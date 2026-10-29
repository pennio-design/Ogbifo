# Closed beta launch checklist

Scope: the Reading Room beta for 30 to 50 people on two Decks (D-026). Ship gates: `OPEN_CONFLICTS.md` #17. Owners: **You**, **Counsel** (Iniabasi), **Teacher**, **Claude**. Costs follow the lean budget. The long pole is people, not code. Updated 2026-10-20.

## Done

- [x] Reading Room, Studio and Live, on-device scoring, recording, results, tester numbers panel
- [x] Reviewer annotation tool, reference provenance rules
- [x] Audio treatment (rumble and noise), pace not forced, 60 s safety cap (D-045)
- [x] Email-link sign-in, Postgres storage, migrations, CI workflow, Codespaces config
- [x] Cards and tone lexicon sheet workflows, dialect-aware (D-043); the hero proverb is real
- [x] No robotic voice in any normal run (it is test-only)
- [x] Draft counsel briefing, reference voice licence, volunteer agreement, recording guide

## Waiting on a decision from you

- [x] Scoring: Tone is now judged against the tone marks, not a recording (D-046). Needs your real readings to check
- [x] No lyrics or song excerpts in the beta (D-047)
- [ ] Email provider: Resend or Brevo
- [ ] Hosting: have me check Netlify's terms and Next.js support, or choose another
- [ ] Entity: company or personal (briefing Q18)

## Your steps, this week

- [ ] Buy the domain (Cloudflare, `ogbifo.com` if free), two-factor and auto-renew on
- [ ] Send Iniabasi the counsel briefing and the two drafts
- [ ] Send the teacher the Cards README and the lexicon README; ask for the dialect list and 20 greetings and 20 proverbs
- [ ] Ask a friend to be the second voice (a different pitch range) and a second reviewer
- [ ] Check that CI is green in GitHub's Actions tab and tell me if it is red
- [ ] **Record your reference** (`docs/RECORDING_A_REFERENCE.md`): the greeting first, then the proverb. Read it yourself and paste me the "Numbers behind this result" panel

## Legal and entity (Counsel). Nothing is collected before this

- [x] Counsel's first informal reaction received (23 Oct): see `COUNSEL_BRIEFING.md` section 11
- [ ] Put the five priority questions (briefing section 12) and ask for scope and fee of a fixed-price beta pack
- [x] No lyrics or song excerpts in the beta (`#29`, D-047)
- [ ] Data controller decided; trademark check on "Ogbifọ"
- [ ] Reference voice licence, volunteer agreement, calibration consent approved
- [ ] Privacy notice and terms of service in plain language
- [ ] NDPC registration decision
- [ ] Withdrawal and deletion contact in place

## Content (You, Teacher, second reviewer)

- [ ] Dialect register filled; Cards named with a dialect
- [ ] About 30 Cards, each reviewed by two named people who speak its dialect; `cards check` and `cards export` pass
- [ ] My seed Cards replaced (none unreviewed ships)

## Voices

- [ ] Your reference and a second voice, signed licences, provenance filled
- [ ] Each reference annotated, then confirmed by a second person
- [ ] Spoken (contracted) forms of the proverb recorded after the full form (`#27`)

## Calibration and scoring (Claude, volunteers, Teacher)

- [ ] Real-speech check on your readings, then a few volunteers, before any retuning (`#26`)
- [ ] 20 or more calibration speakers with signed consent, deletion date, reward kept separate
- [ ] Calibration run against the pass bars; decide whether the score number stays hidden
- [ ] Teacher's first pass over the syllable and tone rules (including "maa" and elision: `#25`)
- [ ] Rhythm in noise watched (`SCORING_SPEC.md` section 16)
- [ ] Phone check on a low-end Android and an iPhone; Safari and Firefox (recording, fonts)

## Platform (You, Claude)

- [ ] Email adapter built once you choose a provider (Claude); DNS records added (You); sign-in verified with a real inbox
- [ ] Hosting and Postgres chosen; environment variables and `migrate` set; Cards and references delivered privately
- [ ] Offline caching of reference audio (D-017, not built)
- [ ] Error logging and database backups (not built)
- [ ] Analytics decided: none for the beta (measure by interview) or a named vendor with a consent banner (D-028)

## Quality

- [ ] Screen reader pass and 200% zoom
- [ ] Results copy: "tones and timing, not words", no "correct" or "authentic"
- [ ] Security look at sign-in (rate-limit address trust, cookie `Secure`)
- [ ] `showResonanceNumber` stays off unless calibration passed

## Launch operations

- [ ] Volunteer call ad: $30 test first, only after the consent wording exists
- [ ] Invitation list, onboarding message, feedback channel, success measures (D-026)
- [ ] Sponsor outreach in parallel (no data rights, D-032)

## Not in this beta

Contribution sync, the Archive and peer confirmation, the tone game and qualification, the leaderboard, live follow-along, contraction understanding beyond listed spoken forms, other languages, cross-device progress.

## Critical path

Your recorded reference, then the scoring decision and a real-speech check; in parallel Counsel and the entity answer, the second voice and reviewers, and the domain and email. Calibration and the beta follow.
