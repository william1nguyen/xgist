---
name: typescript-development
description: Develop and review clear TypeScript or JavaScript. Use when changing frontend code, shared types, browser behavior, or TypeScript configuration.
---

# TypeScript

- Follow the repository's compiler, formatter, linter, and framework conventions.
- Preserve strict type safety; prefer `unknown` plus narrowing over `any`.
- Model state explicitly and keep side effects at clear boundaries.
- Prefer simple components and local state until reuse or complexity justifies an
  abstraction.
- Handle loading, empty, error, and cancellation states where relevant.
- Keep browser-facing code accessible and avoid unnecessary dependencies.
