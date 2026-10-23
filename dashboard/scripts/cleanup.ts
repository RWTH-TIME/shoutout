import { Status } from "@prisma/client";
import { prisma } from "../app/lib/prisma";
import {
  deleteObjects,
  jobResultZipKey,
  listObjectKeys,
  resultObjectKey,
  uploadObjectKey,
} from "../app/lib/storage";
import config from "../app/lib/config";

async function main(): Promise<void> {
  const now = new Date();

  const staleJobs = await prisma.job.findMany({
    where: {
      OR: [
        { status: Status.FAILED },
        { expiresAt: { not: null, lt: now } },
      ],
    },
    include: { files: true },
  });

  for (const job of staleJobs) {
    const keys: string[] = [];
    for (const file of job.files) {
      keys.push(uploadObjectKey(file.audioFile));
      if (file.resultTextKey) {
        keys.push(file.resultTextKey);
      }
      if (file.resultJsonKey) {
        keys.push(file.resultJsonKey);
      }
    }
    if (job.audioFile && job.files.length === 0) {
      keys.push(uploadObjectKey(job.audioFile));
      keys.push(resultObjectKey(job.audioFile));
    }
    if (job.resultZipKey) {
      keys.push(job.resultZipKey);
    } else {
      keys.push(jobResultZipKey(job.publicId));
    }
    const prefix = `${config.DOWNLOAD_FILE_TARGET_DIR}${job.publicId}/`;
    keys.push(...(await listObjectKeys(prefix)));
    await deleteObjects(Array.from(new Set(keys)));
    await prisma.job.delete({ where: { id: job.id } });
  }

  const remaining = await prisma.job.findMany({
    include: { files: true },
  });
  const referenced = new Set<string>();
  for (const job of remaining) {
    for (const file of job.files) {
      referenced.add(uploadObjectKey(file.audioFile));
      if (file.resultTextKey) {
        referenced.add(file.resultTextKey);
      }
      if (file.resultJsonKey) {
        referenced.add(file.resultJsonKey);
      }
    }
    if (job.audioFile && job.files.length === 0) {
      referenced.add(uploadObjectKey(job.audioFile));
      if (job.status === Status.FINISHED) {
        referenced.add(resultObjectKey(job.audioFile));
      }
    }
    if (job.resultZipKey) {
      referenced.add(job.resultZipKey);
    } else if (job.status === Status.FINISHED) {
      referenced.add(jobResultZipKey(job.publicId));
    }
  }

  const prefixes = [
    config.UPLOAD_FILE_TARGET_DIR,
    config.DOWNLOAD_FILE_TARGET_DIR,
  ];
  const orphanKeys: string[] = [];
  for (const prefix of prefixes) {
    const keys = await listObjectKeys(prefix);
    for (const key of keys) {
      if (!referenced.has(key)) {
        orphanKeys.push(key);
      }
    }
  }

  await deleteObjects(orphanKeys);
  console.log(
    `Cleanup finished: removed ${staleJobs.length} jobs and ${orphanKeys.length} orphan objects`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
