import json
import subprocess
import sys
import tempfile
import unicodedata
import unittest
from pathlib import Path

from ogbifo_bench import report
from ogbifo_bench.io import load_lines
from ogbifo_bench.score import SPELLING, TONE, UNDERDOT, align, classify, score_line
from ogbifo_bench.text import letters, strip_marks, tokenize

BENCH = Path(__file__).resolve().parent.parent
FIXTURE = BENCH / "samples" / "fixture.tsv"
PREDICTIONS = BENCH / "samples" / "fixture_predictions.tsv"


class TextTest(unittest.TestCase):
    def test_strip_all_marks(self):
        self.assertEqual(strip_marks("Ọkọ́ ni mo fi ro oko."), "Oko ni mo fi ro oko.")

    def test_strip_tones_keep_underdots(self):
        self.assertEqual(strip_marks("ọkọ́ ọkọ̀ ṣé", keep_underdots=True), "ọkọ ọkọ ṣe")

    def test_composed_and_decomposed_input_tokenize_the_same(self):
        decomposed = unicodedata.normalize("NFD", "Ọkọ́ náà")
        self.assertEqual(tokenize(decomposed), tokenize("ọkọ́ náà"))

    def test_tokenize_drops_edge_punctuation_keeps_elision(self):
        self.assertEqual(tokenize("“Ó dé!” l’ọ́jọ́ náà,"), ["ó", "dé", "l'ọ́jọ́", "náà"])

    def test_letters_group_marks(self):
        self.assertEqual(letters("ọ́")[0], ("o", frozenset({"\u0323", "\u0301"})))


class ScoreTest(unittest.TestCase):
    def test_align_counts(self):
        ops = [op for op, _, _ in align(["a", "b", "c"], ["a", "x", "c", "d"])]
        self.assertEqual(ops, ["eq", "sub", "eq", "ins"])

    def test_classify(self):
        self.assertEqual(classify("ọkọ̀", "ọkọ́"), TONE)
        self.assertEqual(classify("ọkọ", "okọ"), UNDERDOT)
        self.assertEqual(classify("ọkọ", "ọmọ"), SPELLING)

    def test_perfect_line(self):
        s = score_line("Ẹ káàrọ̀ o!", "ẹ káàrọ̀ o")
        self.assertEqual((s.wer, s.letter_error_rate), (0.0, 0.0))

    def test_errors_and_letters(self):
        s = score_line("Ọkọ mi wà nílé.", "Okọ mi wa nílé.")
        self.assertEqual(s.substitutions, 2)
        self.assertAlmostEqual(s.wer, 0.5)
        self.assertEqual(s.categories[UNDERDOT], 1)
        self.assertEqual(s.categories[TONE], 1)
        self.assertEqual(s.letters_wrong, 2)

    def test_missing_and_extra_words(self):
        s = score_line("a b c d", "a c d e")
        self.assertEqual((s.deletions, s.insertions, s.substitutions), (1, 1, 0))


class ReportTest(unittest.TestCase):
    def drafts(self, overrides):
        records = load_lines(FIXTURE)
        for r in records:
            r["draft"] = overrides.get(r["id"], r["reference"])
            r["backend"] = "test"
        return records

    def test_correction_regime(self):
        drafts = self.drafts({"demo-01:2": "Ọkọ náà ti dé."})
        summary = report.build(drafts)
        self.assertEqual(summary["verdict"]["regime"], "correct")
        self.assertGreater(summary["model_vs_gold"]["no_model_wer"], summary["model_vs_gold"]["wer"])

    def test_rewrite_regime(self):
        drafts = self.drafts({})
        for d in drafts:
            d["draft"] = d["input"]
        self.assertEqual(report.build(drafts)["verdict"]["regime"], "rewrite")

    def test_verification_and_cost(self):
        drafts = self.drafts({"demo-01:3": "Okọ mi wa nílé."})
        verified = [
            {"id": "demo-01:1", "final": drafts[0]["draft"], "status": "accepted", "seconds": 10},
            {"id": "demo-01:2", "final": drafts[1]["draft"], "status": "accepted", "seconds": 20},
            # Verifier accepted a draft that still has errors.
            {"id": "demo-01:3", "final": "Okọ mi wa nílé.", "status": "accepted", "seconds": 30},
            {"id": "demo-02:1", "final": "x", "status": "flagged", "seconds": 60},
        ]
        summary = report.build(drafts, verified, rate_per_hour=3600, lines_per_song=10)
        v = summary["verification"]
        self.assertEqual(v["missed_error_lines"], 1)
        self.assertEqual(v["outcomes"]["flagged"]["lines"], 1)
        self.assertEqual(v["draft_vs_final_wer"], 0.0)  # flagged line excluded
        self.assertAlmostEqual(v["cost"]["per_line"], 30.0)
        self.assertAlmostEqual(v["cost"]["per_song"], 300.0)
        self.assertIn("Cost per verified line", report.to_markdown(summary))

    def test_verification_without_gold(self):
        drafts = self.drafts({})
        for d in drafts:
            d["reference"] = None
        verified = [{"id": d["id"], "final": d["draft"], "seconds": 5} for d in drafts]
        summary = report.build(drafts, verified)
        self.assertEqual(summary["verdict"]["basis"], "verifier corrections")
        report.to_markdown(summary)


class CliTest(unittest.TestCase):
    def run_cli(self, *args):
        return subprocess.run([sys.executable, "-m", "ogbifo_bench", *args], cwd=BENCH,
                              capture_output=True, text=True, check=True)

    def test_draft_and_report(self):
        with tempfile.TemporaryDirectory() as tmp:
            drafts = Path(tmp) / "drafts.jsonl"
            self.run_cli("draft", str(FIXTURE), "--backend", "file",
                         "--predictions", str(PREDICTIONS), "--out", str(drafts))
            rows = [json.loads(line) for line in drafts.read_text(encoding="utf-8").splitlines()]
            self.assertEqual(len(rows), 4)
            self.assertEqual(rows[0]["input"], "Oko ni mo fi ro oko.")
            out = Path(tmp) / "report.md"
            result = self.run_cli("report", str(drafts), "--group-by", "genre", "--out", str(out))
            self.assertIn("17.6%", result.stdout)
            self.assertTrue(out.with_suffix(".json").exists())

    def test_identity_baseline(self):
        with tempfile.TemporaryDirectory() as tmp:
            drafts = Path(tmp) / "drafts.jsonl"
            self.run_cli("draft", str(FIXTURE), "--backend", "identity", "--out", str(drafts))
            self.assertIn("Rewrite regime", self.run_cli("report", str(drafts)).stdout)


if __name__ == "__main__":
    unittest.main()
