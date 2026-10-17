"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="py-24">
      <h1 className="font-serif text-3xl font-semibold">We couldn&rsquo;t open this page.</h1>
      <p className="mt-4 max-w-prose font-body text-ash">
        Nothing you have saved is lost. Try again, and if it keeps happening, come back in a little while.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 bg-ochre px-6 py-3 font-ui text-sm font-semibold text-clay hover:brightness-110"
      >
        Try again
      </button>
    </div>
  );
}
