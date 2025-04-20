import os
import json
import requests
import time
from fastapi import APIRouter, Depends, HTTPException, Request
from infra.auth import validate_x_api_key
from pydantic import BaseModel
from services import whisper

did_router = APIRouter(dependencies=[Depends(validate_x_api_key)])

DID_API_URL = os.getenv("DID_API_URL")
DID_API_KEY = os.getenv("DID_API_KEY")

class DidTalkItem(BaseModel):
    script_text: str

@did_router.post("/create-talk", tags=["did"])
async def create_talk(item: DidTalkItem):
    try:
        payload = json.dumps({
            "source_url": os.getenv("AGENT_IMMAGE_URL"),
            "script": {
                "type": "text",
                "input": item.script_text
            },
        })

        headers = {
            "Authorization": f"Basic {DID_API_KEY}",
            "Content-Type": "application/json"
        }

        response = requests.post(f"{DID_API_URL}/talks", headers=headers, data=payload)
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

    # result_url = "https://cdn.discordapp.com/attachments/1159014510133252216/1363310565631459358/1745071700337.mp4?ex=68059167&is=68043fe7&hm=e647de91f0d8f98222a1b148157a609abfce317e7d85098c9755e558766afbc2&"
    # transcripts = await whisper.transcribe_from_path(result_url)
    # transcripts = await whisper.get_transcripts_with_support_sentences(transcripts, text, chunks)

    # return {
    #     "status": "done",
    #     "result_url": result_url,
    #     "transcripts": transcripts,
    # }
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