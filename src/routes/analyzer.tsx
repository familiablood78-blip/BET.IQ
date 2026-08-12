import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { searchPlayers } from "./api/players/-search";

export const Route = createFileRoute("/analyzer")({
  component: Analyzer,
});

// Curated player names used as the offline/fallback search index.
// Mirrors the sports data provider's mock dataset so behavior is consistent
// when the backend API is unreachable (e.g. auth not configured).
const fallbackPlayerNames = [
  "LeBron James", "Stephen Curry", "Luka Dončić", "Giannis Antetokounmpo",
  "Nikola Jokić", "Joel Embiid", "Shai Gilgeous-Alexander",
  "Patrick Mahomes", "Travis Kelce", "Tyreek Hill", "Christian McCaffrey",
  "Aaron Judge", "Shohei Ohtani", "Mookie Betts",
  "Connor McDavid", "Auston Matthews", "Nathan MacKinnon",
  "Christian Pulisic", "Lionel Messi",
  "Rory McIlroy", "Scottie Scheffler", "Jon Rahm", "Xander Schauffele", "Collin Morikawa",
];

function Analyzer() {
  const [query, setQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [apiResults, setApiResults] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search against the real player-search server function.
  // Falls back to the curated local index when the API is unavailable
  // (e.g. Clerk auth not configured → server function throws 401).
  const runApiSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setApiResults([]); return; }
    setSearching(true);
    try {
      const res = await searchPlayers({ data: { q: q.trim() } });
      setApiResults((res?.players ?? []).map((p) => p.name));
    } catch {
      // Unauthorized / API unavailable — local fallback index is used instead
      setApiResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setApiResults([]); return; }
    debounceRef.current = setTimeout(() => { void runApiSearch(query); }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runApiSearch]);

  // Suggestions = curated local matches ∪ API results (deduped, case-insensitive)
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const local = fallbackPlayerNames.filter((p) => p.toLowerCase().includes(q));
    const merged = [...local];
    for (const name of apiResults) {
      if (!merged.some((m) => m.toLowerCase() === name.toLowerCase())) merged.push(name);
    }
    return merged;
  }, [query, apiResults]);

  // Mock data when a player is selected
  const playerData = selectedPlayer ? getPlayerData(selectedPlayer) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-betiq-50">Player Prop Analyzer</h1>
        <p className="mt-1 text-sm text-betiq-400">
          Search any player to get AI-powered analysis on their props
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-betiq-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search for a player..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="w-full rounded-xl border border-betiq-800 bg-betiq-900 py-3.5 pl-11 pr-4 text-sm text-betiq-100 placeholder-betiq-500 outline-none transition-colors focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20"
          />
        </div>

        {/* Suggestions dropdown */}
        {(showSuggestions && (suggestions.length > 0 || searching)) && (
          <div className="absolute z-20 mt-2 w-full rounded-xl border border-betiq-800 bg-betiq-900 p-2 shadow-xl">
            {searching && suggestions.length === 0 && (
              <p className="px-3 py-2.5 text-sm text-betiq-500 animate-pulse">Searching players…</p>
            )}
            {suggestions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setQuery(name);
                  setSelectedPlayer(name);
                  setShowSuggestions(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-betiq-200 transition-colors hover:bg-betiq-800"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-500/10 text-xs font-bold text-gold-400">
                  {name.split(" ").map((n) => n[0]).join("")}
                </div>
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Player content or empty state */}
      {selectedPlayer && !playerData ? (
        <div className="mt-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-betiq-900 text-betiq-500">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-betiq-300">{selectedPlayer}</h3>
          <p className="mt-2 text-sm text-betiq-500">
            Full AI analysis for this player unlocks when you sign in. Search another player to explore a preview.
          </p>
          <Link to="/sign-up" className="btn-gold mt-6 text-sm">Create a Free Account</Link>
        </div>
      ) : playerData ? (
        <div className="mt-8 space-y-8">
          {/* Player header */}
          <div className="card-betiq flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-500/10 text-2xl font-bold text-gold-400">
                {playerData.name.split(" ").map((n: string) => n[0]).join("")}
              </div>
              <div>
                <h2 className="text-xl font-bold text-betiq-50">{playerData.name}</h2>
                <div className="mt-1 flex items-center gap-2 text-sm text-betiq-400">
                  <span>{playerData.team}</span>
                  <span className="text-betiq-600">•</span>
                  <span>{playerData.position}</span>
                  <span className="text-betiq-600">•</span>
                  <span>#{playerData.number}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                playerData.injuryStatus === "Active"
                  ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/20"
                  : playerData.injuryStatus === "Questionable"
                  ? "bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20"
                  : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
              }`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                  playerData.injuryStatus === "Active" ? "bg-green-400" :
                  playerData.injuryStatus === "Questionable" ? "bg-yellow-400" : "bg-red-400"
                }`} />
                {playerData.injuryStatus}
              </span>
              <button className="btn-outline text-xs">
                Add to Tracker
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Stats - 2 columns */}
            <div className="space-y-6 lg:col-span-2">
              {/* Season Averages */}
              <section>
                <h3 className="mb-3 text-sm font-semibold text-betiq-200">Season Averages</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {playerData.seasonAverages.map((avg: { label: string; value: string }) => (
                    <div key={avg.label} className="card-betiq text-center">
                      <p className="text-xl font-bold text-gold-400">{avg.value}</p>
                      <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-betiq-500">{avg.label}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Recent Games */}
              <section>
                <h3 className="mb-3 text-sm font-semibold text-betiq-200">Recent Game Log</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[400px]">
                    <thead>
                      <tr className="border-b border-betiq-800/50 text-left text-[10px] font-medium uppercase tracking-wider text-betiq-500">
                        <th className="pb-2 pr-3">Date</th>
                        <th className="pb-2 pr-3">Opp</th>
                        <th className="pb-2 pr-3 text-right">PTS</th>
                        <th className="pb-2 pr-3 text-right">REB</th>
                        <th className="pb-2 pr-3 text-right">AST</th>
                        <th className="pb-2 pr-3 text-right">MIN</th>
                        <th className="pb-2 text-right">+/-</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-betiq-800/30">
                      {playerData.recentGames.map((game: { date: string; opp: string; pts: number; reb: number; ast: number; min: string; pm: string }, i: number) => (
                        <tr key={i} className="text-sm text-betiq-300 transition-colors hover:bg-betiq-900/50">
                          <td className="py-2.5 pr-3">{game.date}</td>
                          <td className="py-2.5 pr-3">@{game.opp}</td>
                          <td className="py-2.5 pr-3 text-right font-medium text-betiq-100">{game.pts}</td>
                          <td className="py-2.5 pr-3 text-right">{game.reb}</td>
                          <td className="py-2.5 pr-3 text-right">{game.ast}</td>
                          <td className="py-2.5 pr-3 text-right">{game.min}</td>
                          <td className={`py-2.5 text-right font-medium ${game.pm.startsWith("+") ? "text-green-400" : "text-red-400"}`}>{game.pm}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Home/Away Splits */}
              <section>
                <h3 className="mb-3 text-sm font-semibold text-betiq-200">Home / Away Splits</h3>
                <div className="grid grid-cols-2 gap-4">
                  {playerData.splits.map((split: { location: string; stats: { label: string; value: string }[] }, i: number) => (
                    <div key={i} className="card-betiq">
                      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-betiq-400">{split.location}</h4>
                      <div className="space-y-2">
                        {split.stats.map((stat) => (
                          <div key={stat.label} className="flex items-center justify-between text-sm">
                            <span className="text-betiq-400">{stat.label}</span>
                            <span className="font-medium text-betiq-200">{stat.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* AI Analysis - 1 column */}
            <div className="space-y-6">
              <section>
                <div className="card-betiq border-gold-500/30 ring-1 ring-gold-500/20">
                  <div className="mb-4 flex items-center gap-2">
                    <svg className="h-5 w-5 text-gold-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                    </svg>
                    <h3 className="text-sm font-semibold text-betiq-50">AI Analysis</h3>
                  </div>

                  {/* Confidence Gauge */}
                  <div className="mb-6 text-center">
                    <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
                      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="8" className="text-betiq-800" />
                        <circle
                          cx="60" cy="60" r="48"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 48}`}
                          strokeDashoffset={`${2 * Math.PI * 48 * (1 - playerData.confidence / 100)}`}
                          className="text-gold-500 transition-all duration-1000"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-gold-400">{playerData.confidence}%</span>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-betiq-500">Confidence</span>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="mb-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold ${
                      playerData.recommendation === "Lean Over" ? "bg-green-500/10 text-green-400 ring-1 ring-green-500/30" :
                      playerData.recommendation === "Lean Under" ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/30" :
                      "bg-betiq-800 text-betiq-400 ring-1 ring-betiq-700"
                    }`}>
                      {playerData.recommendation}
                    </span>
                  </div>

                  {/* Key Factors */}
                  <div className="mb-4">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-betiq-500">Key Factors</h4>
                    <ul className="space-y-2">
                      {playerData.keyFactors.map((factor: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-betiq-300">
                          <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gold-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Analysis Text */}
                  <div className="rounded-lg bg-betiq-950/50 p-3">
                    <p className="text-xs leading-relaxed text-betiq-400">{playerData.analysis}</p>
                  </div>

                  <button className="btn-gold mt-4 w-full justify-center text-xs">
                    Add to Bet Tracker
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-betiq-900 text-betiq-500">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-betiq-300">Search for a player</h3>
          <p className="mt-2 text-sm text-betiq-500">
            Start typing a player's name above to get AI-powered prop analysis
          </p>
        </div>
      )}
    </div>
  );
}

// Mock data generator
function getPlayerData(name: string) {
  const players: Record<string, any> = {
    "LeBron James": {
      name: "LeBron James",
      team: "Los Angeles Lakers",
      position: "SF",
      number: 23,
      injuryStatus: "Active",
      confidence: 82,
      recommendation: "Lean Over",
      keyFactors: [
        "Averaging 28.5 PPG over last 5 games - well above season average",
        "Opponent defense ranks 24th against SF position",
        "Playing at home where scoring is +3.2 PPG higher",
        "Rest advantage - 2 days since last game",
      ],
      analysis: "LeBron has been on a tear recently, clearing his points line in 4 of the last 5 games. The matchup against a weak perimeter defense sets up well for another strong outing. His usage rate climbs to 32% when Davis is off the floor, and with Davis listed as questionable, expect LeBron to handle a heavy load. The home crowd factor and extra rest give him every advantage to go Over.",
      seasonAverages: [
        { label: "PPG", value: "25.7" },
        { label: "RPG", value: "7.3" },
        { label: "APG", value: "8.2" },
        { label: "FG%", value: "53.2" },
      ],
      recentGames: [
        { date: "3/10", opp: "BKN", pts: 32, reb: 7, ast: 9, min: "37", pm: "+12" },
        { date: "3/08", opp: "MIL", pts: 28, reb: 8, ast: 6, min: "35", pm: "+5" },
        { date: "3/06", opp: "BOS", pts: 21, reb: 6, ast: 8, min: "34", pm: "-3" },
        { date: "3/04", opp: "PHI", pts: 35, reb: 9, ast: 10, min: "38", pm: "+15" },
        { date: "3/02", opp: "NYK", pts: 27, reb: 5, ast: 7, min: "36", pm: "+8" },
      ],
      splits: [
        {
          location: "Home",
          stats: [
            { label: "PPG", value: "27.2" },
            { label: "FG%", value: "54.1%" },
            { label: "3P%", value: "38.2%" },
          ],
        },
        {
          location: "Away",
          stats: [
            { label: "PPG", value: "24.1" },
            { label: "FG%", value: "51.8%" },
            { label: "3P%", value: "34.5%" },
          ],
        },
      ],
    },
    "Stephen Curry": {
      name: "Stephen Curry",
      team: "Golden State Warriors",
      position: "PG",
      number: 30,
      injuryStatus: "Questionable",
      confidence: 71,
      recommendation: "Lean Under",
      keyFactors: [
        "Listed as questionable with knee soreness - could impact minutes",
        "Shooting 38% from 3 in last 3 games - below season avg of 42%",
        "Opponent ranked 3rd in defending 3-point attempts",
        "On a back-to-back (second night of consecutive games)",
      ],
      analysis: "Curry is dealing with knee soreness and is on the second night of a back-to-back, which historically leads to a 3-4 minute reduction in playing time. The matchup against a top-3 perimeter defense also gives reason for caution. While he's always capable of an explosive game, the combination of injury concern and tough matchup makes the Under the safer play tonight.",
      seasonAverages: [
        { label: "PPG", value: "26.4" },
        { label: "APG", value: "5.1" },
        { label: "3PM", value: "4.8" },
        { label: "FT%", value: "92.3" },
      ],
      recentGames: [
        { date: "3/10", opp: "SAS", pts: 24, reb: 3, ast: 5, min: "32", pm: "+7" },
        { date: "3/08", opp: "DEN", pts: 19, reb: 4, ast: 4, min: "30", pm: "-8" },
        { date: "3/06", opp: "LAL", pts: 31, reb: 6, ast: 7, min: "35", pm: "+10" },
        { date: "3/04", opp: "POR", pts: 22, reb: 5, ast: 8, min: "33", pm: "+14" },
        { date: "3/02", opp: "MIN", pts: 16, reb: 3, ast: 3, min: "29", pm: "-5" },
      ],
      splits: [
        {
          location: "Home",
          stats: [
            { label: "PPG", value: "27.8" },
            { label: "3P%", value: "44.1%" },
            { label: "AST", value: "5.6" },
          ],
        },
        {
          location: "Away",
          stats: [
            { label: "PPG", value: "24.9" },
            { label: "3P%", value: "40.3%" },
            { label: "AST", value: "4.6" },
          ],
        },
      ],
    },
  };

  // Return null for players without curated preview data — the UI shows a
  // graceful "sign in for full analysis" state instead of mislabeled mock data.
  return players[name] || null;
}