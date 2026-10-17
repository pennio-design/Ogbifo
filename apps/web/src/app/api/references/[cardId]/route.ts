import { getContentService } from "@/server/content";

/** The reference annotation for a Card: syllables, reference pitch contour and features. Fetched on demand, so Card pages stay small. */
export async function GET(_request: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  const result = await getContentService().getCard(cardId);
  if (!result.ok || !result.value.referenceAnnotation) {
    return Response.json({ error: { code: "REFERENCE_NOT_FOUND", message: "This Card has no reference recording." } }, { status: 404 });
  }
  return Response.json(result.value.referenceAnnotation, { headers: { "Cache-Control": "public, max-age=3600" } });
}
