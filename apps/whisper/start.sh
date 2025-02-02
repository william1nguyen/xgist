#!/bin/bash
eval "$(conda shell.zsh hook)"
conda activate ai
uvicorn app:app --reload
