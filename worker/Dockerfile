FROM pytorch/pytorch:2.7.1-cuda11.8-cudnn9-runtime

ARG HUGGINGFACE
ARG WHISPER_MODEL=small

RUN apt-get update && \ 
    apt-get -y upgrade && \
    apt-get install -y ffmpeg

WORKDIR /app

COPY requirements.txt /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_WARN_ABOUT_ROOT_USER=1
ENV WHISPER_MODEL=${WHISPER_MODEL}
ENV LOG_LEVEL=INFO

RUN pip install --upgrade pip && pip install -r requirements.txt

RUN python -c "from pyannote.audio import Pipeline; model=Pipeline.from_pretrained('pyannote/speaker-diarization-3.1', use_auth_token='${HUGGINGFACE}')"

RUN python -c "import whisper; whisper.load_model('${WHISPER_MODEL}')"

COPY . /app

ENTRYPOINT ["python", "main.py"]
