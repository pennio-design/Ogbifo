import { cookies } from "next/headers";
import { getAuthService, secureCookies, SESSION_COOKIE } from "@/server/auth";
import { isSameOrigin } from "@/server/request";

const see = (request: Request, path: string) => Response.redirect(new URL(path, request.url), 303);

/** The link page posts here, so mail scanners that only GET the link cannot use it up. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData().catch(() => null);
  const token = form?.get("token");
  const result = await getAuthService().redeem(typeof token === "string" ? token : "");
  if (!result.ok) return see(request, "/sign-in?problem=link");
  (await cookies()).set(SESSION_COOKIE, result.value.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    path: "/",
    expires: new Date(result.value.expiresAt),
  });
  return see(request, "/community");
}
