"""Headline statistics from a filled-in audit workbook."""

import math
from collections import defaultdict

from ..score import SPELLING, TONE, UNDERDOT, score_line, total
from ..text import strip_marks, tokenize
from .workbook import NO_LYRICS, PLATFORMS

GATE_CONTINUE = 50
GATE_REPEAT = 20


def wilson(successes, n, z=1.96):
    """95% Wilson score interval for a proportion. Sound at small n and near 0 or 1."""
    if n == 0:
        return (0.0, 0.0)
    p = successes / n
    denom = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom
    return (max(0.0, centre - half), min(1.0, centre + half))


def proportion(successes, n):
    low, high = wilson(successes, n)
    return {"count": successes, "n": n, "share": successes / n if n else 0.0,
            "low": low, "high": high}


def _found(value):
    return value in ("Yes", "Partial")


def _marked(value):
    return value in ("Full", "Some")


def presence_stats(songs, presence):
    by_song = defaultdict(dict)
    for row in presence:
        if row.get("lyrics"):
            by_song[row["song_id"]][row["platform"]] = row
    complete = [s for s in songs if len(by_song[s["song_id"]]) == len(PLATFORMS)]

    def song_flags(song):
        rows = by_song[song["song_id"]].values()
        return {
            "lyrics": any(_found(r["lyrics"]) for r in rows),
            "full_lyrics": any(r["lyrics"] == "Yes" for r in rows),
            "any_marks": any(_found(r["lyrics"]) and _marked(r.get("tone_marks")) for r in rows),
            "full_marks": any(r["lyrics"] == "Yes" and r.get("tone_marks") == "Full" for r in rows),
            "translation": any(r.get("translation") == "Yes" for r in rows),
            "synced": any(r.get("synced") == "Yes" for r in rows),
        }

    flags = {s["song_id"]: song_flags(s) for s in complete}

    def headline(subset):
        n = len(subset)
        return {name: proportion(sum(flags[s["song_id"]][name] for s in subset), n)
                for name in ("lyrics", "full_lyrics", "any_marks", "full_marks",
                             "translation", "synced")}

    def breakdown(field):
        groups = defaultdict(list)
        for s in complete:
            groups[s.get(field) or "(blank)"].append(s)
        return {k: headline(v) for k, v in sorted(groups.items())}

    platforms = {}
    publishers = defaultdict(int)
    for p in PLATFORMS:
        rows = [r for rows in by_song.values() for name, r in rows.items() if name == p]
        found = [r for r in rows if _found(r["lyrics"])]
        platforms[p] = {
            "lyrics": proportion(len(found), len(rows)),
            "marked_when_found": proportion(sum(_marked(r.get("tone_marks")) for r in found),
                                            len(found)),
        }
        for r in found:
            publishers[r.get("published_by") or "(not recorded)"] += 1
    return {
        "songs_sampled": len(songs),
        "songs_complete": len(complete),
        "headline": headline(complete),
        "by_genre": breakdown("genre"),
        "by_era": breakdown("era"),
        "platforms": platforms,
        "publishers": dict(sorted(publishers.items(), key=lambda kv: -kv[1])),
    }


def accuracy_stats(songs, accuracy, target_per_genre):
    rank = {s["song_id"]: int(float(s["accuracy_rank"])) for s in songs}
    genre = {s["song_id"]: s["genre"] for s in songs}
    lines = defaultdict(list)
    skipped = set()
    for row in accuracy:
        if row.get("source_platform") == NO_LYRICS:
            skipped.add(row["song_id"])
        elif row.get("line_as_found") and row.get("correct_line"):
            lines[row["song_id"]].append(row)

    warnings = []
    per_genre = defaultdict(list)
    for song_id in lines:
        per_genre[genre[song_id]].append(song_id)
    for g, ids in sorted(per_genre.items()):
        # Every lower-ranked song must be checked or recorded as having no lyrics.
        top = max(rank[i] for i in ids)
        gaps = [s["song_id"] for s in songs if s["genre"] == g and rank[s["song_id"]] < top
                and s["song_id"] not in lines and s["song_id"] not in skipped]
        if gaps:
            warnings.append(f"{g}: songs ranked below ones you checked were neither checked "
                            f"nor marked '{NO_LYRICS}': {', '.join(gaps)}. Check them, or the "
                            "sample is no longer random.")
        if len(ids) < target_per_genre:
            warnings.append(f"{g}: {len(ids)} of {target_per_genre} songs checked so far.")

    line_scores, song_correct, marked_scores = [], [], []
    marked_lines = correct_lines = 0
    for song_id, rows in lines.items():
        all_correct = True
        for row in rows:
            s = score_line(row["correct_line"], row["line_as_found"])
            line_scores.append(s)
            has_marks = any(strip_marks(w, keep_underdots=True) != w
                            for w in tokenize(row["line_as_found"]))
            if has_marks:
                marked_lines += 1
                marked_scores.append(s)
            if s.errors == 0:
                correct_lines += 1
            else:
                all_correct = False
        song_correct.append(all_correct)

    overall = total(line_scores)
    marked = total(marked_scores)
    n_lines = len(line_scores)
    return {
        "songs_checked": len(lines),
        "songs_without_lyrics": len(skipped),
        "lines": n_lines,
        "lines_correct": proportion(correct_lines, n_lines),
        "lines_with_tone_marks": proportion(marked_lines, n_lines),
        "songs_all_lines_correct": proportion(sum(song_correct), len(song_correct)),
        "word_error_rate": overall.wer,
        "word_error_rate_marked_lines": marked.wer,
        "error_types": {"tone": overall.categories[TONE],
                        "underdot": overall.categories[UNDERDOT],
                        "spelling": overall.categories[SPELLING]},
        "top_errors": [{"correct": r, "found": h, "count": n}
                       for (r, h), n in overall.confusions.most_common(15)],
        "warnings": warnings,
    }


