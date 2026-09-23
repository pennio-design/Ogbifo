"""Command line: `python -m ogbifo_bench draft ...` and `python -m ogbifo_bench report ...`."""

import argparse
import json
import sys
from pathlib import Path

from . import backends, report
from .io import load_lines, read_jsonl, write_jsonl


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
        out = Path(args.out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(markdown + "\n", encoding="utf-8")
        out.with_suffix(".json").write_text(
            json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


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

    args = parser.parse_args(argv)
    try:
        args.func(args)
    except ValueError as exc:
        raise SystemExit(f"error: {exc}")
