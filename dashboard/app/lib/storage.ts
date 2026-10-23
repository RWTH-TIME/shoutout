import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import config from "./config";

function createClient(endpoint: string): S3Client {
  return new S3Client({
    endpoint,
    region: config.S3_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.S3_ACCESS_KEY_ID,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

const internalClient = createClient(config.S3_ENDPOINT);
const publicClient = createClient(config.S3_PUBLIC_ENDPOINT);

const PRESIGN_TTL_SECONDS = 24 * 60 * 60;

export function uploadObjectKey(fileName: string): string {
  return `${config.UPLOAD_FILE_TARGET_DIR}${fileName}`;
}

export function resultObjectKey(audioFile: string): string {
  const base = audioFile.includes(".")
    ? audioFile.substring(0, audioFile.lastIndexOf("."))
    : audioFile;
  return `${config.DOWNLOAD_FILE_TARGET_DIR}${base}${config.FINISHED_FILE_FORMAT}`;
}

export async function presignUpload(fileName: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: uploadObjectKey(fileName),
  });
  return getSignedUrl(publicClient, command, { expiresIn: PRESIGN_TTL_SECONDS });
}

export async function presignDownload(
  audioFile: string,
  downloadName: string
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: resultObjectKey(audioFile),
    ResponseContentDisposition: `attachment; filename="${downloadName}${config.FINISHED_FILE_FORMAT}"`,
  });
  return getSignedUrl(publicClient, command, { expiresIn: PRESIGN_TTL_SECONDS });
}

export async function presignInputDownload(audioFile: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: uploadObjectKey(audioFile),
  });
  return getSignedUrl(publicClient, command, { expiresIn: PRESIGN_TTL_SECONDS });
}

export async function presignResultUpload(audioFile: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: config.S3_BUCKET,
    Key: resultObjectKey(audioFile),
  });
  return getSignedUrl(publicClient, command, { expiresIn: PRESIGN_TTL_SECONDS });
}

export async function uploadStream(
  key: string,
  body: Readable | Buffer,
  contentType?: string
): Promise<void> {
  const upload = new Upload({
    client: internalClient,
    params: {
      Bucket: config.S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    },
  });
  await upload.done();
}

export async function deleteObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) {
    return;
  }
  await internalClient.send(
    new DeleteObjectsCommand({
      Bucket: config.S3_BUCKET,
      Delete: {
        Objects: keys.map((Key) => ({ Key })),
      },
    })
  );
}

export async function listObjectKeys(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await internalClient.send(
      new ListObjectsV2Command({
        Bucket: config.S3_BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    for (const item of response.Contents ?? []) {
      if (item.Key) {
        keys.push(item.Key);
      }
    }
    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return keys;
}
