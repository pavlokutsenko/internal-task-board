import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/request";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/http";
import { assignTaskSchema } from "@/lib/validation";

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

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> },
) {
  const params = await context.params;
  const userId = getAuthenticatedUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJson(request);
  const parsed = assignTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({
    where: { id: params.id },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
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

  const updatedTask = await prisma.$transaction(async (tx) => {
    const nextAssigneeId = parsed.data.assigneeId;

    const updated = await tx.task.update({
      where: { id: params.id },
      data: {
        assigneeId: nextAssigneeId,
      },
      include: taskInclude,
    });

    await tx.taskHistory.create({
      data: {
        taskId: task.id,
        action: "assigned",
        fromValue: {
          assigneeId: task.assigneeId,
        },
        toValue: {
          assigneeId: nextAssigneeId,
        },
        userId,
      },
    });

    return updated;
  });

  return NextResponse.json(updatedTask);
}
