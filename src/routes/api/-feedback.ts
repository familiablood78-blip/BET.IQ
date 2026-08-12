import { createServerFn } from "@tanstack/react-start";
import { requireAuth, requireAdmin } from "~/lib/auth";

interface FeedbackEntry {
  type: "helpful" | "improvement" | "feature" | "bug";
  rating?: "up" | "down";
  message?: string;
  page: string;
  timestamp: string;
}

// In-memory store (replace with database later)
const feedbackStore: FeedbackEntry[] = [];

export const submitFeedback = createServerFn({ method: "POST" })
  .validator((data: unknown) => data as Omit<FeedbackEntry, "timestamp">)
  .handler(async ({ data }) => {
    const entry: FeedbackEntry = {
      ...data,
      timestamp: new Date().toISOString(),
    };
    feedbackStore.push(entry);
    return { success: true, id: feedbackStore.length - 1 };
  });

/** Admin-only: read all feedback entries */
export const getFeedback = createServerFn({ method: "GET" })
  .handler(async () => {
    const auth = await requireAuth();
    await requireAdmin(auth);
    return feedbackStore;
  });
