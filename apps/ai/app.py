from fastapi import FastAPI, UploadFile, File
from typing import List
import os
from tempfile import NamedTemporaryFile
import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline

app = FastAPI()

device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
model_id = "openai/whisper-small"

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
    batch_size=16,
    torch_dtype=torch_dtype,
    device=device,
)

@app.post("/transcribe/")
async def transcribe(files: List[UploadFile] = File(...)):
    results = {}
    for file in files:
        with NamedTemporaryFile(delete=False) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file_path = tmp_file.name

        result = pipe(tmp_file_path)
        results[file.filename] = result["text"]

        os.remove(tmp_file_path)

    return {"transcriptions": results}