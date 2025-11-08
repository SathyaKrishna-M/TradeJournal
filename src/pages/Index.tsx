"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
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
  Activity,
  Target,
  TrendingDown,
  FileText,
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
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import PerformanceRadar from "@/components/PerformanceRadar";
import { useThemeTooltipStyles } from "@/utils/themeTooltip";

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
  commission?: number;
  swap?: number;
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
  const { theme, resolvedTheme } = useTheme();
  const isDark = (theme ?? resolvedTheme) === "dark";
  const tooltipStyles = useThemeTooltipStyles();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"analysis" | "history">("analysis");

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
    
    // Best and worst trades
    const bestTrade = trades.length > 0 
      ? trades.reduce((best, t) => 
          Number(t.profitLoss) > Number(best?.profitLoss || -Infinity) ? t : best
        )
      : null;
    const worstTrade = trades.length > 0
      ? trades.reduce((worst, t) => 
          Number(t.profitLoss) < Number(worst?.profitLoss || Infinity) ? t : worst
        )
      : null;
    
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
      bestTrade: bestTrade ? Number(bestTrade.profitLoss).toFixed(2) : "0.00",
      worstTrade: worstTrade ? Number(worstTrade.profitLoss).toFixed(2) : "0.00",
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

  // Advanced Analysis Data
  const shortTrades = trades.filter((t) => t.direction === "Sell");
  const longTrades = trades.filter((t) => t.direction === "Buy");
  
  const shortAnalysis = useMemo(() => {
    const shortWins = shortTrades.filter((t) => t.profitLoss > 0).length;
    const shortLosses = shortTrades.filter((t) => t.profitLoss < 0).length;
    const shortProfit = shortTrades.filter((t) => t.profitLoss > 0).reduce((s, t) => s + t.profitLoss, 0);
    const shortLoss = Math.abs(shortTrades.filter((t) => t.profitLoss < 0).reduce((s, t) => s + t.profitLoss, 0));
    const shortWinRate = shortTrades.length > 0 ? (shortWins / shortTrades.length) * 100 : 0;
    return {
      wins: shortWins,
      losses: shortLosses,
      profit: shortProfit,
      loss: shortLoss,
      winRate: shortWinRate,
      data: [
        { name: "Profit", value: shortProfit, color: "#00FF9D" },
        { name: "Loss", value: shortLoss, color: "#FF4D4D" },
      ],
    };
  }, [shortTrades]);

  const longAnalysis = useMemo(() => {
    const longWins = longTrades.filter((t) => t.profitLoss > 0).length;
    const longLosses = longTrades.filter((t) => t.profitLoss < 0).length;
    const longProfit = longTrades.filter((t) => t.profitLoss > 0).reduce((s, t) => s + t.profitLoss, 0);
    const longLoss = Math.abs(longTrades.filter((t) => t.profitLoss < 0).reduce((s, t) => s + t.profitLoss, 0));
    const longWinRate = longTrades.length > 0 ? (longWins / longTrades.length) * 100 : 0;
    return {
      wins: longWins,
      losses: longLosses,
      profit: longProfit,
      loss: longLoss,
      winRate: longWinRate,
      data: [
        { name: "Profit", value: longProfit, color: "#00FF9D" },
        { name: "Loss", value: longLoss, color: "#FF4D4D" },
      ],
    };
  }, [longTrades]);

  const profitabilityData = useMemo(() => {
    const wins = trades.filter((t) => t.profitLoss > 0).length;
    const losses = trades.filter((t) => t.profitLoss < 0).length;
    return [
      { name: "Wins", value: wins, color: "#00FF9D" },
      { name: "Losses", value: losses, color: "#FF4D4D" },
    ];
  }, [trades]);

  // Instrument Analysis
  const instrumentData = useMemo(() => {
    const instrumentMap = new Map<string, { profit: number; volume: number }>();
    trades.forEach((trade) => {
      const pair = trade.pair || "Unknown";
      if (!instrumentMap.has(pair)) {
        instrumentMap.set(pair, { profit: 0, volume: 0 });
      }
      const data = instrumentMap.get(pair)!;
      data.profit += trade.profitLoss;
      data.volume += 1;
    });
    return Array.from(instrumentMap.entries()).map(([pair, data]) => ({
      pair,
      profit: data.profit,
      volume: data.volume,
    }));
  }, [trades]);

  // P&L by Duration (scatter plot data)
  const durationData = useMemo(() => {
    return trades.map((trade) => {
      const openTime = trade.openTime ? new Date(trade.openTime) : new Date(trade.date);
      const closeTime = trade.closeTime ? new Date(trade.closeTime) : new Date(trade.date);
      const durationMinutes = (closeTime.getTime() - openTime.getTime()) / (1000 * 60);
      return {
        duration: Math.max(0, durationMinutes),
        pnl: trade.profitLoss,
      };
    });
  }, [trades]);

  // P&L Distribution by Duration (binned)
  const durationDistributionData = useMemo(() => {
    const bins: { [key: string]: { profit: number; loss: number } } = {
      "0-1m": { profit: 0, loss: 0 },
      "1-5m": { profit: 0, loss: 0 },
      "5-15m": { profit: 0, loss: 0 },
      "15-30m": { profit: 0, loss: 0 },
      "30m-1h": { profit: 0, loss: 0 },
      "1h-2h": { profit: 0, loss: 0 },
      "2h-4h": { profit: 0, loss: 0 },
      "4h-8h": { profit: 0, loss: 0 },
      "8h+": { profit: 0, loss: 0 },
    };

    trades.forEach((trade) => {
      const openTime = trade.openTime ? new Date(trade.openTime) : new Date(trade.date);
      const closeTime = trade.closeTime ? new Date(trade.closeTime) : new Date(trade.date);
      const durationMinutes = (closeTime.getTime() - openTime.getTime()) / (1000 * 60);
      
      let bin: string;
      if (durationMinutes < 1) bin = "0-1m";
      else if (durationMinutes < 5) bin = "1-5m";
      else if (durationMinutes < 15) bin = "5-15m";
      else if (durationMinutes < 30) bin = "15-30m";
      else if (durationMinutes < 60) bin = "30m-1h";
      else if (durationMinutes < 120) bin = "1h-2h";
      else if (durationMinutes < 240) bin = "2h-4h";
      else if (durationMinutes < 480) bin = "4h-8h";
      else bin = "8h+";

      if (trade.profitLoss > 0) {
        bins[bin].profit += trade.profitLoss;
      } else {
        bins[bin].loss += Math.abs(trade.profitLoss);
      }
    });

    return Object.entries(bins).map(([duration, data]) => ({
      duration,
      profit: data.profit,
      loss: data.loss,
    }));
  }, [trades]);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-gradient-to-b from-[#000000] to-[#0A0A0A] text-white' : 'bg-[#F9FAFB] text-[#111111]'}`}>
      <DashboardHeader />

      <main className="pt-20 pb-12 w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className={`text-3xl lg:text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-[#111111]'}`}>
            Hello, {currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : 'User')}
          </h1>
          <p className={`${isDark ? 'text-[#9A9A9A]' : 'text-[#666666]'} text-sm lg:text-base`}>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}! Track your trading performance.</p>
        </div>

        {/* ===== Tab Navigation - Pill Container ===== */}
        <div className="mb-8 flex justify-center">
          <div className={`inline-flex gap-2 p-1.5 rounded-full border shadow-lg ${
            isDark ? 'bg-[#111111] border-[#1A1A1A]' : 'bg-gray-100 border-[rgba(0,0,0,0.1)]'
          }`}>
            <button
              onClick={() => setActiveTab("analysis")}
              className={`px-6 py-2.5 font-semibold text-sm lg:text-base transition-all duration-300 rounded-full flex items-center gap-2 ${
                activeTab === "analysis"
                  ? isDark
                    ? "bg-gradient-to-r from-[#00FF99] to-[#00CC66] text-black shadow-[0_0_20px_rgba(0,255,153,0.4)]"
                    : "bg-gradient-to-r from-[#00C26D] to-[#009955] text-white shadow-[0_0_20px_rgba(0,194,109,0.3)]"
                  : isDark
                    ? "text-[#9A9A9A] hover:text-[#DADADA] hover:bg-[#1A1A1A]"
                    : "text-[#666666] hover:text-[#111111] hover:bg-gray-200"
              }`}
            >
              <BarChart2 size={18} />
              Analysis
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-6 py-2.5 font-semibold text-sm lg:text-base transition-all duration-300 rounded-full flex items-center gap-2 ${
                activeTab === "history"
                  ? isDark
                    ? "bg-gradient-to-r from-[#00FF99] to-[#00CC66] text-black shadow-[0_0_20px_rgba(0,255,153,0.4)]"
                    : "bg-gradient-to-r from-[#00C26D] to-[#009955] text-white shadow-[0_0_20px_rgba(0,194,109,0.3)]"
                  : isDark
                    ? "text-[#9A9A9A] hover:text-[#DADADA] hover:bg-[#1A1A1A]"
                    : "text-[#666666] hover:text-[#111111] hover:bg-gray-200"
              }`}
            >
              <FileText size={18} />
              Trade History
            </button>
          </div>
        </div>

        {/* ===== Tab Content ===== */}
        <div className="transition-all duration-300">
          {activeTab === "analysis" && (
            <div className="animate-fadeIn">
              {/* ===== Analysis Tab Content ===== */}
              {/* 1. Top Metrics Section - 6 Cards */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8">
                {/* Total Profit/Loss */}
                <div className={`group relative p-5 rounded-2xl border hover:scale-[1.02] transition-all duration-300 min-h-[140px] flex flex-col justify-between overflow-hidden ${
                  isDark 
                    ? 'bg-gradient-to-br from-[#0F0F0F] to-[#1A1A1A] border-[rgba(0,255,153,0.15)] shadow-[0_0_12px_rgba(0,255,153,0.1)_inset] hover:shadow-[0_0_20px_rgba(0,255,153,0.3)]' 
                    : 'bg-white border-[rgba(0,194,109,0.2)] shadow-md hover:shadow-lg'
                }`}>
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                    isDark ? 'bg-gradient-to-br from-[#00FF99]/10 to-transparent' : 'bg-gradient-to-br from-[#00C26D]/5 to-transparent'
                  }`}></div>
                  <div className="relative z-10 flex items-start gap-4">
                    <div className={`p-2.5 rounded-lg border ${
                      isDark ? 'bg-[#00FF99]/10 border-[#00FF99]/30' : 'bg-[#00C26D]/10 border-[#00C26D]/30'
                    }`}>
                      <TrendingUp className={`w-5 h-5 ${isDark ? 'text-[#00FF99]' : 'text-[#00C26D]'}`} />
                    </div>
                    <div className="flex-1">
                      <div className={`text-xs font-medium mb-2 uppercase tracking-wide ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>Total Profit/Loss</div>
                      {metrics.totalPL >= 0 ? (
                        <div className={`text-2xl lg:text-3xl font-bold mb-1 bg-gradient-to-r bg-clip-text text-transparent ${
                          isDark 
                            ? 'from-[#00FF99] to-[#00CC66] drop-shadow-[0_0_15px_rgba(0,255,153,0.5)]' 
                            : 'from-[#00C26D] to-[#009955]'
                        }`}>
                          ${metrics.totalPL >= 0 ? "+" : ""}{metrics.totalPL.toFixed(2)}
                        </div>
                      ) : (
                        <div className="text-2xl lg:text-3xl font-bold mb-1 bg-gradient-to-r from-[#FF4D4D] to-[#CC3333] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,77,77,0.5)]">
              ${metrics.totalPL.toFixed(2)}
                        </div>
                      )}
                      <div className={`text-xs ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>All time</div>
                    </div>
                  </div>
                </div>

                {/* Win Rate */}
                <div className={`group p-5 rounded-2xl border hover:scale-[1.02] transition-all duration-300 min-h-[140px] flex flex-col justify-between ${
                  isDark 
                    ? 'bg-gradient-to-br from-[#0F0F0F] to-[#1A1A1A] border-[rgba(0,255,153,0.15)] shadow-[0_0_12px_rgba(0,255,153,0.1)_inset] hover:border-[#00FF99]/30 hover:shadow-[0_0_20px_rgba(0,255,153,0.3)]' 
                    : 'bg-white border-[rgba(0,194,109,0.2)] shadow-md hover:shadow-lg'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-lg border ${
                      isDark ? 'bg-[#00FF99]/10 border-[#00FF99]/30' : 'bg-[#00C26D]/10 border-[#00C26D]/30'
                    }`}>
                      <Activity className={`w-5 h-5 ${isDark ? 'text-[#00FF99]' : 'text-[#00C26D]'}`} />
                    </div>
                    <div className="flex-1">
                      <div className={`text-xs font-medium mb-2 uppercase tracking-wide ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>Win Rate</div>
                      <div className={`text-2xl lg:text-3xl font-bold mb-1 bg-gradient-to-r bg-clip-text text-transparent ${
                        isDark ? 'from-[#00FF99] to-[#00CC66]' : 'from-[#00C26D] to-[#009955]'
                      }`}>
                        {metrics.winRate}%
                      </div>
                      <div className={`text-xs ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>{trades.filter((t) => t.profitLoss > 0).length} wins</div>
                    </div>
            </div>
          </div>

                {/* Average R:R Ratio */}
                <div className={`group p-5 rounded-2xl border hover:scale-[1.02] transition-all duration-300 min-h-[140px] flex flex-col justify-between ${
                  isDark 
                    ? 'bg-gradient-to-br from-[#0F0F0F] to-[#1A1A1A] border-[rgba(0,255,153,0.15)] shadow-[0_0_12px_rgba(0,255,153,0.1)_inset] hover:border-[#00FF99]/30 hover:shadow-[0_0_20px_rgba(0,255,153,0.3)]' 
                    : 'bg-white border-[rgba(0,194,109,0.2)] shadow-md hover:shadow-lg'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-lg border ${
                      isDark ? 'bg-[#00FF99]/10 border-[#00FF99]/30' : 'bg-[#00C26D]/10 border-[#00C26D]/30'
                    }`}>
                      <Target className={`w-5 h-5 ${isDark ? 'text-[#00FF99]' : 'text-[#00C26D]'}`} />
                    </div>
                    <div className="flex-1">
                      <div className={`text-xs font-medium mb-2 uppercase tracking-wide ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>Average R:R Ratio</div>
                      <div className={`text-2xl lg:text-3xl font-bold mb-1 ${isDark ? 'text-[#EAEAEA]' : 'text-[#111111]'}`}>
                        {metrics.avgRR}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>Risk to reward</div>
                    </div>
            </div>
          </div>

                {/* Total Trades */}
                <div className={`group p-5 rounded-2xl border hover:scale-[1.02] transition-all duration-300 min-h-[140px] flex flex-col justify-between ${
                  isDark 
                    ? 'bg-gradient-to-br from-[#0F0F0F] to-[#1A1A1A] border-[rgba(0,255,153,0.15)] shadow-[0_0_12px_rgba(0,255,153,0.1)_inset] hover:border-[#00FF99]/30 hover:shadow-[0_0_20px_rgba(0,255,153,0.3)]' 
                    : 'bg-white border-[rgba(0,194,109,0.2)] shadow-md hover:shadow-lg'
                }`}>
                  <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-lg border ${
                      isDark ? 'bg-[#00FF99]/10 border-[#00FF99]/30' : 'bg-[#00C26D]/10 border-[#00C26D]/30'
                    }`}>
                      <BarChart2 className={`w-5 h-5 ${isDark ? 'text-[#00FF99]' : 'text-[#00C26D]'}`} />
                    </div>
                    <div className="flex-1">
                      <div className={`text-xs font-medium mb-2 uppercase tracking-wide ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>Total Trades</div>
                      <div className={`text-2xl lg:text-3xl font-bold mb-1 ${isDark ? 'text-[#EAEAEA]' : 'text-[#111111]'}`}>
                        {metrics.totalTrades}
              </div>
                      <div className={`text-xs ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>All trades</div>
              </div>
            </div>
          </div>

                {/* Best Trade */}
                <div className={`group relative p-5 rounded-2xl border hover:scale-[1.02] transition-all duration-300 min-h-[140px] flex flex-col justify-between overflow-hidden ${
                  isDark 
                    ? 'bg-gradient-to-br from-[#0F0F0F] to-[#1A1A1A] border-[rgba(0,255,153,0.15)] shadow-[0_0_12px_rgba(0,255,153,0.1)_inset] hover:shadow-[0_0_20px_rgba(0,255,153,0.3)]' 
                    : 'bg-white border-[rgba(0,194,109,0.2)] shadow-md hover:shadow-lg'
                }`}>
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                    isDark ? 'bg-gradient-to-br from-[#00FF99]/10 to-transparent' : 'bg-gradient-to-br from-[#00C26D]/5 to-transparent'
                  }`}></div>
                  <div className="relative z-10 flex items-start gap-4">
                    <div className={`p-2.5 rounded-lg border ${
                      isDark ? 'bg-[#00FF99]/10 border-[#00FF99]/30' : 'bg-[#00C26D]/10 border-[#00C26D]/30'
                    }`}>
                      <TrendingUp className={`w-5 h-5 ${isDark ? 'text-[#00FF99]' : 'text-[#00C26D]'}`} />
                    </div>
                    <div className="flex-1">
                      <div className={`text-xs font-medium mb-2 uppercase tracking-wide ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>Best Trade</div>
                      <div className={`text-2xl lg:text-3xl font-bold mb-1 bg-gradient-to-r bg-clip-text text-transparent ${
                        isDark 
                          ? 'from-[#00FF99] to-[#00CC66] drop-shadow-[0_0_15px_rgba(0,255,153,0.5)]' 
                          : 'from-[#00C26D] to-[#009955]'
                      }`}>
                        ${metrics.bestTrade}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>Highest profit</div>
                    </div>
            </div>
          </div>

                {/* Worst Trade */}
                <div className={`group relative p-5 rounded-2xl border hover:scale-[1.02] transition-all duration-300 min-h-[140px] flex flex-col justify-between overflow-hidden ${
                  isDark 
                    ? 'bg-gradient-to-br from-[#0F0F0F] to-[#1A1A1A] border-[rgba(255,77,77,0.15)] shadow-[0_0_12px_rgba(255,77,77,0.1)_inset] hover:border-[#FF4D4D]/30 hover:shadow-[0_0_20px_rgba(255,77,77,0.3)]' 
                    : 'bg-white border-[rgba(255,77,77,0.2)] shadow-md hover:shadow-lg'
                }`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-[#FF4D4D]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10 flex items-start gap-4">
                    <div className="p-2.5 rounded-lg bg-[#FF4D4D]/10 border border-[#FF4D4D]/30">
                      <TrendingDown className="w-5 h-5 text-[#FF4D4D]" />
                    </div>
                    <div className="flex-1">
                      <div className={`text-xs font-medium mb-2 uppercase tracking-wide ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>Worst Trade</div>
                      <div className="text-2xl lg:text-3xl font-bold mb-1 bg-gradient-to-r from-[#FF4D4D] to-[#CC3333] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,77,77,0.5)]">
                        ${metrics.worstTrade}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>Largest loss</div>
          </div>
            </div>
          </div>
        </section>

              {/* 2. Equity Curve Chart (Full Width) */}
              <section className="mb-8">
                <div className={`p-6 rounded-2xl border backdrop-blur-sm shadow-lg transition-all duration-300 ${
                  isDark 
                    ? 'bg-gradient-to-b from-[#111111] to-[#151515] border-[rgba(255,255,255,0.08)] hover:shadow-[0_0_20px_rgba(0,255,153,0.2)]' 
                    : 'bg-white border-[rgba(0,0,0,0.1)] hover:shadow-xl'
                }`}>
                  <h2 className={`text-lg lg:text-xl font-semibold mb-2 relative inline-block ${
                    isDark ? 'text-[#EAEAEA]' : 'text-[#111111]'
                  }`}>
                    Equity Curve
                    <span className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r to-transparent ${
                      isDark ? 'from-[#00FF99]' : 'from-[#00C26D]'
                    }`}></span>
                  </h2>
                  <p className={`text-xs mb-6 mt-2 ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>Cumulative Profit Over Time</p>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={equityData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                      <defs>
                        <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={isDark ? "#00FF99" : "#00C26D"} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={isDark ? "#00FF99" : "#00C26D"} stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="equityLineGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor={isDark ? "#00FF99" : "#00C26D"} />
                          <stop offset="100%" stopColor={isDark ? "#00CC66" : "#009955"} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#222222" : "#E5E5E5"} opacity={isDark ? 0.5 : 0.3} />
                      <XAxis 
                        dataKey="date" 
                        stroke={isDark ? "#AAAAAA" : "#666666"}
                        style={{ fontSize: '11px', fontFamily: 'Inter' }}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                      />
                      <YAxis 
                        stroke={isDark ? "#AAAAAA" : "#666666"}
                        style={{ fontSize: '11px', fontFamily: 'Inter' }}
                        label={{ value: 'Profit ($)', angle: -90, position: 'insideLeft', style: { fill: isDark ? '#EAEAEA' : '#111111', fontSize: '11px', fontFamily: 'Inter' } }}
                      />
                <Tooltip
                          contentStyle={tooltipStyles.contentStyle}
                          labelStyle={tooltipStyles.labelStyle}
                          formatter={(value: number) => {
                            const isPositive = value >= 0;
                            return [
                              <span key="value" style={{ color: tooltipStyles.formatterColor(isPositive), fontWeight: "600" }}>
                                ${value.toFixed(2)}
                              </span>,
                              <span key="label" style={{ color: tooltipStyles.labelStyle.color }}>Equity</span>
                            ];
                          }}
                          labelFormatter={(value) => <span style={{ color: tooltipStyles.labelStyle.color }}>Date: {value}</span>}
                />
                <Line
                  type="monotone"
                  dataKey="equity"
                        stroke={isDark ? "url(#equityLineGradient)" : "#00C26D"}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6, fill: isDark ? "#00FF99" : "#00C26D", strokeWidth: 2, stroke: isDark ? "#000000" : "#FFFFFF" }}
                        animationDuration={1000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
              </section>

              {/* 3. Calendar Section (Full Width) */}
              <section className="mb-8">
                <div className={`p-6 rounded-2xl border backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 ${
                  isDark 
                    ? 'bg-gradient-to-b from-[#111111] to-[#151515] border-[rgba(255,255,255,0.08)]' 
                    : 'bg-white border-[rgba(0,0,0,0.1)]'
                }`}>
                  <TradingCalendar trades={trades} />
                </div>
              </section>

              {/* 4. Advanced Analysis Section */}
              <section className="mb-8">
                <h2 className={`text-xl lg:text-2xl font-semibold mb-6 ${isDark ? 'text-[#EAEAEA]' : 'text-[#111111]'}`}>Detailed Analysis</h2>
                
                {/* First Row: Short Analysis, Profitability, Long Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  {/* Short Analysis */}
                  <div className={`p-4 rounded-2xl border backdrop-blur-sm shadow-lg transition-all duration-300 flex flex-col ${
                    isDark 
                      ? 'bg-gradient-to-b from-[#111111] to-[#151515] border-[rgba(255,255,255,0.08)] hover:border-[#00FF99]/30 hover:shadow-[0_0_20px_rgba(0,255,153,0.2)]' 
                      : 'bg-white border-[rgba(0,0,0,0.1)] hover:border-[#00C26D]/30 hover:shadow-xl'
                  }`}>
                    <h3 className={`text-lg font-semibold mb-2 text-center ${isDark ? 'text-[#EAEAEA]' : 'text-[#111111]'}`}>Short Analysis</h3>
                    <div className="flex items-center justify-center flex-1 min-h-[200px] relative -mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <defs>
                            <linearGradient id="shortProfitGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={isDark ? "#00FF99" : "#00C26D"} />
                              <stop offset="100%" stopColor={isDark ? "#00CC66" : "#009955"} />
                            </linearGradient>
                            <linearGradient id="shortLossGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#FF4D4D" />
                              <stop offset="100%" stopColor="#CC3333" />
                            </linearGradient>
                          </defs>
                          <Pie
                            data={shortAnalysis.data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            startAngle={180}
                            endAngle={0}
                            dataKey="value"
                          >
                            {shortAnalysis.data.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.name === "Profit" ? "url(#shortProfitGradient)" : "url(#shortLossGradient)"}
                                style={{ filter: isDark ? "drop-shadow(0 0 12px rgba(0,255,153,0.3))" : "drop-shadow(0 0 8px rgba(0,194,109,0.2))" }}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={tooltipStyles.contentStyle}
                            labelStyle={tooltipStyles.labelStyle}
                            formatter={(value: number, name: string) => {
                              const isProfit = name === "Profit";
                              return [
                                <span key="value" style={{ color: tooltipStyles.formatterColor(isProfit), fontWeight: "600" }}>
                                  ${Math.abs(value).toFixed(2)}
                                </span>,
                                <span key="label" style={{ color: tooltipStyles.labelStyle.color }}>{name}</span>
                              ];
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                      <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isDark 
                          ? 'bg-[rgba(0,255,153,0.1)] border border-[rgba(0,255,153,0.2)]' 
                          : 'bg-[rgba(0,194,109,0.1)] border border-[rgba(0,194,109,0.2)]'
                      }`}>
                        <span className={isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}>Profit: </span>
                        <span className={`font-semibold ${
                          isDark ? 'text-[#00FF99]' : 'text-[#00C26D]'
                        }`}>${shortAnalysis.profit.toFixed(2)}</span>
                      </div>
                      <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isDark 
                          ? 'bg-[rgba(0,255,153,0.1)] border border-[rgba(0,255,153,0.2)]' 
                          : 'bg-[rgba(0,194,109,0.1)] border border-[rgba(0,194,109,0.2)]'
                      }`}>
                        <span className={isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}>Wins: </span>
                        <span className={`font-semibold ${
                          isDark ? 'text-[#00FF99]' : 'text-[#00C26D]'
                        }`}>{shortAnalysis.wins}</span>
                      </div>
                      <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isDark 
                          ? 'bg-[rgba(255,77,77,0.1)] border border-[rgba(255,77,77,0.2)]' 
                          : 'bg-[rgba(255,77,77,0.1)] border border-[rgba(255,77,77,0.2)]'
                      }`}>
                        <span className={isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}>Losses: </span>
                        <span className="text-[#FF4D4D] font-semibold">{shortAnalysis.losses}</span>
                      </div>
                      <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isDark 
                          ? 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]' 
                          : 'bg-gray-100 border border-gray-200'
                      }`}>
                        <span className={isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}>Win Rate: </span>
                        <span className={`font-semibold ${
                          isDark ? 'text-[#EAEAEA]' : 'text-[#111111]'
                        }`}>{shortAnalysis.winRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Profitability */}
                  <div className={`p-4 rounded-2xl border backdrop-blur-sm shadow-lg transition-all duration-300 flex flex-col ${
                    isDark 
                      ? 'bg-gradient-to-b from-[#111111] to-[#151515] border-[rgba(255,255,255,0.08)] hover:border-[#00FF99]/30 hover:shadow-[0_0_20px_rgba(0,255,153,0.2)]' 
                      : 'bg-white border-[rgba(0,0,0,0.1)] hover:border-[#00C26D]/30 hover:shadow-xl'
                  }`}>
                    <h3 className={`text-lg font-semibold mb-2 text-center ${isDark ? 'text-[#EAEAEA]' : 'text-[#111111]'}`}>Profitability</h3>
                    <div className="flex items-center justify-center flex-1 min-h-[200px] relative -mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <defs>
                            <linearGradient id="profitabilityWinGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={isDark ? "#00FF99" : "#00C26D"} />
                              <stop offset="100%" stopColor={isDark ? "#00CC66" : "#009955"} />
                            </linearGradient>
                            <linearGradient id="profitabilityLossGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#FF4D4D" />
                              <stop offset="100%" stopColor="#CC3333" />
                            </linearGradient>
                          </defs>
                          <Pie
                            data={profitabilityData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            startAngle={90}
                            endAngle={-270}
                            dataKey="value"
                          >
                            {profitabilityData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.name === "Wins" ? "url(#profitabilityWinGradient)" : "url(#profitabilityLossGradient)"}
                                style={{ filter: isDark ? "drop-shadow(0 0 12px rgba(0,255,153,0.3))" : "drop-shadow(0 0 8px rgba(0,194,109,0.2))" }}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={tooltipStyles.contentStyle}
                            labelStyle={tooltipStyles.labelStyle}
                            formatter={(value: number, name: string) => {
                              const isWin = name === "Wins";
                              return [
                                <span key="value" style={{ color: tooltipStyles.formatterColor(isWin), fontWeight: "600" }}>
                                  {value}
                                </span>,
                                <span key="label" style={{ color: tooltipStyles.labelStyle.color }}>{name}</span>
                              ];
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-center mt-2">
                      <div className={`text-3xl font-bold ${isDark ? 'text-[#EAEAEA]' : 'text-[#111111]'}`}>{trades.length}</div>
                      <div className={`text-sm mt-1 ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>Total Trades</div>
                    </div>
                  </div>

                  {/* Long Analysis */}
                  <div className={`p-4 rounded-2xl border backdrop-blur-sm shadow-lg transition-all duration-300 flex flex-col ${
                    isDark 
                      ? 'bg-gradient-to-b from-[#111111] to-[#151515] border-[rgba(255,255,255,0.08)] hover:border-[#00FF99]/30 hover:shadow-[0_0_20px_rgba(0,255,153,0.2)]' 
                      : 'bg-white border-[rgba(0,0,0,0.1)] hover:border-[#00C26D]/30 hover:shadow-xl'
                  }`}>
                    <h3 className={`text-lg font-semibold mb-2 text-center ${isDark ? 'text-[#EAEAEA]' : 'text-[#111111]'}`}>Long Analysis</h3>
                    <div className="flex items-center justify-center flex-1 min-h-[200px] relative -mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <defs>
                            <linearGradient id="longProfitGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={isDark ? "#00FF99" : "#00C26D"} />
                              <stop offset="100%" stopColor={isDark ? "#00CC66" : "#009955"} />
                            </linearGradient>
                            <linearGradient id="longLossGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#FF4D4D" />
                              <stop offset="100%" stopColor="#CC3333" />
                            </linearGradient>
                          </defs>
                          <Pie
                            data={longAnalysis.data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            startAngle={180}
                            endAngle={0}
                            dataKey="value"
                          >
                            {longAnalysis.data.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.name === "Profit" ? "url(#longProfitGradient)" : "url(#longLossGradient)"}
                                style={{ filter: isDark ? "drop-shadow(0 0 12px rgba(0,255,153,0.3))" : "drop-shadow(0 0 8px rgba(0,194,109,0.2))" }}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={tooltipStyles.contentStyle}
                            labelStyle={tooltipStyles.labelStyle}
                            formatter={(value: number, name: string) => {
                              const isProfit = name === "Profit";
                              return [
                                <span key="value" style={{ color: tooltipStyles.formatterColor(isProfit), fontWeight: "600" }}>
                                  ${Math.abs(value).toFixed(2)}
                                </span>,
                                <span key="label" style={{ color: tooltipStyles.labelStyle.color }}>{name}</span>
                              ];
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                      <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isDark 
                          ? 'bg-[rgba(0,255,153,0.1)] border border-[rgba(0,255,153,0.2)]' 
                          : 'bg-[rgba(0,194,109,0.1)] border border-[rgba(0,194,109,0.2)]'
                      }`}>
                        <span className={isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}>Profit: </span>
                        <span className={`font-semibold ${
                          isDark ? 'text-[#00FF99]' : 'text-[#00C26D]'
                        }`}>${longAnalysis.profit.toFixed(2)}</span>
                      </div>
                      <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isDark 
                          ? 'bg-[rgba(0,255,153,0.1)] border border-[rgba(0,255,153,0.2)]' 
                          : 'bg-[rgba(0,194,109,0.1)] border border-[rgba(0,194,109,0.2)]'
                      }`}>
                        <span className={isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}>Wins: </span>
                        <span className={`font-semibold ${
                          isDark ? 'text-[#00FF99]' : 'text-[#00C26D]'
                        }`}>{longAnalysis.wins}</span>
                      </div>
                      <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isDark 
                          ? 'bg-[rgba(255,77,77,0.1)] border border-[rgba(255,77,77,0.2)]' 
                          : 'bg-[rgba(255,77,77,0.1)] border border-[rgba(255,77,77,0.2)]'
                      }`}>
                        <span className={isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}>Losses: </span>
                        <span className="text-[#FF4D4D] font-semibold">{longAnalysis.losses}</span>
                      </div>
                      <div className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isDark 
                          ? 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]' 
                          : 'bg-gray-100 border border-gray-200'
                      }`}>
                        <span className={isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}>Win Rate: </span>
                        <span className={`font-semibold ${
                          isDark ? 'text-[#EAEAEA]' : 'text-[#111111]'
                        }`}>{longAnalysis.winRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Second Row: Distribution and Instrument Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* P&L Distribution by Duration */}
                  <div className={`p-6 rounded-2xl border backdrop-blur-sm shadow-lg transition-all duration-300 ${
                    isDark 
                      ? 'bg-gradient-to-b from-[#111111] to-[#151515] border-[rgba(255,255,255,0.08)] hover:shadow-[0_0_20px_rgba(0,255,153,0.2)]' 
                      : 'bg-white border-[rgba(0,0,0,0.1)] hover:shadow-xl'
                  }`}>
                    <h3 className={`text-base font-semibold mb-2 ${isDark ? 'text-[#EAEAEA]' : 'text-[#111111]'}`}>P&L Distribution by Duration</h3>
                    <p className={`text-xs mb-4 ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>Profit/Loss grouped by trade duration</p>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={durationDistributionData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                        <defs>
                          <linearGradient id="profitBarGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={isDark ? "#00FF99" : "#00C26D"} />
                            <stop offset="100%" stopColor={isDark ? "#00CC66" : "#009955"} />
                          </linearGradient>
                          <linearGradient id="lossBarGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FF4D4D" />
                            <stop offset="100%" stopColor="#CC3333" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#222222" : "#E5E5E5"} opacity={isDark ? 0.5 : 0.3} />
                        <XAxis 
                          dataKey="duration" 
                          stroke={isDark ? "#AAAAAA" : "#666666"}
                          style={{ fontSize: '10px', fontFamily: 'Inter' }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis 
                          stroke={isDark ? "#AAAAAA" : "#666666"}
                          style={{ fontSize: '11px', fontFamily: 'Inter' }}
                        />
                <Tooltip
                          contentStyle={tooltipStyles.contentStyle}
                          labelStyle={tooltipStyles.labelStyle}
                          formatter={(value: number, name: string) => {
                            const isProfit = name === "profit";
                            return [
                              <span key="value" style={{ color: tooltipStyles.formatterColor(isProfit), fontWeight: "600" }}>
                                ${Math.abs(value).toFixed(2)}
                              </span>,
                              <span key="label" style={{ color: tooltipStyles.labelStyle.color }}>{isProfit ? "Profit" : "Loss"}</span>
                            ];
                          }}
                        />
                        <Legend wrapperStyle={{ color: isDark ? "#EAEAEA" : "#111111", fontFamily: "Inter" }} />
                        <Bar dataKey="profit" stackId="a" fill="url(#profitBarGradient)" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="loss" stackId="a" fill="url(#lossBarGradient)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* P&L by Trade Duration (Scatter Plot) */}
                  <div className={`p-6 rounded-2xl border backdrop-blur-sm shadow-lg transition-all duration-300 ${
                    isDark 
                      ? 'bg-gradient-to-b from-[#111111] to-[#151515] border-[rgba(255,255,255,0.08)] hover:shadow-[0_0_20px_rgba(0,255,153,0.2)]' 
                      : 'bg-white border-[rgba(0,0,0,0.1)] hover:shadow-xl'
                  }`}>
                    <h3 className={`text-base font-semibold mb-2 ${isDark ? 'text-[#EAEAEA]' : 'text-[#111111]'}`}>P&L by Trade Duration</h3>
                    <p className={`text-xs mb-4 ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>Profit/Loss vs Duration (minutes)</p>
                    <ResponsiveContainer width="100%" height={280}>
                      <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#222222" : "#E5E5E5"} opacity={isDark ? 0.5 : 0.3} />
                        <XAxis 
                          type="number" 
                          dataKey="duration" 
                          name="Duration"
                          unit=" min"
                          stroke={isDark ? "#AAAAAA" : "#666666"}
                          style={{ fontSize: '11px', fontFamily: 'Inter' }}
                        />
                        <YAxis 
                          type="number" 
                          dataKey="pnl" 
                          name="P&L"
                          unit=" $"
                          stroke={isDark ? "#AAAAAA" : "#666666"}
                          style={{ fontSize: '11px', fontFamily: 'Inter' }}
                        />
                        <Tooltip
                          cursor={{ strokeDasharray: '3 3', stroke: isDark ? "#AAAAAA" : "#666666", strokeOpacity: 0.3 }}
                          contentStyle={tooltipStyles.contentStyle}
                          labelStyle={tooltipStyles.labelStyle}
                          formatter={(value: number, name: string) => {
                            const isProfit = value >= 0;
                            return [
                              <span key="value" style={{ color: tooltipStyles.formatterColor(isProfit), fontWeight: "600" }}>
                                ${Math.abs(value).toFixed(2)}
                              </span>,
                              <span key="label" style={{ color: tooltipStyles.labelStyle.color }}>{name}</span>
                            ];
                          }}
                        />
                        <Scatter 
                          name="Profit" 
                          data={durationData.filter(d => d.duration > 0 && d.pnl > 0)} 
                          fill={isDark ? "#00FF99" : "#00C26D"}
                          shape="circle"
                        />
                        <Scatter 
                          name="Loss" 
                          data={durationData.filter(d => d.duration > 0 && d.pnl < 0)} 
                          fill="#FF4D4D"
                          shape="circle"
                        />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Third Row: Instrument Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  {/* Instrument Profit Analysis */}
                  <div className={`p-6 rounded-2xl border backdrop-blur-sm shadow-lg transition-all duration-300 ${
                    isDark 
                      ? 'bg-gradient-to-b from-[#111111] to-[#151515] border-[rgba(255,255,255,0.08)] hover:shadow-[0_0_20px_rgba(0,255,153,0.2)]' 
                      : 'bg-white border-[rgba(0,0,0,0.1)] hover:shadow-xl'
                  }`}>
                    <h3 className={`text-base font-semibold mb-2 ${isDark ? 'text-[#EAEAEA]' : 'text-[#111111]'}`}>Instrument Profit Analysis</h3>
                    <p className={`text-xs mb-4 ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>Profit by Trading Pair</p>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={instrumentData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                        <defs>
                          <linearGradient id="instrumentProfitGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={isDark ? "#00FF99" : "#00C26D"} />
                            <stop offset="100%" stopColor={isDark ? "#00CC66" : "#009955"} />
                          </linearGradient>
                          <linearGradient id="instrumentLossGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FF4D4D" />
                            <stop offset="100%" stopColor="#CC3333" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#222222" : "#E5E5E5"} opacity={isDark ? 0.5 : 0.3} />
                        <XAxis 
                          dataKey="pair" 
                          stroke={isDark ? "#AAAAAA" : "#666666"}
                          style={{ fontSize: '11px', fontFamily: 'Inter' }}
                        />
                        <YAxis 
                          stroke={isDark ? "#AAAAAA" : "#666666"}
                          style={{ fontSize: '11px', fontFamily: 'Inter' }}
                        />
                        <Tooltip
                          contentStyle={tooltipStyles.contentStyle}
                          labelStyle={tooltipStyles.labelStyle}
                          formatter={(value: number) => {
                            const isProfit = value >= 0;
                            return [
                              <span key="value" style={{ color: tooltipStyles.formatterColor(isProfit), fontWeight: "600" }}>
                                ${Math.abs(value).toFixed(2)}
                              </span>,
                              <span key="label" style={{ color: tooltipStyles.labelStyle.color }}>Profit</span>
                            ];
                          }}
                        />
                        <Bar dataKey="profit" radius={[8, 8, 0, 0]} barSize={40}>
                          {instrumentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? "url(#instrumentProfitGradient)" : "url(#instrumentLossGradient)"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Instrument Volume Analysis */}
                  <div className={`p-6 rounded-2xl border backdrop-blur-sm shadow-lg transition-all duration-300 ${
                    isDark 
                      ? 'bg-gradient-to-b from-[#111111] to-[#151515] border-[rgba(255,255,255,0.08)] hover:shadow-[0_0_20px_rgba(0,255,153,0.2)]' 
                      : 'bg-white border-[rgba(0,0,0,0.1)] hover:shadow-xl'
                  }`}>
                    <h3 className={`text-base font-semibold mb-2 ${isDark ? 'text-[#EAEAEA]' : 'text-[#111111]'}`}>Instrument Volume Analysis</h3>
                    <p className={`text-xs mb-4 ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>Trade Volume by Trading Pair</p>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={instrumentData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                        <defs>
                          <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={isDark ? "#00FF99" : "#00C26D"} />
                            <stop offset="100%" stopColor={isDark ? "#00CC66" : "#009955"} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#222222" : "#E5E5E5"} opacity={isDark ? 0.5 : 0.3} />
                        <XAxis 
                          dataKey="pair" 
                          stroke={isDark ? "#AAAAAA" : "#666666"}
                          style={{ fontSize: '11px', fontFamily: 'Inter' }}
                        />
                        <YAxis 
                          stroke={isDark ? "#AAAAAA" : "#666666"}
                          style={{ fontSize: '11px', fontFamily: 'Inter' }}
                        />
                        <Tooltip
                          contentStyle={tooltipStyles.contentStyle}
                          labelStyle={tooltipStyles.labelStyle}
                          formatter={(value: number) => [
                            <span key="value" style={{ color: tooltipStyles.formatterColor(true), fontWeight: "600" }}>
                              {value}
                            </span>,
                            <span key="label" style={{ color: tooltipStyles.labelStyle.color }}>Volume</span>
                          ]}
                        />
                        <Bar dataKey="volume" fill="url(#volumeGradient)" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
                  </div>
                </div>
        </section>
            </div>
          )}

          {activeTab === "history" && (
            <div className="animate-fadeIn">
              {/* ===== Trade History Tab Content ===== */}
              <section className="mb-8">
                <div className={`p-6 rounded-2xl border backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 ${
                  isDark 
                    ? 'bg-gradient-to-b from-[#111111] to-[#151515] border-[rgba(255,255,255,0.08)]' 
                    : 'bg-white border-[rgba(0,0,0,0.1)]'
                }`}>
                  <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                    <div>
                      <h3 className={`text-lg lg:text-xl font-semibold mb-1 ${isDark ? 'text-[#EAEAEA]' : 'text-[#111111]'}`}>Trade History</h3>
                      <p className={`text-xs ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>Complete trading history and analysis</p>
                    </div>

              <div className="flex items-center gap-3">
                      <MT5Upload />
                <button
                  onClick={() => setShowForm(true)}
                        className={`flex items-center gap-2 font-semibold px-5 py-2.5 rounded-lg transition-all hover:scale-105 shadow-lg hover:shadow-xl active:scale-95 ${
                          isDark
                            ? 'bg-gradient-to-r from-[#00FF99] to-[#00CC66] hover:from-[#33FFB2] hover:to-[#00FF99] text-black shadow-[#00FF99]/30'
                            : 'bg-gradient-to-r from-[#00C26D] to-[#009955] hover:from-[#00E680] hover:to-[#00C26D] text-white shadow-[#00C26D]/30'
                        }`}
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
                    <div className={`mt-8 text-center py-12 rounded-xl border ${
                      isDark 
                        ? 'text-[#A0A0A0] bg-[#0D0D0D] border-[rgba(255,255,255,0.08)]' 
                        : 'text-[#666666] bg-gray-50 border-[rgba(0,0,0,0.1)]'
                    }`}>
                      <p className="text-sm">No trades yet — add one manually or import from MT5.</p>
              </div>
            )}
          </div>
        </section>
            </div>
          )}
        </div>

        {/* ===== Add Trade Modal ===== */}
        <TradeForm
          onSubmit={handleAddTrade}
          showForm={showForm}
          setShowForm={setShowForm}
        />
      </main>
    </div>
  );
}
