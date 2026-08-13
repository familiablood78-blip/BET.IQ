import { createServerFn } from "@tanstack/react-start";
import { createHmac, timingSafeEqual } from "node:crypto";
import { toWebRequest, getEvent } from "h3";
import { sql } from "~/db";
import { syncUser } from "~/lib/db/migrate";

/**
 * Verify a Svix-signed webhook request (Clerk delivers webhooks via Svix).
 *
 * Svix sends three headers:
 *   - svix-id          unique message id
 *   - svix-timestamp   unix seconds (guards against replay)
 *   - svix-signature   space-separated `v1,<base64 hmac>` values
 *
 * The signature is an HMAC-SHA256 over `${svixId}.${timestamp}.${rawBody}`
 * using the base64-decoded signing secret (CLERK_WEBHOOK_SECRET, `whsec_`-prefixed).
 *
 * Fails CLOSED: if the secret is not configured, headers are missing, the
 * timestamp is stale, or no signature matches — returns false (→ 401).
 */
function verifySvixSignature(headers: Headers, rawBody: string): boolean {
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");
  const secret = process.env.CLERK_WEBHOOK_SECRET;

  // Fail closed when the secret is absent — never accept unsigned webhooks.
  if (!secret) return false;
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const timestamp = Number(svixTimestamp);
  if (!Number.isFinite(timestamp)) return false;

  // Reject replays / stale messages (±5 min tolerance).
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) return false;

  const message = `${svixId}.${svixTimestamp}.${rawBody}`;
  const key = secret.startsWith("whsec_")
    ? Buffer.from(secret.slice("whsec_".length), "base64")
    : Buffer.from(secret, "utf8");
  const expected = createHmac("sha256", key).update(message).digest();

  for (const part of svixSignature.split(" ")) {
    if (!part.startsWith("v1,")) continue;
    const provided = Buffer.from(part.slice(3), "base64");
    if (provided.length === expected.length && timingSafeEqual(provided, expected)) {
      return true;
    }
  }
  return false;
}

/**
 * POST /api/auth/webhook — Clerk webhook handler
 * Receives user.created, user.updated, user.deleted events from Clerk.
 *
 * Requires a valid Svix signature (CLERK_WEBHOOK_SECRET). Requests without a
 * valid signature are rejected with 401 — the handler never processes
 * unauthenticated webhook payloads.
 *
 * ⚠️ FOLLOW-UP (separate task — NOT wired here): this handler is not yet
 * mounted into the route tree (no route imports it). Before live Clerk
 * webhooks are enabled it MUST be mounted to an HTTP route AND tested with a
 * real Svix-signed Clerk payload. The Svix verification here makes the
 * handler safe to mount — the routing + end-to-end test is the remaining step.
 */
export const clerkWebhook = createServerFn({ method: "POST" })
  .validator((data: { type: string; data: Record<string, unknown> }) => data)
  .handler(async ({ data }) => {
    // The signature covers the raw request body bytes. The validator already
    // parsed the JSON, so we re-serialize: JSON.parse preserves key order, so
    // JSON.stringify(data) reproduces Clerk's compact body exactly (Clerk sends
    // compact JSON). If serialization ever diverged, verification fails closed
    // (rejected), never silently accepted.
    const headers = toWebRequest(getEvent()).headers;
    const rawBody = JSON.stringify(data);
    if (!verifySvixSignature(headers, rawBody)) {
      throw new Error("Unauthorized: invalid or missing webhook signature");
    }

    const { type, data: eventData } = data;

    try {
      switch (type) {
        case "user.created":
        case "user.updated": {
          const clerkId = String(eventData.id ?? "");
          const email = String((eventData.email_addresses as Array<{ email_address: string }>)?.[0]?.email_address ?? "");
          const firstName = String(eventData.first_name ?? "");
          const lastName = String(eventData.last_name ?? "");
          const imageUrl = String(eventData.image_url ?? "");
          await syncUser(clerkId, email, firstName || undefined, lastName || undefined, imageUrl || undefined);
          break;
        }
        case "user.deleted": {
          const clerkId = String(eventData.id ?? "");
          const client = sql();
          await client`DELETE FROM users WHERE id = ${clerkId}`;
          break;
        }
      }

      return { success: true };
    } catch (err) {
      console.error("Webhook error:", err);
      throw new Error("Webhook processing failed");
    }
  });
