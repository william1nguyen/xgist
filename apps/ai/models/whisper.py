import os
from tempfile import NamedTemporaryFile
import time
from fastapi import File, UploadFile
from pydantic import BaseModel
import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline

device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
model_id = "openai/whisper-tiny"

model = AutoModelForSpeechSeq2Seq.from_pretrained(
    model_id, torch_dtype=torch_dtype, low_cpu_mem_usage=True
)
model.to(device)

processor = AutoProcessor.from_pretrained(model_id)

pipe = pipeline(
    "automatic-speech-recognition",
    model=model,
    tokenizer=processor.tokenizer,
    feature_extractor=processor.feature_extractor,
    torch_dtype=torch_dtype,
    device=device,
    chunk_length_s=120,
    stride_length_s=0,
    return_timestamps=True,
    use_fast=True
)

class Chunk(BaseModel):
    timestamp: list[int]
    text: str

class Transcript(BaseModel):
    text: str
    chunks: list[Chunk]


def is_chunk_valid(chunk: Chunk, start: float | None, end: float | None, text: str | None):
    if not text:
        return False
    
    if not start or not end:
        return True
    
    return start < end

def filter(transcripts: Transcript):
    '''
    Handle broken chunks
    '''

    chunks = transcripts.get('chunks', [])
    broken_chunk_start = -1 # Before first chunk start
    valid_chunks = []
    
    for chunk in chunks:
        (start, end) = chunk.get('timestamp')
        text = chunk.get('text')

        if is_chunk_valid(chunk=chunk, start=start, end=end, text=text):
            valid_chunks.append({
                'time': max(broken_chunk_start, start),
                'text': text
            })
            broken_chunk_start = -1 # reset broken chunk start
        
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
        transcripts = pipe(file_path)
        return filter(transcripts=transcripts)
        
    except Exception as e:
        raise e
    finally:
        os.remove(file_path)
        print(f"__time__: {time.time() - start_time}")