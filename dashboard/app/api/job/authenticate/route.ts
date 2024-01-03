import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import env from "../../utility/environment/config";
import bcrypt from "bcrypt";

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: env.DATABASE_URL
        }
    }
})

async function getJobPassword(jobName: string) {
    const res = await prisma.job.findUnique({
        where: {
            name: jobName
        },
        select: {
            password: true,
        }
    })
    return res?.password
}

export const POST = async (request: NextRequest) => {
    const data = await request.json();

    // TODO: use upcomming jobID (Issue#24)
    const jobPassword = await getJobPassword(data.name);
    
    if(!jobPassword) {
        return NextResponse.json(
            {status: 400} // invalid argument
        )
    }

    try {
        const passwordMatch = await bcrypt.compare(data.password, jobPassword)
        if(passwordMatch) return NextResponse.json({}, {status: 200})
        else return NextResponse.json({}, {status: 401})
    } catch (err) {
        return NextResponse.json({status: 500})
    }
    
}