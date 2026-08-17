# Build context is the repository root (not services/identity/), because
# identity's go.mod replaces the contracts module with a local path
# (../../contracts/gen/go) that must also be present in the build context.
FROM golang:1.26-bookworm AS builder

WORKDIR /src
COPY contracts/gen/go ./contracts/gen/go
COPY services/identity ./services/identity

WORKDIR /src/services/identity
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/identity ./cmd/api

FROM gcr.io/distroless/static-debian12
COPY --from=builder /out/identity /identity
EXPOSE 8081 9091
ENTRYPOINT ["/identity"]
