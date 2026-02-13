type ProviderCreateResult = {
  providerOrderId: string;
  providerStatus: string; // raw
  message?: string;
};

type ProviderStatusResult = {
  providerStatus: string; // raw
  message?: string;
  deliverables?: Array<{ kind: string; url: string; metadata?: any }>;
};

export function normalizeStatus(providerStatus: string):
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "AWAITING_CUSTOMER"
  | "COMPLETED"
  | "FAILED" {
  const s = providerStatus.toLowerCase();
  if (["accepted", "received", "queued"].includes(s)) return "ACCEPTED";
  if (["in_progress", "processing", "working"].includes(s)) return "IN_PROGRESS";
  if (["needs_info", "awaiting_customer", "blocked"].includes(s)) return "AWAITING_CUSTOMER";
  if (["completed", "done", "fulfilled"].includes(s)) return "COMPLETED";
  return "FAILED";
}

/**
 * NOTE: This is a stub. Replace fetch URLs/headers/payload shapes
 * once you have COT's real API documentation.
 */
export const cotClient = {
  async createOrder(payload: any): Promise<ProviderCreateResult> {
    // Example placeholder (disabled by default)
    if (!process.env.COT_BASE_URL) {
      // Simulate a provider order id for local dev
      return {
        providerOrderId: "cot_" + Math.random().toString(36).slice(2),
        providerStatus: "accepted",
        message: "Simulated COT acceptance (set COT_BASE_URL to enable real calls).",
      };
    }

    const res = await fetch(`${process.env.COT_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.COT_API_KEY ?? ""}`,
        "Idempotency-Key": payload.idempotencyKey ?? "",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`COT createOrder failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    return {
      providerOrderId: data.id,
      providerStatus: data.status ?? "accepted",
      message: data.message,
    };
  },

  async getOrderStatus(providerOrderId: string): Promise<ProviderStatusResult> {
    if (!process.env.COT_BASE_URL) {
      // Local dev simulation: randomly progress
      const statuses = ["in_progress", "needs_info", "completed"];
      const providerStatus = statuses[Math.floor(Math.random() * statuses.length)];
      return {
        providerStatus,
        message: "Simulated status update from COT.",
        deliverables:
          providerStatus === "completed"
            ? [{ kind: "results_pdf", url: "https://example.com/results.pdf" }]
            : [],
      };
    }

    const res = await fetch(`${process.env.COT_BASE_URL}/orders/${providerOrderId}`, {
      headers: { Authorization: `Bearer ${process.env.COT_API_KEY ?? ""}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`COT getOrderStatus failed: ${res.status} ${text}`);
    }
    const data = await res.json();
    return {
      providerStatus: data.status,
      message: data.message,
      deliverables: data.deliverables ?? [],
    };
  },

  verifyWebhook(headers: Headers, rawBody: string): boolean {
    // Placeholder HMAC verification.
    // If COT provides signature headers like 'x-cot-signature', implement here.
    const secret = process.env.COT_WEBHOOK_SECRET;
    if (!secret) return true; // allow in dev
    // TODO: implement real verification once signature scheme is known
    return true;
  },
};
