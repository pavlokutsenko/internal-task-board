import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const params = await context.params;
  const task = await prisma.task.findUnique({
    where: { id: params.id },
    select: { id: true },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const history = await prisma.taskHistory.findMany({
    where: { taskId: params.id },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({ history });
}
