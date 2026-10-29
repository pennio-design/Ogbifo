import { fail, ok, type Result } from "./result";
import { isBlank } from "./text";

export type LanguageStatus = "active" | "planned";

export interface Language {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly nativeName: string;
  readonly regions: readonly string[];
  readonly writingSystem: string;
  readonly status: LanguageStatus;
  readonly archiveCount: number;
  /** 0 = well covered, 1 = largest gap in the Archive. */
  readonly archiveGapScore: number;
}

export interface Dialect {
  readonly id: string;
  readonly languageId: string;
  readonly name: string;
  readonly region: string;
  readonly description: string;
}

export function createLanguage(input: Language): Result<Language> {
  if (isBlank(input.id)) return fail("LANGUAGE_INVALID", "Language needs an id.", "id");
  if (isBlank(input.name)) return fail("LANGUAGE_INVALID", "Language needs a name.", "name");
  if (isBlank(input.code)) return fail("LANGUAGE_INVALID", "Language needs a code.", "code");
  if (!Number.isInteger(input.archiveCount) || input.archiveCount < 0) {
    return fail("LANGUAGE_INVALID", "Archive count must be a whole number, zero or more.", "archiveCount");
  }
  if (!(input.archiveGapScore >= 0 && input.archiveGapScore <= 1)) {
    return fail("LANGUAGE_INVALID", "Archive gap score must be between 0 and 1.", "archiveGapScore");
  }
  return ok({ ...input, regions: [...input.regions] });
}
