import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const owner = process.env.SMOKE_OWNER_ID ?? "11111111-1111-1111-1111-111111111111";
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://admin:admin@localhost:5433/postgres?schema=public";

const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main(): Promise<void> {
  const prefix = randomBytes(4).toString("hex");
  const secret = randomBytes(24).toString("base64url");
  const token = `so_${prefix}_${secret}`;
  const hash = createHash("sha256").update(token).digest("hex");

  await prisma.apiKey.create({
    data: {
      owner,
      name: "smoke",
      prefix,
      hash,
      ownerEmail: "smoke@example.com",
    },
  });

  process.stdout.write(token);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
