import logging
import shutil
import threading
import functools

from utils.rabbitmq_manager import RabbitManager
from utils.postgres_manager import PostgresManager, Status
from utils.bucket_manager import BucketManager
from utils.transcription_manager import TranscriptionManager
from config.environment import ConfigEntry


def _ack(connection, ack_callback, delivery_tag):
    """
    This function acks threadsafe
    """
    ack = functools.partial(ack_callback, delivery_tag)
    connection.add_callback_threadsafe(ack)


def _extract_from_filename(filename: str):
    name_data = filename.split(".")[0]
    data = name_data.split("_")
    for i in range(len(data)):
        if data[i] == ConfigEntry.ZIP_NOT_DEFINED_USER_INPUT:
            data[i] = None
    return filename, data[1], data[2]


def _run_job(connection, ack_callback, delivery_tag, job_name):
    """
    This function handles the transcription
    """
    postgres = PostgresManager()
    bucket = BucketManager()
    transcription = TranscriptionManager()

    try:
        uuid_with_extention, participants, language = postgres.getJobDetails(
            jobName=job_name
        )
        files = bucket.downloadFile(uuid_with_extention)

        for filename in files:
            postgres.updateJobStatus(status=Status.RUNNING, jobName=job_name)
            if len(files) > 1:
                # update job info through file name
                filename, participants, language = _extract_from_filename(
                    filename
                )
            else:
                filename = uuid_with_extention

            logging.info(f"{job_name} {filename} Diarization started")
            transcription.diarize(
                ConfigEntry.TMP_FILE_DIR,
                filename,
                participants or 0,
            )
            logging.info(f"{job_name} {filename} Diarization ended.")

            logging.info(
                f"{job_name} {filename} Transcription started.")
            transcription.transcribe(
                ConfigEntry.TMP_FILE_DIR,
                filename,
                language
            )
            logging.info(
                f"{job_name} {filename} Transcription ended.")

        bucket.uploadFile(uuid_with_extention.split(".")[0], files, job_name)

        shutil.rmtree(ConfigEntry.TMP_FILE_DIR)
        postgres.updateJobStatus(status=Status.FINISHED, jobName=job_name)

        _ack(connection, ack_callback, delivery_tag)
    except Exception:
        # If the job fails, update the job status and ack the job and exit
        logging.info(job_name + " failed.")
        postgres.updateJobStatus(
            status=Status.FAILED,
            jobName=job_name
        )
        _ack(connection, ack_callback, delivery_tag)
        return


def _execute_job(_, method, _1, body, args) -> None:
    """
    This function is the callback of the rabbitMQ "listener", it takes the job
    information and starts the thread for transcribing the job
    """
    job_name = str(body.decode())
    (connection, threads, ack_callback) = args
    delivery_tag = method.delivery_tag

    # start thread:
    t = threading.Thread(
        target=_run_job,
        args=(connection, ack_callback, delivery_tag, job_name)
    )

    t.start()
    threads.append(t)


if __name__ == "__main__":
    bucket = BucketManager()
    logging.basicConfig(
        format='%(asctime)s %(levelname)-8s %(message)s',
        level=ConfigEntry.LOG_LEVEL,
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    try:
        rabbitMQ = RabbitManager()
        threads = []

        transcription_callback = functools.partial(
            _execute_job,
            args=(
                rabbitMQ.connection,
                threads,
                rabbitMQ.ack_message,
            )
        )

        rabbitMQ.consume(callback=transcription_callback)

        for thread in threads:
            thread.join()
    except Exception:
        logging.error("Job Failed")
