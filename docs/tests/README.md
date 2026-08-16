# Manual test guides

Step-by-step gRPC test scripts (`grpcurl`/`grpcui`) for each implemented
service, with real captured request/response pairs — not illustrative
examples. Written for a developer verifying a local build by hand, as a
complement to the automated unit/integration tests under each
`services/<name>/internal/**/*_test.go`.

| Service | Guide |
| --- | --- |
| Identity | [identity/manual.md](identity/manual.md) |
| Billing | [billing/manual.md](billing/manual.md) |
| Media | [media/manual.md](media/manual.md) |

Only services with a working gRPC implementation get a guide here; see
[`docs/services/README.md`](../services/README.md) for every service's
design, including ones not yet built.
