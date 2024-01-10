import { Job } from "../../../app/types/types";
import { PrismaClient } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";
import { pushToQueue, removeFromQueue } from "../utility/amqp";
import env from "../utility/environment/config";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  },
});

async function getAllJobs() {
  return await prisma.job.findMany();
}

async function insertJob(data: Job, fileNames: Array<string>) {
  const res = await prisma.$transaction(async (tx) => {
    try {
      const res = await tx.job.create({
        data: {
          name: data.name,
          audioFile: data.audioFile as string,
          participants: data.participants === 0 ? undefined : data.participants,
          language: data.language === "" ? undefined : data.language,
        },
      });
      return res;
    } catch (error) {
      console.error(error);
      throw new Error("Something went wrong");
    }
  });
  fileNames.map(async (fileName: string) => {
    await pushToQueue(data.name, fileName);
  });
  return res;
}

async function deleteJob(jobName: string) {
  try {
    const res = await prisma.job.delete({
      where: {
        name: jobName,
      },
    });
    await removeFromQueue(jobName);
    return res;
  } catch (error) {
    throw new Error("Something went wrong");
  }
}

export const GET = async () => {
  const res = await getAllJobs();
  return NextResponse.json({ jobs: res }, { status: 200 });
};

export const POST = async (request: NextRequest) => {
  const data = await request.json();

  console.log(data);
  const job: Job = data.job;
  const fileNames: Array<string> = data.fileNames;
  const res = await insertJob(job, fileNames);

  return NextResponse.json({ res }, { status: 200 });
};

export const DELETE = async (request: NextRequest) => {
  const query = request.nextUrl.searchParams;
  const jobName = query.get("jobName");
  if (jobName === null || jobName == "") throw new Error("invalid argument");
  const res = await deleteJob(jobName);

  return NextResponse.json({ res }, { status: 200 });
};
