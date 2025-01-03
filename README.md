A modern web application for transcribing audiofiles on your own server.  
Powered by models like whisper-v3 and pyannote/speaker-diarization. Try it yourself!  

# Why Shoutout?
Shoutout is a state of the art web application for transcribing audiofiles including speaker diarization and time stamps. Due to its high accuracy level, ideal data privacy and easy navigation, shoutout is perfectly suited for transcriptions of interviews in qualitative research or sensitive corporate recordings.

Shoutout provides:
- a **simple to use** web-interface.
- **highly accurate** transcriptions leveraging the open source transcription model whisper-v3.
- automatic **speaker detection** including timestamps.
- perfect **data privacy**: Shoutout runs **100% local** and does not share any of your data with external services.
- highly **efficient and fast** transcriptions using GPU acceleration and a scalable architecture.
- **easy deployment** due to a completely dockerized build.

# Screenshots
### Creating a new job
![.assets/Shoutout_1.png](.assets/Shoutout_1.png)

### Web-interface with an overview of all jobs
![.assets/Shoutout_2.png](.assets/Shoutout_2.png)

### Downloading transcripts after finishing a job
![.assets/Shoutout_3.png](.assets/Shoutout_3.png)

### Results example:

```
SPEAKER_00 00:00:00
Sure, okay, so for documentation purposes. Are you okay with me recording the interview?

SPEAKER_01 00:00:12
Yes, I agree to the audio recording.

SPEAKER_00 00:00:17
Okay, then let's start. Could you first briefly introduce yourself, describe your background and what your doing...

SPEAKER_01 00:00:28
Well, my name is ...
```


## Architecture

![.assets/arch.png](.assets/arch.png)

## quickstart

Its recommended to use [docker](https://docs.docker.com/get-docker/) and [docker-compose](https://docs.docker.com/compose/install/)

### Docker

To setup all services just run following command in the root directory.

**Before running the following command, please update the environment variable `MINIO_ENDPOINT` inside the `docker-compose.yml` to an external reachable hostname! This container is called directly from the frontend.**

**If you want the worker to support your gpu you have to install the [nvidia-container-toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) on the host**

```sh
docker compose -f docker-compose.prod.yml up -d
```

It will setup 6 containers:
1. Build of the dashboard at [localhost:8000](http://localhost:8000)
2. PostgresDB on port `5433`
3. MinIO S3 Bucket at [localhost:9001](http://localhost:9001)
4. A MinIO client initializing the s3 bucket permissions
5. RabbitMQ at [localhost:15672](http://localhost:15672)
6. Worker-Container (gpu support)

## Development

Make sure that all services (postgres, minio, rabbitmq) are running

### Dashboard

To start developing the dashboard run following commands, it will start the dev.

```bash
cd dashboard

npm i

npm run dev
```

#### Database

When making any changes to the database, be aware to migrate them!

```bash
npx prisma migrate dev --name {MigrationName}
```

Open [http://localhost:3000](http://localhost:3000)

### Worker

First activate and install all requirements into your virtualenv.

```bash
cd worker

pip install -r requirements.txt
```

To develop and test the worker just run the script without a container.

Be aware to stop the worker-container if it's running!

```bash
python3 main.py
```

## Environment variables

### Dashboard

| NAME                       | DEFAULT VALUE                                                    | DESCRIPTION                                                                    |
| -------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL`             | `postgresql://admin:admin@localhost:5433/postgres?schema=public` | It is required for prisma to connect with the postgres database.               |
| `RABBITMQ_URL`             | `amqp://rabbit:rabbit@localhost`                                 | URL of the rabbitmq                                                            |
| `QUEUE_NAME`               | `jobs`                                                           | The name of the job-queue                                                      |
| `MINIO_ENDPOINT`           | `localhost`                                                      | This is the endpoint of minio server. It will be the IP address of the server. |
| `MINIO_PORT`               | `9000`                                                           | Minio port for communication from dashboard.                                   |
| `MINIO_ACCESS_KEY`         | `shoutoutdevuser`                                                | Access key for minio dev user.                                                 |
| `MINIO_SECRET_KEY`         | `shoutoutdevuser`                                                | Secret key for minio dev user.                                                 |
| `MINIO_JOB_BUCKET`         | `shoutout-job-bucket`                                            | Bucket name to store all audio files.                                          |
| `DOWNLOAD_FILE_TARGET_DIR` | `finished-files/`                                                | Folder on S3-Bucket containing transcribed files                               |
| `FINISHED_FILE_FORMAT`     | `.txt`                                                           | The download format of the finished file                                       |
| `UPLOAD_FILE_TARGET_DIR`   | `to-transcribe/`                                                 | Folder on S3-Bucket to upload mp3 files to                                     |
| `MINIO_SSL_ENABLED`        | `false`                                                          | SSL setting for S3 Bucket                                                      |

### Worker

| NAME                     | DEFAULT VALUE           | DESCRIPTION                                                                                   |
| ------------------------ | ----------------------- | --------------------------------------------------------------------------------------------- |
| `DATABASE_HOST`          | `localhost`             | PostgresDB host                                                                               |
| `DATABASE_NAME`          | `postgres`              | Database name                                                                                 |
| `DATABASE_USER`          | `admin`                 | PostgresDB username                                                                           |
| `DATABASE_PASSWORD`      | `admin`                 | PostgresDB password                                                                           |
| `DATABASE_PORT`          | `5433`                  | PostgresDB port                                                                               |
| `RABBITMQ_HOST`          | `localhost`             | Rabbitmq host                                                                                 |
| `RABBITMQ_USER`          | `rabbit`                | Username for rabbitmq                                                                         |
| `RABBITMQ_PASSWORD`      | `rabbit`                | Password for rabbitmq                                                                         |
| `RABBITMQ_QUEUE`         | `jobs`                  | The name of the job queue                                                                     |
| `MINIO_JOB_BUCKET`       | `shoutout-job-bucket`   | Bucket name to store all audio files.                                                         |
| `MINIO_SECRET_KEY`       | `shoutoutdevuser`       | Secret key for minio dev user.                                                                |
| `MINIO_ACCESS_KEY`       | `shoutoutdevuser`       | Access key for minio dev user.                                                                |
| `MINIO_URL`              | `http://localhost:9000` | URL of S3 Bucket                                                                              |
| `TMP_FILE_DIR`           | `tmp_downloads`         | Local directory where all temporary files which are needed for transcription are stored       |
| `UPLOAD_FILE_TARGET_DIR` | `finished-files/`       | Folder on S3-Bucket to upload finished transcription to                                       |
| `DOWNLOAD_FILE_DIR`      | `to-transcribe/`        | Folder on S3-Bucket containing mp3 files to transcribe                                        |
| `WHISPER_MODEL`          | `large-v3`              | openai whisper [model size](https://github.com/openai/whisper#available-models-and-languages) |
| `FINISHED_FILE_FORMAT`   | `.txt`                  | File format of the transcribed file                                                           |

# Citation

BiBTex:

```
@software{shoutout_2024,
title = {{shoutout: A modern web application for transcribing audio files on your own server}},
doi = {10.5281/zenodo.14527349},
url = {https://github.com/RWTH-TIME/shoutout},
version = {v1.0.0},
year = {2024}
author = {Selzner, Paul and Evers, Felix and Kalhorn, Paul and Beckers, Lukas},
note = {Published by RWTH Technology and Innovation Management Institute (TIME Research Area)}
}
```
