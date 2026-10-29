"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; devLink?: string }
  | { kind: "error"; message: string };

export function SignInForm() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const linkProblem = useSearchParams().get("problem") === "link";
  const [state, setState] = useState<State>({ kind: "idle" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "");
    setState({ kind: "sending" });
    try {
      const response = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await response.json()) as { sent?: boolean; devLink?: string; error?: { message: string } };
      if (response.ok && body.sent) setState(body.devLink ? { kind: "sent", devLink: body.devLink } : { kind: "sent" });
      else setState({ kind: "error", message: body.error?.message ?? "Something went wrong. Try again." });
    } catch {
      setState({ kind: "error", message: "We could not reach Ogbifọ. Check your connection and try again." });
    }
  }

  if (state.kind === "sent") {
    return (
      <div role="status" className="mt-10 max-w-prose border border-bone/10 p-5">
        <h2 className="font-serif text-xl font-semibold">Check your email</h2>
        <p className="mt-2 font-body text-sm leading-relaxed text-ash">
          If that address is right, a link is on its way. It works once and expires in 15 minutes.
        </p>
        {state.devLink ? (
          <p className="mt-4 font-ui text-sm text-ochre">
            Development mailbox: <a className="underline" href={state.devLink}>open the sign-in link</a>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-10 grid max-w-md gap-4" noValidate>
      {linkProblem ? (
        <p role="alert" className="font-ui text-sm text-ochre">
          That sign-in link has expired or was already used. Ask for a new one.
        </p>
      ) : null}
      <div>
        <label htmlFor="email" className="block font-ui text-xs uppercase tracking-wider text-ash">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          className="mt-2 min-h-12 w-full border border-bone/20 bg-clay px-3 font-ui text-sm text-bone"
        />
      </div>
      {state.kind === "error" ? <p role="alert" className="font-ui text-sm text-ochre">{state.message}</p> : null}
      <div>
        <button
          type="submit"
          disabled={state.kind === "sending"}
          className="inline-flex min-h-12 items-center justify-center bg-ochre px-6 font-ui text-sm font-semibold text-clay hover:brightness-110 disabled:opacity-40"
        >
          {state.kind === "sending" ? "Sending…" : "Send me a link"}
        </button>
      </div>
    </form>
  );
}
