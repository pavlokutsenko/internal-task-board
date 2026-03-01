import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/request";
import { prisma } from "@/lib/db";
import { readJson } from "@/lib/http";
import { ingestTasksSchema } from "@/lib/validation";

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

function getIntakeApiKeyFromRequest(request: NextRequest) {
  const headerApiKey = request.headers.get("x-api-key")?.trim();

  if (headerApiKey) {
    return headerApiKey;
  }

  return getBearerToken(request);
}

function safeKeyCompare(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}

export async function POST(request: NextRequest) {
  const configuredApiKey = process.env.TASKS_INGEST_API_KEY?.trim();

  if (!configuredApiKey) {
    return NextResponse.json(
      { error: "TASKS_INGEST_API_KEY is not configured on server." },
      { status: 503 },
    );
  }

  const providedApiKey = getIntakeApiKeyFromRequest(request);

  if (!providedApiKey || !safeKeyCompare(providedApiKey, configuredApiKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJson(request);
  const parsed = ingestTasksSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const items = "tasks" in parsed.data ? parsed.data.tasks : [parsed.data];

  const createdTasks = await prisma.$transaction(async (tx) => {
    const columns = await tx.column.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
      },
    });

    if (columns.length === 0) {
      throw new Error("NO_COLUMNS");
    }

    const columnById = new Map(columns.map((column) => [column.id, column]));
    const columnByName = new Map(columns.map((column) => [column.name.toLowerCase(), column]));

    const assigneeIds = new Set<string>();
    const assigneeEmails = new Set<string>();

    for (const item of items) {
      if (item.assigneeId) {
        assigneeIds.add(item.assigneeId);
      }
      if (item.assigneeEmail) {
        assigneeEmails.add(item.assigneeEmail.toLowerCase());
      }
    }

    const users =
      assigneeIds.size > 0 || assigneeEmails.size > 0
        ? await tx.user.findMany({
            where: {
              OR: [
                ...(assigneeIds.size > 0 ? [{ id: { in: Array.from(assigneeIds) } }] : []),
                ...(assigneeEmails.size > 0
                  ? [{ email: { in: Array.from(assigneeEmails) } }]
                  : []),
              ],
            },
            select: {
              id: true,
              email: true,
            },
          })
        : [];

    const userById = new Map(users.map((user) => [user.id, user]));
    const userByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));
    const nextOrderByColumn = new Map<string, number>();
    const created: Array<
      Awaited<ReturnType<typeof tx.task.create>>
    > = [];

    for (const item of items) {
      let columnId = columns[0]!.id;

      if (item.columnId) {
        const column = columnById.get(item.columnId);

        if (!column) {
          throw new Error(`COLUMN_NOT_FOUND:${item.columnId}`);
        }

        columnId = column.id;
      } else if (item.columnName) {
        const column = columnByName.get(item.columnName.toLowerCase());

        if (!column) {
          throw new Error(`COLUMN_NOT_FOUND:${item.columnName}`);
        }

        columnId = column.id;
      }

      let assigneeId: string | null = null;

      if (item.assigneeId !== undefined) {
        if (item.assigneeId === null) {
          assigneeId = null;
        } else {
          const user = userById.get(item.assigneeId);

          if (!user) {
            throw new Error(`ASSIGNEE_NOT_FOUND:${item.assigneeId}`);
          }

          assigneeId = user.id;
        }
      } else if (item.assigneeEmail !== undefined) {
        if (item.assigneeEmail === null) {
          assigneeId = null;
        } else {
          const user = userByEmail.get(item.assigneeEmail.toLowerCase());

          if (!user) {
            throw new Error(`ASSIGNEE_NOT_FOUND:${item.assigneeEmail}`);
          }

          assigneeId = user.id;
        }
      }

      if (!nextOrderByColumn.has(columnId)) {
        const currentCount = await tx.task.count({
          where: { columnId },
        });

        nextOrderByColumn.set(columnId, currentCount);
      }

      const order = nextOrderByColumn.get(columnId)!;

      const task = await tx.task.create({
        data: {
          title: item.title,
          description: item.description ?? "",
          columnId,
          order,
          assigneeId,
        },
        include: taskInclude,
      });

      nextOrderByColumn.set(columnId, order + 1);
      created.push(task);
    }

    return created;
  }).catch((error: unknown) => {
    if (error instanceof Error) {
      if (error.message === "NO_COLUMNS") {
        return { type: "NO_COLUMNS" as const };
      }

      if (error.message.startsWith("COLUMN_NOT_FOUND:")) {
        const value = error.message.slice("COLUMN_NOT_FOUND:".length);
        return { type: "COLUMN_NOT_FOUND" as const, value };
      }

      if (error.message.startsWith("ASSIGNEE_NOT_FOUND:")) {
        const value = error.message.slice("ASSIGNEE_NOT_FOUND:".length);
        return { type: "ASSIGNEE_NOT_FOUND" as const, value };
      }
    }

    throw error;
  });

  if (Array.isArray(createdTasks)) {
    return NextResponse.json(
      {
        created: createdTasks.length,
        tasks: createdTasks,
      },
      { status: 201 },
    );
  }

  if (createdTasks.type === "NO_COLUMNS") {
    return NextResponse.json({ error: "No columns available. Create a column first." }, { status: 400 });
  }

  if (createdTasks.type === "COLUMN_NOT_FOUND") {
    return NextResponse.json({ error: `Column not found: ${createdTasks.value}` }, { status: 400 });
  }

  return NextResponse.json({ error: `Assignee not found: ${createdTasks.value}` }, { status: 400 });
}
