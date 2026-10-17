"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  CONSENT_COPY,
  CONSENT_IS_DRAFT,
  CONSENT_VERSION,
  CONTRIBUTION_KINDS,
  ContributionService,
  disabledTransport,
  guardTransport,
  RIGHTS_DECLARATIONS,
  verificationLabel,
  type ContributionKind,
  type ContributionView,
  type DomainError,
  type RightsDeclaration,
  type SyncState,
} from "@ogbifo/domain";
import { EmptyState, LanguageText } from "@ogbifo/ui";
import { IndexedDbArchiveStore } from "@/lib/indexeddb-archive-store";

const KIND_LABEL: Record<ContributionKind, string> = { phrase: "Phrase", proverb: "Proverb", greeting: "Greeting", lyric: "Lyric" };

const SYNC_COPY: Record<SyncState, string> = {
  queued: "Saved on this device. It will join the archive queue when sync opens.",
  syncing: "Sending to the archive queue.",
  synced: "Saved to the archive queue.",
  retrying: "Still waiting to sync. Your contribution is safe on this device.",
  failed: "Still waiting to sync. Your contribution is safe on this device.",
};

const button = "inline-flex min-h-12 items-center justify-center px-5 font-ui text-sm disabled:opacity-40";
const primary = `${button} bg-ochre font-semibold text-clay hover:brightness-110`;
const secondary = `${button} border border-bone/20 text-bone hover:border-ochre`;
const fieldBase = "min-h-12 w-full border border-bone/20 bg-clay px-3 text-sm text-bone";
const field = `${fieldBase} font-ui`;
const languageField = `${fieldBase} font-language py-3`;
const label = "block font-ui text-xs uppercase tracking-wider text-ash";

