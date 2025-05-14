import os
import json
import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from infra.auth import validate_x_api_key
from pydantic import BaseModel
from services import whisper

did_router = APIRouter(dependencies=[Depends(validate_x_api_key)])

DID_API_URL = os.getenv("DID_API_URL")
DID_API_KEY = os.getenv("DID_API_KEY")
WEBHOOK_CALLBACK = os.getenv("WEBHOOK_CALLBACK")

class CreateDidTalkItem(BaseModel):
    agent_image: str
    agent_voice_id: str
    text: str

@did_router.post("/create-talk", tags=["did"])
async def create_talk(item: CreateDidTalkItem):
    try:
        payload = json.dumps({
            "source_url": item.agent_image,
            "script": {
                "type": "text",
                "input": item.text,
                "provider":{
                    "type":"microsoft",
                    "voice_id": item.agent_voice_id
                }
            },
            "webhook": WEBHOOK_CALLBACK
        })

        headers = {
            "Authorization": f"Basic {DID_API_KEY}",
            "Content-Type": "application/json"
        }

        response = requests.post(f"{DID_API_URL}/talks", headers=headers, data=payload)
        print(response.json())
        return response.json()
    except Exception as e: 
        raise e
    
@did_router.post("/get-talk", tags=["did"])
async def get_talk_by_id(request_data: dict):
    id = request_data.get("id")
    trans = request_data.get("transcripts")
    
    if not id:
        raise HTTPException(status_code=400, detail="Missing 'id' in request body")
    
    text = trans.get('text')
    chunks = trans.get("chunks")

    headers = {
        "Authorization": f"Basic {DID_API_KEY}",
        "accept": "application/json"
    }

    response = requests.get(f"{DID_API_URL}/talks/{id}", headers=headers)
    data = response.json()
    
    if "result_url" in data:
        result_url = data["result_url"]
        transcripts = await whisper.transcribe_from_path(result_url)
        transcripts = await whisper.get_transcripts_with_support_sentences(transcripts, text, chunks)
        return {
            **data,
            "transcripts": transcripts,
        }
    return data

@did_router.post("/webhook", tags=["did"])
async def notify(request: Request):
    body = await request.body()
    return body.result_url