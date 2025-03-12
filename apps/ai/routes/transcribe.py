from fastapi import HTTPException, Request, UploadFile, File, APIRouter
from models import whisper

transcribe_router = APIRouter()

@transcribe_router.post("/transcribe/", tags=["transcribe"])
async def post(file: UploadFile = File(...)):
    transcript = await whisper.transcribe(file=file)
    return transcript
    
@transcribe_router.post("/transcribe-stream/", tags=["transcribe"])
async def post_stream(request: Request):
    if not request.headers.get("content-type", "").startswith("multipart/form-data"):
        return await whisper.transcribe_stream(request)
    
    else:
        try:
            form = await request.form()
            file = form.get("file")
            
            if not file or not isinstance(file, UploadFile):
                raise HTTPException(status_code=400, detail="No file in form-data")
                
            transcript = await whisper.transcribe(file=file)
            return transcript
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Form processing error: {str(e)}")
