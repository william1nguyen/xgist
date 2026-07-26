---
name: testing-strategy
description: Plan, implement, and review focused software tests. Use for features, bug fixes, refactors, concurrency changes, failure handling, test gaps, flaky tests, or deciding between unit, integration, fuzz, benchmark, and manual verification.
---

# Testing Strategy

Choose the cheapest test that provides credible evidence for the behavior and
risk being changed.

## Plan

1. Identify observable behavior, invariants, boundaries, and failure modes.
2. Reproduce bugs before fixing them when practical.
3. Select test layers based on risk:
   - Unit tests for local behavior and edge cases.
   - Integration tests for boundaries and real dependencies.
   - Concurrency or race checks for shared state and lifecycle changes.
   - Fuzz or property tests for parsers, protocols, and broad input spaces.
   - Benchmarks for performance claims and regressions.
   - Manual tests for behavior automation cannot credibly cover.

## Implement

- Test outcomes and contracts rather than implementation details.
- Keep tests deterministic, isolated, readable, and focused on one behavior.
- Avoid sleeps, unnecessary mocks, shared mutable fixtures, and oversized setup.
- Verify that a regression test fails for the intended reason before relying on
  it, when practical.

## Verify and report

1. Run focused tests first and broader checks afterward.
2. Record exact commands and results.
3. Report manual steps and observed results separately.
4. If a test was not run, state that clearly with the reason.
5. Do not claim coverage for scenarios that were not exercised.
