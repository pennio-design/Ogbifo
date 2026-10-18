import { allowUnreviewed, getContentService } from "@/server/content";
import { devReference, isDevReferenceCard } from "@/server/dev-reference";

/** Development only: the synthetic reference voice for a seed Card as a WAV. 404 in a release. */
export async function GET(request: Request) {
  if (!allowUnreviewed) return new Response("Not found", { status: 404 });
  const id = new URL(request.url).searchParams.get("card") ?? "card-yo-greeting-1";
  if (!isDevReferenceCard(id)) return new Response("Not found", { status: 404 });
  const card = await getContentService().getCard(id);
  if (!card.ok) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(devReference(id, card.value.sourceText).wav), {
    headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
  });
}
