from fastapi import FastAPI, UploadFile, File
from typing import List
import os
from tempfile import NamedTemporaryFile
import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
import math

app = FastAPI()

device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
model_id = "openai/whisper-small"

model = AutoModelForSpeechSeq2Seq.from_pretrained(
    model_id, torch_dtype=torch_dtype, low_cpu_mem_usage=True
)
model.to(device)

processor = AutoProcessor.from_pretrained(model_id)

# Configure pipeline for explicit timestamp management
pipe = pipeline(
    "automatic-speech-recognition",
    model=model,
    tokenizer=processor.tokenizer,
    feature_extractor=processor.feature_extractor,
    chunk_length_s=30,  # Process in 30-second chunks
    stride_length_s=0,   # No overlap
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
            # Get raw transcription result
            result = pipe(tmp_file_path)
            
            # Debugging - print the structure of the result
            print(f"Result type: {type(result)}")
            if isinstance(result, dict):
                print(f"Result keys: {result.keys()}")
                if "chunks" in result:
                    print(f"First chunk: {result['chunks'][0] if result['chunks'] else 'No chunks'}")
            
            # Extract chunks with timestamps
            chunks = []
            if isinstance(result, dict):
                # Try to get chunks from various possible formats
                if "chunks" in result:
                    chunks = result["chunks"]
                elif "segments" in result:
                    chunks = result["segments"]
                elif "timestamps" in result:
                    # Convert timestamps to chunks format
                    for i, (start, end, text) in enumerate(result["timestamps"]):
                        chunks.append({"text": text, "timestamp": [start, end]})
            
            # If we got chunks with timestamps
            if chunks:
                for chunk in chunks:
                    # Extract timestamp and text
                    if isinstance(chunk, dict):
                        # Get timestamp based on different possible formats
                        timestamp = None
                        if "timestamp" in chunk:
                            timestamp = chunk["timestamp"]
                        elif "start" in chunk and "end" in chunk:
                            timestamp = [chunk["start"], chunk["end"]]
                        
                        # Get text
                        text = chunk.get("text", "")
                        
                        # Create result entry
                        if timestamp and len(timestamp) >= 2:
                            all_results.append({
                                "timestamp": {
                                    "start": timestamp[0],
                                    "end": timestamp[1]
                                },
                                "transcript": text
                            })
            else:
                # If no chunks, create a single entry
                text = result["text"] if isinstance(result, dict) and "text" in result else str(result)
                all_results.append({
                    "timestamp": {
                        "start": 0,
                        "end": 30
                    },
                    "transcript": text
                })
                
        except Exception as e:
            # Add error information to results
            all_results.append({
                "timestamp": {
                    "start": 0,
                    "end": 0
                },
                "transcript": f"Error processing file: {str(e)}"
            })
            
            # Print the error for debugging
            print(f"Error: {str(e)}")
        
        # Clean up the temporary file
        os.remove(tmp_file_path)

    return {"results": all_results}