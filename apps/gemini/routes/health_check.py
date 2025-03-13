from fastapi import APIRouter

health_router = APIRouter()

@health_router.get("/healthz")
def check_health():
    return {"status": "online", "service": "Gemini Text Generation API"}