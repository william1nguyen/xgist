FROM continuumio/miniconda3:latest

WORKDIR /app


COPY environment.yml /app/environment.yml

RUN apt-get update && apt-get install -y ffmpeg && \
    conda update -n base -c defaults conda && \
    conda env create -f /app/environment.yml && \
    conda clean -afy

RUN echo "source activate whisperV3" > ~/.bashrc
ENV PATH /opt/conda/envs/whisperV3/bin:$PATH

COPY . /app

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
