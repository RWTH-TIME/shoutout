interface ENV {
  NODE_ENV: string | undefined;
  DATABASE_URL: string | undefined;
  RABBITMQ_URL: string | undefined;
  QUEUE_NAME: string | undefined;
  MINIO_ENDPOINT: string | undefined;
  MINIO_PORT: number | undefined;
  MINIO_ACCESS_KEY: string | undefined;
  MINIO_SECRET_KEY: string | undefined;
  MINIO_JOB_BUCKET: string | undefined;
  DOWNLOAD_FILE_TARGET_DIR: string | undefined;
  FINISHED_FILE_FORMAT: string | undefined;
  UPLOAD_FILE_TARGET_DIR: string | undefined;
  MINIO_SSL_ENABLED: boolean | undefined;
}

interface Config {
  NODE_ENV: string;
  DATABASE_URL: string;
  RABBITMQ_URL: string;
  QUEUE_NAME: string;
  MINIO_ENDPOINT: string;
  MINIO_PORT: number;
  MINIO_ACCESS_KEY: string;
  MINIO_SECRET_KEY: string;
  MINIO_JOB_BUCKET: string;
  DOWNLOAD_FILE_TARGET_DIR: string;
  FINISHED_FILE_FORMAT: string;
  UPLOAD_FILE_TARGET_DIR: string;
  MINIO_SSL_ENABLED: boolean;
}

const getConfig = (): ENV => {
  return {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    RABBITMQ_URL: process.env.RABBITMQ_URL,
    QUEUE_NAME: process.env.QUEUE_NAME,
    MINIO_ENDPOINT: process.env.MINIO_ENDPOINT,
    MINIO_PORT: process.env.MINIO_PORT
      ? parseInt(process.env.MINIO_PORT)
      : undefined,
    MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY,
    MINIO_JOB_BUCKET: process.env.MINIO_JOB_BUCKET,
    DOWNLOAD_FILE_TARGET_DIR: process.env.DOWNLOAD_FILE_TARGET_DIR,
    FINISHED_FILE_FORMAT: process.env.FINISHED_FILE_FORMAT,
    UPLOAD_FILE_TARGET_DIR: process.env.UPLOAD_FILE_TARGET_DIR,
    MINIO_SSL_ENABLED: process.env.MINIO_SSL_ENABLED
      ? toBool(process.env.MINIO_SSL_ENABLED)
      : undefined,
  };
};

const toBool = (value: string | undefined): boolean => {
  if (value) {
    return ["True", "true", "1"].includes(value);
  } else return false;
};

const getSanitizedConfig = (config: ENV): Config => {
  for (const [key, value] of Object.entries(config)) {
    if (value === undefined) {
      throw new Error(`Missing key ${key} in config.env`);
    }
  }

  return config as Config;
};

const config = getConfig();
const sanitizedConfig = getSanitizedConfig(config);
export default sanitizedConfig;
