"""Reading line tables and writing JSONL run files."""

import csv
import json
from pathlib import Path

from .text import nfc, strip_marks

CORE_COLUMNS = {"song_id", "line_no", "reference", "plain", "draft"}


def read_rows(path):
    """Read a TSV (default) or CSV file into a list of dicts with NFC text."""
    path = Path(path)
    delimiter = "," if path.suffix.lower() == ".csv" else "\t"
    with path.open(encoding="utf-8-sig", newline="") as f:
        return [{k.strip(): nfc((v or "").strip()) for k, v in row.items() if k}
                for row in csv.DictReader(f, delimiter=delimiter)]


def read_table(path):
    """Read a line table: rows that each carry song_id and line_no."""
    rows = read_rows(path)
    for row in rows:
        for key in ("song_id", "line_no"):
            if not row.get(key):
                raise ValueError(f"{path}: every row needs {key}")
    return rows


def record_id(row):
    return f"{row['song_id']}:{row['line_no']}"


def load_lines(path, keep_underdots=False):
    """Turn a line table into records the backends can draft.

    Each row needs a reference (verified, tone-marked text), a plain line, or
    both. Without plain, the input is the reference with its marks stripped.
    Without reference, the line can still be drafted and timed but not scored
    against a gold standard.
    """
    records = []
    for row in read_table(path):
        reference = row.get("reference") or None
        plain = row.get("plain") or None
        if not reference and not plain:
            raise ValueError(f"{path}: line {record_id(row)} has neither reference nor plain")
        records.append({
            "id": record_id(row),
            "song_id": row["song_id"],
            "line_no": row["line_no"],
            "input": plain or strip_marks(reference, keep_underdots),
            "reference": reference,
            "meta": {k: v for k, v in row.items() if k not in CORE_COLUMNS and v},
        })
    ids = [r["id"] for r in records]
    duplicates = {i for i in ids if ids.count(i) > 1}
    if duplicates:
        raise ValueError(f"{path}: duplicate song_id:line_no {sorted(duplicates)}")
    return records


def read_jsonl(path):
    with open(path, encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]


def write_jsonl(path, records):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
