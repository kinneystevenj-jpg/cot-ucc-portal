import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const events = await prisma.orderEvent.findMany({
    where: { orderId: params.id },
    orderBy: { at: "desc" },
  });
  return NextResponse.json(events);
}
