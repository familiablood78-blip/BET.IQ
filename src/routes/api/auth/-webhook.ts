import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { WebhookEvent } from "@clerk/tanstack-start/server";
import { syncUser } from "~/lib/db/migrate";

/**
 * POST /api/auth/webhook — Clerk webhook handler
 * Receives user.created, user.updated, user.deleted events from Clerk.
 */
export const clerkWebhook = createServerFn({ method: "POST" })
  .validator((data: { type: string; data: Record<string, unknown> }) => data)
  .handler(async ({ data }) => {
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