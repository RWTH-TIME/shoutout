import { NextResponse, NextRequest } from "next/server";
import * as minio from "minio";
import env from "../../utility/environment/config";

export const GET = async (req: NextRequest) => {
    try {
        const query = req.nextUrl.searchParams;
        let fileName = query.get("fileName"); // uuid

        if (fileName) {
            // Manipulate file-ending
            fileName =
                fileName.substring(0, fileName.lastIndexOf(".")) +
                env.FINISHED_FILE_FORMAT;
        }

        if (fileName == null) throw new Error("Minio file name cannot be null");

        const minioClient = new minio.Client({
            endPoint: env.MINIO_ENDPOINT,
            port: env.MINIO_PORT,
            useSSL: env.MINIO_SSL_ENABLED,
            accessKey: env.MINIO_ACCESS_KEY,
            secretKey: env.MINIO_SECRET_KEY,
        });

        const presignedUrl = await minioClient.presignedGetObject(
            env.MINIO_JOB_BUCKET || "shoutout-job-bucket",
            env.DOWNLOAD_FILE_TARGET_DIR + fileName,
            24 * 60 * 60,
            {
                "response-content-disposition": `attachment; filename=${query.get("jobName") + env.FINISHED_FILE_FORMAT}`,
            }
        );
        return NextResponse.json({ presignedUrl: presignedUrl }, { status: 200 });
    } catch (error) {
        console.log("Error getting download-url", error);
        return NextResponse.json({}, { status: 500 })
    }
};
