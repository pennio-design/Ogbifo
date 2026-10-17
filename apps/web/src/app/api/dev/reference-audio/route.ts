import { allowUnreviewed } from "@/server/content";
import { DEV_REFERENCE_CARD_ID, devReference } from "@/server/dev-reference";
import { getContentService } from "@/server/content";

/** Development only: the synthetic reference tones as a WAV. 404 in a release. */
export async function GET() {
  if (!allowUnreviewed) return new Response("Not found", { status: 404 });
  const card = await getContentService().getCard(DEV_REFERENCE_CARD_ID);
  if (!card.ok) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(devReference(card.value.sourceText).wav), {
    headers: { "Content-Type": "audio/wav", "Cache-Control": "no-store" },
  });
}
