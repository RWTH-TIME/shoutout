import boto3

import zipfile
import os

from config.environment import ConfigEntry


class BucketManager:
    def __init__(self) -> None:
        self.s3 = self._create_target()

    def _create_target(self):
        return boto3.resource(
            "s3",
            endpoint_url=ConfigEntry.MINIO_URL,
            aws_access_key_id=ConfigEntry.MINIO_ACCESS_KEY,
            aws_secret_access_key=ConfigEntry.MINIO_SECRET_KEY,
        )

    def _getBucket(self):
        return self.s3.Bucket(ConfigEntry.MINIO_JOB_BUCKET)

    def downloadFile(self, filename: str, to_be_extracted: str) -> list[str]:
        """
        :param: filename = The filename of the file comming from the db
        :param: to_be_extracted = If the file is a zip, only one file should
                                  be extracted, thats the name of it
        """
        bucket = self._getBucket()

        _, file_format = os.path.splitext(filename)
        file = None  # contains the downloaded file name

        source = os.path.join(ConfigEntry.DOWNLOAD_FILE_DIR, filename)
        target = os.path.join(ConfigEntry.TMP_FILE_DIR, filename)

        if not os.path.exists(ConfigEntry.TMP_FILE_DIR):
            os.makedirs(ConfigEntry.TMP_FILE_DIR)

        bucket.download_file(source, target)

        if file_format == ".zip":
            # extract zip to tmp_file_dir
            with zipfile.ZipFile(target, "r") as zip_ref:
                zip_ref.extract(
                    to_be_extracted,
                    ConfigEntry.TMP_FILE_DIR
                )
                file = to_be_extracted

            # rename files which contain spaces for diarization
            os.rename(ConfigEntry.TMP_FILE_DIR + file,
                      ConfigEntry.TMP_FILE_DIR + file.replace(" ", ""))
            file = file.replace(" ", "")

            os.remove(target)  # remove zip file again
        else:
            file = filename

        return file

    def uploadFile(self, uuid: str, file: str):
        """
        :param: uuid = uuid of the job name
        :param: file = the file to be uploaded
        """
        bucket = self._getBucket()
        upload_target = os.path.join(
            ConfigEntry.UPLOAD_FILE_TARGET_DIR,
            uuid,
            file.split(".")[0] + ".txt"
        )  # thats where our file should be uploaded at
        to_be_uploaded_filename = (
            f"{ConfigEntry.TMP_FILE_DIR}{file.rsplit('.', 1)[0]}.txt"
        )
        bucket.upload_file(to_be_uploaded_filename, upload_target)
