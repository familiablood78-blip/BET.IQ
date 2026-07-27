import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState, useEffect, useCallback } from "react";

export const Route = createFileRoute("/bet-tracker")({ component: BetTracker });

interface Bet {
  id: string; sport: string; event_name: string | null; player_name: string;
  prop_type: string; prop_line: number | null; bet_type: "over" | "under";
  odds: number; stake: number; outcome: "win" | "loss" | "push" | "pending" | null;
  profit: number | null; league: string | null; notes: string | null;
  placed_at: string; settled_at: string | null;
}

function fmtDate(d: string | null) { return d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"; }
function fmtMoney(n: number | null) { return n == null ? "—" : (n >= 0 ? "+$" : "-$") + Math.abs(n).toFixed(2); }

const SPORTS = ["NBA", "NFL", "MLB", "NHL", "Soccer", "UFC", "Other"];
const PROPS = ["Points", "Rebounds", "Assists", "3-Pointers", "Passing Yards", "Receiving Yards", "Rushing Yards", "Total Bases", "Home Runs", "Strikeouts", "Goals", "Other"];

type SortField = "placed_at" | "stake" | "odds" | "outcome";

function BetTracker() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [stats, setStats] = useState<{total:number;wins:number;losses:number;pushes:number;winRate:number;totalProfit:number}|null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [formErr, setFormErr] = useState("");
  const [form, setForm] = useState({sport:"NBA",playerName:"",propType:"Points",propLine:"",betType:"over"as"over"|"under",odds:"-110",stake:"",notes:""});
  const [fSport, setFSport] = useState("All");
  const [fOutcome, setFOutcome] = useState("All");
  const [sort, setSort] = useState<SortField>("placed_at");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");

  const load = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const [bd, sd] = await Promise.all([fetchBets(), fetchStats()]);
      setBets(bd as Bet[]); setStats(sd as typeof stats);
    } catch (e: any) { setError(e.message || "Load failed"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormErr("");
    if (!form.playerName || !form.stake) { setFormErr("Player name and stake required"); return; }
    const s = parseFloat(form.stake); if (isNaN(s) || s <= 0) { setFormErr("Valid stake required"); return; }
    try {
      await createBetFn({ data: { sport: form.sport, playerName: form.playerName, propType: form.propType,
        propLine: form.propLine ? parseFloat(form.propLine) : undefined, betType: form.betType,
        odds: parseInt(form.odds.replace(/[^0-9-]/g,""),10)||-110, stake: s, league: form.sport, notes: form.notes || undefined } });
      setShowForm(false); setForm({sport:"NBA",playerName:"",propType:"Points",propLine:"",betType:"over",odds:"-110",stake:"",notes:""});
      load();
    } catch (e: any) { setFormErr(e.message || "Create failed"); }
  };

  const settle = async (id: string, o: "win"|"loss"|"push"|"pending") => {
    try {
      const b = bets.find(x => x.id === id);
      const p = o === "win" ? (b ? (b.odds > 0 ? b.stake * (b.odds/100) : b.stake * (100/Math.abs(b.odds))) : 0)
        : o === "loss" ? -(b?.stake ?? 0) : 0;
      await updateBetFn({ data: { id, outcome: o, profit: o==="pending" ? undefined : p } });
      load();
    } catch (e: any) { setError(e.message); }
  };

  const del = async (id: string) => { if (!confirm("Delete?")) return; try { await deleteBetFn({data:{id}}); load(); } catch(e:any){ setError(e.message); } };

  const filtered = bets.filter(b => (fSport==="All"||b.sport===fSport) && (fOutcome==="All"||b.outcome===fOutcome))
    .sort((a,b) => { let c=0; if(sort==="placed_at") c=new Date(a.placed_at).getTime()-new Date(b.placed_at).getTime();
      else if(sort==="stake") c=(a.stake||0)-(b.stake||0); else if(sort==="odds") c=a.odds-b.odds;
      else c=(a.outcome||"").localeCompare(b.outcome||""); return sortDir==="asc"?c:-c; });

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><p className="text-betiq-400 animate-pulse">Loading...</p></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold text-betiq-50">Bet Tracker</h1><p className="text-sm text-betiq-400">Track, analyze, and improve your betting</p></div>
        <button onClick={()=>setShowForm(!showForm)} className="btn-gold text-sm">{showForm?"Cancel":"+ New Bet"}</button>
      </div>
      {error && <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[{l:"Total",v:stats.total,c:"text-betiq-100"},{l:"Win Rate",v:stats.winRate+"%",c:stats.winRate>=50?"text-green-400":"text-red-400"},
            {l:"Wins",v:stats.wins,c:"text-green-400"},{l:"Losses",v:stats.losses,c:"text-red-400"},
            {l:"Pushes",v:stats.pushes,c:"text-betiq-300"},{l:"P/L",v:fmtMoney(stats.totalProfit),c:stats.totalProfit>=0?"text-green-400":"text-red-400"}]
            .map(s=>(<div key={s.l} className="card-betiq text-center"><p className={`text-xl font-bold ${s.c}`}>{s.v}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-betiq-500">{s.l}</p></div>))}
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="card-betiq mt-6">
          <h2 className="mb-4 text-sm font-semibold text-betiq-200">Record a Bet</h2>
          {formErr && <p className="mb-3 text-xs text-red-400">{formErr}</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><label className="mb-1 block text-xs font-medium text-betiq-400">Sport</label>
              <select value={form.sport} onChange={e=>setForm({...form,sport:e.target.value})} className="w-full rounded-lg border border-betiq-800 bg-betiq-950 px-3 py-2.5 text-sm text-betiq-100 outline-none focus:border-gold-500/50">{SPORTS.map(s=><option key={s}>{s}</option>)}</select></div>
            <div><label className="mb-1 block text-xs font-medium text-betiq-400">Player *</label>
              <input type="text" value={form.playerName} onChange={e=>setForm({...form,playerName:e.target.value})} className="w-full rounded-lg border border-betiq-800 bg-betiq-950 px-3 py-2.5 text-sm text-betiq-100 outline-none focus:border-gold-500/50" placeholder="LeBron James" /></div>
            <div><label className="mb-1 block text-xs font-medium text-betiq-400">Prop</label>
              <select value={form.propType} onChange={e=>setForm({...form,propType:e.target.value})} className="w-full rounded-lg border border-betiq-800 bg-betiq-950 px-3 py-2.5 text-sm text-betiq-100 outline-none focus:border-gold-500/50">{PROPS.map(p=><option key={p}>{p}</option>)}</select></div>
            <div><label className="mb-1 block text-xs font-medium text-betiq-400">Line</label>
              <input type="text" value={form.propLine} onChange={e=>setForm({...form,propLine:e.target.value})} className="w-full rounded-lg border border-betiq-800 bg-betiq-950 px-3 py-2.5 text-sm text-betiq-100 outline-none focus:border-gold-500/50" placeholder="27.5" /></div>
            <div><label className="mb-1 block text-xs font-medium text-betiq-400">Type</label>
              <div className="flex gap-2"><button type="button" onClick={()=>setForm({...form,betType:"over"})} className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium ${form.betType==="over"?"bg-green-500/10 text-green-400 ring-1 ring-green-500/30":"bg-betiq-950 text-betiq-500 border border-betiq-800"}`}>Over</button>
              <button type="button" onClick={()=>setForm({...form,betType:"under"})} className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium ${form.betType==="under"?"bg-red-500/10 text-red-400 ring-1 ring-red-500/30":"bg-betiq-950 text-betiq-500 border border-betiq-800"}`}>Under</button></div></div>
            <div><label className="mb-1 block text-xs font-medium text-betiq-400">Odds</label>
              <input type="text" value={form.odds} onChange={e=>setForm({...form,odds:e.target.value})} className="w-full rounded-lg border border-betiq-800 bg-betiq-950 px-3 py-2.5 text-sm text-betiq-100 outline-none focus:border-gold-500/50" placeholder="-110" /></div>
            <div><label className="mb-1 block text-xs font-medium text-betiq-400">Stake ($) *</label>
              <input type="text" value={form.stake} onChange={e=>setForm({...form,stake:e.target.value})} className="w-full rounded-lg border border-betiq-800 bg-betiq-950 px-3 py-2.5 text-sm text-betiq-100 outline-none focus:border-gold-500/50" placeholder="100" /></div>
            <div><label className="mb-1 block text-xs font-medium text-betiq-400">Notes</label>
              <input type="text" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="w-full rounded-lg border border-betiq-800 bg-betiq-950 px-3 py-2.5 text-sm text-betiq-100 outline-none focus:border-gold-500/50" placeholder="Optional" /></div>
          </div>
          <button type="submit" className="btn-gold mt-4 w-full justify-center text-sm">Record Bet</button>
        </form>
      )}

      {/* Filters + Table */}
      {bets.length > 0 && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <select value={fSport} onChange={e=>setFSport(e.target.value)} className="rounded-lg border border-betiq-800 bg-betiq-950 px-3 py-2 text-xs text-betiq-300 outline-none focus:border-gold-500/50">{["All",...SPORTS].map(s=><option key={s}>{s}</option>)}</select>
            <select value={fOutcome} onChange={e=>setFOutcome(e.target.value)} className="rounded-lg border border-betiq-800 bg-betiq-950 px-3 py-2 text-xs text-betiq-300 outline-none focus:border-gold-500/50">{["All","win","loss","push","pending"].map(o=><option key={o}>{o==="All"?"All Outcomes":o}</option>)}</select>
            <div className="ml-auto text-xs text-betiq-500">{filtered.length} of {bets.length} bets</div>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead><tr className="border-b border-betiq-800/50 text-left text-[10px] font-medium uppercase tracking-wider text-betiq-500">
                {[{k:"placed_at",l:"Date"},{k:"sport",l:"Sport"},{k:"stake",l:"Bet"},{k:"odds",l:"Odds"},{k:"outcome",l:"Result"}].map(h=>(
                  <th key={h.k as string} className="cursor-pointer pb-3 pr-3" onClick={()=>{if(sort===h.k as SortField) setSortDir(sortDir==="asc"?"desc":"asc"); else {setSort(h.k as SortField); setSortDir("desc");}}}>{h.l} {sort===h.k as SortField ? (sortDir==="asc"?"↑":"↓") : ""}</th>
                ))}<th className="pb-3 pr-3">P/L</th><th className="pb-3 text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-betiq-800/30">
                {filtered.map(b => {
                  const outcomeColor = b.outcome==="win"?"text-green-400":b.outcome==="loss"?"text-red-400":b.outcome==="push"?"text-betiq-300":"text-betiq-500";
                  return (<tr key={b.id} className="text-sm transition-colors hover:bg-betiq-900/50">
                    <td className="py-3 pr-3 text-betiq-300">{fmtDate(b.placed_at)}</td>
                    <td className="py-3 pr-3"><span className="text-xs font-medium text-betiq-400">{b.sport}</span></td>
                    <td className="py-3 pr-3"><span className="font-medium text-betiq-200">{b.player_name}</span><br/><span className="text-xs text-betiq-500">{b.prop_type} {b.prop_line ? `${b.bet_type} ${b.prop_line}` : b.bet_type}</span></td>
                    <td className="py-3 pr-3 text-betiq-300">{b.odds>0?"+"+b.odds:b.odds}<br/><span className="text-xs text-betiq-500">${b.stake}</span></td>
                    <td className="py-3 pr-3"><span className={`text-xs font-semibold capitalize ${outcomeColor}`}>{b.outcome||"pending"}</span></td>
                    <td className={`py-3 pr-3 text-xs font-medium ${(b.profit??0)>=0?"text-green-400":"text-red-400"}`}>{fmtMoney(b.profit)}</td>
                    <td className="py-3 text-right"><div className="flex items-center justify-end gap-1">
                      {b.outcome==="pending"||!b.outcome ? (<>
                        <button onClick={()=>settle(b.id,"win")} className="rounded px-2 py-1 text-[10px] font-medium text-green-400 hover:bg-green-500/10" title="Win">W</button>
                        <button onClick={()=>settle(b.id,"loss")} className="rounded px-2 py-1 text-[10px] font-medium text-red-400 hover:bg-red-500/10" title="Loss">L</button>
                        <button onClick={()=>settle(b.id,"push")} className="rounded px-2 py-1 text-[10px] font-medium text-betiq-400 hover:bg-betiq-800" title="Push">P</button>
                      </>) : (
                        <button onClick={()=>settle(b.id,"pending")} className="rounded px-2 py-1 text-[10px] font-medium text-betiq-500 hover:bg-betiq-800" title="Reopen">↻</button>
                      )}
                      <button onClick={()=>del(b.id)} className="rounded px-2 py-1 text-[10px] font-medium text-red-400 hover:bg-red-500/10" title="Delete">✕</button>
                    </div></td>
                  </tr>);
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {bets.length === 0 && !loading && (
        <div className="mt-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-betiq-900 text-betiq-500">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
          </div>
          <h3 className="mt-4 text-lg font-semibold text-betiq-300">No bets yet</h3>
          <p className="mt-2 text-sm text-betiq-500">Click "+ New Bet" to start tracking your bets</p>
        </div>
      )}
    </div>
  );
}

// ---------- Server functions ----------
const fetchBets = createServerFn({ method: "GET" }).handler(async () => {
  const { listBets } = await import("./api/bets/-index"); return listBets();
});
const fetchStats = createServerFn({ method: "GET" }).handler(async () => {
  const { getBetStats } = await import("./api/bets/-index"); return getBetStats();
});
const createBetFn = createServerFn({ method: "POST" })
  .validator((data: {sport:string;playerName:string;propType:string;propLine?:number;betType:"over"|"under";odds:number;stake:number;league?:string;notes?:string})=>data)
  .handler(async ({data})=>{const{createBet}=await import("./api/bets/-index");return createBet({data});});
const updateBetFn = createServerFn({ method: "PUT" })
  .validator((data: {id:string;outcome:"win"|"loss"|"push"|"pending";profit?:number})=>data)
  .handler(async ({data})=>{const{updateBet}=await import("./api/bets/-index");return updateBet({data});});
const deleteBetFn = createServerFn({ method: "DELETE" })
  .validator((data: {id:string})=>data)
  .handler(async ({data})=>{const{deleteBet}=await import("./api/bets/-index");return deleteBet({data});});