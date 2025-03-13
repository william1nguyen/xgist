import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import google.generativeai as genai
import uvicorn
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

load_dotenv()

app = FastAPI(title="Gemini Chat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextPart(BaseModel):
    text: str

class Content(BaseModel):
    parts: List[TextPart]

class GeminiRequest(BaseModel):
    contents: List[Content]

class Part(BaseModel):
    text: str

class ContentResponse(BaseModel):
    parts: List[Part]

class Candidate(BaseModel):
    content: ContentResponse

class GeminiResponse(BaseModel):
    candidates: List[Candidate]

class TransientAPIError(Exception):
    pass

@app.on_event("startup")
async def startup_event():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    genai.configure(api_key=api_key)

@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    retry=retry_if_exception_type((TransientAPIError, ConnectionError, TimeoutError)),
    reraise=True
)
async def generate_with_retry(model, prompt, generation_config):
    try:
        response = model.generate_content(
            prompt,
            generation_config=generation_config,
        )
        return response.text
    except Exception as e:
        error_message = str(e).lower()
        if any(term in error_message for term in ['rate limit', 'timeout', 'server', '5xx', 'connection']):
            raise TransientAPIError(f"Temporary API failure: {str(e)}")
        else:
            raise

@app.post("/v1beta/models/gemini-2.0-flash:generateContent", response_model=GeminiResponse)
async def generate_content(request: GeminiRequest):
    try:
        prompt = request.contents[0].parts[0].text
        model = genai.GenerativeModel('gemini-2.0-flash')
        generation_config = {
            "temperature": 1.0,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
        }
        response_text = await generate_with_retry(model, prompt, generation_config)
        return GeminiResponse(
            candidates=[
                Candidate(
                    content=ContentResponse(
                        parts=[Part(text=response_text)]
                    )
                )
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed after retries: {str(e)}")

@app.get("/")
def read_root():
    return {"status": "online", "service": "Gemini Text Generation API"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8440"))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)