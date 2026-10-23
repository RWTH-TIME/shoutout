import Busboy from "busboy";
import { Readable } from "node:stream";
import { NextRequest } from "next/server";
import { uploadObjectKey, uploadStream } from "./storage";

export type MultipartFile = {
  fieldName: string;
  filename: string;
  mimeType: string;
  objectKey: string;
  uploadRef: string;
};

export type MultipartResult = {
  fields: Record<string, string>;
  files: MultipartFile[];
};

function extensionOf(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index >= 0 ? filename.slice(index) : "";
}

export async function parseMultipartUpload(
  request: NextRequest,
  options: { fileFields?: string[] } = {}
): Promise<MultipartResult> {
  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("multipart/form-data")) {
    throw new Error("Expected multipart/form-data");
  }

  const body = request.body;
  if (!body) {
    throw new Error("Missing request body");
  }

  const fields: Record<string, string> = {};
  const files: MultipartFile[] = [];
  const allowed = options.fileFields;
  const buffer = Buffer.from(await request.arrayBuffer());

  await new Promise<void>((resolve, reject) => {
    const busboy = Busboy({ headers: { "content-type": contentType } });
    const uploads: Promise<void>[] = [];

    busboy.on("field", (name, value) => {
      fields[name] = value;
    });

    busboy.on("file", (fieldName, stream, info) => {
      if (allowed && !allowed.includes(fieldName)) {
        stream.resume();
        return;
      }

      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      const uploadPromise = new Promise<void>((resolveFile, rejectFile) => {
        stream.on("end", () => {
          const filename = info.filename || "upload.bin";
          const uploadRef = `${crypto.randomUUID()}${extensionOf(filename)}`;
          const objectKey = uploadObjectKey(uploadRef);
          uploadStream(objectKey, Buffer.concat(chunks), info.mimeType)
            .then(() => {
              files.push({
                fieldName,
                filename,
                mimeType: info.mimeType || "application/octet-stream",
                objectKey,
                uploadRef,
              });
              resolveFile();
            })
            .catch(rejectFile);
        });
        stream.on("error", rejectFile);
      });

      uploads.push(uploadPromise);
    });

    busboy.on("error", reject);
    busboy.on("finish", () => {
      Promise.all(uploads).then(() => resolve()).catch(reject);
    });

    Readable.from(buffer).pipe(busboy);
  });

  return { fields, files };
}
