export const runtime = "nodejs";

import { prisma } from "@/lib/db";

function encoder() {
  return new TextEncoder();
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const orderId = params.id;
  const url = new URL(req.url);
  const since = url.searchParams.get("since"); // optional ISO timestamp

  let lastAt = since ? new Date(since) : new Date(0);

  const stream = new ReadableStream({
    async start(controller) {
      const enc = encoder();
      const send = (eventName: string, data: any) => {
        controller.enqueue(enc.encode(`event: ${eventName}\n`));
        controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // initial hello
      send("order_event", {
        id: "hello",
        at: new Date().toISOString(),
        status: "IN_PROGRESS",
        message: "Connected to live updates.",
      });

      const interval = setInterval(async () => {
        try {
          const latest = await prisma.orderEvent.findFirst({
            where: { orderId },
            orderBy: { at: "desc" },
          });
          if (latest && latest.at > lastAt) {
            lastAt = latest.at;
            send("order_event", {
              id: latest.id,
              at: latest.at.toISOString(),
              status: latest.status,
              message: latest.message,
            });
          }
        } catch (e) {
          // ignore
        }
      }, 1000);

      const abort = () => {
        clearInterval(interval);
        controller.close();
      };

      // Close stream on client disconnect
      // @ts-ignore
      req.signal?.addEventListener?.("abort", abort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
