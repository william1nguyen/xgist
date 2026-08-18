-- New catalog version, per docs/services/billing.md's rollout pattern: a
-- price change ships as a new catalog_versions row with a later active_at,
-- never by mutating an existing version — quotes/reservations already
-- issued against launch-v1 keep referencing it unchanged.
INSERT INTO billing.catalog_versions (id, items, active_at) VALUES (
  'launch-v2',
  '{"transcribe":2,"summarize":2,"extract_keywords":2,"extract_keypoints":2,"generate_notes":5,"generate_audio_summary":5}'::jsonb,
  now()
);
