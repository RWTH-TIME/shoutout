import { Job } from "../../../types/types";
import { PrismaClient } from "@prisma/client";
import { NextResponse, NextRequest } from "next/server";
import env from "../../utility/environment/config";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  },
});

async function deleteJob(data: Job) {
    try {
        const res = await prisma.job.delete({
          where: {
            name: data.name,
          },
        });
        return res
    } catch (error) {
        throw new Error("Something went wrong")
    }    
}


export const POST = async (request: NextRequest) => {
    const job: Job = await request.json();
    const res = await deleteJob(job)

    return NextResponse.json({res}, { status: 200 });
};
