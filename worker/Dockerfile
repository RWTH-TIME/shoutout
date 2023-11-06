FROM pytorch/pytorch

ARG HUGGINGFACE_APIKEY

RUN apt-get update && \ 
    apt-get -y upgrade && \
    apt-get install -y ffmpeg

WORKDIR /app

COPY requirements.txt /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PIP_NO_WARN_ABOUT_ROOT_USER 1

RUN pip install --upgrade pip && pip install -r requirements.txt

RUN python -c "from pyannote.audio import Pipeline; model=Pipeline.from_pretrained('pyannote/speaker-diarization-3.0', use_auth_token='${HUGGINGFACE_APIKEY}')"

COPY . /app

ENTRYPOINT ["python", "main.py"]