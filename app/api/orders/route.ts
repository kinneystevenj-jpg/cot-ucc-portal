import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { CreateOrderSchema } from "@/lib/validation";

export async function POST(req: Request) {
  console.log(
  "DATABASE_URL starts with:",
  (process.env.DATABASE_URL || "").slice(0, 20)
);

  const json = await req.json().catch(() => null);
  const parsed = CreateOrderSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;

  const order = await prisma.order.create({
    data: {
      userId: input.userId,
      stateCode: input.stateCode,
      deadlineAt: new Date(input.deadlineAt),
      rushLevel: input.rushLevel,
      status: "DRAFT",
      items: {
        create: input.items.map((i) => ({
          type: i.type,
          payload: i.payload,
          options: i.options ?? {},
        })),
      },
      events: {
        create: {
          status: "DRAFT",
          message: "Order created (draft).",
        },
      },
    },
  });

  return NextResponse.json({ id: order.id });
}
