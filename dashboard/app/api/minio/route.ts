import { NextResponse, NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import * as minio from "minio";
import env from "../utility/environment/config";

export const GET = async (req: NextRequest) => {
  try {
    const query = req.nextUrl.searchParams;
    const fileName = query.get("fileName");
    const fileFormat = fileName?.substring(fileName.lastIndexOf("."));
    const uuid = uuidv4();

    if (fileName === null) throw new Error("Minio file name cannot be null.");

    const minioClient = new minio.Client({
      endPoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT,
      useSSL: env.MINIO_SSL_ENABLED,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    });

    const presignedUrl = await minioClient.presignedPutObject(
      env.MINIO_JOB_BUCKET,
      env.UPLOAD_FILE_TARGET_DIR + uuid + "/" + uuid + fileFormat,
      24 * 60 * 60
    );
    return NextResponse.json(
      { presignedUrl: presignedUrl, uuidFileName: uuid + fileFormat },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error in minio route:", error);
  }
};
