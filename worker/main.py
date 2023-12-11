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
    data = filename.split("_")
    for i in range(len(data)):
        if i == ConfigEntry.ZIP_NOT_DEFINED_USER_INPUT:
            data[i] = None        
    return data[0], data[1], data[2]


def _run_job(connection, ack_callback, delivery_tag, job_name):
    """
    This function handles the transcription
    """
    postgres = PostgresManager()
    bucket = BucketManager()
    transcription = TranscriptionManager()
    try:
        file_name, participants, language = postgres.getJobDetails(
            jobName=job_name
        )
        files = bucket.downloadFile(file_name)

        for filename in files:
            postgres.updateJobStatus(status=Status.RUNNING, jobName=job_name)
            if len(files) > 1:
                # update job info
                participants, language = _extract_from_filename(filename)

            logging.info(job_name + file_name + " Diarization started.")
            transcription.diarize(
                ConfigEntry.TMP_FILE_DIR,
                filename,
                participants,
            )
            logging.info(job_name + file_name + " Diarization ended.")

            logging.info(job_name + file_name + " Transcription started.")
            transcription.transcribe(
                ConfigEntry.TMP_FILE_DIR,
                filename,
                language
            )
            logging.info(job_name + file_name + " Transcription ended.")

        # TODO: Differ between one transcribed file and zip file
        bucket.uploadFile(
            ConfigEntry.TMP_FILE_DIR +
            f"{file_name.rsplit('.',1)[0]}.txt"
        )

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
        level=logging.INFO,
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
    except Exception as e:
        print(e)
        logging.error("Job Failed")
