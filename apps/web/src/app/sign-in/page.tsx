import type { Metadata } from "next";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <>
      <p className="font-ui text-xs uppercase tracking-[0.3em] text-ochre">Sign in</p>
      <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Keep what you read, add what you know.</h1>
      <p className="mt-6 max-w-prose font-body text-base leading-relaxed text-ash">
        There are no passwords. Give us your email address and we will send you a link. It works once, within 15 minutes of being sent, and you then stay signed in on this device.
        We use your address only to sign you in. It is never shown to other readers.
      </p>
      <SignInForm />
    </>
  );
}
