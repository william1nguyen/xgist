import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
import uvicorn
from dotenv import load_dotenv
from routes import chat, health_check

load_dotenv()

app = FastAPI(title="Gemini Chat API")

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

app.include_router(health_check.health_router)
app.include_router(chat.chat_router)

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8440"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)