def demand_stats(posts, daily, signups):
    by_tag = defaultdict(int)
    for s in signups:
        by_tag[s.get("link_tag") or "(untagged)"] += 1
    latest = {}
    for row in sorted(daily, key=lambda r: r.get("date", "")):
        if row.get("post_no"):
            latest[row["post_no"]] = row
    posted = [p for p in posts if p.get("video_url")]
    total_signups = len(signups)
    if total_signups >= GATE_CONTINUE:
        gate = "Continue as planned"
    elif total_signups >= GATE_REPEAT:
        gate = "Repeat the test on 10 more videos before deciding"
    else:
        gate = "Lead with the tone-marker and creator captions; push music back"
    per_post = []
    for p in posted:
        last = latest.get(p["post_no"], {})
        per_post.append({
            "post_no": p["post_no"], "link_tag": p.get("link_tag", ""),
            "channel": p.get("channel", ""), "status": p.get("comment_status", ""),
            "views_at_post": p.get("views_at_post", ""),
            "likes": last.get("comment_likes", ""), "replies": last.get("replies", ""),
            "signups": by_tag.get(p.get("link_tag", ""), 0),
        })
    return {
        "posts": len(posted),
        "removed_or_held": sum(p.get("comment_status") in ("Removed", "Held for review")
                               for p in posted),
        "signups": total_signups,
        "signups_by_tag": dict(by_tag),
        "per_post": per_post,
        "gate": gate,
    }


def build(sheets):
    meta = sheets["meta"]
    target = int(meta.get("accuracy_per_genre") or 8)
    summary = {
        "meta": meta,
        "presence": presence_stats(sheets["songs"], sheets["presence"]),
        "accuracy": accuracy_stats(sheets["songs"], sheets["accuracy"], target),
        "demand": demand_stats(sheets["posts"], sheets["daily"], sheets["signups"]),
    }
    summary["carousel"] = carousel(summary)
    return summary


def carousel(summary):
    """Plain-language headline numbers for the PENNIO carousel series."""
    p, a = summary["presence"], summary["accuracy"]
    h = p["headline"]
    n = p["songs_complete"]
    facts = []
    if n:
        facts.append(f"{h['lyrics']['count']} of {n} Yorùbá songs we checked have lyrics "
                     f"anywhere online ({h['lyrics']['share']:.0%}).")
        facts.append(f"{h['any_marks']['count']} of {n} have lyrics with any tone marks "
                     f"({h['any_marks']['share']:.0%}).")
        facts.append(f"{h['translation']['count']} of {n} have a translation "
                     f"({h['translation']['share']:.0%}).")
    if a["lines"]:
        facts.append(f"Of {a['lines']} lyric lines checked by a Yorùbá teacher, "
                     f"{a['lines_correct']['share']:.0%} were written correctly.")
        if a["lines_with_tone_marks"]["count"]:
            facts.append(f"In lines that did carry tone marks, "
                         f"{a['word_error_rate_marked_lines']:.0%} of words were still wrong.")
    return facts


def _pct(x):
    return f"{x * 100:.0f}%"


def _ci(stat):
    if not stat["n"]:
        return "no data yet"
    return f"{_pct(stat['share'])} ({stat['count']}/{stat['n']}; 95% CI {_pct(stat['low'])}–{_pct(stat['high'])})"


HEADLINE_LABELS = [
    ("lyrics", "Lyrics anywhere online (full or partial)"),
    ("full_lyrics", "Full lyrics anywhere"),
    ("any_marks", "Lyrics with any tone marks"),
    ("full_marks", "Full lyrics, fully tone-marked"),
    ("translation", "A translation anywhere"),
    ("synced", "Time-synced lyrics anywhere"),
]


