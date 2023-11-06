import boto3

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

    def downloadFile(self, fileName: str) -> str:
        bucket = self._getBucket()
        file_path = ConfigEntry.TMP_FILE_DIR
        target = os.path.join(file_path, fileName)

        if not os.path.exists(file_path):
            os.makedirs(file_path)

        bucket.download_file(ConfigEntry.DOWNLOAD_FILE_DIR + fileName, target)

        return target

    def uploadFile(self, file_path: str) -> None:
        """
        :param: file_path = The file path of the finished file, relative from
        root dir
        """
        bucket = self._getBucket()

        targetFileName = os.path.basename(
            file_path
        )  # Extract fileName from path

        upload_target_path = ConfigEntry.UPLOAD_FILE_TARGET_DIR
        upload_target = os.path.join(upload_target_path, targetFileName)

        bucket.upload_file(file_path, upload_target)
