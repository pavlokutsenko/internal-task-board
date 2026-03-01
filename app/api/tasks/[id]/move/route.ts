import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth/request";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/http";
import { moveTaskSchema } from "@/lib/validation";

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
  const parsed = moveTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({
    where: { id: params.id },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const targetColumn = await prisma.column.findUnique({
    where: { id: parsed.data.toColumnId },
    select: { id: true },
  });

  if (!targetColumn) {
    return NextResponse.json({ error: "Target column not found" }, { status: 400 });
  }

  if (task.columnId === parsed.data.toColumnId) {
    const columnTaskCount = await prisma.task.count({
      where: { columnId: task.columnId },
    });
    const normalizedOrder = Math.max(0, Math.min(parsed.data.toOrder, columnTaskCount - 1));

    if (normalizedOrder === task.order) {
      const currentTask = await prisma.task.findUnique({
        where: { id: task.id },
        include: taskInclude,
      });

      return NextResponse.json(currentTask);
    }
  }

  const updatedTask = await prisma.$transaction(async (tx) => {
    let normalizedOrder = parsed.data.toOrder;

    if (task.columnId === parsed.data.toColumnId) {
      const columnTaskCount = await tx.task.count({
        where: { columnId: task.columnId },
      });

      normalizedOrder = Math.max(0, Math.min(parsed.data.toOrder, columnTaskCount - 1));

      if (normalizedOrder > task.order) {
        await tx.task.updateMany({
          where: {
            columnId: task.columnId,
            order: {
              gt: task.order,
              lte: normalizedOrder,
            },
          },
          data: {
            order: {
              decrement: 1,
            },
          },
        });
      }

      if (normalizedOrder < task.order) {
        await tx.task.updateMany({
          where: {
            columnId: task.columnId,
            order: {
              gte: normalizedOrder,
              lt: task.order,
            },
          },
          data: {
            order: {
              increment: 1,
            },
          },
        });
      }
    } else {
      const targetTaskCount = await tx.task.count({
        where: { columnId: parsed.data.toColumnId },
      });

      normalizedOrder = Math.max(0, Math.min(parsed.data.toOrder, targetTaskCount));

      await tx.task.updateMany({
        where: {
          columnId: task.columnId,
          order: {
            gt: task.order,
          },
        },
        data: {
          order: {
            decrement: 1,
          },
        },
      });

      await tx.task.updateMany({
        where: {
          columnId: parsed.data.toColumnId,
          order: {
            gte: normalizedOrder,
          },
        },
        data: {
          order: {
            increment: 1,
          },
        },
      });
    }

    const movedTask = await tx.task.update({
      where: { id: task.id },
      data: {
        columnId: parsed.data.toColumnId,
        order: normalizedOrder,
      },
      include: taskInclude,
    });

    await tx.taskHistory.create({
      data: {
        taskId: task.id,
        action: "moved",
        fromValue: {
          columnId: task.columnId,
          order: task.order,
        },
        toValue: {
          columnId: movedTask.columnId,
          order: movedTask.order,
        },
        userId,
      },
    });

    return movedTask;
  });

  return NextResponse.json(updatedTask);
}
