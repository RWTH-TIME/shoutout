import { Status } from "@prisma/client";
import { prisma } from "../app/lib/prisma";
import {
  deleteObjects,
  listObjectKeys,
  resultObjectKey,
  uploadObjectKey,
} from "../app/lib/storage";
import config from "../app/lib/config";

async function main(): Promise<void> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const staleJobs = await prisma.job.findMany({
    where: {
      OR: [{ status: Status.FAILED }, { createdAt: { lt: cutoff } }],
    },
  });

  for (const job of staleJobs) {
    const keys: string[] = [];
    if (job.audioFile) {
      keys.push(uploadObjectKey(job.audioFile));
      keys.push(resultObjectKey(job.audioFile));
    }
    await deleteObjects(keys);
    await prisma.job.delete({ where: { id: job.id } });
  }

  const remaining = await prisma.job.findMany({
    select: { audioFile: true, status: true },
  });
  const referenced = new Set<string>();
  for (const job of remaining) {
    if (!job.audioFile) {
      continue;
    }
    referenced.add(uploadObjectKey(job.audioFile));
    if (job.status === Status.FINISHED) {
      referenced.add(resultObjectKey(job.audioFile));
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
