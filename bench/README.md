# Tone-restoration benchmark

This harness answers the question the Month 1 plan depends on: **how many minutes, and how much money, does it take to turn a model draft into a verified, tone-marked Yorùbá line?**

It reports:

- **Model word error rate** on your lines, compared with a no-model baseline and the published 18% figure for news-style text.
- **Error types**: wrong tone, wrong underdot, or a changed word.
- **Verifier time per line**, and how many lines were accepted, corrected, rewritten or flagged.
- **Verifier accuracy** against gold lines, including drafts accepted with errors still in them.
- **Cost** per line, per song and per 1,000 lines at a given hourly rate.
- **A verdict.** If more than a third of draft words are wrong, verifiers are rewriting lines rather than correcting them, and every service priced on "correct the draft" costs more than planned.

The core needs only Python 3.9+ and the standard library. The mT5 model is optional (see [Running the model](#running-the-model)).

## Week 1 protocol

Run every command from the `bench` folder.

1. **Choose 10 songs** across genres and eras: jùjú, fúdí, highlife, gospel and Afrobeats with heavy Yorùbá. Include some code-switched lines, because they are where the model is expected to be weakest.
2. **Make gold lines for at least 3 of the songs.** Type the correct, tone-marked lyrics into a line sheet (see [Line sheets](#line-sheets)). Use the spoken (lexical) tone, not the sung tone, and note in `notes` where they differ. Gold lines let the harness measure the model and the verifier. Without gold, a song can still be drafted and timed.
3. **Draft every line with the model:**
   ```sh
   python -m ogbifo_bench draft data/songs.tsv --out runs/w1/mt5.jsonl
   ```
4. **Send `runs/w1/mt5.jsonl` and `verify.html` to a verifier.** It should be someone other than the person who made the gold lines, or the timing will be contaminated. They open `verify.html` in any browser (it works offline on a phone), enter their name, load the file, correct each line, then tap *Download results* and send back the `verified-*.jsonl` file.
5. **Run the report:**
   ```sh
   python -m ogbifo_bench report runs/w1/mt5.jsonl \
     --verified runs/w1/verified-*.jsonl \
     --rate 3000 --lines-per-song 40 --group-by genre \
     --out runs/w1/report.md
   ```
   `--rate` is the verifier's pay per hour in naira (use `--currency` for another currency). The report is written as Markdown with a JSON summary beside it.

Optional comparisons:

```sh
# No-model baseline: what verifiers face if they start from plain text
python -m ogbifo_bench draft data/songs.tsv --backend identity --out runs/w1/plain.jsonl

# Any other tool (GPT, Gemini, a human typist): paste its output into a
# sheet with song_id, line_no and draft columns
python -m ogbifo_bench draft data/songs.tsv --backend file \
  --predictions data/gpt_drafts.tsv --out runs/w1/gpt.jsonl
```

## Line sheets

A TSV (or `.csv`) with one row per lyric line. [`samples/line_sheet_template.tsv`](samples/line_sheet_template.tsv) has the headers.

| Column | Required | Meaning |
| --- | --- | --- |
| `song_id` | yes | Short stable ID, e.g. `lijadu-kehinde` |
| `line_no` | yes | Line number within the song |
| `reference` | one of these two | Gold, verified tone-marked line |
| `plain` | one of these two | The line as a contributor would type it. Without it, the model input is `reference` with all marks stripped |
| anything else | no | Kept as metadata; use it with `--group-by` (e.g. `genre`, `era`, `code_switched`). `audio_url` is shown to the verifier as a link |

Use the `plain` column to test realistic input: partial tone marks, spelling variants, English and Pidgin mixed in. Stripping gold lines gives the model its easiest possible input.

Keep line sheets under `bench/data/` and outputs under `bench/runs/`. Both folders are git-ignored because **this repository is public and lyrics are copyrighted.**

## Running the model

The default backend is `Davlan/mt5_base_yoruba_adr` on Hugging Face. It has not been run from this repository yet, so check it on five lines before running the full set. If the output looks wrong, the model may expect a task prefix (`--prefix`), or the model ID may have moved (`--model`).

```sh
cd bench
pip install -r requirements-model.txt
python -m ogbifo_bench draft samples/fixture.tsv --out runs/check.jsonl
```

A free Google Colab GPU is enough for this. Upload the `bench` folder, then run the same commands in cells prefixed with `!`. On a CPU, a few hundred lines take minutes, not hours.

## Reading the report

- **Word error rate with no model** is the share of words that need at least one mark. It is the ceiling the model is working down from.
- **Letter error rate** only counts words the model kept (same base letters). It shows how close the near-misses are.
- **Changed words** mean the model altered the letters themselves, not just the marks. Many of these point to code-switching or elision the model mishandles.
- **Lines accepted with errors still in them** is the verifier-quality number. If it is above zero on gold lines, a single verifier is not enough, and the second-verifier step in the plan is needed from the start.
- Treat timings from the first 20 or so lines as warm-up. Look at the median and p90 as well as the mean.

## Development

```sh
cd bench
python -m unittest discover -s tests -t .
```

The fixture in `samples/` is test data for the scorer. It is not a verified corpus.
