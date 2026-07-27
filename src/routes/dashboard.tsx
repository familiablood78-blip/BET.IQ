import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

// Mock data for the dashboard
const featuredGames = [
  {
    id: 1,
    awayTeam: "Lakers",
    awayScore: 112,
    homeTeam: "Celtics",
    homeScore: 108,
    time: "Final",
    spread: "LAL -2.5",
    total: "O/U 224.5",
    awayColor: "bg-purple-600",
    homeColor: "bg-green-700",
  },
  {
    id: 2,
    awayTeam: "Chiefs",
    awayScore: null,
    homeTeam: "49ers",
    homeScore: null,
    time: "Sun 8:15 PM",
    spread: "KC -3.5",
    total: "O/U 47.5",
    awayColor: "bg-red-600",
    homeColor: "bg-red-900",
  },
  {
    id: 3,
    awayTeam: "Yankees",
    awayScore: 5,
    homeTeam: "Dodgers",
    homeScore: 3,
    time: "Final",
    spread: "NYY -1.5",
    total: "O/U 8.5",
    awayColor: "bg-blue-800",
    homeColor: "bg-blue-600",
  },
  {
    id: 4,
    awayTeam: "Bulls",
    awayScore: null,
    homeTeam: "Warriors",
    homeScore: null,
    time: "Mon 7:00 PM",
    spread: "GSW -4.5",
    total: "O/U 232.5",
    awayColor: "bg-red-500",
    homeColor: "bg-yellow-600",
  },
];

const trendingProps = [
  { player: "LeBron James", prop: "Points", line: 27.5, trend: "over", confidence: 78 },
  { player: "Patrick Mahomes", prop: "Passing Yards", line: 285.5, trend: "under", confidence: 65 },
  { player: "Shohei Ohtani", prop: "Total Bases", line: 1.5, trend: "over", confidence: 82 },
  { player: "Steph Curry", prop: "3-Pointers", line: 4.5, trend: "over", confidence: 71 },
  { player: "Aaron Judge", prop: "Home Runs", line: 0.5, trend: "over", confidence: 59 },
  { player: "Travis Kelce", prop: "Receiving Yards", line: 65.5, trend: "over", confidence: 74 },
];

const aiPicks = [
  { player: "Luka Dončić", prop: "Points + Rebounds + Assists", line: 54.5, pick: "Over", edge: "+8.2%", confidence: 88 },
  { player: "Tyreek Hill", prop: "Receiving Yards", line: 75.5, pick: "Over", edge: "+6.5%", confidence: 82 },
  { player: "Giannis Antetokounmpo", prop: "Points", line: 31.5, pick: "Under", edge: "+5.1%", confidence: 76 },
];

const alerts = [
  { type: "injury", text: "Joel Embiid (Questionable) - Knee soreness, expected to play" },
  { type: "lineup", text: "Christian McCaffrey (Out) - Calf injury, week-to-week" },
  { type: "weather", text: "GB vs CHI - Wind 18mph, downgrade passing props" },
];

const newsItems = [
  { title: "Jokic records 5th triple-double in last 7 games", league: "NBA", time: "2h ago" },
  { title: "Aaron Judge on pace for 55+ HR season", league: "MLB", time: "4h ago" },
  { title: "Mahomes: 'Feeling great' after ankle scare", league: "NFL", time: "6h ago" },
  { title: "McDavid extends point streak to 12 games", league: "NHL", time: "8h ago" },
];

