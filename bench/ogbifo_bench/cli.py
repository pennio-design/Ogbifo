"""Command line: `python -m ogbifo_bench draft|report|audit ...`."""

import argparse
import json
import sys
from pathlib import Path

from . import backends, report
from .io import load_lines, read_jsonl, write_jsonl


def write_report(path, markdown, summary):
    """Write the Markdown report and a JSON summary beside it."""
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(markdown + "\n", encoding="utf-8")
    out.with_suffix(".json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def cmd_draft(args):
    records = load_lines(args.lines, keep_underdots=args.keep_underdots)
    if args.backend == "identity":
        backend = backends.IdentityBackend()
    elif args.backend == "file":
        if not args.predictions:
            raise SystemExit("--backend file needs --predictions")
        backend = backends.FileBackend(args.predictions)
    else:
        backend = backends.MT5Backend(args.model, args.device, args.batch_size,
                                      args.num_beams, args.prefix)
    drafts, seconds = backends.timed_restore(backend, records)
    for record, draft in zip(records, drafts):
        record["draft"] = draft
        record["backend"] = backend.name
        record["model"] = getattr(backend, "model_name", None)
        record["model_seconds_per_line"] = round(seconds, 4)
    write_jsonl(args.out, records)
    print(f"Drafted {len(records)} lines with {backend.name} -> {args.out}", file=sys.stderr)


def cmd_report(args):
    drafts = read_jsonl(args.drafts)
    verified = []
    for path in args.verified or []:
        verified.extend(read_jsonl(path))
    summary = report.build(
        drafts,
        verified=verified or None,
        rate_per_hour=args.rate,
        lines_per_song=args.lines_per_song,
        group_by=args.group_by or (),
        rewrite_threshold=args.threshold,
        casefold=not args.case_sensitive,
    )
    markdown = report.to_markdown(summary, currency=args.currency)
    print(markdown)
    if args.out:
        write_report(args.out, markdown, summary)


def cmd_audit_sample(args):
    from .audit import sample
    songs, shortfalls = sample.run(args.candidates, args.out, args.per_genre,
                                   args.accuracy_per_genre, args.seed, args.frame)
    genres = sorted({s["genre"] for s in songs})
    print(f"Sampled {len(songs)} songs across {len(genres)} genres -> {args.out}",
          file=sys.stderr)
    for genre, count in shortfalls.items():
        print(f"warning: only {count} candidates for {genre}; add more to reach "
              f"{args.per_genre}", file=sys.stderr)


def cmd_audit_report(args):
    from .audit import report as audit_report
    from .audit.workbook import read_workbook
    summary = audit_report.build(read_workbook(args.workbook))
    markdown = audit_report.to_markdown(summary)
    print(markdown)
    if args.out:
        write_report(args.out, markdown, summary)


def main(argv=None):
    parser = argparse.ArgumentParser(prog="ogbifo_bench",
                                     description="Benchmark Yorùbá tone restoration.")
    sub = parser.add_subparsers(dest="command", required=True)

    draft = sub.add_parser("draft", help="Draft tone-marked lines with a backend.")
    draft.add_argument("lines", help="TSV/CSV with song_id, line_no and reference and/or plain")
    draft.add_argument("--out", required=True, help="Drafts JSONL to write")
    draft.add_argument("--backend", choices=["mt5", "file", "identity"], default="mt5")
    draft.add_argument("--predictions", help="For --backend file: TSV/CSV with a draft column")
    draft.add_argument("--model", default=backends.DEFAULT_MT5_MODEL)
    draft.add_argument("--device", help="cuda or cpu (default: cuda if available)")
    draft.add_argument("--batch-size", type=int, default=8)
    draft.add_argument("--num-beams", type=int, default=4)
    draft.add_argument("--prefix", default="", help="Text prepended to each input line")
    draft.add_argument("--keep-underdots", action="store_true",
                       help="Strip only tone marks from references, keep ẹ ọ ṣ")
    draft.set_defaults(func=cmd_draft)

    rep = sub.add_parser("report", help="Score drafts and verifier timings.")
    rep.add_argument("drafts", help="Drafts JSONL from the draft command")
    rep.add_argument("--verified", nargs="+", help="JSONL exports from verify.html")
    rep.add_argument("--rate", type=float, help="Verifier pay per hour, for cost figures")
    rep.add_argument("--currency", default="NGN")
    rep.add_argument("--lines-per-song", type=int, default=40)
    rep.add_argument("--group-by", nargs="+", help="Extra columns to break results down by")
    rep.add_argument("--threshold", type=float, default=report.DEFAULT_REWRITE_THRESHOLD,
                     help="Draft error rate above which verifiers are rewriting (default 1/3)")
    rep.add_argument("--case-sensitive", action="store_true")
    rep.add_argument("--out", help="Write the report here (.md) plus a .json summary")
    rep.set_defaults(func=cmd_report)

    audit = sub.add_parser("audit", help="The Yorùbá-lyrics-online audit.")
    audit_sub = audit.add_subparsers(dest="audit_command", required=True)
    samp = audit_sub.add_parser("sample", help="Draw the sample and write the audit workbook.")
    samp.add_argument("candidates", help="CSV/TSV with title, artist, genre (year, frame_source, url)")
    samp.add_argument("--out", required=True, help="Workbook to write (.xlsx)")
    samp.add_argument("--per-genre", type=int, default=40)
    samp.add_argument("--accuracy-per-genre", type=int, default=8)
    samp.add_argument("--seed", type=int, help="Random seed (default: the current year)")
    samp.add_argument("--frame", default="",
                      help="One line describing where the candidates came from")
    samp.set_defaults(func=cmd_audit_sample)
    arep = audit_sub.add_parser("report", help="Headline numbers from a filled-in workbook.")
    arep.add_argument("workbook")
    arep.add_argument("--out", help="Write the report here (.md) plus a .json summary")
    arep.set_defaults(func=cmd_audit_report)

    args = parser.parse_args(argv)
    try:
        args.func(args)
    except ValueError as exc:
        raise SystemExit(f"error: {exc}")
