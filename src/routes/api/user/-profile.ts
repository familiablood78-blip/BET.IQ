import { createServerFn } from "@tanstack/react-start";
import { sql } from "~/db";
import { requireAuth } from "~/lib/auth";

/**
 * GET /api/user/profile — Get current user's profile
 */
export const getProfile = createServerFn({ method: "GET" })
  .handler(async () => {
    const auth = await requireAuth(new Request("http://localhost"));
    const client = sql();
    const users = await client`SELECT * FROM users WHERE id = ${auth.userId}`;
    if (users.length === 0) throw new Error("User not found");
    const u = users[0];
    return {
      id: u.id,
      email: u.email,
      firstName: u.first_name,
      lastName: u.last_name,
      imageUrl: u.image_url,
      isPremium: u.is_premium,
      createdAt: String(u.created_at),
    };
  });

/**
 * PUT /api/user/profile — Update user profile
 */
export const updateProfile = createServerFn({ method: "PUT" })
  .validator((data: { firstName?: string; lastName?: string }) => data)
  .handler(async ({ data }) => {
    const auth = await requireAuth(new Request("http://localhost"));
    const client = sql();
    await client`
      UPDATE users 
      SET first_name = COALESCE(${data.firstName ?? null}, first_name),
          last_name = COALESCE(${data.lastName ?? null}, last_name),
          updated_at = NOW()
      WHERE id = ${auth.userId}
    `;
    return { success: true };
  });

/**
 * GET /api/user/notifications — Get user's notifications
 */
export const getNotifications = createServerFn({ method: "GET" })
  .handler(async () => {
    const auth = await requireAuth(new Request("http://localhost"));
    const client = sql();
    const rows = await client`
      SELECT * FROM notifications 
      WHERE user_id = ${auth.userId} 
      ORDER BY created_at DESC 
      LIMIT 20
    `;
    return rows.map((r) => ({
      ...r,
      data: r.data ? JSON.parse(String(r.data)) : null,
      created_at: String(r.created_at),
    }));
  });

/**
 * PUT /api/user/notifications/:id/read — Mark notification as read
 */
export const markNotificationRead = createServerFn({ method: "PUT" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const auth = await requireAuth(new Request("http://localhost"));
    const client = sql();
    await client`
      UPDATE notifications SET read = true 
      WHERE id = ${data.id} AND user_id = ${auth.userId}
    `;
    return { success: true };
  });

/**
 * PUT /api/user/notifications/read-all — Mark all notifications as read
 */
export const markAllNotificationsRead = createServerFn({ method: "PUT" })
  .handler(async () => {
    const auth = await requireAuth(new Request("http://localhost"));
    const client = sql();
    await client`
      UPDATE notifications SET read = true 
      WHERE user_id = ${auth.userId}
    `;
    return { success: true };
  });

/**
 * GET /api/user/saved — Get saved players/teams
 */
export const getSavedItems = createServerFn({ method: "GET" })
  .handler(async () => {
    const auth = await requireAuth(new Request("http://localhost"));
    const client = sql();
    const rows = await client`
      SELECT * FROM saved_items 
      WHERE user_id = ${auth.userId} 
      ORDER BY created_at DESC
    `;
    return rows.map((r) => ({ ...r, created_at: String(r.created_at) }));
  });

/**
 * POST /api/user/saved — Save a player or team
 */
export const saveItem = createServerFn({ method: "POST" })
  .validator((data: { itemType: "player" | "team"; itemName: string; sport: string; teamName?: string; league?: string }) => data)
  .handler(async ({ data }) => {
    const auth = await requireAuth(new Request("http://localhost"));
    const client = sql();
    await client`
      INSERT INTO saved_items (user_id, item_type, item_name, sport, team_name, league)
      VALUES (${auth.userId}, ${data.itemType}, ${data.itemName}, ${data.sport}, ${data.teamName ?? null}, ${data.league ?? null})
      ON CONFLICT (user_id, item_type, item_name) DO NOTHING
    `;
    return { success: true };
  });

/**
 * DELETE /api/user/saved/:id — Remove a saved item
 */
export const deleteSavedItem = createServerFn({ method: "DELETE" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const auth = await requireAuth(new Request("http://localhost"));
    const client = sql();
    await client`DELETE FROM saved_items WHERE id = ${data.id} AND user_id = ${auth.userId}`;
    return { success: true };
  });