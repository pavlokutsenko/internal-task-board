import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/http";
import { createColumnSchema } from "@/lib/validation";

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

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  const parsed = createColumnSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const order = await prisma.column.count();

  try {
    const column = await prisma.column.create({
      data: {
        name: parsed.data.name,
        order,
      },
      select: {
        id: true,
        name: true,
        order: true,
      },
    });

    return NextResponse.json(column, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Column name already exists" }, { status: 400 });
  }
}
