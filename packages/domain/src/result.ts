export interface DomainError {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
}

export type Result<T, E = DomainError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const fail = (code: string, message: string, field?: string): Result<never> => ({
  ok: false,
  error: field === undefined ? { code, message } : { code, message, field },
});
