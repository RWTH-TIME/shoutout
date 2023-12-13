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
        file_path = ConfigEntry.TMP_FILE_DIR
        uuid, file_format = os.path.splitext(fileName)
        
        files = []  # contains all file names

        source = os.path.join(ConfigEntry.DOWNLOAD_FILE_DIR, fileName)
        target = os.path.join(file_path, fileName)

        if not os.path.exists(file_path):
            os.makedirs(file_path)
        
        bucket.download_file(source, target)

        if file_format == ".zip":
            with zipfile.ZipFile(target, "r") as zip_ref:
                zip_ref.extractall(
                    file_path
                )
                files = zip_ref.namelist()
            os.remove(target)  # remove zip file again
        else:
            files.append(fileName)
        
        return files

    def uploadFile(self, name, files: list[str]):
        """
        :param: files = List containing all the filnames of the transcribed files
        """
        bucket = self._getBucket()
        with zipfile.ZipFile(f"{ConfigEntry.TMP_FILE_DIR}{name}.zip", "w") as obj:
            for filename in files:
                real_name = filename.split(".")[0]
                obj.write(f"{ConfigEntry.TMP_FILE_DIR}{real_name}{ConfigEntry.FINISHED_FILE_FORMAT}", f"{real_name}{ConfigEntry.FINISHED_FILE_FORMAT}")

        to_be_uploaded_filename = f"{ConfigEntry.TMP_FILE_DIR}/{name}.zip"
        upload_target = os.path.join(ConfigEntry.UPLOAD_FILE_TARGET_DIR, name)
        bucket.upload_file(to_be_uploaded_filename, upload_target + ".zip")
                
