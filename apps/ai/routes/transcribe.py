from fastapi import Depends, HTTPException, Request, UploadFile, File, APIRouter
from services import whisper
from infra.auth import validate_x_api_key
from pydantic import BaseModel

transcribe_router = APIRouter(dependencies=[Depends(validate_x_api_key)])

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

class PathRequest(BaseModel):
    file_path: str

@transcribe_router.post("/transcribe-from-path/", tags=["transcribe"])
async def post_from_path(request: PathRequest):
    transcript = await whisper.transcribe_from_path(file_path=request.file_path)
    return transcript