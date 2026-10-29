import type { CardCategory } from "@ogbifo/domain";

const CATEGORY_LABELS: Record<CardCategory, string> = {
  proverb: "Proverb",
  greeting: "Greeting",
  daily_speech: "Daily speech",
  praise_song_excerpt: "Praise or song",
  market_expression: "Market expression",
  cultural_expression: "Cultural expression",
  general_phrase: "Phrase",
};

export const categoryLabel = (category: CardCategory): string => CATEGORY_LABELS[category];
