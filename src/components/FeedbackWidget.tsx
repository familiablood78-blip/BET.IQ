import { useState, useCallback } from "react";
import { submitFeedback } from "~/routes/ap./-feedback";

export function FeedbackWidget() {
  const [state, setState] = useState<"idle" | "thumbsDown" | "thanks">("idle");
  const [message, setMessage] = useState("");

  const handleThumbsUp = useCallback(async () => {
    await submitFeedback({ data: { type: "helpful", rating: "up", page: location.pathname } });
    setState("thanks");
  }, []);

  const handleThumbsDown = useCallback(() => {
    setState("thumbsDown");
  }, []);

  const handleSubmitImprovement = useCallback(async () => {
    await submitFeedback({ data: { type: "improvement", rating: "down", message, page: location.pathname } });
    setMessage("");
    setState("thanks");
  }, [message]);

  if (state === "thanks") {
    return (
      <div className="fixed bottom-24 right-4 z-30 lg:bottom-6 rounded-xl border border-gold-500/20 bg-betiq-900 p-4 shadow-xl max-w-[280px] animate-pulse">
        <p className="text-sm font-medium text-gold-400">Thanks for your feedback! 🙏</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 z-30 lg:bottom-6 rounded-xl border border-betiq-800 bg-betiq-900 p-4 shadow-xl max-w-[280px]">
      {state === "idle" ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-betiq-300">Was this helpful?</span>
          <button onClick={handleThumbsUp} className="rounded-lg p-1.5 text-betiq-400 hover:bg-betiq-800 hover:text-gold-400 transition-colors" aria-label="Thumbs up">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V2.75a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" />
            </svg>
          </button>
          <button onClick={handleThumbsDown} className="rounded-lg p-1.5 text-betiq-400 hover:bg-betiq-800 hover:text-gold-400 transition-colors" aria-label="Thumbs down">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.498 15.25H4.372c-1.026 0-1.945-.694-2.054-1.715a12.137 12.137 0 01-.068-1.285c0-2.848.992-5.464 2.649-7.521C5.287 4.247 5.886 4 6.504 4h4.016a4.5 4.5 0 011.423.23l3.114 1.04a4.5 4.5 0 001.423.23h1.294M7.498 15.25c.618 0 .991.724.725 1.282A7.471 7.471 0 007.5 19.75 2.25 2.25 0 009.75 22a.75.75 0 00.75-.75v-.633c0-.573.11-1.14.322-1.672.304-.76.93-1.33 1.653-1.715a9.04 9.04 0 002.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-betiq-200">What could be better?</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us what you'd like improved..."
            rows={3}
            className="w-full rounded-lg border border-betiq-700 bg-betiq-950 px-3 py-2 text-sm text-betiq-100 placeholder:text-betiq-500 focus:border-gold-500/50 focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleSubmitImprovement} disabled={!message.trim()} className="btn-gold text-xs py-2 px-4 disabled:opacity-50">
              Submit
            </button>
            <button onClick={() => { setState("idle"); setMessage(""); }} className="btn-ghost text-xs py-2 px-4">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BugReportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = useCallback(async () => {
    await submitFeedback({ data: { type: "bug", message, page: location.pathname } });
    setSent(true);
  }, [message]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-betiq-800 bg-betiq-900 p-6 shadow-2xl">
        {sent ? (
          <div className="text-center py-4">
            <p className="text-gold-400 font-semibold">Bug report submitted!</p>
            <p className="text-sm text-betiq-400 mt-1">We'll look into it.</p>
            <button onClick={() => { setSent(false); setMessage(""); onClose(); }} className="btn-gold mt-4 text-sm">Close</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-betiq-100">Report a Bug</h3>
              <button onClick={onClose} className="btn-ghost p-1" aria-label="Close">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe the bug..." rows={4} className="w-full rounded-lg border border-betiq-700 bg-betiq-950 px-3 py-2 text-sm text-betiq-100 placeholder:text-betiq-500 focus:border-gold-500/50 focus:outline-none resize-none" />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
              <button onClick={handleSubmit} disabled={!message.trim()} className="btn-gold text-sm disabled:opacity-50">Submit</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
