# shoutout

## Architecture

![.assets/arch.png](.assets/arch.png)

## quickstart

Its recommended to use [docker](https://docs.docker.com/get-docker/) and [docker-compose](https://docs.docker.com/compose/install/)


### Docker:

To setup all services just run following command in the root directory.

**Before running the following command, please update the environment variable `MINIO_ENDPOINT` inside the docker compose to the external reachable hostname! This container is called directly from the frontend.**

```bash
docker compose up -d
```

It will setup 5 containers.
1. Build of the dashboard at [localhost:8000](http://localhost:8000)
2. PostgresDB on port 5433
3. Minio S3 Bucket at [localhost:9001](http://localhost:9001)
4. RabbitMQ at [localhost:15672](http://localhost:15672)
5. Worker-Container

## Development:

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

| NAME | DEFAULT VALUE | DESCRIPTION |
| ----------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | `postgresql://admin:admin@localhost:5433/postgres?schema=public` | It is required for prisma to connect with the postgres database. |
| `RABBITMQ_URL` | `amqp://rabbit:rabbit@localhost` | URL of the rabbitmq |
| `QUEUE_NAME` | `jobs` | The name of the job-queue | 
| `MINIO_ENDPOINT` | `localhost` | This is the endpoint of minio server. It will be the IP address of the server. |
| `MINIO_PORT` | `9000` | Minio port for communication from dashboard. |
| `MINIO_ACCESS_KEY` | `shoutoutdevuser` | Access key for minio dev user. |
| `MINIO_SECRET_KEY` | `shoutoutdevuser` | Secret key for minio dev user. |
| `MINIO_JOB_BUCKET` | `shoutout-job-bucket` | Bucket name to store all audio files. |
| `DOWNLOAD_FILE_TARGET_DIR` | `finished-files/` | Folder on S3-Bucket containing transcribed files | 
| `FINISHED_FILE_FORMAT` | `.txt` | The download format of the finished file |
| `UPLOAD_FILE_TARGET_DIR` | `to-transcribe/` | Folder on S3-Bucket to upload mp3 files to |
| `MINIO_SSL_ENABLED` | `false` | SSL setting for S3 Bucket |

### Worker

| NAME | DEFAULT VALUE | DESCRIPTION |
| ----------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `DATABASE_HOST` | `localhost` | PostgresDB host |
| `DATABASE_NAME` | `postgres` | Database name |
| `DATABASE_USER` | `admin` | PostgresDB username |
| `DATABASE_PASSWORD` | `admin` | PostgresDB password |
| `DATABASE_PORT` | `5433` | PostgresDB port|
| `RABBITMQ_HOST` | `localhost` | Rabbitmq host |
| `RABBITMQ_USER` | `rabbit` | Username for rabbitmq |
| `RABBITMQ_PASSWORD` | `rabbit` | Password for rabbitmq |
| `RABBITMQ_QUEUE` | `jobs` | The name of the job queue |
| `MINIO_JOB_BUCKET` | `shoutout-job-bucket` | Bucket name to store all audio files. |
| `MINIO_SECRET_KEY` | `shoutoutdevuser` | Secret key for minio dev user. |
| `MINIO_ACCESS_KEY` | `shoutoutdevuser` | Access key for minio dev user. |
| `MINIO_URL` | `http://localhost:9000` | URL of S3 Bucket |
| `TMP_FILE_DIR` | `tmp_downloads` | Local directory where all temporary files which are needed for transcription are stored |
| `UPLOAD_FILE_TARGET_DIR` | `finished-files/` | Folder on S3-Bucket to upload finished transcription to |
| `DOWNLOAD_FILE_DIR` | `to-transcribe/` | Folder on S3-Bucket containing mp3 files to transcribe |
| `WHISPER_MODEL` | `small` | openai whisper [model size](https://github.com/openai/whisper#available-models-and-languages) |
| `FINISHED_FILE_FORMAT` | `.txt` | File format of the transcribed file |