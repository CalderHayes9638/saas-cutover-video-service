import { z } from "zod";
import { InfraiClient } from "./infrai_client.ts";

export const promoRequest = z.object({
  tenantName: z.string().min(1),
  accountState: z.enum(["trial", "active", "suspended"]),
  adminAction: z.enum(["invite", "rotate", "deactivate"])
});
export type PromoRequest = z.infer<typeof promoRequest>;

export function buildPrompt(input: PromoRequest): string {
  const action = { invite: "invite an administrator", rotate: "rotate an access credential", deactivate: "deactivate an account" }[input.adminAction];
  return `B2B SaaS admin console for ${input.tenantName}: show tenant onboarding, an ${input.accountState} account, and an admin who can ${action}. Finish with a clear migration cutover checklist and rollback path from runway/pika.`;
}

type Video = { id: string; status?: string; state?: string };
type Download = { url: string };

export async function createPromo(input: unknown, client = new InfraiClient()): Promise<{ videoId: string; downloadUrl: string }> {
  const request = promoRequest.parse(input);
  const bucket = process.env.INFRAI_BUCKET ?? "saas-promo-clips";
  await client.request("/storage/bucket/create", { method: "POST", body: { name: bucket } });
  const video = await client.request<Video>("/video/generate", {
    method: "POST",
    body: { prompt: buildPrompt(request), model: "auto", resolution: "720p", duration_seconds: 8, aspect_ratio: "16:9", seed: 7, negative_prompt: "", reference_image: "" }
  });
  let current = video;
  for (let attempt = 0; attempt < 120 && !["completed", "succeeded", "done"].includes(current.status ?? current.state ?? ""); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    current = await client.request<Video>(`/video/status/${video.id}`, { method: "GET" });
  }
  if (!["completed", "succeeded", "done"].includes(current.status ?? current.state ?? "")) throw new Error("video generation did not finish");
  const signed = await client.request<Download>(`/video/download_url/${video.id}`, { method: "GET" });
  return { videoId: video.id, downloadUrl: signed.url };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const body = { tenantName: process.env.TENANT_NAME ?? "Northstar CRM", accountState: "active", adminAction: "invite" };
  createPromo(body).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
}
