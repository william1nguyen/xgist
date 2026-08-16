# Service designs

| Service | Design |
| --- | --- |
| Public API | [hermes](hermes.md) |
| Identity | [identity](identity.md) |
| Billing | [billing](billing.md) |
| Media | [media](media.md) |
| Content | [content](content.md) |
| Workflow | [conductor](conductor.md) |
| Executor | [worker](worker.md) |

Each service is separately buildable and deployable. Shared code is limited to
technical infrastructure and generated clients. Shared contracts live in
`contracts/`; domain models and storage never do.
