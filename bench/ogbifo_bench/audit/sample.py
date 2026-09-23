"""Draw a reproducible, stratified sample of songs from a candidate list."""

import datetime
import random
import re
from collections import defaultdict

from ..io import read_rows
from ..text import strip_marks
from . import workbook


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", strip_marks(text).casefold()).strip("-")[:40]


def genre_key(genre):
    return slug(genre)


def load_candidates(path):
    """Read the candidate list. Needs title, artist and genre; year, frame_source and url help."""
    rows = read_rows(path)
    seen = set()
    candidates = []
    for row in rows:
        for column in ("title", "artist", "genre"):
            if not row.get(column):
                raise ValueError(f"{path}: every candidate needs {column}")
        song_id = row.get("song_id") or slug(f"{row['artist']} {row['title']}")
        key = (slug(row["artist"]), slug(row["title"]))
        if key in seen:
            continue  # the same song listed twice, e.g. from two playlists
        seen.add(key)
        base, n = song_id, 2
        while song_id in {c["song_id"] for c in candidates}:
            song_id, n = f"{base}-{n}", n + 1
        candidates.append({
            "song_id": song_id,
            "title": row["title"],
            "artist": row["artist"],
            "year": row.get("year", ""),
            "era": workbook.era(row.get("year", "")),
            "genre": row["genre"],
            "frame_source": row.get("frame_source", ""),
            "url": row.get("url", ""),
        })
    return candidates


def draw(candidates, per_genre, seed):
    """Shuffle each genre with a fixed seed and keep the first per_genre songs.

    The shuffled position becomes accuracy_rank, so the accuracy subsample is
    simply "the lowest ranks that have lyrics", which leaves no room to pick
    easy songs.
    """
    by_genre = defaultdict(list)
    for c in candidates:
        by_genre[genre_key(c["genre"])].append(c)
    rng = random.Random(seed)
    sample, shortfalls = [], {}
    for key in sorted(by_genre):
        pool = sorted(by_genre[key], key=lambda c: c["song_id"])
        rng.shuffle(pool)
        chosen = pool[:per_genre]
        if len(chosen) < per_genre:
            shortfalls[chosen[0]["genre"]] = len(chosen)
        for rank, song in enumerate(chosen, start=1):
            sample.append({**song, "accuracy_rank": rank})
    return sample, shortfalls


def run(candidates_path, out, per_genre=40, accuracy_per_genre=8, seed=None, frame=""):
    candidates = load_candidates(candidates_path)
    seed = seed if seed is not None else datetime.date.today().year
    sample, shortfalls = draw(candidates, per_genre, seed)
    meta = {
        "method_version": workbook.METHOD_VERSION,
        "created_on": datetime.date.today().isoformat(),
        "seed": seed,
        "per_genre": per_genre,
        "accuracy_per_genre": accuracy_per_genre,
        "candidates": len(candidates),
        "frame": frame or f"{len(candidates)} candidates from {candidates_path}",
    }
    # Twice the target leaves room for songs with no lyrics anywhere.
    workbook.write_workbook(out, sample, meta, accuracy_rows_per_genre=2 * accuracy_per_genre)
    return sample, shortfalls
