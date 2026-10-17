import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false }, referrer: "no-referrer" };

/**
 * Landing page for the emailed link. It does not sign anyone in on load: some mail
 * programs open links to scan them, which would use the link up. Signing in needs this button.
 */
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <>
      <p className="font-ui text-xs uppercase tracking-[0.3em] text-ochre">Sign in</p>
      <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Welcome back.</h1>
      {token ? (
        <form method="post" action="/api/auth/redeem" className="mt-8 max-w-prose">
          <input type="hidden" name="token" value={token} />
          <p className="font-body text-base leading-relaxed text-ash">Press the button to finish signing in on this device.</p>
          <button type="submit" className="mt-6 inline-flex min-h-12 items-center bg-ochre px-6 font-ui text-sm font-semibold text-clay hover:brightness-110">
            Sign in
          </button>
        </form>
      ) : (
        <p className="mt-8 max-w-prose font-body text-base leading-relaxed text-ash">
          This link is incomplete. <a className="text-ochre underline" href="/sign-in">Ask for a new one.</a>
        </p>
      )}
    </>
  );
}
