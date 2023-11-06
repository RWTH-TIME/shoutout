# shoutout

## Architecture

![.assets/arch.png](.assets/arch.png)

# Dashboard

#### Versions

node: v18.16.0

npm: v9.6.4

## quickstart

Its recommended to use [docker](https://docs.docker.com/get-docker/) and [docker-compose](https://docs.docker.com/compose/install/)

### Packages:

Install all packages with:

```bash
npm i
```

### Docker:

To setup all services just run following commands in root directory.

It also sets up a build of the dashboard at [localhost:8000](http://localhost:8000)

```bash
docker compose up -d
```

### Database:

For the first time running please initialize your DB in the dashboard directory

```bash
npx prisma migrate dev --name init
```

### FileStorage (MinIO):

For saving files we use minio

Initially you have to generate an access token.

Go to: [localhost:9001](http://localhost:9001)

TODO

## Development:

```bash
npm run dev
```

Any changes to the DB have to be migrated! Keep the models in sync with the worker!

```bash
npx prisma migrate dev --name {MigrationName}
```

Open [http://localhost:3000](http://localhost:3000)

## Worker

## Environment variables
| Name | Value | Description |
| ----------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| DATABASE_URL | "postgresql://admin:admin@localhost:5433/postgres?schema=public" | It is required for prisma to connect with the postgres database. |
| MINIO_ENDPOINT | "localhost" | This is the endpoint of minio server. It will be the IP address of the server. |
| MINIO_PORT | "9000" | Minio port for communication from dashboard. |
| MINIO_ACCESS_KEY | "shoutoutdevuser" | Access key for minio dev user. Update it for production. |
| MINIO_SECRET_KEY | "shoutoutdevuser" | Secret key for minio dev user. |
| MINIO_JOB_BUCKET | "shoutout-job-bucket" | Bucket name to store all audio files.   |