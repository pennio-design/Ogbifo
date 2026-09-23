"""Tone-restoration backends. Each takes records and returns one draft per record."""

import time

from .io import read_table, record_id
from .text import nfc

DEFAULT_MT5_MODEL = "Davlan/mt5_base_yoruba_adr"


class IdentityBackend:
    """Returns the plain input unchanged: the no-model baseline."""

    name = "identity"

    def restore(self, records):
        return [r["input"] for r in records]


class FileBackend:
    """Reads drafts produced elsewhere (GPT, Gemini, a human typist).

    The file is a TSV or CSV with song_id, line_no and draft columns.
    """

    name = "file"

    def __init__(self, path):
        self.path = path
        self.drafts = {}
        for row in read_table(path):
            if "draft" not in row:
                raise ValueError(f"{path}: needs a 'draft' column")
            self.drafts[record_id(row)] = nfc(row["draft"])

    def restore(self, records):
        missing = [r["id"] for r in records if r["id"] not in self.drafts]
        if missing:
            raise ValueError(f"{self.path}: no draft for {', '.join(missing[:5])}"
                             + (" ..." if len(missing) > 5 else ""))
        return [self.drafts[r["id"]] for r in records]


class MT5Backend:
    """The open mT5 diacritic-restoration model, run through transformers.

    Install with: pip install -r requirements-model.txt
    """

    name = "mt5"

    def __init__(self, model=DEFAULT_MT5_MODEL, device=None, batch_size=8,
                 num_beams=4, prefix=""):
        try:
            import torch
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
        except ImportError as exc:
            raise SystemExit(
                "The mt5 backend needs transformers, torch and sentencepiece: "
                "pip install -r requirements-model.txt"
            ) from exc
        self.torch = torch
        self.model_name = model
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = AutoTokenizer.from_pretrained(model)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model).to(self.device).eval()
        self.batch_size = batch_size
        self.num_beams = num_beams
        self.prefix = prefix

    def restore(self, records):
        drafts = []
        for start in range(0, len(records), self.batch_size):
            batch = [self.prefix + r["input"] for r in records[start:start + self.batch_size]]
            encoded = self.tokenizer(batch, return_tensors="pt", padding=True,
                                     truncation=True, max_length=256).to(self.device)
            with self.torch.no_grad():
                output = self.model.generate(**encoded, num_beams=self.num_beams,
                                             max_new_tokens=512)
            drafts.extend(nfc(t.strip()) for t in
                          self.tokenizer.batch_decode(output, skip_special_tokens=True))
        return drafts


def timed_restore(backend, records):
    """Run the backend and return (drafts, seconds per line)."""
    start = time.perf_counter()
    drafts = backend.restore(records)
    elapsed = time.perf_counter() - start
    return drafts, elapsed / max(len(records), 1)
