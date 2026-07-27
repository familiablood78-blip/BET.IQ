# BetIQ — Follow-up Tasks for Backend Developer

## Immediate (next 1-2 tasks)
1. **Run database migrations against Neon** — Execute `src/lib/db/schema.ts` SQL via `runMigrations()` once DATABASE_URL is connected. Verify all 8 tables exist with correct schema.
2. **Set up Clerk webhook endpoint** — Configure Clerk dashboard to point webhooks to `/api/auth/webhook`. Test user.created, user.updated, user.deleted events.
3. **Wire up OpenAI real analysis** — Replace mock analysis in analyzer.ts with actual OpenAI API calls. Test with a few player props and validate confidence scores.

## Short-term (next sprint)
4. **Stripe subscription integration** — Implement Stripe Checkout session creation in `api/subscriptions`. Handle webhook events (checkout.session.completed, customer.subscription.deleted) to sync subscription state.
5. **Rate limiting for API routes** — Add per-user rate limiting middleware to prevent abuse of free tier endpoints.
6. **Parlay builder integration** — Connect the `generateParlayRecommendations()` function to the frontend bet builder with real odds data.
7. **Sports data API integration** — Populate the real API provider with actual data from The Odds API, SportsDataIO, or Sportradar. Test all provider methods.

## Medium-term
8. **Admin dashboard with real analytics** — Replace mock analytics with real queries. Add: MRR tracking, user acquisition charts, top prop types, accuracy tracking for AI recommendations.
9. **Email notification system** — Set up transactional emails (Resend/SendGrid) for: bet results, AI analysis completions, subscription renewals, weekly betting recaps.
10. **AI model feedback loop** — Track when users bet on recommendations and log outcomes. Use this data to improve analysis accuracy over time.
11. **Caching layer** — Add Redis or server-side cache for sports data queries (games, odds) to reduce API costs.

## Nice-to-have
12. **Multi-sportsbook odds comparison** — Aggregate odds from 3+ sportsbooks to find best value.
13. **Player performance trends** — Implement trend analysis (hot streaks, cold streaks, home/away splits) as structured data.
14. **Export functionality** — CSV/PDF export of bet history and analysis results.
15. **Integration tests** — Test suite for API routes with mock database and auth.
