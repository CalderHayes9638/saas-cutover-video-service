import test from "node:test";
import assert from "node:assert/strict";
import { buildPrompt, promoRequest } from "./promo_service.ts";

test("active tenant invite prompt includes the lifecycle decision and rollback path", () => {
  const input = promoRequest.parse({ tenantName: "Acme", accountState: "active", adminAction: "invite" });
  const prompt = buildPrompt(input);
  assert.match(prompt, /Acme/);
  assert.match(prompt, /active/);
  assert.match(prompt, /invite an administrator/);
  assert.match(prompt, /rollback path/);
});
