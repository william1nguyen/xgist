import json
import os
from tempfile import NamedTemporaryFile
import time
from fastapi import File, HTTPException, Request, UploadFile
from pydantic import BaseModel
from faster_whisper import WhisperModel

from services.gemini import prompting

model_size = "tiny"
device = "cpu"
compute_type = "float16" if device == "cuda" else "float32"

model = WhisperModel(model_size, device=device, compute_type=compute_type)

class Chunk(BaseModel):
    timestamp: list[float]
    text: str

class Transcript(BaseModel):
    text: str
    chunks: list[Chunk]

def process_results(segments):
    """
    Process segments from faster-whisper into dictionary format 
    that matches exactly what the transformers pipeline returned
    """
    full_text = ""
    chunks = []
    
    for segment in segments:
        start = segment.start
        end = segment.end
        text = segment.text.strip()
        
        if text:
            full_text += text + " "
            chunks.append({
                "timestamp": [start, end],
                "text": text
            })
    
    return {
        "text": full_text.strip(),
        "chunks": chunks
    }

def is_chunk_valid(chunk, start=None, end=None, text=None):
    """Check if a chunk is valid"""
    if isinstance(chunk, dict):
        if start is None and end is None and text is None:
            timestamp = chunk.get("timestamp", [None, None])
            start, end = timestamp if len(timestamp) >= 2 else (None, None)
            text = chunk.get("text", "")
    
    if not text:
        return False
    
    if start is None or end is None:
        return True
    
    return start < end

def filter(transcripts):
    """
    Handle broken chunks - format matches the original transformers implementation
    """
    chunks = transcripts.get('chunks', [])
    broken_chunk_start = -1
    valid_chunks = []
    
    for chunk in chunks:
        (start, end) = chunk.get('timestamp')
        text = chunk.get('text')

        if is_chunk_valid(chunk=chunk, start=start, end=end, text=text):
            valid_chunks.append({
                'time': max(broken_chunk_start, start),
                'text': text
            })
            broken_chunk_start = -1
        else:
            broken_chunk_start = start
    
    transcripts['chunks'] = valid_chunks
    return transcripts

async def transcribe(file: UploadFile = File(...)):
    start_time = time.time()
    with NamedTemporaryFile(delete=False) as tfile:
        content = await file.read()
        tfile.write(content)
        file_path = tfile.name
    try:
        segments, info = model.transcribe(
            file_path, 
            beam_size=5,
            word_timestamps=False,
            vad_filter=True
        )
        
        transcripts = process_results(segments)
        filtered_transcripts = filter(transcripts=transcripts)
        
        return filtered_transcripts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")
    finally:
        os.remove(file_path)
        print(f"__time__: {time.time() - start_time}, file_size: {len(content) if 'content' in locals() else 0}")

async def transcribe_stream(request: Request):
    start_time = time.time()
    
    with NamedTemporaryFile(delete=False, suffix=".mp4") as tfile:
        file_size = 0
        async for chunk in request.stream():
            tfile.write(chunk)
            file_size += len(chunk)
        
        file_path = tfile.name
    
    try:
        if file_size == 0:
            raise HTTPException(status_code=400, detail="Empty file received")
        
        segments, info = model.transcribe(
            file_path, 
            beam_size=5,
            word_timestamps=False,
            vad_filter=True
        )
        
        transcripts = process_results(segments)
        filtered_transcripts = filter(transcripts=transcripts)
        
        return filtered_transcripts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")
    finally:
        os.remove(file_path)
        print(f"__time__: {time.time() - start_time}, file_size: {file_size}")

async def transcribe_from_path(file_path: str):
    start_time = time.time()
    
    try:
        segments, info = model.transcribe(
            file_path, 
            beam_size=5,
            word_timestamps=False,
            vad_filter=True
        )
        
        transcripts = process_results(segments)
        filtered_transcripts = filter(transcripts=transcripts)
        
        return filtered_transcripts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")
    finally:
        print(f"__time__: {time.time() - start_time}, file_size: {os.path.getsize(file_path) if os.path.exists(file_path) else 0}")

async def get_transcripts_with_support_sentences(transcripts, text, chunks):
    prompt = f'''
        Preserving the key points and main message, and identify supporting evidence for each transcripts.

        Transcript:
        {transcripts}

        Time-stamped segments:
        {chunks}

        Return ONLY a valid JSON object with the following structure, without any additional text, code formatting, prefixes, or line numbers:

        [
        {{
            "text": "The 'text' value from the first transcripts item in 'Transcript'",
            "time": "The 'time' value from the first transcripts item in 'Transcript'",
            "supporting_sentences": [
            {{
                "text": "The 'text' value from the first relevant item in 'Time-stamped segments'",
                "time": "The 'time' value from the first relevant item in 'Time-stamped segments'"
            }},
            {{
                "text": "The 'text' value from the second relevant item in 'Time-stamped segments'",
                "time": "The 'time' value from the second relevant item in 'Time-stamped segments'"
            }}
            ]
        }}
        ]

        IMPORTANT: 
        1. Focus on preserving the key points and main message of the transcript
        2. Make each summary point concise but informative
        3. Do not include any text outside the JSON object
        4. Do not add markdown code blocks, backticks, or any other formatting
        5. Do not include numbering or bullet points
        6. Ensure the response is a valid, parseable JSON object
        7. Each summary point should be supported by relevant sentences from the transcript
        8. Do not add any explanations before or after the JSON
    '''

    res = await prompting(prompt)
    res = res.replace("```json", "").replace("```", "").strip()
    try:
        parsed_data = json.loads(res)
        return parsed_data
    except Exception as e:
        return transcripts

    