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

    def downloadFile(self, fileName: str) -> list[str]:
        bucket = self._getBucket()

        _, file_format = os.path.splitext(fileName)
        files = []  # contains all file names

        source = os.path.join(ConfigEntry.DOWNLOAD_FILE_DIR, fileName)
        target = os.path.join(ConfigEntry.TMP_FILE_DIR, fileName)

        if not os.path.exists(ConfigEntry.TMP_FILE_DIR):
            os.makedirs(ConfigEntry.TMP_FILE_DIR)

        bucket.download_file(source, target)

        if file_format == ".zip":
            # extract zip to tmp_file_dir
            with zipfile.ZipFile(target, "r") as zip_ref:
                zip_ref.extractall(
                    ConfigEntry.TMP_FILE_DIR
                )
                files = zip_ref.namelist()
            os.remove(target)  # remove zip file again
        else:
            files.append(fileName)

        return files

    def uploadFile(self, uuid: str, files: list[str], job_name: str):
        """
        :param: uuid = uuid of the job name 
        :param: files = List containing all the filnames of the transcribed files
        :param: job_name = Name of the job
        """
        bucket = self._getBucket()
        to_be_uploaded_filename = f"{ConfigEntry.TMP_FILE_DIR}{uuid}.zip"
        # pack zip containing all files
        with zipfile.ZipFile(to_be_uploaded_filename, "w") as obj:
            for filename in files:
                source_name = filename.split(".")[0]
                target_name = filename.split(".")[0] if len(files) > 1 else job_name
                obj.write(f"{ConfigEntry.TMP_FILE_DIR}{source_name}{ConfigEntry.FINISHED_FILE_FORMAT}",
                          f"{target_name}{ConfigEntry.FINISHED_FILE_FORMAT}")

        upload_target = os.path.join(
            ConfigEntry.UPLOAD_FILE_TARGET_DIR, uuid + ".zip")
        bucket.upload_file(to_be_uploaded_filename, upload_target)
