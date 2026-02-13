export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cotClient, normalizeStatus } from "@/lib/providers/cot/client";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const ok = cotClient.verifyWebhook(new Headers(req.headers), rawBody);
  if (!ok) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  let payload: any = null;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  /**
   * EXPECTED (placeholder) payload shape:
   * {
   *   orderId: "cot_abc123",
   *   status: "in_progress|completed|needs_info|failed",
   *   message: "optional",
   *   reference: { orderId: "<your-order-id>" },
   *   deliverables: [{ kind, url, metadata }]
   * }
   */
  const providerOrderId = payload.orderId;
  const providerStatus = payload.status ?? "in_progress";
  const message = payload.message ?? "Update from COT.";

  // Find local order by providerOrderId (preferred), fallback to reference.orderId
  const localOrder =
    (providerOrderId
      ? await prisma.order.findFirst({ where: { providerOrderId } })
      : null) ??
    (payload?.reference?.orderId
      ? await prisma.order.findUnique({ where: { id: payload.reference.orderId } })
      : null);

  if (!localOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const normalized = normalizeStatus(providerStatus);

  await prisma.order.update({
    where: { id: localOrder.id },
    data: { status: normalized, providerMeta: { ...(localOrder.providerMeta as any), providerStatus } },
  });

  await prisma.orderEvent.create({
    data: {
      orderId: localOrder.id,
      status: normalized,
      message,
      rawProvider: payload,
    },
  });

  const deliverables = Array.isArray(payload.deliverables) ? payload.deliverables : [];
  for (const d of deliverables) {
    if (!d?.url) continue;
    await prisma.deliverable.create({
      data: {
        orderId: localOrder.id,
        kind: d.kind ?? "deliverable",
        storageUrl: d.url,
        metadata: d.metadata ?? {},
      },
    });
  }

  return NextResponse.json({ ok: true });
}
