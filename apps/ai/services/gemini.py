from typing import List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential
import google.generativeai as genai
from infra.auth import validate_x_api_key

chat_router = APIRouter(dependencies=[Depends(validate_x_api_key)])

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

async def prompting(prompt):
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        generation_config = {
            "temperature": 1.0,
            "top_p": 0.95,
            "top_k": 40,
            "max_output_tokens": 8192,
        }
        response_text = await generate_with_retry(model, prompt, generation_config)
        return response_text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed after retries: {str(e)}")