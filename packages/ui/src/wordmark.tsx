import { RoyalSeal } from "./royal-seal";

export function Wordmark({ sealSize = 32 }: { sealSize?: number }) {
  return (
    <span className="inline-flex items-center gap-3">
      <RoyalSeal size={sealSize} className="text-bone" />
      <span className="font-serif text-2xl font-semibold italic tracking-tight text-bone">Ogbifọ</span>
    </span>
  );
}
