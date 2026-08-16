# Build context is the repository root (not services/content/), because
# content's go.mod replaces the contracts module with a local path
# (../../contracts/gen/go) that must also be present in the build context.
FROM golang:1.26-bookworm AS builder

WORKDIR /src
COPY contracts/gen/go ./contracts/gen/go
COPY services/content ./services/content

WORKDIR /src/services/content
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/content ./cmd/api

FROM gcr.io/distroless/static-debian12
COPY --from=builder /out/content /content
EXPOSE 8084 9095
ENTRYPOINT ["/content"]
