import { Job } from "../../../app/types/types";
import { PrismaClient } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";
import { pushToQueue } from "../utility/amqp";
import env from "../utility/environment/config";
import bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL
    }
  }
});

async function getAllJobs() {
  const res = await prisma.job.findMany();
  return res.map(({ password, ...rest }) => ({
    ...rest,
    isProtected: password !== null && password !== undefined,
  }));
}

async function insertJob(data: Job) {
  let passwordHash: string | undefined = undefined
  if(data.password !== "") passwordHash = await bcrypt.hash(data.password, 10)
  const res = await prisma.$transaction(async (tx) => {
    try {
      const res = await tx.job.create({
        data: {
          name: data.name,
          audioFile: data.audioFile as string,
          participants: data.participants === 0 ? undefined : data.participants,
          language: data.language === "" ? undefined : data.language,
          password: passwordHash
        },
      });
      return res
    } catch (error) {
      throw new Error("Something went wrong");
    }
  });
  await pushToQueue(data);
  return res;
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
