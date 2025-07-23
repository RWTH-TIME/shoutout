import { Job } from "../../../app/types/types";
import { PrismaClient } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";
import { pushToQueue, removeFromQueue } from "../utility/amqp";
import { authOptions } from "../auth/[...nextauth]/authOptions";
import { getServerSession } from "next-auth/next";
import env from "../utility/environment/config";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL
    }
  }
});

async function getJobsByOwner(owner: string) {
  return await prisma.job.findMany({
    where: { owner },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async function insertJob(data: Job, owner: string) {
  const res = await prisma.$transaction(async (tx) => {
    try {
      const res = await tx.job.create({
        data: {
          name: data.name,
          owner,
          audioFile: data.audioFile as string,
          participants: data.participants === 0 ? undefined : data.participants,
          language: data.language === "" ? undefined : data.language,
        },
      });
      return res;
    } catch (error) {
      console.error("Error inserting a job:", error);
      throw new Error("Something went wrong");
    }
  });

  await pushToQueue(data);
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
    console.error("Error deleting a job:", error);
    throw new Error("Something went wrong");
  }
}

export const GET = async () => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owner = session.user.id;
  const res = await getJobsByOwner(owner);
  return NextResponse.json({ jobs: res }, { status: 200 });
};

export const POST = async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job: Job = await request.json();
  const owner = session.user.id;

  const res = await insertJob(job, owner);
  return NextResponse.json({ res }, { status: 200 });
};

export const DELETE = async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams;
  const jobName = query.get("jobName");
  if (!jobName) {
    return NextResponse.json({ error: "Missing jobName" }, { status: 400 });
  }

  const job = await prisma.job.findUnique({
    where: { name: jobName },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.owner !== session.user.id) {
    return NextResponse.json({ error: "Forbidden: You do not own this job" }, { status: 403 });
  }

  const res = await deleteJob(jobName);
  return NextResponse.json({ res }, { status: 200 });
};
