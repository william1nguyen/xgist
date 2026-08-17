# Continuous Integration

Status: proposed implementation specification.

CI checks must be added with the implementation and must remain reproducible
locally.

## Required jobs

| Job | Coverage |
| --- | --- |
| Web quality | Frozen pnpm install, build, Biome lint, TypeScript checks, and tests |
| Service quality and contracts | Go formatting, vet, Protobuf validation, event-schema syntax, tests, and builds |
| Container matrix | Every independently deployable service |

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
