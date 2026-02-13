import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const deliverables = await prisma.deliverable.findMany({
    where: { orderId: params.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(deliverables);
}
