import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.transcribe import transcribe_router
from routes.did import did_router
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app.include_router(transcribe_router)
app.include_router(did_router)
