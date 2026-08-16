# Media Notes 2 Service Boundaries

Status: design specification.

No Media Notes 2 service implementation or Go workspace is present yet. When
implemented, each service below must be an independently buildable module and
deployment unit. Local workspace tooling must not turn the modules into one
shared application.

## Services

- `hermes`: public GraphQL gateway and response aggregation.
- `identity`: users, accounts, and sessions.
- `billing`: subscriptions, credit reservations, and ledger.
- `media`: uploads, source-media metadata, and processing requests.
- `content`: transcripts and generated content.
- `conductor`: workflow state, dependencies, joins, retries, and timeouts.

Every service must expose operational liveness and readiness endpoints:

```text
GET /health/live
GET /health/ready
```

Domain APIs, database connections, and messaging consumers belong inside their
own service module. A service must not import another service's implementation
or internal packages, and must not access another service's schema.

Synchronous cross-service calls use versioned gRPC contracts. Asynchronous
communication uses versioned Kafka events. Media bytes and long-form generated
content remain in object storage and must not pass through Kafka.

Shared libraries are limited to technical infrastructure such as
observability, messaging envelopes, middleware, configuration, and test
utilities.

## Implementation acceptance criteria

- Every service builds and tests independently.
- Ownership, startup, shutdown, cancellation, timeouts, retries, and readiness
  behavior are explicit.
- Stateful services use separate credentials, schemas, and migration histories.
- Contracts and events are backward compatible within a version.
- No service imports another service's implementation or accesses its storage.
