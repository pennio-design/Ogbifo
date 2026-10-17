"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  audioExtension,
  isReferenceLicence,
  parseReferenceFile,
  referenceAudioUrl,
  referenceJsonName,
  REFERENCE_LICENCES,
  validateProvenance,
  type ReferenceFile,
  type ReferenceLicence,
  type ReferenceProvenance,
} from "@ogbifo/domain";
import {
  buildReferenceAnnotation,
  compareWithCardText,
  detectSpeechSpan,
  labelsToSyllables,
  parseAudacityLabels,
  proposeSyllables,
  resampleTo16k,
  syllabify,
  type AnnotatedSyllable,
  type Tone,
} from "@ogbifo/speech";
import { colors, LanguageText } from "@ogbifo/ui";
import type { Region } from "wavesurfer.js/dist/plugins/regions.js";
import type WaveSurfer from "wavesurfer.js";
import type { ReviewerCard } from "@/server/content";

const button = "inline-flex min-h-12 items-center justify-center px-5 font-ui text-sm disabled:opacity-40";
const primary = `${button} bg-ochre font-semibold text-clay hover:brightness-110`;
const secondary = `${button} border border-bone/20 text-bone hover:border-ochre`;
// Language text must use the language face: the UI face mis-stacks tone marks on dot-below letters.
const fieldBase = "min-h-12 w-full border border-bone/20 bg-clay px-3 text-sm text-bone";
const field = `${fieldBase} font-ui`;
const languageField = `${fieldBase} font-language`
const label = "block font-ui text-xs uppercase tracking-wider text-ash";

const LICENCE_LABELS: Record<ReferenceLicence, string> = {
  recorded_for_ogbifo: "Recorded for Ogbifọ, with the speaker's written consent",
  written_permission: "Existing recording, written permission from the rights holder",
  cc_by: "Published under CC BY (attribution required)",
  cc0: "Published under CC0",
  synthetic_test: "Synthetic test (development only)",
};
const OFFERED_LICENCES = REFERENCE_LICENCES.filter((l) => l !== "synthetic_test");
const TONES: Tone[] = ["H", "M", "L"];

async function decode(file: File): Promise<{ samples: Float32Array; durationMs: number }> {
  const context = new AudioContext();
  try {
    const audio = await context.decodeAudioData(await file.arrayBuffer());
    const mono = new Float32Array(audio.length);
    for (let c = 0; c < audio.numberOfChannels; c += 1) {
      const channel = audio.getChannelData(c);
      for (let i = 0; i < mono.length; i += 1) mono[i] = mono[i]! + channel[i]! / audio.numberOfChannels;
    }
    return { samples: resampleTo16k(mono, audio.sampleRate), durationMs: audio.duration * 1000 };
  } finally {
    void context.close();
  }
}

