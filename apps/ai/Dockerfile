FROM python:3.13-slim
LABEL author=vietanhhd03@gmail.com

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY Pipfile Pipfile.lock ./
RUN python -m pip install --upgrade pip
RUN pip install pipenv

# Force CPU-only PyTorch installation
RUN pip uninstall -y torch
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu

RUN pipenv install --dev --system --deploy

WORKDIR /app
COPY . /app

RUN adduser -u 5678 --disabled-password --gecos "" appuser && chown -R appuser /app
USER appuser

EXPOSE 8080
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]