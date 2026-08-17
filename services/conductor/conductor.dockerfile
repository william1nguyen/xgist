# Build context is the repository root (not services/conductor/), because
# conductor's go.mod replaces the contracts module with a local path
# (../../contracts/gen/go) that must also be present in the build context.
FROM golang:1.26-bookworm AS builder

WORKDIR /src
COPY contracts/gen/go ./contracts/gen/go
COPY services/conductor ./services/conductor

WORKDIR /src/services/conductor
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/conductor ./cmd/conductor

FROM gcr.io/distroless/static-debian12
COPY --from=builder /out/conductor /conductor
EXPOSE 8085
ENTRYPOINT ["/conductor"]
