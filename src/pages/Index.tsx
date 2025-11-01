"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import { useAuth } from "@/context/AuthContext";
import { TradeForm } from "@/components/TradeForm";
import { TradeTable } from "@/components/TradeTable";
import { TradeSummary } from "@/components/TradeSummary";
import { MT5Upload } from "@/components/MT5Upload";
import { TradingCalendar } from "@/components/TradingCalendar";
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
    
    // Calculate Profit Factor
    const grossProfit = trades
      .filter((t) => Number(t.profitLoss) > 0)
      .reduce((s, t) => s + Number(t.profitLoss || 0), 0);
    const grossLoss = Math.abs(
      trades
        .filter((t) => Number(t.profitLoss) < 0)
        .reduce((s, t) => s + Number(t.profitLoss || 0), 0)
    );
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

    // Calculate current streak
    const sortedTrades = [...trades].sort((a, b) => {
      const timestampA = new Date(a.openTime || a.date).getTime();
      const timestampB = new Date(b.openTime || b.date).getTime();
      return timestampB - timestampA;
    });

    let winStreak = 0;
    let lossStreak = 0;
    for (const trade of sortedTrades) {
      if (Number(trade.profitLoss) > 0) {
        if (lossStreak > 0) break;
        winStreak++;
      } else if (Number(trade.profitLoss) < 0) {
        if (winStreak > 0) break;
        lossStreak++;
      }
    }

    // Monthly stats (current month)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthTrades = trades.filter((t) => {
      const tradeDate = new Date(t.openTime || t.date);
      return tradeDate.getMonth() === currentMonth && tradeDate.getFullYear() === currentYear;
    });
    const monthPL = monthTrades.reduce((s, t) => s + Number(t.profitLoss || 0), 0);
    const tradingDays = new Set(
      monthTrades.map((t) => new Date(t.openTime || t.date).toDateString())
    ).size;

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
      profitFactor: Number(profitFactor.toFixed(2)),
      winStreak,
      lossStreak,
      monthPL,
      tradingDays,
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

      <main className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}!</p>
          </div>
        </div>

        {/* ===== Summary Stats ===== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Net P&L */}
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="text-sm text-muted-foreground mb-1">Net P&L</div>
            <div className={`text-2xl font-bold ${metrics.totalPL >= 0 ? "text-green-400" : "text-red-400"}`}>
              ${metrics.totalPL.toFixed(2)}
            </div>
          </div>

          {/* Profit Factor */}
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="text-sm text-muted-foreground mb-1">Profit Factor</div>
            <div className="text-2xl font-bold text-foreground">
              {metrics.profitFactor.toFixed(2)}
            </div>
          </div>

          {/* Current Streak */}
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="text-sm text-muted-foreground mb-2">Current Streak</div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="text-xs font-semibold text-green-400">{metrics.winStreak} days</div>
                <div className="text-xs font-semibold text-red-400">{metrics.lossStreak} days</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs font-semibold text-green-400">{metrics.winStreak} trades</div>
                <div className="text-xs font-semibold text-red-400">{metrics.lossStreak} trades</div>
              </div>
            </div>
          </div>

          {/* Monthly Stats */}
          <div className="p-5 rounded-xl bg-card border border-border">
            <div className="text-sm text-muted-foreground mb-1">Monthly Stats</div>
            <div className={`text-xl font-bold ${metrics.monthPL >= 0 ? "text-green-400" : "text-red-400"}`}>
              ${(metrics.monthPL / 1000).toFixed(2)}K
            </div>
            <div className="text-xs text-muted-foreground mt-1">{metrics.tradingDays} days</div>
          </div>
        </section>

        {/* ===== Monthly Calendar ===== */}
        <section className="p-6 rounded-2xl bg-card border border-border shadow-md">
          <TradingCalendar trades={trades} />
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
