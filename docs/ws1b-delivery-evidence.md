# WS1b — Delivery Evidence (PR #9)

Task: `104a6521-2672-4c92-ba44-fbb491927e50` — Implement owner 20-section hardening directive.
Owner approval gate: WS1b submitted for owner review. **Not self-merged; not Phase 2.**

## PR
- URL: https://github.com/familiablood78-blip/BET.IQ/pull/9
- Branch: `feature/ws1b-data-architecture`
- Base: `main` @ `0954ac695f7894e3961b8022394780b0853c6bb8`

## Exact commit SHA
- Head commit: `aa6ab9a04a28446e373160c6f1cbcddcf61c0a63`

## Files changed (22 files, +2685 / −676)
```
M  package.json                                              (add "test": "bun test")
D  src/lib/ai/analyzer.ts                                    (dead: random-confidence fabrication + duplicate EV)
A  src/lib/analytics/settlement.ts                           (server-authoritative settlement derivation)
A  src/lib/analytics/__tests__/settlement.test.ts
A  src/lib/sports/datastate.ts                               (exactly 7 DataStates)
A  src/lib/sports/entity-resolution.ts                       (canonical player/event resolution, fail-closed)
A  src/lib/sports/live-props-validator.ts                    (gate; AnalysisEligibleProp via module-private WeakSet)
A  src/lib/sports/ev-engine.ts                               (single EV engine; runtime WeakSet auth)
A  src/lib/sports/provider-normalization.ts                  (fixed Odds API props normalization)
A  src/lib/sports/__tests__/datastate.test.ts
A  src/lib/sports/__tests__/entity-resolution.test.ts
A  src/lib/sports/__tests__/ev-engine.test.ts
A  src/lib/sports/__tests__/facade.test.ts
A  src/lib/sports/__tests__/helpers.ts
A  src/lib/sports/__tests__/live-props-validator.test.ts
A  src/lib/sports/__tests__/provider-normalization.test.ts
M  src/lib/sports/index.ts                                    (silent mock fallback REMOVED; facade; honest states; provider kinds)
M  src/lib/sports/odds-api-provider.ts                        (sport-key URLs incl. WNBA/Tennis; provenance)
M  src/lib/sports/types.ts                                    (provenance fields; PropSide/PropOutcome/RawProviderProp)
M  src/routes/api/analytics/-settle.ts                        (server-authoritative settlement)
M  src/routes/api/players/-analysis.ts                        (full production chain; single calculateEv call site)
M  src/routes/api/players/-search.ts                          (honest DataState in responses)
```

## Test results (actual command + output)
```
$ bun test
  105 pass
  0 fail
  200 expect() calls
  Ran 105 tests across 7 files.
```
Suites: datastate, entity-resolution, live-props-validator, ev-engine, provider-normalization, facade (honest states), settlement (server-authoritative, client-outcome-rejection).

## Build result (actual command + output)
```
$ bun run build
  ✓ built in 2.5s
  build exit: 0
```

## Required before/after audits (actual grep output)
- `Math.random` in `src/` → **NONE repo-wide** (previously present in dead `src/lib/ai/analyzer.ts`).
- `generateMockAnalysis` → **comment only** (`src/routes/api/players/-analysis.ts:28`); no call site.
- `calculateEV(` (legacy name) → **NONE**.
- `calculateEv(` (production engine) → **exactly 1 production call site** (`-analysis.ts:290`) + definition (`ev-engine.ts:63`).
- `WeakSet` `.add` → **exactly 1** (`live-props-validator.ts:240`), module-private `analysisEligibleRegistry`.
- Client `outcome` claim in settle → **rejected/ignored**; result derived only via `deriveSettlement` (`-settle.ts:27,58,76,105`).
- Silent mock fallback in `src/lib/sports/index.ts` → **removed** (wrapProvider takes no fallback; unconfiguredProvider fails closed).

## Production chain (no bypass)
API boundary → provider validation → canonical entity resolution → LivePropsValidator → AnalysisEligibleProp issuance → EVEngine → response. Settlement is server-authoritative (client can never decide won/lost/pushed).

## Data state / provenance
Exactly seven DataStates (AVAILABLE/EMPTY/TEMPORARILY_UNAVAILABLE/NOT_SUPPORTED/DEMO/UNVERIFIED/STALE_CACHED). Only AVAILABLE is EV-eligible; DEMO/UNVERIFIED/STALE_CACHED are never convertible to AVAILABLE. Every live prop carries provenance (provider, event id, canonical ids, market, statType, period, line, odds, retrieval timestamp). Freshness boundary exact: 60,000ms accepted, 60,001ms rejected, future timestamps rejected.

## Known limitations / unavailable data (honest)
- No real provider/API keys configured (THE_ODDS_API_KEY, OPENAI_API_KEY, Stripe): the chain fails closed → honest `TEMPORARILY_UNAVAILABLE`; no invented EV. **No live credential verification was performed — none is claimed.**
- No fair-probability model source configured, so `serverFairProbability()` returns null and no EV is fabricated.
- No database migrations added by this PR.

## No mock/fabricated data presented as live
Confirmed: DEMO is isolated and never reaches the EV engine; production surfaces never silently fall back to mock; nothing fabricated is presented as live.
