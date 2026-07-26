---
name: golang-development
description: Develop and review idiomatic Go code. Use when changing Go source, tests, modules, concurrency, APIs, or performance-sensitive Go components.
---

# Go Development

Follow the repository's declared Go version, build commands, and conventions.

- Keep ownership, mutation, blocking, and goroutine lifecycles visible.
- Propagate `context.Context` through cancellable operations; do not store it in
  structs without a documented reason.
- Return useful errors and preserve causes when adding context.
- Prefer small interfaces at the consumer boundary and concrete types elsewhere.
- Bound concurrency, queues, retries, and resource use.
- Avoid allocations and synchronization complexity unless measurements justify
  them.
- Format changed code and run relevant tests and static checks.
- Use the race detector for changes involving shared state or concurrency.

## Go Testing

Read `references/go-testing.md` when designing or reviewing Go tests.
