import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cotClient, normalizeStatus } from "@/lib/providers/cot/client";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status !== "DRAFT") {
    return NextResponse.json({ error: "Order already submitted or processed." }, { status: 409 });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: "SUBMITTED" },
  });
  await prisma.orderEvent.create({
    data: { orderId: order.id, status: "SUBMITTED", message: "Submitted to COT." },
  });

  // Build provider payload (shape will depend on COT docs)
  const providerPayload = {
    idempotencyKey: order.id,
    stateCode: order.stateCode,
    deadlineAt: order.deadlineAt,
    rushLevel: order.rushLevel,
    items: order.items.map((i) => ({ type: i.type, payload: i.payload, options: i.options })),
    reference: { orderId: order.id },
  };

  try {
    const result = await cotClient.createOrder(providerPayload);
    const normalized = normalizeStatus(result.providerStatus);

    await prisma.order.update({
      where: { id: order.id },
      data: {
        providerOrderId: result.providerOrderId,
        status: normalized,
        providerMeta: { ...(order.providerMeta as any), providerStatus: result.providerStatus },
      },
    });

    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        status: normalized,
        message: result.message ?? `COT acknowledged order (${result.providerStatus}).`,
        rawProvider: { providerStatus: result.providerStatus, providerOrderId: result.providerOrderId },
      },
    });

    return NextResponse.json({ ok: true, providerOrderId: result.providerOrderId, status: normalized });
  } catch (e: any) {
    await prisma.order.update({ where: { id: order.id }, data: { status: "FAILED" } });
    await prisma.orderEvent.create({
      data: { orderId: order.id, status: "FAILED", message: `COT submission failed: ${e?.message ?? "unknown error"}` },
    });
    return NextResponse.json({ error: "COT submission failed", detail: e?.message }, { status: 502 });
  }
}
