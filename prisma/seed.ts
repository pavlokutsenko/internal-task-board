import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma";
import { hashPassword } from "../lib/auth/password";

const DEFAULT_PASSWORD = "Password123!";

const users = [
  { email: "alex@company.local", name: "Alex Carter" },
  { email: "maria@company.local", name: "Maria Lee" },
  { email: "jordan@company.local", name: "Jordan Kim" },
] as const;

const columns = [
  { name: "Todo", order: 0 },
  { name: "In Progress", order: 1 },
  { name: "Done", order: 2 },
] as const;

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const hashedPassword = await hashPassword(DEFAULT_PASSWORD);

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash: hashedPassword,
      },
      create: {
        email: user.email,
        name: user.name,
        passwordHash: hashedPassword,
      },
    });
  }

  for (const column of columns) {
    await prisma.column.upsert({
      where: { name: column.name },
      update: {
        order: column.order,
      },
      create: {
        name: column.name,
        order: column.order,
      },
    });
  }

  await prisma.$disconnect();

  console.log("Seed complete.");
  console.log("Users:");
  users.forEach((user) => {
    console.log(`- ${user.email} / ${DEFAULT_PASSWORD}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
