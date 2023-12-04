FROM pytorch/pytorch

ARG HUGGINGFACE_APIKEY
ARG WHISPER_MODEL_SIZE

RUN apt-get update && \ 
    apt-get -y upgrade && \
    apt-get install -y ffmpeg

WORKDIR /app

COPY requirements.txt /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PIP_NO_WARN_ABOUT_ROOT_USER 1
ENV WHISPER_MODEL=${WHISPER_MODEL_SIZE}

RUN pip install --upgrade pip && pip install -r requirements.txt

# load diarization model
RUN python -c "from pyannote.audio import Pipeline; model=Pipeline.from_pretrained('pyannote/speaker-diarization-3.0', use_auth_token='${HUGGINGFACE_APIKEY}')"
# load whisper model
RUN python -c "import whisper; whisper.load_model(${WHISPER_MODEL_SIZE})"

COPY . /app

ENTRYPOINT ["python", "main.py"]