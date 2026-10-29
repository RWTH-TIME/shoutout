ARG BASE_IMAGE=ghcr.io/rwth-time/shoutout/worker-base:latest

FROM ${BASE_IMAGE}

ARG HUGGINGFACE_DEV_PREWARM_TOKEN=
ARG WHISPER_MODEL=small

WORKDIR /app

COPY pyproject.toml /app/pyproject.toml
COPY shoutout_worker /app/shoutout_worker

ENV WHISPER_MODELS=${WHISPER_MODEL}
ENV LOG_LEVEL=INFO

RUN pip install --no-deps -e .

RUN python -c "import whisper; whisper.load_model('${WHISPER_MODEL}')"

RUN if [ -n "${HUGGINGFACE_DEV_PREWARM_TOKEN}" ]; then \
      python -c "from pyannote.audio import Pipeline; Pipeline.from_pretrained('pyannote/speaker-diarization-community-1', token='${HUGGINGFACE_DEV_PREWARM_TOKEN}')"; \
    fi

ENTRYPOINT ["shoutout-worker"]
