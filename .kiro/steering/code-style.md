# Code Style

## Non-Negotiables

- **No `any`, no `unknown`** — every value must be typed
- **No comments** — code is self-documenting via naming
- **No non-null assertions** (`!`) — handle nullability explicitly
- **Strict TypeScript** — `tsconfig` with `"strict": true`
- **Reuse types** from `@repo/types` — never redefine the same shape

## TypeScript

- Prefer `type` over `interface` for data shapes
- Zod schemas live next to their domain; types derived via `z.infer<typeof Schema>`
- Export both schema and inferred type from the same file

```ts
// apps/server/src/schemas/video.ts
export const uploadInputSchema = z.object({ ... })
export type UploadInput = z.infer<typeof uploadInputSchema>
```

## File & Folder Naming

- All files/folders: `kebab-case`
- React components: `PascalCase.tsx`
- Domain modules: `schema.ts`, `router.ts`, `handler.ts`

## Functions

- Named exports everywhere (except React Router route files — default export required)
- Arrow functions for handlers and callbacks
- `function` keyword for top-level utilities
- Max ~30 lines per function — extract if longer

## oRPC Conventions

One router file per domain. Always define input via Zod schema, never inline types.

## Drizzle ORM

- Schema in `packages/db/src/schema/` — one file per domain
- Always export inferred types:

```ts
export const videos = pgTable("videos", { ... })
export type Video = typeof videos.$inferSelect
export type NewVideo = typeof videos.$inferInsert
```

- Use `db.query.*` (relational API) over raw joins when possible

## React Components

- Functional only
- Tailwind only — no inline styles, no CSS modules
- Import shared types from `@repo/types`

## Python Worker

- Type hints on all functions
- Pydantic models for all Redis payloads
- Async/await throughout

## Error Handling

- oRPC: throw `ORPCError` with typed codes
- Worker: catch per-job, publish `status: "failed"` with error string
- Never silently swallow errors
