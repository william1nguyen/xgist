#!/bin/bash
cd apps/ai
python3 -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r <(pipenv requirements --dev)
python -m pytest . -q