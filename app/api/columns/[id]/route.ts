import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/http";
import { updateColumnSchema } from "@/lib/validation";

export const runtime = "nodejs";

type ParamsContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: ParamsContext) {
  const params = await context.params;
  const body = await readJson(request);
  const parsed = updateColumnSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const column = await prisma.column.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, order: true },
  });

  if (!column) {
    return NextResponse.json({ error: "Column not found" }, { status: 404 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      let nextName = column.name;
      let nextOrder = column.order;

      if (parsed.data.name && parsed.data.name !== column.name) {
        const renamed = await tx.column.update({
          where: { id: params.id },
          data: { name: parsed.data.name },
          select: { id: true, name: true, order: true },
        });
        nextName = renamed.name;
      }

      if (parsed.data.order !== undefined && parsed.data.order !== column.order) {
        const total = await tx.column.count();
        nextOrder = Math.max(0, Math.min(parsed.data.order, total - 1));

        if (nextOrder !== column.order) {
          await tx.column.update({
            where: { id: params.id },
            data: { order: -1 },
          });

          if (nextOrder > column.order) {
            const toShift = await tx.column.findMany({
              where: {
                order: {
                  gt: column.order,
                  lte: nextOrder,
                },
              },
              orderBy: {
                order: "asc",
              },
              select: {
                id: true,
                order: true,
              },
            });

            for (const shiftedColumn of toShift) {
              await tx.column.update({
                where: { id: shiftedColumn.id },
                data: {
                  order: shiftedColumn.order - 1,
                },
              });
            }
          } else {
            const toShift = await tx.column.findMany({
              where: {
                order: {
                  gte: nextOrder,
                  lt: column.order,
                },
              },
              orderBy: {
                order: "desc",
              },
              select: {
                id: true,
                order: true,
              },
            });

            for (const shiftedColumn of toShift) {
              await tx.column.update({
                where: { id: shiftedColumn.id },
                data: {
                  order: shiftedColumn.order + 1,
                },
              });
            }
          }

          await tx.column.update({
            where: { id: params.id },
            data: { order: nextOrder },
          });
        }
      }

      return {
        id: column.id,
        name: nextName,
        order: nextOrder,
      };
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Could not update column" }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: ParamsContext) {
  const params = await context.params;

  const column = await prisma.column.findUnique({
    where: { id: params.id },
    select: { id: true, order: true },
  });

  if (!column) {
    return NextResponse.json({ error: "Column not found" }, { status: 404 });
  }

  const taskCount = await prisma.task.count({
    where: { columnId: column.id },
  });

  if (taskCount > 0) {
    return NextResponse.json(
      { error: "Column must be empty before deletion" },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.column.delete({
      where: { id: column.id },
    });

    const toShift = await tx.column.findMany({
      where: {
        order: {
          gt: column.order,
        },
      },
      orderBy: {
        order: "asc",
      },
      select: {
        id: true,
        order: true,
      },
    });

    for (const shiftedColumn of toShift) {
      await tx.column.update({
        where: { id: shiftedColumn.id },
        data: {
          order: shiftedColumn.order - 1,
        },
      });
    }
  });

  return NextResponse.json({ success: true });
}
