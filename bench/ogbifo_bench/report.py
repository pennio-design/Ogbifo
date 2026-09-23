"""Turn a drafts file (and optionally a verification export) into the numbers
the Month 1 decision needs: model error rate, verifier time and cost per line."""

import math
from collections import defaultdict
from statistics import mean, median

from .score import SPELLING, TONE, UNDERDOT, score_line, total

# The plan's threshold: above this share of wrong words, verifiers rewrite
# lines instead of correcting them and the cost per song rises.
DEFAULT_REWRITE_THRESHOLD = 1 / 3
# mT5_base_yoruba_adr word error rate on the 2026 MDPI benchmark (news-style text).
PUBLISHED_WER = 0.18


def percentile(values, pct):
    ordered = sorted(values)
    if not ordered:
        return 0.0
    rank = max(1, math.ceil(pct / 100 * len(ordered)))
    return ordered[rank - 1]


def _score_summary(score):
    return {
        "lines_words": score.ref_words,
        "wer": score.wer,
        "letter_error_rate": score.letter_error_rate,
        "substitutions": score.substitutions,
        "deletions": score.deletions,
        "insertions": score.insertions,
        "tone_errors": score.categories[TONE],
        "underdot_errors": score.categories[UNDERDOT],
        "spelling_errors": score.categories[SPELLING],
    }


def build(drafts, verified=None, rate_per_hour=None, lines_per_song=40,
          group_by=(), rewrite_threshold=DEFAULT_REWRITE_THRESHOLD, casefold=True,
          top=15):
    summary = {"lines": len(drafts), "backend": sorted({d.get("backend", "?") for d in drafts})}

    gold = [d for d in drafts if d.get("reference")]
    if gold:
        model_scores = {d["id"]: score_line(d["reference"], d["draft"], casefold) for d in gold}
        model = total(model_scores.values())
        baseline = total(score_line(d["reference"], d["input"], casefold) for d in gold)
        groups = {}
        for key in group_by:
            buckets = defaultdict(list)
            for d in gold:
                buckets[d.get("meta", {}).get(key) or "(blank)"].append(model_scores[d["id"]])
            groups[key] = {
                value: {"lines": len(scores), **_score_summary(total(scores))}
                for value, scores in sorted(buckets.items())
            }
        summary["model_vs_gold"] = {
            "lines": len(gold),
            **_score_summary(model),
            "no_model_wer": baseline.wer,
            "groups": groups,
            "top_confusions": [
                {"reference": r, "draft": h, "count": n}
                for (r, h), n in model.confusions.most_common(top)
            ],
        }

    if verified:
        by_id = {d["id"]: d for d in drafts}
        rows = []
        for v in verified:
            d = by_id.get(v["id"])
            if d is None:
                continue
            edit = score_line(v["final"], d["draft"], casefold)
            rows.append((d, v, edit))
        buckets = defaultdict(list)
        for d, v, edit in rows:
            if v.get("status") == "flagged":
                bucket = "flagged"
            elif edit.errors == 0:
                bucket = "accepted"
            elif edit.wer <= rewrite_threshold:
                bucket = "corrected"
            else:
                bucket = "rewritten"
            buckets[bucket].append(float(v.get("seconds", 0)))
        seconds = [float(v.get("seconds", 0)) for _, v, _ in rows]
        verification = {
            "lines": len(rows),
            "threshold": rewrite_threshold,
            "verifiers": sorted({v.get("verifier") or "(unnamed)" for _, v, _ in rows}),
            # Flagged lines are ones the verifier was unsure of, so they say
            # nothing about how wrong the draft was.
            "draft_vs_final_wer": total(
                e for _, v, e in rows if v.get("status") != "flagged").wer,
            "total_minutes": sum(seconds) / 60,
            "seconds_mean": mean(seconds) if seconds else 0.0,
            "seconds_median": median(seconds) if seconds else 0.0,
            "seconds_p90": percentile(seconds, 90),
            "outcomes": {
                name: {
                    "lines": len(buckets[name]),
                    "share": len(buckets[name]) / len(rows) if rows else 0.0,
                    "seconds_median": median(buckets[name]) if buckets[name] else 0.0,
                }
                for name in ("accepted", "corrected", "rewritten", "flagged")
            },
        }
        checked = [(d, v) for d, v, _ in rows if d.get("reference")]
        if checked:
            missed = sum(
                1 for d, v in checked
                if score_line(v["final"], d["draft"], casefold).errors == 0
                and score_line(d["reference"], d["draft"], casefold).errors > 0
            )
            verification["verifier_vs_gold_wer"] = total(
                score_line(d["reference"], v["final"], casefold) for d, v in checked).wer
            verification["lines_with_gold"] = len(checked)
            verification["missed_error_lines"] = missed
        if rate_per_hour and seconds:
            per_line = rate_per_hour * mean(seconds) / 3600
            verification["cost"] = {
                "rate_per_hour": rate_per_hour,
                "lines_per_hour": 3600 / mean(seconds) if mean(seconds) else 0.0,
                "per_line": per_line,
                "per_song": per_line * lines_per_song,
                "per_1000_lines": per_line * 1000,
                "lines_per_song": lines_per_song,
            }
        summary["verification"] = verification

    # Gold references are the better yardstick; verifier corrections stand in
    # for them on lines nobody has prepared a gold version of.
    if gold:
        error_rate = summary["model_vs_gold"]["wer"]
        basis = "gold references"
    elif "verification" in summary and summary["verification"]["lines"]:
        error_rate = summary["verification"]["draft_vs_final_wer"]
        basis = "verifier corrections"
    else:
        error_rate, basis = None, None
    if error_rate is not None:
        summary["verdict"] = {
            "draft_error_rate": error_rate,
            "basis": basis,
            "threshold": rewrite_threshold,
            "regime": "rewrite" if error_rate > rewrite_threshold else "correct",
        }
    return summary


