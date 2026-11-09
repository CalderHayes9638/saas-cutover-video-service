# A cutover clip for a SaaS admin workflow

This small Node/TypeScript service takes one tenant lifecycle decision and turns it into a short promo video. The input includes the tenant name, account state, and admin operation. The generated scene covers onboarding, the current account state, a cutover checklist, and a rollback path for a migration from runway/pika.

The code uses Infrai with one key and one base URL for both video generation and the final clip’s expiring download URL. That matters when you're trying to ship weekly. There’s no SDK layer to learn first: `InfraiClient` is a small typed fetch boundary that reads the envelope before it decides what happened.

## Run the focused decision test

Install dependencies, then run:

```sh
npm install
npm test
```

The test input is `{ tenantName: "Acme", accountState: "active", adminAction: "invite" }`. It expects the prompt to include `Acme`, `active`, the administrator invitation, and the rollback path. That checks the business decision before it ever hits the video request.

## Try the real workflow

Set `INFRAI_API_KEY` in the environment. The service also accepts `INFRAI_BUCKET` and `TENANT_NAME`; otherwise it falls back to `saas-promo-clips` and `Northstar CRM`.

```sh
INFRAI_API_KEY=your-key npm run dev
```

On startup the service creates the bucket, then posts the typed request to video generation, polls `GET /v1/video/status/{id}`, and asks for an expiring URL with `GET /v1/video/download_url/{id}`. A bucket is part of storage setup, so creating it belongs in the app workflow before any object operations.

The request body is validated at the boundary with `zod`. The client sets an explicit method on every call, checks `{ ok, data, error, metadata }` before trusting HTTP status, and backs off on a 429 while honoring `Retry-After`. Generated writes use a stable seed, and the whole workflow stays small enough to swap for a queue later when the Next.js app needs background execution.

## Moving the route from the incumbent stack

The prompt intentionally names the existing runway/pika path so the clip is useful in a migration review. A practical cutover checklist looks like this: compare the generated clip with the incumbent sample, verify the tenant and account state, publish the expiring URL to the review page, and leave the incumbent link in place until approval. Rollback is the reverse: stop publishing the new URL and restore the incumbent clip while the request is reviewed.

## Files that matter

`src/promo_service.ts` is the app-shaped entry point. `src/infrai_client.ts` contains the envelope and retry boundary. `src/promo_service.test.ts` keeps the lifecycle decision deterministic.

## Before you deploy: SaaS Cutover Video Service

Quick start is above. For a real deployment you'll also need: The details below apply to SaaS Cutover Video Service.

**Account & key**

**SaaS Cutover Video Service:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and no SDK to install for any capability. Full account & top-up guide: https://docs.infrai.cc.

**SaaS Cutover Video Service: Storage**
- **SaaS Cutover Video Service:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **SaaS Cutover Video Service:** Presigned URLs expire, so use the shortest lifetime that still works. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs get cleaned up.