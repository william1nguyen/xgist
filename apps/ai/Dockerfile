FROM python:3.12-slim
LABEL author=vietanhhd03@gmail.com

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY Pipfile Pipfile.lock ./

RUN apt-get update && apt-get install -y ffmpeg \
    && python -m pip install --upgrade pip \
    && pip install pipenv \
    && pipenv install --system --deploy

WORKDIR /app
COPY . /app

RUN adduser -u 5678 --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]