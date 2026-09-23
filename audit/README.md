# Yorùbá lyrics online: audit kit

Method version 1.0. This is Workstream 1 of the project plan. The audit puts numbers on three unknowns:

1. What share of Yorùbá songs have lyrics online at all?
2. What share of those carry tone marks?
3. How many of the marked lines are actually correct?

It also runs the demand test: do listeners want to help close the gap?

The method is written down so the audit can be repeated every year, making it an index rather than a one-off. Change the method only by raising the version number, and say what changed.

## What you get

- **A workbook** (`.xlsx`) with dropdowns, generated from your candidate list. It has a live Dashboard and works in Excel or Google Sheets (upload it to Drive and open with Sheets; the dropdowns carry over).
- **A report** with every headline number and a 95% confidence interval, broken down by genre, era and platform. It includes the accuracy scores, the demand-gate verdict, and plain-language lines for the carousel series. It also writes a JSON summary.

All commands run from the `bench` folder:

```sh
cd bench
pip install openpyxl
python -m ogbifo_bench audit sample ../audit/data/candidates.csv \
  --out ../audit/data/audit-2026.xlsx --seed 2026 \
  --frame "Spotify and Apple Music editorial playlists, YouTube top results, Sept 2026"
# ... fill in the workbook ...
python -m ogbifo_bench audit report ../audit/data/audit-2026.xlsx --out ../audit/runs/report-2026.md
```

`audit/data/` and `audit/runs/` are git-ignored because the repository is public.

## Step 1: build the candidate list (about 2 hours)

This step decides whether the headline number holds up. Every result describes **the candidate list**, not "all Yorùbá music". Build the list by rules, write the rules down, and don't bend them.

- **Genres:** jùjú, fújì, highlife, gospel, and Afrobeats with heavy Yorùbá.
- **At least 60 candidates per genre**, so the sampler has real choices.
- **Use named public sources only**, and record each in `frame_source`: editorial playlists on Spotify and Apple Music, YouTube search results ranked by views, Boomplay charts, and the discographies of each genre's canonical artists.
- **At most 3 songs per artist**, so one artist can't dominate a genre.
- **Don't look up any song's lyrics before adding it.** Knowing which songs have lyrics online, and then choosing, biases the sample.
- Columns: `title`, `artist`, `year`, `genre`, then optionally `frame_source` and `url`. There's a blank template in [`templates/candidates.csv`](templates/candidates.csv). Example row:
  `Song title,Artist name,1994,Fújì,"YouTube top results, Sept 2026",https://…`

The sampler then shuffles each genre with a fixed seed (use the year) and keeps 40 per genre. Anyone with the same list and seed gets the same sample, which is the answer to "how did you choose the songs?"

## Step 2: presence (about 15 hours for 200 songs)

The Presence tab has one row per song per platform: Spotify, YouTube Music, Apple Music, Musixmatch, Genius, and the top Google result for "<title> <artist> lyrics". For each row, record what a listener would find. Definitions are in the workbook's *Read me* tab. The ones that matter most:

- **tone_marks: Full** means marks on nearly every word that needs one, whether right or wrong. Correctness is measured in Step 3.
- **Underdots alone count as None.** They are not tone marks.
- **published_by** records who supplied the lyrics: Musixmatch, LyricFind, a fan blog, the artist. This shows who controls Yorùbá lyrics today, which matters for the Musixmatch question in the plan.

Working one song at a time across all six tabs is faster than one platform at a time.

**100 songs or 200?** Presence takes most of the hours. Halving to 20 per genre (`--per-genre 20`) saves about 7 hours. For a result near 50%, the confidence interval widens from about ±7 points to about ±10 points. For grants and press, ±10 is usually fine. For the yearly index, 200 is better. It's your call, and the kit handles either.

## Step 3: accuracy (about 4 hours of teacher time)

The Accuracy tab lists songs in `accuracy_rank` order within each genre. Work down the ranks until 8 songs per genre are done.

- **Skip only songs with no lyrics anywhere.** For those, set `source_platform` to *No lyrics found* on the first line. If you skip a song for being hard, the report flags it, because the sample is then no longer random.
- **Source:** use the platform with the most tone marks for that song. This is the best case, which makes any bad result harder to dismiss.
- **Lines:** the first 5 mainly-Yorùbá lines, starting at the first verse. Paste `line_as_found` exactly as it appears, errors included.
- **`correct_line`** is written by a qualified teacher, using spoken (lexical) tones. Use `notes` to record where the sung tone differs.

The report scores these lines with the same scorer as the tone-restoration benchmark, so audit error rates and model error rates are directly comparable.

## Step 4: demand test (10 posts, 14 days)

1. **Make a one-question waitlist form** (Google Forms or Tally). The question is *"Which Yorùbá song do you most want to see with full lyrics and meaning?"*, plus a contact field. Give each video its own link carrying a hidden tag (`v01` to `v10`, pre-filled in the Demand posts tab) so every signup is attributed to a video.
2. **Post under 10 popular Yorùbá song videos.** A draft in English:

   > Is there anywhere to find the full lyrics of this song in Yorùbá, written properly with the tone marks? I'm building a place where we can add and check them together. If you'd like to help, or hear when it's live: [link]

   Write the Yorùbá version yourself. A comment about correct tone marks can't contain a tone-marking mistake.
3. **Log each post** in the Demand posts tab. YouTube often holds comments that contain links. If yours is held, set `comment_status` to *Held for review*; the report notes that demand was under-counted. Posting the link in a reply to your own comment sometimes gets through.
4. **Record likes and replies daily** in Demand daily.
5. **Paste form responses into Signups:** `signed_up_at`, `link_tag` and `answer` only. **Keep contact details in the form tool.** The workbook doesn't need them, and it shouldn't hold personal data.

The gate from the plan is applied automatically: **50 or more** signups means continue; **20 to 49** means repeat on 10 more videos; **under 20** means lead with the tone-marker and creator captions.

The answers to the form question are free content research: a ranked list of the songs people want. Use it to pick the first 25 opt-in songs in Workstream 4c.

## Reading the report

- **Quote the interval with the number.** For example: "About half of popular Yorùbá songs have lyrics online (50%, 95% CI 43–57%)". A number without its interval invites the first sceptical reply.
- **Check the report's warnings before publishing.** They flag unfinished genres and skipped ranks.
- **The carousel lines are drafts.** Check each against the tables before posting.

## Repeating the audit next year

Rebuild the candidate list with the same rules, sample with the new year as the seed, and keep the method version unless the method changed. If you change a definition, raise the version (1.1 or 2.0) and note it in the report, because year-on-year comparisons across a method change are not like for like.
