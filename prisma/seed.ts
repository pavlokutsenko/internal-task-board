import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { hashPassword } from "../lib/auth/password";

function getSeedPassword() {
  const value = process.env.SEED_DEFAULT_PASSWORD;

  if (!value) {
    throw new Error("SEED_DEFAULT_PASSWORD is not set");
  }

  return value;
}

function shouldForcePasswordReset() {
  return process.env.SEED_FORCE_PASSWORD_RESET === "true";
}

const users = [
  { email: "pasha@pog.sandbox", name: "Pasha" },
  { email: "oleg@pog.sandbox", name: "Oleg" },
  { email: "gena@pog.sandbox", name: "Gena" },
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

  const seedPassword = getSeedPassword();
  const forcePasswordReset = shouldForcePasswordReset();

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const hashedPassword = await hashPassword(seedPassword);

  for (const user of users) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
      select: { id: true },
    });

    if (!existing) {
      await prisma.user.create({
        data: {
          email: user.email,
          name: user.name,
          passwordHash: hashedPassword,
        },
      });
      continue;
    }

    await prisma.user.update({
      where: { email: user.email },
      data: {
        name: user.name,
        ...(forcePasswordReset ? { passwordHash: hashedPassword } : {}),
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
  console.log("Users ensured:");
  users.forEach((user) => console.log(`- ${user.email}`));
  console.log(`Password reset mode: ${forcePasswordReset ? "enabled" : "disabled"}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