export function AnnotationTool({ cards }: { cards: ReviewerCard[] }) {
  const [cardId, setCardId] = useState(cards[0]?.id ?? "");
  const card = cards.find((c) => c.id === cardId);
  const proposal = useMemo(() => (card ? syllabify(card.sourceText).syllables : []), [card]);

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [samples, setSamples] = useState<Float32Array | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [syllables, setSyllables] = useState<AnnotatedSyllable[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [labelNote, setLabelNote] = useState<string | null>(null);

  const [source, setSource] = useState("");
  const [licence, setLicence] = useState<ReferenceLicence>("recorded_for_ogbifo");
  const [rightsHolder, setRightsHolder] = useState("");
  const [speakerConsent, setSpeakerConsent] = useState(false);
  const [recordedOn, setRecordedOn] = useState("");
  const [attribution, setAttribution] = useState("");
  const [result, setResult] = useState<{ jsonUrl: string; jsonName: string; audioName: string; summary: string[] } | null>(null);

  const waveform = useRef<HTMLDivElement>(null);
  const surfer = useRef<WaveSurfer | null>(null);
  const regionMap = useRef<Map<number, Region>>(new Map());
  const syncing = useRef(false);

  // Decode the chosen file and make a first guess at the syllable boundaries.
  const choose = useCallback(
    async (chosen: File | null) => {
      setResult(null);
      setMessage(null);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      setSamples(null);
      setFile(chosen);
      if (!chosen) return;
      if (!audioExtension(chosen.name)) {
        setMessage("That file type isn't supported. Use WAV, MP3, M4A, OGG, WebM or FLAC.");
        return;
      }
      try {
        const decoded = await decode(chosen);
        const span = detectSpeechSpan(decoded.samples);
        if (!span) {
          setMessage("We couldn't find any speech in that recording. Check the file and try again.");
          return;
        }
        setSamples(decoded.samples);
        setDurationMs(decoded.durationMs);
        setAudioUrl(URL.createObjectURL(chosen));
        if (proposal.length >= 2) setSyllables(proposeSyllables(span, proposal));
      } catch {
        setMessage("We couldn't read that audio file. Try exporting it again as WAV.");
      }
    },
    [audioUrl, proposal],
  );

  // A different Card means different syllables; start again from a fresh proposal.
  const changeCard = (id: string) => {
    setCardId(id);
    setResult(null);
    setLabelNote(null);
    const next = cards.find((c) => c.id === id);
    const parts = next ? syllabify(next.sourceText).syllables : [];
    const span = samples ? detectSpeechSpan(samples) : null;
    setSyllables(span && parts.length >= 2 ? proposeSyllables(span, parts) : []);
  };

  // Draw the waveform with draggable regions (wavesurfer.js, BSD-3-Clause).
  const structure = syllables.length;
  useEffect(() => {
    if (!audioUrl || !waveform.current) return;
    let cancelled = false;
    let instance: WaveSurfer | undefined;
    const regionsByIndex = regionMap.current;
    void (async () => {
      const [{ default: WaveSurferClass }, { default: RegionsPlugin }] = await Promise.all([
        import("wavesurfer.js"),
        import("wavesurfer.js/dist/plugins/regions.js"),
      ]);
      if (cancelled || !waveform.current) return;
      const regions = RegionsPlugin.create();
      instance = WaveSurferClass.create({
        container: waveform.current,
        height: 120,
        waveColor: colors.ash,
        progressColor: colors.ochre,
        cursorColor: colors.bone,
        normalize: true,
        plugins: [regions],
        url: audioUrl,
      });
      surfer.current = instance;
      instance.on("decode", () => {
        regionMap.current.clear();
        syllables.forEach((s, i) => {
          const labelElement = document.createElement("span");
          labelElement.textContent = s.text.normalize("NFC");
          labelElement.style.fontFamily = '"Noto Serif", Georgia, serif';
          labelElement.style.fontSize = "14px";
          labelElement.style.display = "inline-block";
          labelElement.style.lineHeight = "1.7";
          labelElement.style.paddingTop = "6px";
          const region = regions.addRegion({
            start: s.startMs / 1000,
            end: s.endMs / 1000,
            content: labelElement,
            drag: true,
            resize: true,
            color: i % 2 === 0 ? "rgba(212,155,65,0.28)" : "rgba(250,249,246,0.16)",
          });
          regionMap.current.set(i, region);
        });
      });
      regions.on("region-updated", (region: Region) => {
        if (syncing.current) return;
        const index = [...regionMap.current.entries()].find(([, r]) => r === region)?.[0];
        if (index === undefined) return;
        setSyllables((current) =>
          current.map((s, i) => (i === index ? { ...s, startMs: Math.round(region.start * 1000), endMs: Math.round(region.end * 1000) } : s)),
        );
      });
    })();
    return () => {
      cancelled = true;
      instance?.destroy();
      surfer.current = null;
      regionsByIndex.clear();
    };
    // Rebuild only when the recording, the Card or the number of syllables changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioUrl, structure, cardId]);

  // Table edits move the regions.
  useEffect(() => {
    syncing.current = true;
    syllables.forEach((s, i) => {
      const region = regionMap.current.get(i);
      if (region && (Math.abs(region.start * 1000 - s.startMs) > 1 || Math.abs(region.end * 1000 - s.endMs) > 1)) {
        region.setOptions({ start: s.startMs / 1000, end: s.endMs / 1000 });
      }
    });
    syncing.current = false;
  }, [syllables]);

  const update = (index: number, patch: Partial<AnnotatedSyllable>) =>
    setSyllables((current) => current.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  const editText = (index: number, text: string) => {
    const parsed = syllabify(text).syllables;
    update(index, parsed.length === 1 ? { text, tone: parsed[0]!.tone } : { text });
  };

  const addSyllable = () =>
    setSyllables((current) => {
      const last = current[current.length - 1];
      const start = last ? last.endMs : 0;
      return [...current, { text: "", tone: "M", startMs: start, endMs: Math.min(start + 200, Math.round(durationMs)) }];
    });

  const importLabels = async (labelFile: File | null) => {
    setLabelNote(null);
    if (!labelFile) return;
    const parsed = parseAudacityLabels(await labelFile.text());
    if (!parsed.ok) return setLabelNote(parsed.error.message);
    const converted = labelsToSyllables(parsed.value);
    if (!converted.ok) return setLabelNote(converted.error.message);
    setSyllables(converted.value);
    const match = card ? compareWithCardText(card.sourceText, converted.value) : null;
    setLabelNote(
      match && !match.matches
        ? `Imported ${converted.value.length} labels. They differ from the proposed syllables (${match.expected.join(" · ")}). That is allowed: you are confirming or correcting the proposal.`
        : `Imported ${converted.value.length} labels.`,
    );
  };

  const provenance: ReferenceProvenance = {
    source,
    licence,
    rightsHolder,
    speakerConsent,
    recordedOn,
    ...(attribution.trim() ? { attribution: attribution.trim() } : {}),
  };
  const provenanceCheck = validateProvenance(provenance, { reviewed: false });
  const proposalMatch = card && syllables.length > 0 ? compareWithCardText(card.sourceText, syllables) : null;

  const save = () => {
    setMessage(null);
    setResult(null);
    if (!card || !file || !samples) return setMessage("Choose a Card and a recording first.");
    const ext = audioExtension(file.name);
    if (!ext) return setMessage("That file type isn't supported.");
    if (!provenanceCheck.ok) return setMessage(provenanceCheck.error.message);
    const built = buildReferenceAnnotation({ samples, syllables });
    if (!built.ok) return setMessage(built.error.message);

    const reference: ReferenceFile = {
      cardId: card.id,
      audioUrl: referenceAudioUrl(card.id, ext),
      annotation: built.value,
      provenance: provenanceCheck.value,
    };
    const roundTrip = parseReferenceFile(JSON.parse(JSON.stringify(reference)));
    if (!roundTrip.ok) return setMessage(roundTrip.error.message);

    const voicedShare = (() => {
      const hz = built.value.contourHz;
      let voiced = 0;
      let total = 0;
      for (const s of built.value.syllables) {
        for (let f = Math.round(s.startMs / 10); f < Math.round(s.endMs / 10); f += 1) {
          total += 1;
          if (hz[f] !== null && hz[f] !== undefined) voiced += 1;
        }
      }
      return total === 0 ? 0 : voiced / total;
    })();
    const summary = [
      `${built.value.syllables.length} syllables over ${(built.value.durationMs / 1000).toFixed(1)} seconds.`,
      `Pitch found in ${Math.round(voicedShare * 100)} percent of the syllable frames.`,
    ];
    if (voicedShare < 0.6) summary.push("That is low. Check for background noise or music, or record a cleaner take.");
    const blob = new Blob([JSON.stringify(reference)], { type: "application/json" });
    setResult({ jsonUrl: URL.createObjectURL(blob), jsonName: referenceJsonName(card.id), audioName: `${card.id}.${ext}`, summary });
  };

  return (
    <div>
      <p className="font-ui text-xs uppercase tracking-[0.3em] text-ochre">Reviewer tool</p>
      <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight">Annotate a reference recording</h1>
      <p className="mt-4 max-w-prose font-body text-ash">
        Mark where each syllable of the Card starts and ends in the native reference. Learners are scored against this,
        so take your time. Nothing is uploaded: the files you download are placed in the app by hand.
      </p>

      <section className="mt-10 grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="card" className={label}>Card</label>
          <select id="card" className={languageField} value={cardId} onChange={(e) => changeCard(e.target.value)}>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>{c.deckName}: {c.sourceText.split("\n")[0]}</option>
            ))}
          </select>
          {card ? (
            <p className="mt-3 font-body text-sm text-ash">
              Proposed syllables:{" "}
              <LanguageText lang={card.languageCode} text={proposal.map((s) => `${s.text}·${s.tone}`).join("  ")} className="text-bone" />
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="audio" className={label}>Reference recording</label>
          <input id="audio" type="file" accept="audio/*" className={field} onChange={(e) => void choose(e.target.files?.[0] ?? null)} />
          <p className="mt-3 font-body text-xs text-ash">One Card per file, one clean speaker, no music, natural speed.</p>
        </div>
      </section>

      {message ? <p role="alert" className="mt-6 border border-ochre/40 px-4 py-3 font-body text-sm text-bone">{message}</p> : null}

      {audioUrl ? (
        <section className="mt-10" aria-label="Syllable boundaries">
          <h2 className="font-serif text-2xl font-semibold">Syllable boundaries</h2>
          <div
            ref={waveform}
            role="img"
            aria-label="Waveform of the recording with one shaded region per syllable. Use the table below to set the boundaries with the keyboard."
            className="mt-4 border border-bone/10 bg-card"
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className={secondary} onClick={() => void surfer.current?.playPause()}>Play or pause</button>
            <label className={`${secondary} cursor-pointer`}>
              Import Audacity labels
              <input type="file" accept=".txt,text/plain" className="sr-only" onChange={(e) => void importLabels(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          {labelNote ? <p role="status" className="mt-3 max-w-prose font-body text-sm text-bone">{labelNote}</p> : null}
          {proposalMatch && !proposalMatch.matches && !labelNote ? (
            <p className="mt-3 max-w-prose font-body text-sm text-ash">
              Your syllables differ from the proposal ({proposalMatch.expected.join(" · ")}). That is allowed when you are correcting it.
            </p>
          ) : null}

          <table className="mt-6 w-full border-collapse text-left font-ui text-sm">
            <caption className="sr-only">Syllables with text, tone, start and end in milliseconds</caption>
            <thead>
              <tr className="text-xs uppercase tracking-wider text-ash">
                <th scope="col" className="py-2 pr-2">#</th>
                <th scope="col" className="pr-2">Syllable</th>
                <th scope="col" className="pr-2">Tone</th>
                <th scope="col" className="pr-2">Start (ms)</th>
                <th scope="col" className="pr-2">End (ms)</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {syllables.map((s, i) => (
                <tr key={i} className="border-t border-bone/10">
                  <td className="py-2 pr-2 text-ash">{i + 1}</td>
                  <td className="pr-2">
                    <input aria-label={`Syllable ${i + 1} text`} className={`${languageField} w-24`} lang={card?.languageCode} value={s.text} onChange={(e) => editText(i, e.target.value)} />
                  </td>
                  <td className="pr-2">
                    <select aria-label={`Syllable ${i + 1} tone`} className={`${field} w-20`} value={s.tone} onChange={(e) => update(i, { tone: e.target.value as Tone })}>
                      {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="pr-2">
                    <input aria-label={`Syllable ${i + 1} start in milliseconds`} type="number" min={0} step={10} className={`${field} w-28`} value={s.startMs} onChange={(e) => update(i, { startMs: Number(e.target.value) })} />
                  </td>
                  <td className="pr-2">
                    <input aria-label={`Syllable ${i + 1} end in milliseconds`} type="number" min={0} step={10} className={`${field} w-28`} value={s.endMs} onChange={(e) => update(i, { endMs: Number(e.target.value) })} />
                  </td>
                  <td className="space-x-2 whitespace-nowrap">
                    <button type="button" className={secondary} onClick={() => regionMap.current.get(i)?.play()}>Play</button>
                    <button type="button" className={secondary} onClick={() => setSyllables((c) => c.filter((_, k) => k !== i))}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className={`${secondary} mt-3`} onClick={addSyllable}>Add a syllable</button>
        </section>
      ) : null}

      <section className="mt-12" aria-label="Where the recording came from">
        <h2 className="font-serif text-2xl font-semibold">Where it came from</h2>
        <p className="mt-2 max-w-prose font-body text-sm text-ash">
          Every reference needs a record of its source and licence. Nothing found online is used without one of these.
        </p>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="licence" className={label}>Licence</label>
            <select id="licence" className={field} value={licence} onChange={(e) => isReferenceLicence(e.target.value) && setLicence(e.target.value)}>
              {OFFERED_LICENCES.map((l) => <option key={l} value={l}>{LICENCE_LABELS[l]}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="source" className={label}>Source</label>
            <input id="source" className={field} value={source} onChange={(e) => setSource(e.target.value)} placeholder="Studio session, 1 November 2026" />
          </div>
          <div>
            <label htmlFor="holder" className={label}>Rights holder</label>
            <input id="holder" className={field} value={rightsHolder} onChange={(e) => setRightsHolder(e.target.value)} />
          </div>
          <div>
            <label htmlFor="date" className={label}>Date recorded or permission given</label>
            <input id="date" type="date" className={field} value={recordedOn} onChange={(e) => setRecordedOn(e.target.value)} />
          </div>
          {licence === "cc_by" ? (
            <div className="sm:col-span-2">
              <label htmlFor="attribution" className={label}>Attribution text (shown wherever the audio plays)</label>
              <input id="attribution" className={field} value={attribution} onChange={(e) => setAttribution(e.target.value)} />
            </div>
          ) : null}
          <label className="flex items-center gap-3 font-body text-sm text-bone sm:col-span-2">
            <input type="checkbox" className="h-5 w-5" checked={speakerConsent} onChange={(e) => setSpeakerConsent(e.target.checked)} />
            The speaker has agreed in writing to this use of their voice.
          </label>
        </div>
        {!provenanceCheck.ok ? <p className="mt-4 font-body text-sm text-ash">To save: {provenanceCheck.error.message}</p> : null}
      </section>

      <div className="mt-10">
        <button type="button" className={primary} disabled={!samples || syllables.length < 2} onClick={save}>Check and prepare files</button>
      </div>

      {result ? (
        <section className="mt-8 border border-bone/10 p-6" aria-label="Files to place in the app" data-testid="save-result">
          <h2 className="font-serif text-2xl font-semibold">Ready</h2>
          <ul className="mt-3 list-disc pl-5 font-body text-sm text-bone">
            {result.summary.map((line) => <li key={line}>{line}</li>)}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <a className={primary} href={result.jsonUrl} download={result.jsonName}>Download {result.jsonName}</a>
            <a className={secondary} href={audioUrl ?? "#"} download={result.audioName}>Download {result.audioName}</a>
          </div>
          <p className="mt-6 max-w-prose font-body text-sm text-ash">
            Put <code className="text-bone">{result.jsonName}</code> in <code className="text-bone">apps/web/content/references/</code> and{" "}
            <code className="text-bone">{result.audioName}</code> in <code className="text-bone">apps/web/public/references/</code>, then restart the app.
            A Card still needs its two named reviewers before learners can see it.
          </p>
        </section>
      ) : null}
    </div>
  );
}
