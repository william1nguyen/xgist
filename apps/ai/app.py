from fastapi import FastAPI
import os
import sentry_sdk
from prometheus_client import CONTENT_TYPE_LATEST, CollectorRegistry, generate_latest
from prometheus_client import Counter, Histogram
from starlette.responses import Response
from routes.transcribe import transcribe_router

if os.getenv("SENTRY_DSN"):
    sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"), traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE") or 0.0))

app = FastAPI()
app.include_router(transcribe_router)


@app.get("/healthz")
async def health():
    return {"status": "ok"}


registry = CollectorRegistry()
http_requests_total = Counter("http_requests_total", "Total HTTP requests", ["method", "path", "status"], registry=registry)
http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration seconds",
    ["method", "path", "status"],
    registry=registry,
)


@app.middleware("http")
async def metrics_middleware(request, call_next):
    from time import perf_counter

    start = perf_counter()
    response = await call_next(request)
    duration = perf_counter() - start

    method = request.method
    path = request.url.path
    status = str(response.status_code)

    http_requests_total.labels(method, path, status).inc()
    http_request_duration_seconds.labels(method, path, status).observe(duration)

    return response


@app.get("/metrics")
async def metrics():
    return Response(generate_latest(registry), media_type=CONTENT_TYPE_LATEST)
