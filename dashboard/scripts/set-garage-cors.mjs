import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.S3_ENDPOINT ?? "http://localhost:3900";
const region = process.env.S3_REGION ?? "garage";
const bucket = process.env.S3_BUCKET ?? "shoutout-job-bucket";
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

if (!accessKeyId || !secretAccessKey) {
  console.error("S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are required");
  process.exit(1);
}

const client = new S3Client({
  endpoint,
  region,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

await client.send(
  new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
          AllowedOrigins: ["*"],
          ExposeHeaders: ["ETag", "x-amz-request-id", "x-amz-version-id"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  })
);

console.log(`Configured CORS on s3://${bucket} via ${endpoint}`);
