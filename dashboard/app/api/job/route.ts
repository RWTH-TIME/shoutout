import { Job } from "../../../app/types/types";
import { PrismaClient } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";
import { pushToQueue } from "../utility/amqp";
import env from "../utility/environment/config";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL
    }
  }
});

async function getAllJobs() {
  return await prisma.job.findMany();
}

async function insertJob(data: Job) {
  return await prisma.$transaction(async (tx) => {
    try {
      const res = await tx.job.create({
        data: {
          name: data.name,
          audioFile: data.audioFile as string,
          participants: data.participants === 0 ? undefined : data.participants,
          language: data.language === "" ? undefined : data.language,
        },
      });
      await pushToQueue(data);
      return res;
    } catch (error) {
      throw new Error("Something went wrong");
    }
  });
}

export const GET = async () => {
  const res = await getAllJobs();
  return NextResponse.json({ jobs: res }, { status: 200 });
};

export const POST = async (request: NextRequest) => {
  const job: Job = await request.json();
  const res = await insertJob(job);

  return NextResponse.json({ res }, { status: 200 });
};
