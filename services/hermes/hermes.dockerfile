# Build context is the repository root (not services/hermes/), because
# hermes's go.mod replaces the contracts module with a local path
# (../../contracts/gen/go) that must also be present in the build context.
FROM golang:1.26-bookworm AS builder

WORKDIR /src
COPY contracts/gen/go ./contracts/gen/go
COPY services/hermes ./services/hermes

WORKDIR /src/services/hermes
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/hermes ./cmd/hermes

FROM gcr.io/distroless/static-debian12
COPY --from=builder /out/hermes /hermes
EXPOSE 8086
ENTRYPOINT ["/hermes"]
