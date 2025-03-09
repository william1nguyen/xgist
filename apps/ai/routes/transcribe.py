from fastapi import UploadFile, File, APIRouter
from models import whisper

transcribe_router = APIRouter()

@transcribe_router.post("/transcribe/", tags=["transcribe"])
async def post(file: UploadFile = File(...)):
    transcript = await whisper.transcribe(file=file)
    return transcript
    