function Dashboard() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-betiq-50">Dashboard</h1>
          <p className="text-sm text-betiq-400">Your daily betting intelligence</p>
        </div>
        <div className="mt-3 flex items-center gap-3 sm:mt-0">
          <span className="badge-gold">Live</span>
          <span className="text-xs text-betiq-500">Updated 2 min ago</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content - 2 columns */}
        <div className="space-y-6 lg:col-span-2">
          {/* Featured Games */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-betiq-50">Featured Games</h2>
              <Link to="/analyzer" className="text-xs font-medium text-gold-400 hover:text-gold-300">
                View All
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {featuredGames.map((game) => (
                <div key={game.id} className="card-betiq group">
                  <div className="flex items-center justify-between text-xs text-betiq-500">
                    <span className="flex items-center gap-1.5">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${game.time === "Final" ? "bg-betiq-500" : "bg-gold-500 animate-pulse"}`} />
                      {game.time}
                    </span>
                    <span className="text-betiq-400">{game.spread}</span>
                  </div>
                  <div className="mt-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ${game.awayColor}`}>
                          {game.awayTeam.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-betiq-200">{game.awayTeam}</span>
                      </div>
                      <span className="text-lg font-bold text-betiq-50">
                        {game.awayScore !== null ? game.awayScore : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ${game.homeColor}`}>
                          {game.homeTeam.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-sm font-medium text-betiq-200">{game.homeTeam}</span>
                      </div>
                      <span className="text-lg font-bold text-betiq-50">
                        {game.homeScore !== null ? game.homeScore : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-betiq-800/50 pt-3">
                    <span className="text-xs text-betiq-500">{game.total}</span>
                    <button className="text-xs font-medium text-gold-400 opacity-0 transition-opacity group-hover:opacity-100">
                      Analyze Props
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* AI's Top Value Picks */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-betiq-50">AI's Top Value Picks</h2>
                <span className="badge-gold">High Confidence</span>
              </div>
            </div>
            <div className="space-y-3">
              {aiPicks.map((pick, i) => (
                <div key={i} className="card-betiq flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-500/10 text-sm font-bold text-gold-400">
                      {pick.player.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-betiq-50">{pick.player}</p>
                      <p className="text-xs text-betiq-400">{pick.prop} — {pick.line}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className={`text-sm font-bold ${pick.pick === "Over" ? "text-green-400" : "text-red-400"}`}>
                        {pick.pick}
                      </span>
                      <span className="ml-1.5 text-xs text-betiq-500">{pick.edge}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-betiq-800">
                        <div
                          className="h-full rounded-full bg-gold-500"
                          style={{ width: `${pick.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gold-400">{pick.confidence}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Trending Player Props */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-betiq-50">Trending Player Props</h2>
              <Link to="/analyzer" className="text-xs font-medium text-gold-400 hover:text-gold-300">
                Analyze Player
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-betiq-800/50 text-left text-xs font-medium text-betiq-500">
                    <th className="pb-3 pr-4">Player</th>
                    <th className="pb-3 pr-4">Prop</th>
                    <th className="pb-3 pr-4">Line</th>
                    <th className="pb-3 pr-4">Trend</th>
                    <th className="pb-3 text-right">AI Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-betiq-800/30">
                  {trendingProps.map((prop, i) => (
                    <tr key={i} className="transition-colors hover:bg-betiq-900/50">
                      <td className="py-3 pr-4">
                        <span className="text-sm font-medium text-betiq-200">{prop.player}</span>
                      </td>
                      <td className="py-3 pr-4 text-sm text-betiq-400">{prop.prop}</td>
                      <td className="py-3 pr-4 text-sm text-betiq-300">{prop.line}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                          prop.trend === "over" ? "text-green-400" : "text-red-400"
                        }`}>
                          {prop.trend === "over" ? (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                            </svg>
                          ) : (
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                            </svg>
                          )}
                          {prop.trend === "over" ? "Over" : "Under"}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-betiq-800">
                            <div
                              className="h-full rounded-full bg-gold-500"
                              style={{ width: `${prop.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gold-400">{prop.confidence}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Injury & Lineup Alerts */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-betiq-50">Alerts</h2>
            <div className="space-y-3">
              {alerts.map((alert, i) => (
                <div key={i} className="card-betiq">
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
                      alert.type === "injury" ? "bg-yellow-500/10 text-yellow-400" :
                      alert.type === "lineup" ? "bg-red-500/10 text-red-400" :
                      "bg-blue-500/10 text-blue-400"
                    }`}>
                      {alert.type === "injury" ? (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                      ) : alert.type === "lineup" ? (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                      )}
                    </span>
                    <div>
                      <p className="text-xs leading-relaxed text-betiq-300">{alert.text}</p>
                      <span className="mt-1 inline-block text-[10px] font-medium uppercase tracking-wider text-betiq-500">
                        {alert.type}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Sports News Feed */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-betiq-50">Latest News</h2>
            <div className="space-y-2">
              {newsItems.map((item, i) => (
                <div key={i} className="card-betiq flex items-start gap-3 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-betiq-200 line-clamp-2">{item.title}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-gold-500/70">{item.league}</span>
                      <span className="text-[10px] text-betiq-500">{item.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Stats */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-betiq-50">Your Activity</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Bets Today", value: "3", color: "text-gold-400" },
                { label: "Win Rate", value: "67%", color: "text-green-400" },
                { label: "ROI (7d)", value: "+12.4%", color: "text-green-400" },
                { label: "AI Credits", value: "5/5", color: "text-betiq-300" },
              ].map((stat, i) => (
                <div key={i} className="card-betiq text-center">
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-betiq-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}