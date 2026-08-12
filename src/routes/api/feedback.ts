import { createServerFn } from "@tanstack/react-start";

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

export const getFeedback = createServerFn({ method: "GET" })
  .handler(async () => {
    return feedbackStore;
  });
