import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/http";
import { createTaskSchema } from "@/lib/validation";

export const runtime = "nodejs";

const taskInclude = {
  assignee: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

export async function GET() {
  const [tasks, users] = await Promise.all([
    prisma.task.findMany({
      orderBy: [{ column: { order: "asc" } }, { order: "asc" }],
      include: taskInclude,
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
      },
    }),
  ]);

  return NextResponse.json({ tasks, users });
}

export async function POST(request: NextRequest) {
  const body = await readJson(request);
  const parsed = createTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const column = await prisma.column.findUnique({
    where: { id: parsed.data.columnId },
    select: { id: true },
  });

  if (!column) {
    return NextResponse.json({ error: "Column not found" }, { status: 400 });
  }

  if (parsed.data.assigneeId) {
    const assignee = await prisma.user.findUnique({
      where: { id: parsed.data.assigneeId },
      select: { id: true },
    });

    if (!assignee) {
      return NextResponse.json({ error: "Assignee not found" }, { status: 400 });
    }
  }

  const order = await prisma.task.count({
    where: { columnId: parsed.data.columnId },
  });

  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      columnId: parsed.data.columnId,
      order,
      assigneeId: parsed.data.assigneeId ?? null,
    },
    include: taskInclude,
  });

  return NextResponse.json(task, { status: 201 });
}
