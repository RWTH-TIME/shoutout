FROM pytorch/pytorch:2.7.1-cuda11.8-cudnn9-runtime

ARG HUGGINGFACE=
ARG WHISPER_MODEL=small

RUN apt-get update && \
    apt-get -y upgrade && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml requirements.txt /app/
COPY shoutout_worker /app/shoutout_worker

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_WARN_ABOUT_ROOT_USER=1
ENV WHISPER_MODELS=${WHISPER_MODEL}
ENV LOG_LEVEL=INFO
ENV HF_HOME=/var/cache/shoutout-worker

RUN pip install --upgrade pip && pip install -e .

RUN if [ -n "${HUGGINGFACE}" ]; then \
      python -c "from pyannote.audio import Pipeline; Pipeline.from_pretrained('pyannote/speaker-diarization-3.1', token='${HUGGINGFACE}')"; \
      python -c "import whisper; whisper.load_model('${WHISPER_MODEL}')"; \
    fi

ENTRYPOINT ["shoutout-worker"]
