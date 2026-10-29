import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listCardsForReviewers } from "@/server/content";
import { AnnotationTool } from "./annotation-tool";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Annotate a reference", robots: { index: false, follow: false } };

/**
 * Reviewer-only (D-033). There are no accounts yet (D-022), so the tool is
 * switched on per deployment with OGBIFO_ENABLE_REVIEWER_TOOLS=1 and is not
 * linked from the app. It returns 404 otherwise.
 */
export default async function AnnotatePage() {
  if (process.env.OGBIFO_ENABLE_REVIEWER_TOOLS !== "1") notFound();
  return <AnnotationTool cards={await listCardsForReviewers()} />;
}
