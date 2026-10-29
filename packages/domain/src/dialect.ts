import { fail, ok, type Result } from "./result";
import { isBlank } from "./text";

/**
 * D-043: the lexicon is dialect-aware. The register is curated by reviewers (the
 * first entries come from the Yorùbá teacher); code never invents dialects.
 */
export interface DialectEntry {
  readonly id: string;
  readonly name: string;
  readonly region?: string;
  readonly note?: string;
}

export interface DialectRegister {
  readonly dialects: readonly DialectEntry[];
}

export function parseDialectRegister(data: unknown): Result<DialectRegister> {
  if (typeof data !== "object" || data === null || !("dialects" in data) || !Array.isArray(data.dialects)) {
    return fail("DIALECTS_INVALID", 'The dialect register must be {"dialects": [...]}.');
  }
  const seen = new Set<string>();
  const dialects: DialectEntry[] = [];
  for (const item of data.dialects as unknown[]) {
    if (typeof item !== "object" || item === null) return fail("DIALECTS_INVALID", "Each dialect must be an object.");
    const { id, name, region, note } = item as Record<string, unknown>;
    if (typeof id !== "string" || isBlank(id) || typeof name !== "string" || isBlank(name)) {
      return fail("DIALECTS_INVALID", "Each dialect needs an id and a name.");
    }
    if (seen.has(id)) return fail("DIALECTS_INVALID", `Dialect id used twice: ${id}.`);
    seen.add(id);
    dialects.push({
      id,
      name,
      ...(typeof region === "string" ? { region } : {}),
      ...(typeof note === "string" ? { note } : {}),
    });
  }
  return ok({ dialects });
}

const key = (text: string) => text.normalize("NFC").trim().toLowerCase();

/** Resolve what someone typed (an id or a name) to a register id. */
export function resolveDialect(register: DialectRegister, typed: string): string | null {
  const k = key(typed);
  if (k === "") return null;
  return register.dialects.find((d) => key(d.id) === k || key(d.name) === k)?.id ?? null;
}
