from fastapi import FastAPI
from routes.transcribe import transcribe_router

app = FastAPI()
app.include_router(transcribe_router)
