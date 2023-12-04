import psycopg2

from enum import Enum

from config.environment import ConfigEntry


class Status(Enum):
    PENDING = "PENDING"
    FINISHED = "FINISHED"
    FAILED = "FAILED"
    RUNNING = "RUNNING"


class PostgresManager:
    def __init__(self) -> None:
        self.connection = self._create_connection()

    def _create_connection(self):
        return psycopg2.connect(
            host=ConfigEntry.DATABASE_HOST,
            database=ConfigEntry.DATABASE_NAME,
            user=ConfigEntry.DATABASE_USER,
            password=ConfigEntry.DATABASE_PASSWORD,
            port=ConfigEntry.DATABASE_PORT,
        )

    def get_cursor(self):
        return self.connection.cursor()

    def updateJobStatus(self, status: Status, jobName: str):
        cursor = self.get_cursor()
        sql = "UPDATE job SET status=%s WHERE name=%s"

        cursor.execute(sql, (status.value, jobName))

        self.connection.commit()

    def getJobDetails(self, jobName: str):
        cursor = self.get_cursor()
        sql = """SELECT "audioFile", "participants", "language" FROM job
        WHERE name=%s"""

        cursor.execute(sql, (jobName,))
        job_details = cursor.fetchone()

        return job_details[0], job_details[1], job_details[2]
