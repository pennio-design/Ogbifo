# Reference Voice Licence — DRAFT

**DRAFT for counsel. Not legal advice. Not reviewed by a lawyer. Not in use.** Prepared by an AI assistant from the product decisions (D-002, D-019, D-020, D-034). Iniabasi (or other counsel) should rewrite or discard any part of it. Square brackets are blanks. Nothing here is signed or binding until counsel has approved the final wording and both sides have signed.

One form is used for every reference voice, including the project owner's own recordings (a record that the owner also gave consent in writing is the point: D-034 route 1 needs a written licence from the speaker, whoever the speaker is).

---

## 1. Who

- **Speaker** ("I"): [full name], [city, country], aged 18 or over.
- **Ogbifọ** ("the Project"): the Yorùbá reading and archive project run by [owner's full name], and **any company or organisation that takes over running it** (the "Successor"). I agree in advance that the Project may assign this licence to a Successor that continues the Project, on the same terms, and will tell me when it does.

## 2. What I am recording

I will record the Yorùbá phrases listed in Schedule A. My dialect and region are: [dialect, town/region]. I understand the recordings, and my pitch and rhythm measured from them, will be used as the **reference** that learners' readings are compared with.

## 3. What I keep, what I give

- I **keep ownership** of the recordings and of my voice. I am not selling or transferring them.
- I give the Project a **non-exclusive, worldwide licence**, for as long as it runs and until I withdraw it (section 6), to:
  1. store the recordings and their measurements (syllable boundaries, pitch contour);
  2. play them to learners in the Ogbifọ Reading Room and use them to give learners feedback on tones and timing; and
  3. keep copies on learners' devices so Decks work offline.
- The licence covers **Ogbifọ only**. The Project will not license, sell, give or share the recordings with anyone else.

## 4. What the Project will not do

(These go beyond the minimum. Counsel should confirm each one is workable.)

- No dataset: the recordings will not be sold, licensed, exported or offered as data (Product decision D-002).
- No voice cloning: the recordings will not be used to create a synthetic or cloned voice, or to make speech that sounds like me.
- Improving tone detection (speaker's choice): [ ] I allow the Project to use my recordings, and measurements taken from them, to test and tune Ogbifọ's tone detection (never to produce or imitate a voice). [ ] I do not allow this.
- No other use: no advertising, no film, music or third-party products, without my new written consent.
- No misrepresenting me: my recordings will not be edited to make me say anything I did not say. Trimming silence and normalising volume is allowed.

## 5. Credit

[ ] Credit me by name on each Card I voice: [name as I want it shown].
[ ] Credit me only as "a native speaker from [region]".
[ ] Do not credit me.

## 6. Withdrawing

I can withdraw this licence at any time by writing to [contact]. The Project will, within [30] days, stop using the recordings in new releases and delete them from its servers and backups on its normal schedule of [period]. Copies already saved on learners' devices may remain until those devices next update. Withdrawal does not undo use that happened before it.

## 7. My information

The Project holds my name, contact details, the recordings and this signed licence. It uses them only for this licence and for keeping a record of where each recording came from. They are kept [for the life of the Project plus [period]]. I can ask to see or correct my information, and to have it deleted, by writing to [contact]. My voice is personal data; the Project relies on my consent for it.

## 8. Money

[ ] I am doing this without payment.
[ ] I will be paid [amount] for my time. The payment is for the recording session. It is not a condition of this licence being valid and does not buy ownership of the recordings.

## 9. Promises I make

- The phrases are not song lyrics or other copyrighted text, or Schedule A says who holds the rights and I have their permission.
- I am the only speaker in the recordings, and nobody else's voice or music is in the background.
- I understand this document and have had the chance to ask questions or get advice.

## 10. Law

[Governing law and place for disputes: counsel to set.]

Signed: ______________________  Date: ____________  (Speaker)
Signed: ______________________  Date: ____________  (for the Project)

---

## Schedule A — phrases

[List each Card id and its Yorùbá text exactly as it will appear, with tone marks.]

## Schedule B — the provenance record this produces

Copy into the reference file for each Card (`validateProvenance` rejects a recording made for Ogbifọ without it):

```json
{
  "source": "Recorded for Ogbifọ, session [id]",
  "licence": "recorded_for_ogbifo",
  "rightsHolder": "[Speaker's full name]",
  "speakerConsent": true,
  "recordedOn": "[YYYY-MM-DD]"
}
```

Keep the signed licence somewhere private (never in this repository, which is public).

---

### Notes for counsel

1. Is a licence from an individual to "the Project and its Successor" enough while no company exists, or should the licensee be the owner personally until incorporation, with assignment on incorporation?
2. Does the no-cloning and no-dataset wording suit a product that also stores a Card's reference pitch contour? The contour is derived data, not audio. Is the separate tick-box for tuning tone detection the right way to ask for that use (D-042)?
3. How should withdrawal treat copies cached on learners' devices (offline Decks)?
4. Minimum age and a parent's consent for speakers under 18: the form says 18 or over; no minors are planned.
5. Is the self-licence by the project owner worth anything legally, or is it only a record? We want it as a record that the owner consented in writing.
