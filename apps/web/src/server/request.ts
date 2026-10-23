/**
 * Refuse cross-site writes. Browsers send `Sec-Fetch-Site` (which a page cannot forge)
 * and `Origin`. A form posted from a page with `Referrer-Policy: no-referrer`, like the
 * sign-in link page, sends `Origin: null`, so that case is accepted only when the
 * browser itself says the request is same-origin.
 */
export function isSameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site" || site === "same-site") return false;
  const origin = request.headers.get("origin");
  if (origin === null || origin === "null") return site === "same-origin";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return host !== null && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Best-effort client address for rate limiting. Only as trustworthy as the proxy in front. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export const errorResponse = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
