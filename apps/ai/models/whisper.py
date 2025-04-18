import os
from tempfile import NamedTemporaryFile
import time
from fastapi import File, HTTPException, Request, UploadFile
from pydantic import BaseModel
from faster_whisper import WhisperModel

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
            # Use dictionary format instead of Pydantic model
            chunks.append({
                "timestamp": [start, end],
                "text": text
            })
    
    # Return dictionary format instead of Pydantic model
    return {
        "text": full_text.strip(),
        "chunks": chunks
    }

def is_chunk_valid(chunk, start=None, end=None, text=None):
    """Check if a chunk is valid"""
    # Handle both dictionary and Pydantic model inputs
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
    broken_chunk_start = -1  # Before first chunk start
    valid_chunks = []
    
    for chunk in chunks:
        (start, end) = chunk.get('timestamp')
        text = chunk.get('text')

        if is_chunk_valid(chunk=chunk, start=start, end=end, text=text):
            valid_chunks.append({
                'time': max(broken_chunk_start, start),
                'text': text
            })
            broken_chunk_start = -1  # reset broken chunk start
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
        
        # Use the dictionary-based process_results and filter
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
        
        # Use the dictionary-based process_results and filter
        transcripts = process_results(segments)
        filtered_transcripts = filter(transcripts=transcripts)
        
        return filtered_transcripts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")
    finally:
        os.remove(file_path)
        print(f"__time__: {time.time() - start_time}, file_size: {file_size}")