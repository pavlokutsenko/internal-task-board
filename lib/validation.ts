import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().max(2000).optional().default(""),
  columnId: z.string().uuid(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().min(1).max(140).optional(),
    description: z.string().max(2000).optional(),
  })
  .refine((value) => value.title !== undefined || value.description !== undefined, {
    message: "Provide title or description",
  });

export const moveTaskSchema = z.object({
  toColumnId: z.string().uuid(),
  toOrder: z.number().int().min(0),
});

export const assignTaskSchema = z.object({
  assigneeId: z.string().uuid().nullable(),
});
