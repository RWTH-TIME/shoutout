FROM pytorch/pytorch

ARG HUGGINGFACE_APIKEY
ARG WHISPER_MODEL=small

RUN apt-get update && \ 
    apt-get -y upgrade && \
    apt-get install -y ffmpeg

WORKDIR /app

COPY requirements.txt /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PIP_NO_WARN_ABOUT_ROOT_USER 1
ENV WHISPER_MODEL=${WHISPER_MODEL}
ENV LOG_LEVEL=INFO

RUN pip install --upgrade pip && pip install -r requirements.txt

# based on pyannote/pyannote-audio#1403
RUN apt install git -y && pip uninstall pyannote-audio -y && pip install "git+https://github.com/mllife/pyannote-audio-118.git@822db88f573d7923d921dac11486f713c1729a09"

# load diarization model (v2.1 for perfomance diarization)
RUN python -c "from pyannote.audio import Pipeline; model=Pipeline.from_pretrained('pyannote/speaker-diarization@2.1', use_auth_token='${HUGGINGFACE_APIKEY}')"
# load whisper model
RUN python -c "import whisper; whisper.load_model('${WHISPER_MODEL}')"

COPY . /app

ENTRYPOINT ["python", "main.py"]
