# Media Notes — Design Docs

Media Notes turns uploaded video and audio into structured, searchable
knowledge: timestamped transcripts, evidence-linked summaries, keywords,
keypoints, generated notes, and audio summaries, processed asynchronously
and billed through credits.

This directory is the system's design documentation.

- [Architecture](architecture.md) — services, storage boundaries, and the
  end-to-end processing flow.
- [Architecture Decision Records](adr/) — the accepted decisions behind the
  design, with context, alternatives, and validation criteria.
- [Service designs](services/) — scope, data ownership, API, and initial
  schema for each service.
- [Database migrations](database-migrations.md), [local infrastructure](local-infrastructure.md),
  and [continuous integration](continuous-integration.md) — supporting
  engineering specifications.
- [Benchmarks](benchmarks/) — reproducible measurements behind performance
  decisions.

For the project overview and quick start, see the [root README](../README.md).
