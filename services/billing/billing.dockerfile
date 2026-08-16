# Build context is the repository root (not services/billing/), because
# billing's go.mod replaces the contracts module with a local path
# (../../contracts/gen/go) that must also be present in the build context.
FROM golang:1.26-bookworm AS builder

WORKDIR /src
COPY contracts/gen/go ./contracts/gen/go
COPY services/billing ./services/billing

WORKDIR /src/services/billing
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/billing ./cmd/api

FROM gcr.io/distroless/static-debian12
COPY --from=builder /out/billing /billing
EXPOSE 8082 9093
ENTRYPOINT ["/billing"]
