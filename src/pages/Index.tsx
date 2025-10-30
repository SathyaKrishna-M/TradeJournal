"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import { useAuth } from "@/context/AuthContext";
import { TradeSummary } from "@/components/TradeSummary";
import { TradeForm } from "@/components/TradeForm";
import { TradeTable } from "@/components/TradeTable";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Plus,
  BarChart2,
  Clock,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from "recharts";

export interface Trade {
  id: string;
  date: string;
  pair: "XAUUSD" | "XAGUSD";
  direction: "Buy" | "Sell";
  setupType: "Breakout" | "Reversal" | "Range" | "News";
  lotSize: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  profitLoss: number;
  rrRatio: number;
  session: "London" | "New York" | "Asian";
  emotion: "Calm" | "Fear" | "Greedy" | "Revenge";
  reason: string;
  notes: string;
  lesson: string;
}

export default function Index() {
  const { currentUser } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Firestore real-time sync
  useEffect(() => {
    if (!currentUser) return;
    const tradesRef = collection(db, "users", currentUser.uid, "trades");
    const unsubscribe = onSnapshot(tradesRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Trade, "id">),
      })) as Trade[];
      setTrades(data.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")));
    });
    return unsubscribe;
  }, [currentUser]);

  const handleAddTrade = async (trade: Omit<Trade, "id">) => {
    if (!currentUser) return alert("Please log in first.");
    try {
      setLoading(true);
      const tradesRef = collection(db, "users", currentUser.uid, "trades");
      await addDoc(tradesRef, trade);
      setShowForm(false);
    } catch (err) {
      console.error("Error adding trade:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrade = async (id: string) => {
    if (!currentUser) return;
    const confirmed = confirm("Are you sure you want to delete this trade?");
    if (!confirmed) return;
    try {
      const tradeRef = doc(db, "users", currentUser.uid, "trades", id);
      await deleteDoc(tradeRef);
    } catch (err) {
      console.error("Error deleting trade:", err);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalTrades = trades.length;
    const totalPL = trades.reduce((s, t) => s + Number(t.profitLoss || 0), 0);
    const avgRR =
      trades.length === 0
        ? 0
        : trades.reduce((s, t) => s + Number(t.rrRatio || 0), 0) /
          trades.length;
    const winRate =
      trades.length === 0
        ? 0
        : (trades.filter((t) => Number(t.profitLoss) > 0).length /
            trades.length) *
          100;
    return {
      totalTrades,
      totalPL,
      avgRR: Number(avgRR.toFixed(2)),
      winRate: Number(winRate.toFixed(1)),
    };
  }, [trades]);

  // Chart Data
  const equityData = trades
    .slice()
    .reverse()
    .reduce<{ date: string; equity: number }[]>((acc, trade, i) => {
      const prevEquity = acc[i - 1]?.equity || 0;
      acc.push({
        date: trade.date,
        equity: prevEquity + Number(trade.profitLoss || 0),
      });
      return acc;
    }, []);

  const winLossData = [
    {
      name: "Trades",
      Wins: trades.filter((t) => t.profitLoss > 0).length,
      Losses: trades.filter((t) => t.profitLoss < 0).length,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050505] to-[#0a0a0a] text-white">
      <DashboardHeader />

      <main className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* METRICS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[
            {
              title: "Total P/L",
              value: `${metrics.totalPL >= 0 ? "+" : ""}${metrics.totalPL}`,
              icon: <DollarSign className="w-6 h-6 text-black" />,
              accent: metrics.totalPL >= 0 ? "#00FF9C" : "#FF5555",
            },
            {
              title: "Total Trades",
              value: metrics.totalTrades,
              icon: <Clock className="w-6 h-6 text-black" />,
              accent: "#00FF9C",
            },
            {
              title: "Win Rate",
              value: `${metrics.winRate}%`,
              icon: <BarChart2 className="w-6 h-6 text-black" />,
              accent: "#00FF9C",
            },
            {
              title: "Avg R:R",
              value: metrics.avgRR,
              icon: <TrendingUp className="w-6 h-6 text-black" />,
              accent: "#00FF9C",
            },
          ].map((m, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-black/50 border border-[#111] shadow-[0_0_15px_rgba(0,255,156,0.08)] hover:shadow-[0_0_25px_rgba(0,255,156,0.12)] transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm text-slate-400">{m.title}</h3>
                  <p
                    className="text-3xl font-semibold mt-2"
                    style={{ color: m.accent }}
                  >
                    {m.value}
                  </p>
                </div>
                <div
                  className="p-3 rounded-xl shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${m.accent}, #00c853)`,
                  }}
                >
                  {m.icon}
                </div>
              </div>
            </div>
          ))}
        </section>


                {/* ADD TRADE FORM */}
        <TradeForm
          onSubmit={handleAddTrade}
          showForm={showForm}
          setShowForm={setShowForm}
        />

        {/* CHARTS */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Equity Curve */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-black/40 border border-[#111] backdrop-blur-md shadow-md">
            <h2 className="text-lg font-semibold mb-5">Equity Curve</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={equityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="equity"
                  stroke="#00FF9C"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Win/Loss */}
          <aside className="p-6 rounded-2xl bg-black/40 border border-[#111] backdrop-blur-md shadow-md">
            <h2 className="text-lg font-semibold mb-4">Win / Loss Stats</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={winLossData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip />
                <Legend />
                <Bar dataKey="Wins" fill="#00FF9C" />
                <Bar dataKey="Losses" fill="#FF5555" />
              </BarChart>
            </ResponsiveContainer>
          </aside>
        </section>



                {/* SUMMARY */}
        <div className="mt-12">
          <TradeSummary trades={trades} />
        </div>

        {/* RECENT TRADES */}
        <section className="mt-12">
          <div className="p-6 rounded-2xl bg-black/40 border border-[#111] backdrop-blur-md shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Recent Trades</h3>
                {/* The Add Trade button is now inside the TradeForm component */}
              </div>
            <TradeTable trades={trades} onDelete={handleDeleteTrade} />
            {trades.length === 0 && (
              <div className="mt-6 text-center text-slate-500">
                No trades yet — add one to start tracking.
              </div>
            )}
          </div>
        </section>


      </main>
    </div>
  );
}