def _pct(x):
    return f"{x * 100:.1f}%"


def to_markdown(summary, currency="NGN"):
    out = ["# Tone-restoration benchmark", ""]
    out.append(f"Lines: {summary['lines']} · Backend: {', '.join(summary['backend'])}")
    out.append("")

    verdict = summary.get("verdict")
    if verdict:
        out += ["## Verdict", ""]
        rate = _pct(verdict["draft_error_rate"])
        if verdict["regime"] == "rewrite":
            out.append(f"**Rewrite regime.** {rate} of words in the draft are wrong "
                       f"(measured against {verdict['basis']}), above the "
                       f"{_pct(verdict['threshold'])} threshold. Verifiers are retyping, not "
                       "correcting; expect cost per song to rise until the model is fine-tuned "
                       "on verified lines.")
        else:
            out.append(f"**Correction regime.** {rate} of words in the draft are wrong "
                       f"(measured against {verdict['basis']}), within the "
                       f"{_pct(verdict['threshold'])} threshold. Verifiers are correcting drafts.")
        out.append(f"Published benchmark for comparison: {_pct(PUBLISHED_WER)} word error rate "
                   "on news-style text.")
        out.append("")

    model = summary.get("model_vs_gold")
    if model:
        out += ["## Model against gold references", "",
                "| Measure | Value |", "| --- | --- |",
                f"| Lines scored | {model['lines']} |",
                f"| Word error rate | {_pct(model['wer'])} |",
                f"| Word error rate with no model | {_pct(model['no_model_wer'])} |",
                f"| Letter error rate (kept words) | {_pct(model['letter_error_rate'])} |",
                f"| Tone-only errors | {model['tone_errors']} |",
                f"| Underdot errors | {model['underdot_errors']} |",
                f"| Changed words | {model['spelling_errors']} |",
                f"| Missing / extra words | {model['deletions']} / {model['insertions']} |",
                ""]
        for key, values in model["groups"].items():
            out += [f"### By {key}", "", "| Value | Lines | Word error rate |",
                    "| --- | --- | --- |"]
            out += [f"| {v} | {s['lines']} | {_pct(s['wer'])} |" for v, s in values.items()]
            out.append("")
        if model["top_confusions"]:
            out += ["### Most frequent errors", "", "| Correct | Draft | Count |",
                    "| --- | --- | --- |"]
            out += [f"| {c['reference']} | {c['draft']} | {c['count']} |"
                    for c in model["top_confusions"]]
            out.append("")

    ver = summary.get("verification")
    if ver:
        out += ["## Verification", "",
                f"Verifiers: {', '.join(ver['verifiers'])}", "",
                "| Measure | Value |", "| --- | --- |",
                f"| Lines verified | {ver['lines']} |",
                f"| Draft words changed by verifier | {_pct(ver['draft_vs_final_wer'])} |",
                f"| Total active time | {ver['total_minutes']:.1f} min |",
                f"| Seconds per line (mean / median / p90) | "
                f"{ver['seconds_mean']:.1f} / {ver['seconds_median']:.1f} / {ver['seconds_p90']:.1f} |"]
        if "verifier_vs_gold_wer" in ver:
            out += [f"| Verifier word error rate against gold | {_pct(ver['verifier_vs_gold_wer'])} |",
                    f"| Lines accepted with errors still in them | {ver['missed_error_lines']} "
                    f"of {ver['lines_with_gold']} |"]
        out += ["", "| Outcome | Lines | Share | Median seconds |", "| --- | --- | --- | --- |"]
        out += [f"| {name} | {o['lines']} | {_pct(o['share'])} | {o['seconds_median']:.1f} |"
                for name, o in ver["outcomes"].items()]
        out += ["", f"Corrected: up to {_pct(ver['threshold'])} of a line's words "
                "changed. Rewritten: more than that. Flagged: the verifier was not sure.", ""]
        cost = ver.get("cost")
        if cost:
            out += ["## Cost", "",
                    f"At {currency} {cost['rate_per_hour']:,.0f} per verifier hour:", "",
                    "| Measure | Value |", "| --- | --- |",
                    f"| Lines per hour | {cost['lines_per_hour']:.0f} |",
                    f"| Cost per verified line | {currency} {cost['per_line']:,.2f} |",
                    f"| Cost per song ({cost['lines_per_song']} lines) | "
                    f"{currency} {cost['per_song']:,.0f} |",
                    f"| Cost per 1,000 verified lines | {currency} {cost['per_1000_lines']:,.0f} |",
                    ""]
    return "\n".join(out)
