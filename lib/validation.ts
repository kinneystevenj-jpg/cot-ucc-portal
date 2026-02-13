import { z } from "zod";

export const OrderItemSchema = z.object({
  type: z.string(),
  payload: z.record(z.any()),
  options: z.record(z.any()).optional().default({}),
});

export const CreateOrderSchema = z.object({
  userId: z.string().min(1),
  stateCode: z.string().length(2),
  deadlineAt: z.string().datetime(),
  rushLevel: z.enum(["standard", "rush"]).default("standard"),
  items: z.array(OrderItemSchema).min(1),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
