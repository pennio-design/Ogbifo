-- Ogbifọ 0003: reference annotation and provenance for Cards (D-014, D-034). Additive only.

ALTER TABLE cards
  ADD COLUMN reference_annotation jsonb,
  ADD COLUMN reference_provenance jsonb,
  ADD CONSTRAINT cards_reference_audio_complete
    CHECK (reference_audio_url IS NULL
           OR (reference_annotation IS NOT NULL AND reference_provenance IS NOT NULL)),
  ADD CONSTRAINT cards_annotation_needs_audio
    CHECK (reference_annotation IS NULL OR reference_audio_url IS NOT NULL),
  ADD CONSTRAINT cards_provenance_needs_audio
    CHECK (reference_provenance IS NULL OR reference_audio_url IS NOT NULL),
  ADD CONSTRAINT cards_synthetic_never_reviewed
    CHECK (review_status <> 'reviewed'
           OR COALESCE(reference_provenance ->> 'licence', '') <> 'synthetic_test');
