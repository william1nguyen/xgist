# Build context is the repository root (not services/media/), because
# media's go.mod replaces the contracts module with a local path
# (../../contracts/gen/go) that must also be present in the build context.
FROM golang:1.26-bookworm AS builder

WORKDIR /src
COPY contracts/gen/go ./contracts/gen/go
COPY services/media ./services/media

WORKDIR /src/services/media
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/media ./cmd/api

FROM gcr.io/distroless/static-debian12
COPY --from=builder /out/media /media
EXPOSE 8083 19095
ENTRYPOINT ["/media"]
