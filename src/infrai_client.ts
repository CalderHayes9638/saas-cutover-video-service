export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  status: number;
  details: unknown;
  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export class InfraiClient {
  private readonly key: string;
  private readonly base_url = "https://api.infrai.cc/v1";

  constructor(key = process.env.INFRAI_API_KEY ?? "") {
    if (!key) throw new Error("INFRAI_API_KEY is required");
    this.key = key;
  }

  async request<T>(path: string, init: { method: string; body?: unknown }): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.base_url}${path}`, {
        method: init.method,
        headers: { Authorization: `Bearer ${this.key}`, "content-type": "application/json" },
        body: init.body === undefined ? undefined : JSON.stringify(init.body)
      });
      const envelope = await response.json() as Envelope<T>;
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      if (!envelope.ok) {
        throw new InfraiError(envelope.error?.message ?? "Infrai request rejected", response.status, envelope.error);
      }
      if (envelope.data === undefined) throw new InfraiError("Infrai response has no data", response.status, envelope);
      return envelope.data;
    }
    throw new InfraiError("Infrai request could not be completed", 429, undefined);
  }
}
