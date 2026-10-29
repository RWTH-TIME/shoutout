/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@helpwave/hightide", "@helpwave/hightide-utils"],
  serverExternalPackages: [
    "@aws-sdk/client-s3",
    "@aws-sdk/lib-storage",
    "@aws-sdk/s3-request-presigner",
    "@react-pdf/renderer",
    "busboy",
    "jszip",
  ],
};

module.exports = nextConfig;
