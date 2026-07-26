# Continuous Integration

Status: proposed Media Notes 2 implementation specification.

The current workflow validates version 1. Media Notes 2 checks must be added
with the implementation and must remain reproducible locally.

## Required jobs

| Job | Coverage |
| --- | --- |
| Version 1 quality | Frozen pnpm install, build, Biome lint, TypeScript checks, and tests |
| Version 2 quality and contracts | Go formatting, vet, Protobuf validation, event-schema syntax, tests, and builds |
| Container matrix | Every independently deployable version 2 service |

The workflow grants read-only repository permission. Container jobs build
images without publishing them. Publishing, signing, deployment environments,
and registry credentials remain separate release concerns.

## Implementation acceptance criteria

- Pull requests run frozen dependency installation, formatting, linting,
  type-checking, tests, contract compatibility checks, and builds relevant to
  the changed area.
- Every CI check has a documented local equivalent.
- Service images build independently, run as non-root, and contain only the
  required runtime artifact.
- Build jobs do not publish images or receive deployment credentials.
- Branch protection names only checks that exist and are stable.
- Secrets and local environment files are excluded from build contexts.
- Version 1 checks remain required until its traffic is fully retired.
