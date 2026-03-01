import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const columns = await prisma.column.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      order: true,
    },
  });

  return NextResponse.json(columns);
}
