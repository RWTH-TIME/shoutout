import logging
import traceback
import shutil

from utils.rabbitmq_manager import RabbitManager
from utils.postgres_manager import PostgresManager, Status
from utils.bucket_manager import BucketManager
from utils.transcription_manager import TranscriptionManager
from config.environment import ConfigEntry
from exceptions.TranscriptionException import TranscriptionException


def _execute_job(channel, method, _, body) -> None:
    job_name = str(body.decode())

    try:
        postgres = PostgresManager()
        bucket = BucketManager()
        transcription = TranscriptionManager()

        file_name, participants, language = postgres.getJobDetails(
            jobName=job_name
        )
        bucket.downloadFile(file_name)

        logging.info(job_name + " Diarization started.")
        transcription.diarize(
            ConfigEntry.TMP_FILE_DIR, file_name,
            participants
        )
        logging.info(job_name + " Diarization ended.")

        logging.info(job_name + " Transcription started.")
        transcription.transcribe(ConfigEntry.TMP_FILE_DIR, file_name)
        logging.info(job_name + " Transcription ended.")

        bucket.uploadFile(
            ConfigEntry.TMP_FILE_DIR + f"{file_name.rsplit('.',1)[0]}.txt"
        )

        shutil.rmtree(ConfigEntry.TMP_FILE_DIR)
        postgres.updateJobStatus(status=Status.FINISHED, jobName=job_name)
        channel.basic_ack(delivery_tag=method.delivery_tag)
    except Exception:
        traceback.print_exc()
        raise TranscriptionException(
            job=job_name, channel=channel,
            method=method
        )


def _main() -> None:
    rabbitMQ = RabbitManager()

    rabbitMQ.consume(callback=_execute_job)


if __name__ == "__main__":
    bucket = BucketManager()
    logging.basicConfig(
        format='%(asctime)s %(levelname)-8s %(message)s',
        level=logging.INFO,
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    try:
        _main()
    except TranscriptionException as job_exception:
        # If the job fails, the job status will be updated
        postgres = PostgresManager()
        postgres.updateJobStatus(status=Status.FAILED,
                                 jobName=job_exception.jobName
                                 )
        job_exception.channel.basic_ack(
            delivery_tag=job_exception.method.delivery_tag
        )
    except Exception as e:
        print(e)
        logging.error("Job Failed")
