from fastapi import FastAPI, UploadFile, File
from typing import List
import os
from tempfile import NamedTemporaryFile
import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline

app = FastAPI()

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
    chunk_length_s=30,
    stride_length_s=0,
    return_timestamps=True,
    torch_dtype=torch_dtype,
    device=device,
)

@app.post("/transcribe/")
async def transcribe(files: List[UploadFile] = File(...)):
    all_results = []
    
    for file in files:
        with NamedTemporaryFile(delete=False) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name
        
        try:
            result = pipe(tmp_file_path)
            chunks = []
            if isinstance(result, dict):
                if "chunks" in result:
                    chunks = result["chunks"]
                elif "segments" in result:
                    chunks = result["segments"]
                elif "timestamps" in result:
                    for i, (start, end, text) in enumerate(result["timestamps"]):
                        chunks.append({"text": text, "timestamp": [start, end]})
            
            if chunks:
                for chunk in chunks:
                    if isinstance(chunk, dict):
                        timestamp = None
                        if "timestamp" in chunk:
                            timestamp = chunk["timestamp"]
                        elif "start" in chunk and "end" in chunk:
                            timestamp = [chunk["start"], chunk["end"]]
                        
                        text = chunk.get("text", "")

                        if timestamp and len(timestamp) >= 2:
                            all_results.append({
                                "timestamp": {
                                    "start": timestamp[0],
                                    "end": timestamp[1]
                                },
                                "transcript": text
                            })
            else:
                text = result["text"] if isinstance(result, dict) and "text" in result else str(result)
                all_results.append({
                    "timestamp": {
                        "start": 0,
                        "end": 30
                    },
                    "transcript": text
                })
                
        except Exception as e:
            all_results.append({
                "timestamp": {
                    "start": 0,
                    "end": 0
                },
                "transcript": f"Error processing file: {str(e)}"
            })
            print(f"Error: {str(e)}")
        
        os.remove(tmp_file_path)

    return {"results": all_results}