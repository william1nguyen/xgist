FROM python:3.12-slim
LABEL author=vietanhhd03@gmail.com

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV CUDA_VISIBLE_DEVICES=""
ENV TORCH_CUDA_ARCH_LIST=""

COPY Pipfile Pipfile.lock ./

RUN apt-get update && apt-get install -y ffmpeg \
    && python -m pip install --upgrade pip \
    && pip install pipenv \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && pipenv install --system --deploy \
    && pip uninstall -y torch torchvision torchaudio \
    && pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

WORKDIR /app
COPY . /app

RUN adduser -u 5678 --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

EXPOSE 8080
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]