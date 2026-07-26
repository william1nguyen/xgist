---
name: performance-engineering
description: Investigate and improve software performance using measurements. Use for latency, throughput, memory, CPU, allocation, contention, I/O, scaling, benchmark, profiling, or performance-regression work.
---

# Performance Engineering

Treat performance work as an evidence loop: reproduce, measure, explain, change,
and compare.

## Establish a baseline

1. Define the user-visible or system-visible metric and acceptable range.
2. Reproduce under representative inputs and controlled conditions.
3. Record commands, environment, workload, and variance.
4. Profile before selecting an optimization target.

## Find the limiting resource

- Distinguish CPU, memory, allocation, synchronization, network, storage, and
  scheduling limits.
- Trace the critical path and check for queueing, batching, backpressure, and
  tail-latency effects.
- Confirm that the suspected hotspot materially affects the target metric.

## Change safely

- Prefer the smallest change that addresses the measured bottleneck.
- Preserve correctness, compatibility, and bounded resource usage.
- Avoid caches, pools, lock-free code, and concurrency increases unless their
  lifecycle and failure costs are justified.
- Add a focused benchmark or regression test when it will remain useful.

## Compare and report

1. Run before and after measurements with the same method.
2. Report raw values, relative change, variance, and tradeoffs.
3. Run correctness tests and concurrency checks relevant to the change.
4. State when results are inconclusive; never infer improvement from code shape.
