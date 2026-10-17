import { cookies } from "next/headers";
import { getAuthService, SESSION_COOKIE } from "@/server/auth";
import { errorResponse } from "@/server/request";

export async function GET() {
  const user = await getAuthService().userForSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (user === null) return errorResponse(401, "NOT_SIGNED_IN", "You are not signed in.");
  return Response.json(
    { user: { id: user.id, email: user.email, displayName: user.displayName } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
