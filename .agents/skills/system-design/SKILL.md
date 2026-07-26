---
name: system-design
description: Design and review reliable software systems. Use for architecture proposals, component boundaries, APIs, protocols, storage, concurrency, distributed workflows, migrations, or changes with meaningful operational tradeoffs.
---

# System Design

Design from verified requirements and constraints. Keep the result proportional
to the problem and avoid platform-specific assumptions unless required.

## Establish context

1. Inspect the existing system, interfaces, and data flows.
2. Separate goals, non-goals, constraints, and assumptions.
3. Make quality requirements measurable where evidence exists; label estimates.

## Develop the design

1. Define component responsibilities and narrow interfaces.
2. Trace important data and control paths end to end.
3. State ownership, lifecycle, invariants, concurrency, and consistency.
4. Bound queues, retries, memory, connections, workers, and other resources.
5. Cover partial failures, timeouts, cancellation, recovery, and shutdown.
6. Preserve compatibility or provide an explicit migration and rollback path.

## Evaluate tradeoffs

- Compare at least one credible alternative for consequential decisions.
- Consider correctness, complexity, performance, security, observability,
  operability, cost, and maintainability only where relevant.
- Do not add distributed components, caches, queues, or abstractions without a
  concrete requirement.

## Validate

- Define tests, benchmarks, fault scenarios, rollout checks, and success signals.
- Record unresolved risks and questions instead of hiding uncertainty.
- Use `architecture/templates/system-design.md` or `adr.md` when available.
