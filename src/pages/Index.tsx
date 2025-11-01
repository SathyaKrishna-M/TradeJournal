"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import { useAuth } from "@/context/AuthContext";
import { TradeForm } from "@/components/TradeForm";
import { TradeTable } from "@/components/TradeTable";
import { TradeSummary } from "@/components/TradeSummary";
import { MT5Upload } from "@/components/MT5Upload";
 // ✅ FIXED import (was destructured incorrectly)
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  updateDoc,
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
import { getSessionFromTradeDate } from "@/utils/sessionDetector";
import { sortTradesByTime } from "@/utils/sortTrades";
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
  pair: "XAUUSD" | "XAGUSD" | string;
  direction: "Buy" | "Sell";
  setupType?: string;
  lotSize?: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  profitLoss: number;
  rrRatio: number;
  session?: string;
  emotion?: string;
  reason?: string;
  notes?: string;
  lesson?: string;
  balance?: number;
  openTime?: string; // Full datetime from Positions table for sorting (e.g., "2025.10.31 21:31:42")
  closeTime?: string;
}

export default function Index() {
  const { currentUser } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔄 Realtime Firestore sync
  useEffect(() => {
    if (!currentUser) return;
    const tradesRef = collection(db, "users", currentUser.uid, "trades");
    const unsubscribe = onSnapshot(tradesRef, (snapshot) => {
      const data = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Trade, "id">),
      })) as Trade[];
      setTrades(sortTradesByTime(data));
    });
    return unsubscribe;
  }, [currentUser]);

  // ➕ Add trade manually
  const handleAddTrade = async (trade: Omit<Trade, "id">) => {
    if (!currentUser) return alert("Please log in first.");
    try {
      setLoading(true);
      const tradesRef = collection(db, "users", currentUser.uid, "trades");
      
      // Auto-detect session if not provided
      const tradeWithSession = {
        ...trade,
        session: trade.session || getSessionFromTradeDate(trade.date),
      };
      
      await addDoc(tradesRef, tradeWithSession);
      setShowForm(false);
    } catch (err) {
      console.error("Error adding trade:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✏️ Update trade
  const handleUpdateTrade = async (id: string, updates: Partial<Trade>) => {
    if (!currentUser) return;
    try {
      const tradeRef = doc(db, "users", currentUser.uid, "trades", id);
      await updateDoc(tradeRef, updates);
    } catch (err) {
      console.error("Error updating trade:", err);
    }
  };

  // ❌ Delete trade
  const handleDeleteTrade = async (id: string) => {
    if (!currentUser) return;
    if (!confirm("Are you sure you want to delete this trade?")) return;
    try {
      const tradeRef = doc(db, "users", currentUser.uid, "trades", id);
      await deleteDoc(tradeRef);
    } catch (err) {
      console.error("Error deleting trade:", err);
    }
  };

  // 🗑️ Bulk delete trades
  const handleBulkDeleteTrades = async (ids: string[]) => {
    if (!currentUser) return;
    if (ids.length === 0) return;
    
    try {
      // Delete all trades in parallel using Promise.all
      await Promise.all(
        ids.map((id) => {
          const tradeRef = doc(db, "users", currentUser.uid, "trades", id);
          return deleteDoc(tradeRef);
        })
      );
    } catch (err) {
      console.error("Error deleting trades:", err);
      alert("Error deleting some trades. Please try again.");
    }
  };

  // 📈 Metrics
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

  // 📊 Chart Data
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
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <DashboardHeader />

      <main className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* ===== Metrics ===== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
              className="p-5 rounded-2xl bg-card border border-border shadow-[0_0_15px_rgba(0,255,156,0.08)] hover:shadow-[0_0_25px_rgba(0,255,156,0.12)] transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm text-muted-foreground">{m.title}</h3>
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

        {/* ===== Charts ===== */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Equity Curve */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border shadow-md">
            <h2 className="text-lg font-semibold mb-5">Equity Curve</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={equityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="date" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="equity"
                  stroke="#00FF9C"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Win / Loss */}
          <aside className="p-6 rounded-2xl bg-card border border-border shadow-md">
            <h2 className="text-lg font-semibold mb-4">Win / Loss Stats</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={winLossData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Legend />
                <Bar dataKey="Wins" fill="#00FF9C" />
                <Bar dataKey="Losses" fill="#FF5555" />
              </BarChart>
            </ResponsiveContainer>
          </aside>
        </section>

        {/* ===== TradeBook ===== */}
        <section>
          <div className="p-6 rounded-2xl bg-card border border-border shadow-md">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="text-lg font-semibold">TradeBook</h3>

              <div className="flex items-center gap-3">
                <MT5Upload /> {/* ✅ Upload Button */}
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 bg-[#00FF9C] hover:bg-[#00cc7a] text-black font-semibold px-4 py-2 rounded-lg transition-all"
                >
                  <Plus size={18} /> Add Trade
                </button>
              </div>
            </div>

            <TradeTable 
              trades={trades} 
              onDelete={handleDeleteTrade}
              onUpdate={handleUpdateTrade}
              onBulkDelete={handleBulkDeleteTrades}
            />
            {trades.length === 0 && (
              <div className="mt-6 text-center text-muted-foreground">
                No trades yet — add one manually or import from MT5.
              </div>
            )}
          </div>
        </section>

        {/* ===== Add Trade Modal ===== */}
        <TradeForm
          onSubmit={handleAddTrade}
          showForm={showForm}
          setShowForm={setShowForm}
        />

        {/* ===== Summary ===== */}
        <div>
          <TradeSummary trades={trades} />
        </div>
      </main>
    </div>
  );
}
