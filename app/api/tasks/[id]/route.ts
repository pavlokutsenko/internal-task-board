import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/request";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/http";
import { updateTaskSchema } from "@/lib/validation";

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
  const parsed = updateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const currentTask = await prisma.task.findUnique({
    where: { id: params.id },
  });

  if (!currentTask) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const nextTitle = parsed.data.title ?? currentTask.title;
  const nextDescription = parsed.data.description ?? currentTask.description;

  if (nextTitle === currentTask.title && nextDescription === currentTask.description) {
    const unchangedTask = await prisma.task.findUnique({
      where: { id: params.id },
      include: taskInclude,
    });

    return NextResponse.json(unchangedTask);
  }

  const updatedTask = await prisma.$transaction(async (tx) => {
    const task = await tx.task.update({
      where: { id: params.id },
      data: {
        title: nextTitle,
        description: nextDescription,
      },
      include: taskInclude,
    });

    await tx.taskHistory.create({
      data: {
        taskId: task.id,
        action: "edited",
        fromValue: {
          title: currentTask.title,
          description: currentTask.description,
        },
        toValue: {
          title: nextTitle,
          description: nextDescription,
        },
        userId,
      },
    });

    return task;
  });

  return NextResponse.json(updatedTask);
}
