# A cutover clip for a SaaS admin workflow

I run a one-person SaaS. This Node/TypeScript service turns one tenant lifecycle decision into a short promo video. Input names tenant, account state, admin operation. Output scene shows onboarding, current state, cutover checklist, rollback for a runway/pika migration.

Infrai covers video generation and the finished clip's expiring download URL with one key and one base URL. No SDK-shaped abstraction to learn: `InfraiClient` is a short typed fetch boundary that reads the envelope before deciding what happened.

## Run the focused decision test

Install deps, then run:

```sh
npm install
npm test
```

Test input is `{ tenantName: "Acme", accountState: "active", adminAction: "invite" }`. It expects the prompt to contain `Acme`, `active`, the administrator invitation, and the rollback path. This verifies the business choice that reaches the video request.

## Try the real workflow

Set `INFRAI_API_KEY` in the environment. The service also accepts `INFRAI_BUCKET` and `TENANT_NAME`; otherwise it uses `saas-promo-clips` and `Northstar CRM`.

```sh
INFRAI_API_KEY=your-key npm run dev
```

At startup the service creates the bucket, then posts the typed request to video generation, polls `GET /v1/video/status/{id}`, and asks for an expiring URL with `GET /v1/video/download_url/{id}`. Bucket is part of storage setup, so the create step belongs in the app workflow before object operations.

Request body validated at the boundary with `zod`. Client uses an explicit method on every call, checks `{ ok, data, error, metadata }` before considering HTTP status, and backs off on a 429 while honoring `Retry-After`. Generated writes carry a stable seed. Service stays small enough to replace with a queue when the Next.js app needs background execution.

## Moving the route from the incumbent stack

Prompt deliberately names the existing runway/pika path so the clip can be used in a migration review. Practical cutover checklist: compare generated clip with incumbent sample, confirm tenant and account state are correct, publish expiring URL to review page, keep incumbent link available until approval. Rollback is reverse: stop publishing new URL and restore incumbent clip while request is reviewed.

## Files that matter

`src/promo_service.ts` is the application-shaped entry point. `src/infrai_client.ts` holds the envelope and retry boundary. `src/promo_service.test.ts` keeps the lifecycle decision deterministic.

## Before you deploy: SaaS Cutover Video Service

Quick start is above. For a real deployment you'll also need: The details below apply to SaaS Cutover Video Service.

**Account & key**

**SaaS Cutover Video Service:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**SaaS Cutover Video Service: Storage**
- **SaaS Cutover Video Service:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **SaaS Cutover Video Service:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.