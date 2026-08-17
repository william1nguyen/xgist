# Build context is the repository root (not services/worker/), because
# worker imports the generated Python gRPC stubs from
# contracts/gen/python, which must also be present in the build context —
# the same reason every Go service's dockerfile builds from the root.
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.8.13 /uv /uvx /usr/local/bin/

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY services/worker/pyproject.toml services/worker/uv.lock ./
RUN uv sync --frozen --no-dev

COPY contracts/gen/python /app/contracts/gen/python
COPY services/worker/src /app/src

ENV PYTHONPATH=/app/contracts/gen/python:/app/src
ENV PATH="/app/.venv/bin:$PATH"

ENTRYPOINT ["python", "src/main.py"]
