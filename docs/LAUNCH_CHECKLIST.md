# Closed beta launch checklist

Scope: the Reading Room beta for 30 to 50 people on two Decks (D-026). Contributions, the tone game, the leaderboard and live follow-along are **not** in this beta (see the end). Ship gates come from `OPEN_CONFLICTS.md` #17. Owners: **You** (owner), **Counsel** (Iniabasi), **Teacher**, **Claude** (engineering). Costs follow the lean budget (about $550 to $900). Dates are not set: the long pole is people, not code.

## Already done

- [x] Reading Room, Studio and Live, on-device scoring, recording, results screen
- [x] Reviewer annotation tool, reference provenance rules
- [x] Email-link sign-in, Postgres storage, migrations, CI workflow, Codespaces preview
- [x] Cards and tone lexicon sheet workflows, dialect-aware (D-043)
- [x] Draft counsel briefing, reference voice licence, volunteer agreement

## 1. Legal and entity (Counsel, You). Nothing is recorded before this

- [ ] Decide who is the data controller: company or you personally (briefing Q18)
- [ ] Trademark check on "Ogbifọ" (Nigerian register)
- [ ] Counsel reviews: reference voice licence, volunteer agreement, calibration consent
- [ ] Privacy notice and terms of service, in plain language
- [ ] Decide whether NDPC registration applies (₦10,000 to ₦100,000 if so)
- [ ] Withdrawal and deletion contact set up (an email address you read)

## 2. Content (You, Teacher, a second reviewer)

- [ ] Teacher supplies the dialect list for `dialects.json`
- [ ] A second fluent speaker named, so every Card has two reviewers
- [ ] About 30 Cards written (greetings for Common Tongue, proverbs for Proverb House), tone-marked, with translation and context
- [ ] Every Card reviewed by two named people who speak its dialect; `cards check` passes; `cards export` done
- [ ] My seed Cards confirmed replaced: none ships unreviewed

## 3. Voices (You, second voice, Teacher)

- [ ] Your reference voice and a second voice with a different pitch range (a woman), recorded on the same Cards
- [ ] Both licences signed (`recorded_for_ogbifo`, provenance filled), stored privately
- [ ] Reference audio uploaded and annotated with the reviewer tool; a second person confirms each annotation
- [ ] Real-speech test: run the pipeline on a sample of Common Voice Yoruba (CC0) and fix what breaks (Claude)

## 4. Calibration and scoring (You, volunteers, Teacher)

- [ ] 20 or more calibration speakers recruited, each with signed consent, a stated purpose, a storage place and a deletion date; reward separate from consent
- [ ] Calibration run against the pass bars (`SCORING_SPEC.md` section 10); decide whether the number stays hidden
- [ ] Teacher's first pass over the syllable and tone rules (a phonologist later)
- [ ] Phone check on a low-end Android and an iPhone: speed under 2 seconds, microphone settings (#19)
- [ ] Safari and Firefox checked: recording, fonts with tone marks (#11, #19)

## 5. Platform (You, Claude)

- [ ] Domain bought (Cloudflare or Porkbun), two-factor and auto-renew on
- [ ] Email provider chosen and DNS records added; sign-in verified with a real inbox (Claude builds the adapter)
- [ ] Hosting chosen (check Netlify's terms and Next.js support first); environment variables and the `migrate` step set
- [ ] Postgres created (for example Neon); the Cards export delivered to the server privately
- [ ] CI green on GitHub; a Codespaces preview tried on a phone
- [ ] Offline: reference audio cached for offline Decks (D-017, not built)
- [ ] Error logging and database backups (not built)
- [ ] Analytics: decide whether the beta has any (D-028 needs a consent banner and a named vendor), or measure by interview and a short survey (D-026 week-2 and week-4 return needs data)

## 6. Quality (You, Claude)

- [ ] Accessibility: a screen reader pass and 200% zoom (`ACCESSIBILITY.md`)
- [ ] Results copy says "tones and timing, not words"; no "correct" or "authentic" claims anywhere
- [ ] Security look at sign-in: rate-limit address trust, cookie `Secure` on
- [ ] `showResonanceNumber` off unless calibration passed

## 7. Launch operations (You)

- [ ] Volunteer call ad: test $30 first, only after consent wording exists
- [ ] Invitation list of 30 to 50, an onboarding message, a feedback channel
- [ ] Success measures chosen (Deck completion, week-2 and week-4 return)
- [ ] Sponsor outreach started, in parallel (no data rights: D-032)

## Not in this beta

Contribution sync, the Archive and peer confirmation, the tone lexicon game and qualification, the leaderboard, live follow-along, languages other than Yorùbá, an account for progress across devices.

## Critical path

Counsel and the entity answer → voices recorded → annotated and confirmed → calibration → beta. The people items (second voice, two reviewers, 20 speakers, Iniabasi's time) decide the date. Engineering can finish its list while they wait.
