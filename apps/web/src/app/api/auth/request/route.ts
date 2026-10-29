import { devLinkFor, getAuthService } from "@/server/auth";
import { clientIp, errorResponse, isSameOrigin } from "@/server/request";

const STATUS: Record<string, number> = { INVALID_EMAIL: 400, RATE_LIMITED: 429, SIGN_IN_CLOSED: 503, EMAIL_FAILED: 502 };

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return errorResponse(403, "FORBIDDEN", "This request did not come from Ogbifọ.");
  let email = "";
  try {
    const body: unknown = await request.json();
    if (typeof body === "object" && body !== null && "email" in body && typeof body.email === "string") email = body.email;
  } catch {
    return errorResponse(400, "INVALID_REQUEST", "Send the email address as JSON.");
  }
  const result = await getAuthService().requestLink(email, clientIp(request));
  if (!result.ok) return errorResponse(STATUS[result.error.code] ?? 400, result.error.code, result.error.message);
  const devLink = devLinkFor(email.trim().toLowerCase());
  return Response.json(devLink ? { sent: true, devLink } : { sent: true }, { headers: { "Cache-Control": "no-store" } });
}
