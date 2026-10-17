export interface SpeechError {
  readonly code: string;
  readonly message: string;
}

export type SpeechResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: SpeechError };

export const okResult = <T>(value: T): SpeechResult<T> => ({ ok: true, value });
export const failResult = (code: string, message: string): SpeechResult<never> => ({
  ok: false,
  error: { code, message },
});