export function Contribute() {
  const service = useMemo(
    () =>
      new ContributionService({
        store: new IndexedDbArchiveStore(),
        now: () => new Date(),
        newId: () => crypto.randomUUID(),
      }),
    [],
  );
  const [items, setItems] = useState<readonly ContributionView[] | null>(null);
  const [storeError, setStoreError] = useState(false);
  const [online, setOnline] = useState(true);
  const [saved, setSaved] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setItems(await service.list());
      setStoreError(false);
    } catch {
      setStoreError(true);
      setItems([]);
    }
  }, [service]);

  useEffect(() => {
    // Sync is closed while the consent wording is a draft; guardTransport enforces it.
    const trySync = () => void service.sync(guardTransport(disabledTransport)).then(refresh, refresh);
    void trySync();
    const update = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) trySync();
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [service, refresh]);

  return (
    <>
      {!online ? (
        <p role="status" className="mt-8 border border-ochre/40 px-4 py-3 font-ui text-sm text-ochre">
          Offline. Your archive contributions are saved and will sync automatically.
        </p>
      ) : null}
      {storeError ? (
        <p role="alert" className="mt-8 border border-ochre/40 px-4 py-3 font-ui text-sm text-ochre">
          This browser would not let us save on your device (private browsing can do this). Nothing can be added right now.
        </p>
      ) : null}

      <ContributeForm
        service={service}
        disabled={storeError}
        onSaved={async () => {
          await refresh();
          setSaved(true);
        }}
        onEdit={() => setSaved(false)}
      />
      {saved ? (
        <p role="status" className="mt-4 font-ui text-sm text-ochre">
          Added. It is saved on this device and waiting for community review.
        </p>
      ) : null}

      <section aria-labelledby="mine" className="mt-16">
        <h2 id="mine" className="font-serif text-2xl font-semibold">Your contributions</h2>
        {items === null ? (
          <p role="status" className="mt-6 font-ui text-sm text-ash">Opening your archive…</p>
        ) : items.length === 0 ? (
          <EmptyState title="Nothing added yet">
            A phrase, a proverb or a greeting from your own speech is a good first expression.
          </EmptyState>
        ) : (
          <ul className="mt-6 divide-y divide-bone/10 border-y border-bone/10">
            {items.map(({ contribution: c, sync }) => (
              <li key={c.clientId} className="py-6">
                <LanguageText as="p" lang="yo" text={c.contentText} className="whitespace-pre-wrap text-xl leading-relaxed" />
                <p className="mt-2 font-ui text-sm text-ash">
                  {KIND_LABEL[c.kind]}
                  {c.dialect ? <> · <LanguageText lang="yo" text={c.dialect} /></> : null}
                  {c.contextTags.length > 0 ? ` · ${c.contextTags.join(", ")}` : ""}
                </p>
                <p className="mt-2 font-ui text-sm text-bone">{verificationLabel(c.verification)}</p>
                <p className="mt-1 font-ui text-sm text-ash">{SYNC_COPY[sync]}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {sync === "failed" ? (
                    <button type="button" className={secondary} onClick={() => void service.retry(c.clientId).then(refresh)}>
                      Try again
                    </button>
                  ) : null}
                  {confirming === c.clientId ? (
                    <>
                      <span className="inline-flex items-center font-ui text-sm text-bone">
                        Withdraw this? It will disappear from view.
                      </span>
                      <button
                        type="button"
                        className={primary}
                        onClick={() => void service.withdraw(c.clientId).then(refresh).then(() => setConfirming(null))}
                      >
                        Withdraw
                      </button>
                      <button type="button" className={secondary} onClick={() => setConfirming(null)}>Keep it</button>
                    </>
                  ) : (
                    <button type="button" className={secondary} onClick={() => setConfirming(c.clientId)}>
                      Withdraw
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function ContributeForm({
  service,
  disabled,
  onSaved,
  onEdit,
}: {
  service: ContributionService;
  disabled: boolean;
  onSaved: () => Promise<void>;
  onEdit: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<ContributionKind>("phrase");
  const [rights, setRights] = useState<RightsDeclaration | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DomainError | null>(null);

  const noteRequired = kind === "lyric" || (rights !== null && rights !== "own_work");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "");
    setBusy(true);
    setError(null);
    try {
      const result = await service.submit({
        userId: null,
        kind,
        languageId: "yo",
        dialect: text("dialect"),
        contentText: text("contentText"),
        contextTags: text("tags").split(","),
        consent: agreed ? { version: CONSENT_VERSION, acceptedAt: new Date().toISOString() } : null,
        rightsDeclaration: rights,
        rightsNote: text("rightsNote"),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setKind("phrase");
      setRights(null);
      setAgreed(false);
      await onSaved();
    } catch {
      setError({ code: "LOCAL_SAVE_FAILED", message: "We could not save this on your device. Try again." });
    } finally {
      setBusy(false);
    }
  }

  const fieldError = (name: string) => (error?.field === name ? error.message : null);

  return (
    <form ref={formRef} onSubmit={submit} onChange={onEdit} className="mt-10 grid max-w-2xl gap-6" noValidate>
      <div>
        <label htmlFor="kind" className={label}>What are you adding?</label>
        <select id="kind" className={`${field} mt-2`} value={kind} onChange={(e) => setKind(e.target.value as ContributionKind)}>
          {CONTRIBUTION_KINDS.map((k) => (
            <option key={k} value={k}>{KIND_LABEL[k]}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="contentText" className={label}>In Yorùbá</label>
        <textarea
          id="contentText"
          name="contentText"
          lang="yo"
          rows={4}
          spellCheck={false}
          className={`${languageField} mt-2`}
          aria-invalid={fieldError("contentText") ? true : undefined}
          aria-describedby="contentText-help"
        />
        <p id="contentText-help" className="mt-1 font-ui text-xs text-ash">
          Write it as you would say it, with tone marks and dot-below letters if you use them. We keep it exactly as you wrote it.
        </p>
        {fieldError("contentText") ? <p role="alert" className="mt-1 font-ui text-sm text-ochre">{fieldError("contentText")}</p> : null}
      </div>

      <div>
        <label htmlFor="dialect" className={label}>Dialect or town (optional)</label>
        <input id="dialect" name="dialect" lang="yo" className={`${languageField} mt-2`} autoComplete="off" />
        {fieldError("dialect") ? <p role="alert" className="mt-1 font-ui text-sm text-ochre">{fieldError("dialect")}</p> : null}
      </div>

      <div>
        <label htmlFor="tags" className={label}>Context (optional, separate with commas)</label>
        <input id="tags" name="tags" className={`${field} mt-2`} autoComplete="off" placeholder="market, greeting an elder" />
        {fieldError("contextTags") ? <p role="alert" className="mt-1 font-ui text-sm text-ochre">{fieldError("contextTags")}</p> : null}
      </div>

      <fieldset>
        <legend className={label}>{CONSENT_COPY.rightsLabel}</legend>
        {kind === "lyric" ? <p className="mt-2 font-ui text-sm text-ochre">{CONSENT_COPY.lyricsNotice}</p> : null}
        <div className="mt-2 grid gap-1">
          {RIGHTS_DECLARATIONS.map((value) => (
            <label key={value} className="flex min-h-12 items-center gap-3 font-body text-sm text-bone">
              <input type="radio" name="rights" value={value} checked={rights === value} onChange={() => setRights(value)} className="size-5 accent-ochre" />
              {CONSENT_COPY.rights[value]}
            </label>
          ))}
        </div>
        {fieldError("rightsDeclaration") ? <p role="alert" className="mt-1 font-ui text-sm text-ochre">{fieldError("rightsDeclaration")}</p> : null}
        {noteRequired || rights !== null ? (
          <div className="mt-4">
            <label htmlFor="rightsNote" className={label}>
              {rights === null ? "Source or rights holder" : CONSENT_COPY.rightsNoteLabel[rights]}
            </label>
            <input id="rightsNote" name="rightsNote" className={`${field} mt-2`} autoComplete="off" />
            {fieldError("rightsNote") ? <p role="alert" className="mt-1 font-ui text-sm text-ochre">{fieldError("rightsNote")}</p> : null}
          </div>
        ) : null}
      </fieldset>

      <section aria-labelledby="consent-title" className="border border-bone/10 p-5">
        {CONSENT_IS_DRAFT ? (
          <p className="font-ui text-xs uppercase tracking-wider text-ochre">Draft · {CONSENT_VERSION}</p>
        ) : null}
        <h2 id="consent-title" className="mt-2 font-serif text-xl font-semibold">{CONSENT_COPY.title}</h2>
        {CONSENT_IS_DRAFT ? <p className="mt-2 font-ui text-sm text-ochre">{CONSENT_COPY.draftNotice}</p> : null}
        <ul className="mt-4 grid list-disc gap-2 pl-5 font-body text-sm leading-relaxed text-bone">
          {CONSENT_COPY.points.map((point) => <li key={point}>{point}</li>)}
        </ul>
        <label className="mt-4 flex min-h-12 items-center gap-3 font-body text-sm text-bone">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="size-5 accent-ochre" />
          {CONSENT_COPY.acceptLabel}
        </label>
        {fieldError("consent") ? <p role="alert" className="mt-1 font-ui text-sm text-ochre">{fieldError("consent")}</p> : null}
      </section>

      {error && !error.field ? <p role="alert" className="font-ui text-sm text-ochre">{error.message}</p> : null}

      <div>
        <button type="submit" className={primary} disabled={busy || disabled}>
          {busy ? "Saving…" : "Add to the archive"}
        </button>
      </div>
    </form>
  );
}
