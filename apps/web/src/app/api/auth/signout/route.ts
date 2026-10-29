import { cookies } from "next/headers";
import { getAuthService, SESSION_COOKIE } from "@/server/auth";
import { isSameOrigin } from "@/server/request";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const jar = await cookies();
  await getAuthService().signOut(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  return Response.redirect(new URL("/", request.url), 303);
}
