#!/bin/bash
eval "$(conda shell.zsh hook)"
conda activate whisperV3
uvicorn app:app --reload
