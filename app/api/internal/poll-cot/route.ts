export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cotClient, normalizeStatus } from "@/lib/providers/cot/client";

const ACTIVE_STATUSES = ["SUBMITTED","ACCEPTED","IN_PROGRESS","AWAITING_CUSTOMER"] as const;

export async function POST(req: Request) {
  const secret = req.headers.get("x-internal-secret");
  if (!process.env.INTERNAL_POLL_SECRET || secret !== process.env.INTERNAL_POLL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeOrders = await prisma.order.findMany({
    where: { status: { in: ACTIVE_STATUSES as any }, provider: "COT", NOT: { providerOrderId: null } },
    take: 50,
  });

  let updated = 0;

  for (const order of activeOrders) {
    try {
      const st = await cotClient.getOrderStatus(order.providerOrderId!);
      const normalized = normalizeStatus(st.providerStatus);

      if (normalized !== order.status) {
        await prisma.order.update({ where: { id: order.id }, data: { status: normalized } });
        await prisma.orderEvent.create({
          data: {
            orderId: order.id,
            status: normalized,
            message: st.message ?? `Polled COT: ${st.providerStatus}`,
            rawProvider: st,
          },
        });
        updated += 1;
      }

      for (const d of st.deliverables ?? []) {
        if (!d.url) continue;
        await prisma.deliverable.create({
          data: {
            orderId: order.id,
            kind: d.kind ?? "deliverable",
            storageUrl: d.url,
            metadata: d.metadata ?? {},
          },
        });
      }
    } catch (e: any) {
      // If polling errors repeatedly, you might add a retry counter in providerMeta
      await prisma.orderEvent.create({
        data: {
          orderId: order.id,
          status: order.status,
          message: `Polling error: ${e?.message ?? "unknown"}`,
          rawProvider: { error: e?.message ?? "unknown" },
        },
      });
    }
  }

  return NextResponse.json({ ok: true, checked: activeOrders.length, updated });
}