def to_markdown(summary):
    meta, p, a, d = summary["meta"], summary["presence"], summary["accuracy"], summary["demand"]
    out = ["# Yorùbá lyrics online: audit", ""]
    out.append(f"Method {meta.get('method_version', '?')} · sample drawn "
               f"{meta.get('created_on', '?')} · seed {meta.get('seed', '?')} · "
               f"frame: {meta.get('frame', '?')}")
    out.append("")
    out.append("Shares are of songs checked on every platform. The interval is the range the "
               "true share for the whole candidate list probably falls in; quote it with the "
               "number.")
    out.append("")

    out += ["## Headline", "",
            f"Songs checked on all {len(PLATFORMS)} platforms: {p['songs_complete']} of "
            f"{p['songs_sampled']}.", "", "| Measure | Result |", "| --- | --- |"]
    out += [f"| {label} | {_ci(p['headline'][key])} |" for key, label in HEADLINE_LABELS]
    if a["lines"]:
        out += [f"| Lyric lines found online that are written correctly | {_ci(a['lines_correct'])} |",
                f"| Checked songs whose lines are all correct | {_ci(a['songs_all_lines_correct'])} |"]
    out.append("")

    for field, title in (("by_genre", "By genre"), ("by_era", "By era")):
        groups = p[field]
        if not groups:
            continue
        out += [f"## {title}", "", "| Group | Songs | Lyrics online | Any tone marks | Translation |",
                "| --- | --- | --- | --- | --- |"]
        for g, h in groups.items():
            out.append(f"| {g} | {h['lyrics']['n']} | {_pct(h['lyrics']['share'])} | "
                       f"{_pct(h['any_marks']['share'])} | {_pct(h['translation']['share'])} |")
        out.append("")

    out += ["## By platform", "",
            "Counts every checked row, including songs not yet checked on all platforms.", "",
            "| Platform | Lyrics found | Tone-marked when found |",
            "| --- | --- | --- |"]
    for name, s in p["platforms"].items():
        out.append(f"| {name} | {_ci(s['lyrics'])} | {_ci(s['marked_when_found'])} |")
    out.append("")
    if p["publishers"]:
        out += ["Who supplies the lyrics that exist: " + ", ".join(
            f"{k} ({v})" for k, v in p["publishers"].items()), ""]

    out += ["## Accuracy", ""]
    if a["lines"]:
        out += ["| Measure | Value |", "| --- | --- |",
                f"| Songs checked | {a['songs_checked']} (plus {a['songs_without_lyrics']} with no lyrics anywhere) |",
                f"| Lines checked | {a['lines']} |",
                f"| Lines carrying any tone marks | {_ci(a['lines_with_tone_marks'])} |",
                f"| Word error rate, all lines | {_pct(a['word_error_rate'])} |",
                f"| Word error rate, lines with tone marks | {_pct(a['word_error_rate_marked_lines'])} |",
                f"| Errors: tone / underdot / changed word | {a['error_types']['tone']} / "
                f"{a['error_types']['underdot']} / {a['error_types']['spelling']} |", ""]
        if a["top_errors"]:
            out += ["| Correct | As found online | Count |", "| --- | --- | --- |"]
            out += [f"| {e['correct']} | {e['found']} | {e['count']} |" for e in a["top_errors"]]
            out.append("")
    else:
        out += ["No accuracy lines filled in yet.", ""]
    for w in a["warnings"]:
        out.append(f"- **Check:** {w}")
    if a["warnings"]:
        out.append("")

    out += ["## Demand test", "",
            f"**{d['signups']} waitlist signups** from {d['posts']} posts. "
            f"Decision gate: **{d['gate']}.**", ""]
    if d["removed_or_held"]:
        count = d["removed_or_held"]
        out += [f"{count} {'comment was' if count == 1 else 'comments were'} removed or held "
                "for review, so the test under-counts demand from those videos.", ""]
    if d["per_post"]:
        out += ["| Post | Channel | Status | Views at post | Likes | Replies | Signups |",
                "| --- | --- | --- | --- | --- | --- | --- |"]
        out += [f"| {r['post_no']} ({r['link_tag']}) | {r['channel']} | {r['status']} | "
                f"{r['views_at_post']} | {r['likes']} | {r['replies']} | {r['signups']} |"
                for r in d["per_post"]]
        out.append("")

    if summary["carousel"]:
        out += ["## Carousel lines", "", "Check each against the tables above before posting.", ""]
        out += [f"- {line}" for line in summary["carousel"]]
        out.append("")
    return "\n".join(out)
