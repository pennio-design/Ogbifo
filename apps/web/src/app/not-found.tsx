import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24">
      <h1 className="font-serif text-3xl font-semibold">This page isn&rsquo;t in the Archive.</h1>
      <p className="mt-4 font-body text-ash">It may have moved, or it may not exist yet.</p>
      <Link href="/" className="mt-8 inline-block border border-bone/20 px-6 py-3 font-ui text-sm hover:border-ochre">
        Back to Home
      </Link>
    </div>
  );
}
