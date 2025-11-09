"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TradeForm } from "@/components/TradeForm";
import { TradeTable } from "@/components/TradeTable";
import { TradeSummary } from "@/components/TradeSummary";
import { MT5Upload } from "@/components/MT5Upload";
import { TradingCalendar } from "@/components/TradingCalendar";
import { TnTScore } from "@/components/TnTScore";
import { PerformanceMetrics } from "@/components/PerformanceMetrics";
import { SemiCircleGauge } from "@/components/SemiCircleGauge";
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
  Info,
  Wallet,
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
import { toast } from "@/hooks/use-toast";
import { Settings as SettingsIcon } from "lucide-react";

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
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, resolvedTheme } = useTheme();
  const isDark = (theme ?? resolvedTheme) === "dark";
  const tooltipStyles = useThemeTooltipStyles();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"analysis" | "history" | "settings">("analysis");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [accountSize, setAccountSize] = useState<string>(() => {
    const saved = localStorage.getItem("accountSize");
    return saved || "10000";
  });
  const [ddPercentage, setDdPercentage] = useState<string>(() => {
    const saved = localStorage.getItem("ddPercentage");
    return saved || "2";
  });
  const [targetProfitAmount, setTargetProfitAmount] = useState<number>(() => {
    const saved = localStorage.getItem("targetProfitAmount");
    return saved ? parseFloat(saved) : 500;
  });
  const [maxAllowedDailyDD, setMaxAllowedDailyDD] = useState<number>(() => {
    const saved = localStorage.getItem("maxAllowedDailyDD");
    return saved ? parseFloat(saved) : 4;
  });
  const [maxAllowedDD, setMaxAllowedDD] = useState<number>(() => {
    const saved = localStorage.getItem("maxAllowedDD");
    return saved ? parseFloat(saved) : 10;
  });
  const [initialBalance, setInitialBalance] = useState<number>(() => {
    const saved = localStorage.getItem("initialBalance");
    return saved ? parseFloat(saved) : parseFloat(accountSize) || 10000;
  });

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(e.target as Node)) setProfileMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

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

  // Save account size to localStorage
  useEffect(() => {
    if (accountSize) {
      localStorage.setItem("accountSize", accountSize);
    }
  }, [accountSize]);

  // Save DD percentage to localStorage
  useEffect(() => {
    if (ddPercentage) {
      localStorage.setItem("ddPercentage", ddPercentage);
    }
  }, [ddPercentage]);

  // Save performance metrics to localStorage
  useEffect(() => {
    localStorage.setItem("targetProfitAmount", targetProfitAmount.toString());
  }, [targetProfitAmount]);

  useEffect(() => {
    localStorage.setItem("maxAllowedDailyDD", maxAllowedDailyDD.toString());
  }, [maxAllowedDailyDD]);

  useEffect(() => {
    localStorage.setItem("maxAllowedDD", maxAllowedDD.toString());
  }, [maxAllowedDD]);

  useEffect(() => {
    localStorage.setItem("initialBalance", initialBalance.toString());
  }, [initialBalance]);

  // Update initial balance when account size changes (if initial balance hasn't been manually set)
  useEffect(() => {
    const accountSizeValue = parseFloat(accountSize) || 10000;
    const totalPL = trades.reduce((s, t) => s + Number(t.profitLoss || 0), 0);
    const startingBalance = accountSizeValue - totalPL;
    const savedInitialBalance = localStorage.getItem("initialBalance");
    // Only auto-update if initial balance hasn't been manually set
    if (!savedInitialBalance || parseFloat(savedInitialBalance) === 0) {
      setInitialBalance(startingBalance);
    }
  }, [accountSize, trades]);

  // Handle balance from MT5 upload
  const handleBalanceFromMT5 = (balance: number) => {
    if (balance > 0) {
      setAccountSize(balance.toString());
      toast({
        title: "✅ Account Balance Updated",
        description: `Account balance set to $${balance.toFixed(2)} from MT5 report.`,
      });
    }
  };

  // 📈 Metrics
  const metrics = useMemo(() => {
    const totalTrades = trades.length;
    const totalPL = trades.reduce((s, t) => s + Number(t.profitLoss || 0), 0);
    const accountSizeValue = parseFloat(accountSize) || 10000;
    // Current balance is the account size from HTML (which already includes P&L)
    const currentBalance = accountSizeValue;
    // Starting balance = current balance - total P&L (subtract P&L to get original starting balance)
    const startingBalance = currentBalance - totalPL;
    // Balance card should show starting balance
    const balance = startingBalance;
    
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
      totalPL: Number(totalPL.toFixed(2)),
      balance: Number(balance.toFixed(2)),
      startingBalance: Number(startingBalance.toFixed(2)),
      currentBalance: Number(currentBalance.toFixed(2)),
      avgRR: Number(avgRR.toFixed(2)),
      winRate: Number(winRate.toFixed(1)),
      profitFactor: Number(profitFactor.toFixed(2)),
      winStreak,
      lossStreak,
      monthPL: Number(monthPL.toFixed(2)),
      tradingDays,
      bestTrade: bestTrade ? Number(bestTrade.profitLoss).toFixed(2) : "0.00",
      worstTrade: worstTrade ? Number(worstTrade.profitLoss).toFixed(2) : "0.00",
    };
  }, [trades, accountSize]);

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


  return (
    <div className="min-h-screen depth-layer-0 transition-colors duration-300">
      {/* ===== Seamless Integrated Top Section ===== */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 pt-8 pb-6"
      >
        <div className="flex items-center justify-between">
          {/* Left: Logo */}
          <motion.div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate("/dashboard")}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className={`relative w-10 h-10 rounded-xl flex items-center justify-center ${
                isDark 
                  ? 'bg-gradient-to-tr from-[#00FF99] to-[#00CC66] shadow-[0_0_20px_rgba(0,255,153,0.3)]' 
                  : 'bg-gradient-to-tr from-[#00C26D] to-[#009955] shadow-[0_0_15px_rgba(0,194,109,0.2)]'
              }`}
              animate={{ scale: [1, 1.04, 1], rotate: [0, 2, -2, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[rgba(255,255,255,0.3)] to-transparent opacity-60" />
              <img src="/favicon.png" alt="TracknTrade" className="w-7 h-7 relative z-10" />
            </motion.div>
            <div className="leading-tight">
              <div className={`font-heading text-lg font-bold tracking-[-0.3px] ${
                isDark 
                  ? 'text-white drop-shadow-[0_0_20px_rgba(0,255,153,0.2)]' 
                  : 'text-[var(--text-primary)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
              }`}>
                TracknTrade
              </div>
            </div>
          </motion.div>

          {/* Center: Tabs Navigation */}
          <div className="flex-1 flex justify-center px-4">
            <div className="relative inline-flex gap-2">
              <button
                onClick={() => setActiveTab("analysis")}
                className={`relative px-6 py-2.5 font-heading font-medium text-[0.95rem] tracking-[-0.2px] transition-all duration-300 rounded-xl flex items-center gap-2 ${
                  activeTab === "analysis"
                    ? isDark
                      ? "bg-gradient-to-r from-[#00FF99] to-[#00CC66] text-black shadow-[0_0_20px_rgba(0,255,153,0.4)]"
                      : "bg-gradient-to-r from-[#00C26D] to-[#009955] text-white shadow-[0_0_15px_rgba(0,194,109,0.3)]"
                    : isDark
                      ? "text-[rgba(255,255,255,0.6)] hover:text-[rgba(255,255,255,0.9)] hover:bg-[rgba(255,255,255,0.05)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(0,0,0,0.03)]"
                }`}
              >
                {activeTab === "analysis" && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[rgba(255,255,255,0.2)] to-transparent opacity-50" />
                )}
                <BarChart2 size={18} className="relative z-10" />
                <span className="relative z-10">Analysis</span>
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`relative px-6 py-2.5 font-heading font-medium text-[0.95rem] tracking-[-0.2px] transition-all duration-300 rounded-xl flex items-center gap-2 ${
                  activeTab === "history"
                    ? isDark
                      ? "bg-gradient-to-r from-[#00FF99] to-[#00CC66] text-black shadow-[0_0_20px_rgba(0,255,153,0.4)]"
                      : "bg-gradient-to-r from-[#00C26D] to-[#009955] text-white shadow-[0_0_15px_rgba(0,194,109,0.3)]"
                    : isDark
                      ? "text-[rgba(255,255,255,0.6)] hover:text-[rgba(255,255,255,0.9)] hover:bg-[rgba(255,255,255,0.05)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(0,0,0,0.03)]"
                }`}
              >
                {activeTab === "history" && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[rgba(255,255,255,0.2)] to-transparent opacity-50" />
                )}
                <FileText size={18} className="relative z-10" />
                <span className="relative z-10">Trade History</span>
              </button>
            </div>
          </div>

          {/* Right: Profile Section */}
          <div className="relative flex items-center gap-3" ref={profileMenuRef}>
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg font-heading font-medium text-[0.95rem] transition-all ${
              isDark 
                ? 'text-[rgba(255,255,255,0.7)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(0,0,0,0.03)]'
            }`}>
              {currentUser?.displayName || currentUser?.email || "Guest"}
            </div>

            <div className={`p-1.5 rounded-lg transition-all ${
              isDark 
                ? 'hover:bg-[rgba(255,255,255,0.05)]' 
                : 'hover:bg-[rgba(0,0,0,0.03)]'
            }`}>
              <ThemeToggle />
            </div>

            <button
              onClick={() => setProfileMenuOpen((s) => !s)}
              className={`relative w-10 h-10 rounded-xl overflow-hidden transition-all group ${
                isDark 
                  ? 'ring-2 ring-transparent hover:ring-[rgba(0,255,153,0.3)] shadow-[0_0_15px_rgba(0,255,153,0.1)]' 
                  : 'ring-2 ring-transparent hover:ring-[rgba(0,194,109,0.2)] shadow-[0_0_10px_rgba(0,194,109,0.1)]'
              }`}
              aria-label="Open profile menu"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${
                isDark 
                  ? 'from-[rgba(0,255,153,0.1)] to-transparent' 
                  : 'from-[rgba(0,194,109,0.08)] to-transparent'
              } opacity-0 group-hover:opacity-100 transition-opacity`} />
              <img
                src={currentUser?.photoURL ?? "/favicon.png"}
                alt="profile"
                className="w-full h-full object-cover relative z-10"
              />
            </button>

            <AnimatePresence>
              {profileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className={`absolute right-0 top-12 w-48 rounded-xl overflow-hidden z-50 ${
                    isDark 
                      ? 'bg-[#121212] border border-[rgba(255,255,255,0.1)] shadow-[0_8px_32px_rgba(0,0,0,0.5)]' 
                      : 'bg-white border border-[rgba(0,0,0,0.1)] shadow-[0_8px_32px_rgba(0,0,0,0.15)]'
                  }`}
                  style={{
                    boxShadow: isDark 
                      ? '0 8px 32px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                      : '0 8px 32px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                  }}
                >
                  <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${
                    isDark ? 'via-[rgba(0,255,153,0.3)]' : 'via-[rgba(0,194,109,0.3)]'
                  } to-transparent`} />
                  
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate("/profile");
                    }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      isDark 
                        ? 'text-[#EAEAEA] hover:bg-[rgba(255,255,255,0.05)]' 
                        : 'text-[#111111] hover:bg-[rgba(0,0,0,0.03)]'
                    }`}
                  >
                    Profile
                  </button>

                  <div className={`h-px bg-gradient-to-r from-transparent ${
                    isDark ? 'via-[rgba(255,255,255,0.1)]' : 'via-[rgba(0,0,0,0.1)]'
                  } to-transparent`} />

                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-[#FF4D4D] hover:bg-[rgba(255,77,77,0.1)] transition-colors"
                  >
                    Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <main className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 pb-12">
        {/* Page Header with Depth */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="mb-8"
        >
          <h1 className={`font-heading text-3xl lg:text-4xl font-bold mb-2 tracking-[-0.5px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] ${
            isDark ? 'text-white' : 'text-[var(--text-primary)]'
          }`}>
            Hello, {currentUser?.displayName || (currentUser?.email ? currentUser.email.split('@')[0] : 'User')}
          </h1>
          <p className={`font-body ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'} text-[0.95rem]`}>
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}! Track your trading performance.
          </p>
        </motion.div>

        {/* ===== Tab Content ===== */}
        <div className="transition-all duration-300">
          {activeTab === "analysis" && (
            <div className="animate-fadeIn">
              {/* ===== Analysis Tab Content ===== */}
              {/* 1. Top Metrics Section - 6 Cards with Depth */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 mb-10">
                {/* Balance - First Card */}
                <div className="group relative p-6 rounded-2xl depth-layer-2 depth-hover depth-card-glow min-h-[160px] flex flex-col justify-between overflow-hidden border-[rgba(0,255,153,0.2)] dark:border-[rgba(0,255,153,0.25)] border-[rgba(0,194,109,0.25)]">
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                    isDark 
                      ? 'from-[rgba(0,255,153,0.4)] via-[rgba(0,255,153,0.6)] to-[rgba(0,255,153,0.4)]' 
                      : 'from-[rgba(0,194,109,0.4)] via-[rgba(0,194,109,0.6)] to-[rgba(0,194,109,0.4)]'
                  } opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl ${
                    isDark ? 'bg-gradient-to-br from-[rgba(0,255,153,0.1)] to-transparent' : 'bg-gradient-to-br from-[rgba(0,194,109,0.08)] to-transparent'
                  }`} />
                  <div className="relative z-10 flex items-start gap-4">
                    <div className={`p-3 rounded-xl depth-recessed ${
                      isDark ? 'bg-[rgba(0,255,153,0.12)] border-[rgba(0,255,153,0.3)]' : 'bg-[rgba(0,194,109,0.15)] border-[rgba(0,194,109,0.35)]'
                    }`}>
                      <Wallet className={`w-5 h-5 ${isDark ? 'text-[#00FF99]' : 'text-[#00C26D]'}`} />
                    </div>
                    <div className="flex-1">
                      <div className={`font-body text-xs font-medium mb-3 uppercase tracking-[0.5px] ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>Balance</div>
                      <div className={`font-heading metric-value text-2xl lg:text-3xl font-semibold mb-2 tracking-[-0.2px] ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                        ${metrics.currentBalance.toFixed(2)}
                      </div>
                      <div className={`font-body text-xs ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>
                        Account: ${metrics.startingBalance.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Profit/Loss - Second Card */}
                <div className={`group relative p-6 rounded-2xl depth-layer-2 depth-hover depth-card-glow min-h-[160px] flex flex-col justify-between overflow-hidden ${
                  metrics.totalPL >= 0 
                    ? isDark 
                      ? 'border-[rgba(0,255,153,0.2)]' 
                      : 'border-[rgba(0,194,109,0.25)]'
                    : 'border-[rgba(255,77,77,0.2)]'
                }`}>
                  {/* Top glow gradient */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                    metrics.totalPL >= 0
                      ? isDark 
                        ? 'from-[rgba(0,255,153,0.3)] via-[rgba(0,255,153,0.5)] to-[rgba(0,255,153,0.3)]' 
                        : 'from-[rgba(0,194,109,0.3)] via-[rgba(0,194,109,0.5)] to-[rgba(0,194,109,0.3)]'
                      : 'from-[rgba(255,77,77,0.3)] via-[rgba(255,77,77,0.5)] to-[rgba(255,77,77,0.3)]'
                  } opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  
                  {/* Hover glow effect */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl ${
                    metrics.totalPL >= 0
                      ? isDark 
                        ? 'bg-gradient-to-br from-[rgba(0,255,153,0.08)] to-transparent' 
                        : 'bg-gradient-to-br from-[rgba(0,194,109,0.06)] to-transparent'
                      : 'bg-gradient-to-br from-[rgba(255,77,77,0.08)] to-transparent'
                  }`} />
                  
                  <div className="relative z-10 flex items-start gap-4">
                    <div className={`p-3 rounded-xl depth-recessed ${
                      metrics.totalPL >= 0
                        ? isDark 
                          ? 'bg-[rgba(0,255,153,0.1)] border-[rgba(0,255,153,0.25)]' 
                          : 'bg-[rgba(0,194,109,0.12)] border-[rgba(0,194,109,0.3)]'
                        : 'bg-[rgba(255,77,77,0.1)] border-[rgba(255,77,77,0.25)]'
                    }`}>
                      <TrendingUp className={`w-5 h-5 ${
                        metrics.totalPL >= 0 
                          ? isDark ? 'text-[#00FF99]' : 'text-[#00C26D]'
                          : 'text-[#FF4D4D]'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className={`font-body text-xs font-medium mb-3 uppercase tracking-[0.5px] ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>
                        Total Profit/Loss
                      </div>
                      {metrics.totalPL >= 0 ? (
                        <div className={`font-heading metric-value text-2xl lg:text-3xl font-semibold mb-2 tracking-[-0.2px] bg-gradient-to-r bg-clip-text text-transparent ${
                          isDark 
                            ? 'from-[#00FF99] to-[#00CC66] drop-shadow-[0_0_20px_rgba(0,255,153,0.6)]' 
                            : 'from-[#00C26D] to-[#009955]'
                        }`}>
                          ${metrics.totalPL >= 0 ? "+" : ""}{metrics.totalPL.toFixed(2)}
                        </div>
                      ) : (
                        <div className="font-heading metric-value text-2xl lg:text-3xl font-semibold mb-2 tracking-[-0.2px] bg-gradient-to-r from-[#FF4D4D] to-[#CC3333] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,77,77,0.6)]">
                          ${metrics.totalPL.toFixed(2)}
                        </div>
                      )}
                      <div className={`font-body text-xs ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>All time</div>
                    </div>
                  </div>
                </div>

                {/* Win Rate */}
                <div className="group relative p-6 rounded-2xl depth-layer-2 depth-hover depth-card-glow min-h-[160px] flex flex-col justify-between overflow-hidden border-[rgba(0,255,153,0.15)] dark:border-[rgba(0,255,153,0.2)] border-[rgba(0,194,109,0.2)]">
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                    isDark 
                      ? 'from-[rgba(0,255,153,0.3)] via-[rgba(0,255,153,0.5)] to-[rgba(0,255,153,0.3)]' 
                      : 'from-[rgba(0,194,109,0.3)] via-[rgba(0,194,109,0.5)] to-[rgba(0,194,109,0.3)]'
                  } opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl ${
                    isDark ? 'bg-gradient-to-br from-[rgba(0,255,153,0.08)] to-transparent' : 'bg-gradient-to-br from-[rgba(0,194,109,0.06)] to-transparent'
                  }`} />
                  <div className="relative z-10 flex items-start gap-4">
                    <div className={`p-3 rounded-xl depth-recessed ${
                      isDark ? 'bg-[rgba(0,255,153,0.1)] border-[rgba(0,255,153,0.25)]' : 'bg-[rgba(0,194,109,0.12)] border-[rgba(0,194,109,0.3)]'
                    }`}>
                      <Activity className={`w-5 h-5 ${isDark ? 'text-[#00FF99]' : 'text-[#00C26D]'}`} />
                    </div>
                    <div className="flex-1">
                      <div className={`font-body text-xs font-medium mb-3 uppercase tracking-[0.5px] ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>Win Rate</div>
                      <div className={`font-heading metric-value text-2xl lg:text-3xl font-semibold mb-2 tracking-[-0.2px] bg-gradient-to-r bg-clip-text text-transparent ${
                        isDark ? 'from-[#00FF99] to-[#00CC66]' : 'from-[#00C26D] to-[#009955]'
                      }`}>
                        {metrics.winRate}%
                      </div>
                      <div className={`font-body text-xs ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>{trades.filter((t) => t.profitLoss > 0).length} wins</div>
                    </div>
                  </div>
                </div>

                {/* Average R:R Ratio */}
                <div className="group relative p-6 rounded-2xl depth-layer-2 depth-hover depth-card-glow min-h-[160px] flex flex-col justify-between overflow-hidden border-[rgba(0,255,153,0.15)] dark:border-[rgba(0,255,153,0.2)] border-[rgba(0,194,109,0.2)]">
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                    isDark 
                      ? 'from-[rgba(0,255,153,0.3)] via-[rgba(0,255,153,0.5)] to-[rgba(0,255,153,0.3)]' 
                      : 'from-[rgba(0,194,109,0.3)] via-[rgba(0,194,109,0.5)] to-[rgba(0,194,109,0.3)]'
                  } opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl ${
                    isDark ? 'bg-gradient-to-br from-[rgba(0,255,153,0.08)] to-transparent' : 'bg-gradient-to-br from-[rgba(0,194,109,0.06)] to-transparent'
                  }`} />
                  <div className="relative z-10 flex items-start gap-4">
                    <div className={`p-3 rounded-xl depth-recessed ${
                      isDark ? 'bg-[rgba(0,255,153,0.1)] border-[rgba(0,255,153,0.25)]' : 'bg-[rgba(0,194,109,0.12)] border-[rgba(0,194,109,0.3)]'
                    }`}>
                      <Target className={`w-5 h-5 ${isDark ? 'text-[#00FF99]' : 'text-[#00C26D]'}`} />
                    </div>
                    <div className="flex-1">
                      <div className={`font-body text-xs font-medium mb-3 uppercase tracking-[0.5px] ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>Average R:R Ratio</div>
                      <div className={`font-heading metric-value text-2xl lg:text-3xl font-semibold mb-2 tracking-[-0.2px] ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                        {metrics.avgRR}
                      </div>
                      <div className={`font-body text-xs ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>Risk to reward</div>
                    </div>
                  </div>
                </div>

                {/* Best Trade */}
                <div className="group relative p-6 rounded-2xl depth-layer-2 depth-hover depth-card-glow min-h-[160px] flex flex-col justify-between overflow-hidden border-[rgba(0,255,153,0.2)] dark:border-[rgba(0,255,153,0.25)] border-[rgba(0,194,109,0.25)]">
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
                    isDark 
                      ? 'from-[rgba(0,255,153,0.4)] via-[rgba(0,255,153,0.6)] to-[rgba(0,255,153,0.4)]' 
                      : 'from-[rgba(0,194,109,0.4)] via-[rgba(0,194,109,0.6)] to-[rgba(0,194,109,0.4)]'
                  } opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl ${
                    isDark ? 'bg-gradient-to-br from-[rgba(0,255,153,0.1)] to-transparent' : 'bg-gradient-to-br from-[rgba(0,194,109,0.08)] to-transparent'
                  }`} />
                  <div className="relative z-10 flex items-start gap-4">
                    <div className={`p-3 rounded-xl depth-recessed ${
                      isDark ? 'bg-[rgba(0,255,153,0.12)] border-[rgba(0,255,153,0.3)]' : 'bg-[rgba(0,194,109,0.15)] border-[rgba(0,194,109,0.35)]'
                    }`}>
                      <TrendingUp className={`w-5 h-5 ${isDark ? 'text-[#00FF99]' : 'text-[#00C26D]'}`} />
                    </div>
                    <div className="flex-1">
                      <div className={`font-body text-xs font-medium mb-3 uppercase tracking-[0.5px] ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>Best Trade</div>
                      <div className={`font-heading metric-value text-2xl lg:text-3xl font-semibold mb-2 tracking-[-0.2px] bg-gradient-to-r bg-clip-text text-transparent ${
                        isDark 
                          ? 'from-[#00FF99] to-[#00CC66] drop-shadow-[0_0_20px_rgba(0,255,153,0.6)]' 
                          : 'from-[#00C26D] to-[#009955]'
                      }`}>
                        ${metrics.bestTrade}
                      </div>
                      <div className={`font-body text-xs ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>Highest profit</div>
                    </div>
                  </div>
                </div>

                {/* Worst Trade */}
                <div className="group relative p-6 rounded-2xl depth-layer-2 depth-hover depth-card-glow min-h-[160px] flex flex-col justify-between overflow-hidden border-[rgba(255,77,77,0.2)]">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[rgba(255,77,77,0.4)] via-[rgba(255,77,77,0.6)] to-[rgba(255,77,77,0.4)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-br from-[rgba(255,77,77,0.1)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                  <div className="relative z-10 flex items-start gap-4">
                    <div className="p-3 rounded-xl depth-recessed bg-[rgba(255,77,77,0.12)] border-[rgba(255,77,77,0.3)]">
                      <TrendingDown className="w-5 h-5 text-[#FF4D4D]" />
                    </div>
                    <div className="flex-1">
                      <div className={`font-body text-xs font-medium mb-3 uppercase tracking-[0.5px] ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>Worst Trade</div>
                      <div className="font-heading metric-value text-2xl lg:text-3xl font-semibold mb-2 tracking-[-0.2px] bg-gradient-to-r from-[#FF4D4D] to-[#CC3333] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(255,77,77,0.6)]">
                        ${metrics.worstTrade}
                      </div>
                      <div className={`font-body text-xs ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>Largest loss</div>
                    </div>
                  </div>
                </div>
              </section>

              {/* 2. Equity Curve Chart (Full Width) - Depth-Driven */}
              <section className="mb-10">
                <div className="relative p-8 rounded-2xl depth-chart depth-card-glow depth-hover overflow-hidden">
                  {/* Top glow line */}
                  <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${
                    isDark ? 'via-[rgba(0,255,153,0.3)]' : 'via-[rgba(0,194,109,0.3)]'
                  } to-transparent`} />
                  
                    <h2 className={`font-heading chart-title text-lg lg:text-xl font-semibold mb-3 relative inline-block tracking-[-0.3px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] ${
                      isDark ? 'text-white' : 'text-[var(--text-primary)]'
                    }`}>
                      Equity Curve
                      <span className={`absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r ${
                        isDark 
                          ? 'from-[#00FF99] via-[#00FF99] to-transparent' 
                          : 'from-[#00C26D] via-[#00C26D] to-transparent'
                      } opacity-60`}></span>
                    </h2>
                    <p className={`font-body text-xs mb-6 mt-3 ${isDark ? 'text-[rgba(255,255,255,0.7)]' : 'text-[var(--text-secondary)]'}`}>Cumulative Profit Over Time</p>
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

              {/* 3. TnT Score & Performance Metrics - Dual Section */}
              <section className="mb-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: TnT Score */}
                  <TnTScore trades={trades} />
                  
                  {/* Right: Performance Metrics */}
                  <PerformanceMetrics
                    trades={trades}
                    accountSize={accountSize}
                    initialBalance={initialBalance}
                    targetProfitAmount={targetProfitAmount}
                    maxAllowedDD={maxAllowedDD}
                    maxAllowedDailyDD={maxAllowedDailyDD}
                    onInitialBalanceChange={setInitialBalance}
                    onTargetProfitAmountChange={setTargetProfitAmount}
                    onMaxAllowedDDChange={setMaxAllowedDD}
                    onMaxAllowedDailyDDChange={setMaxAllowedDailyDD}
                  />
                </div>
              </section>

              {/* 4. Calendar Section (Full Width) - Depth-Driven */}
              <section className="mb-10">
                <div className="relative p-8 rounded-2xl depth-chart depth-card-glow overflow-hidden">
                  {/* Top glow line */}
                  <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${
                    isDark ? 'via-[rgba(0,255,153,0.3)]' : 'via-[rgba(0,194,109,0.3)]'
                  } to-transparent`} />
                  <TradingCalendar trades={trades} />
                </div>
              </section>

                {/* 5. Advanced Analysis Section - Depth-Driven */}
                <section className="mb-10">
                  <h2 className={`font-heading text-xl lg:text-2xl font-semibold mb-8 tracking-[-0.3px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] ${
                    isDark ? 'text-white' : 'text-[var(--text-primary)]'
                  }`}>Detailed Analysis</h2>
                
                {/* First Row: Short Analysis, Profitability, Long Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  {/* Short Analysis - Semi-circle Gauge */}
                  <div className="relative p-6 rounded-2xl depth-chart depth-hover depth-card-glow flex flex-col overflow-hidden">
                    {/* Top glow line */}
                    <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${
                      isDark ? 'via-[rgba(0,255,153,0.3)]' : 'via-[rgba(0,194,109,0.3)]'
                    } to-transparent`} />
                    <h3 className={`font-heading text-base font-semibold mb-4 text-center tracking-[-0.3px] ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>Short Analysis</h3>
                    <div className="flex-1 w-full h-[200px]">
                      <SemiCircleGauge
                        profit={shortAnalysis.profit}
                        loss={-shortAnalysis.loss}
                        isDark={isDark}
                        gradientId="short"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
                      <div className={`px-2.5 py-1.5 rounded-lg font-body text-xs font-medium transition-all ${
                        isDark 
                          ? 'bg-[rgba(0,255,153,0.1)] border border-[rgba(0,255,153,0.2)]' 
                          : 'bg-[rgba(0,194,109,0.1)] border border-[rgba(0,194,109,0.2)]'
                      }`}>
                        <span className={isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}>Wins: </span>
                        <span className={`font-heading font-semibold ${
                          isDark ? 'text-[#00FF99]' : 'text-[#00C26D]'
                        }`}>{shortAnalysis.wins}</span>
                      </div>
                      <div className={`px-2.5 py-1.5 rounded-lg font-body text-xs font-medium transition-all ${
                        isDark 
                          ? 'bg-[rgba(255,77,77,0.1)] border border-[rgba(255,77,77,0.2)]' 
                          : 'bg-[rgba(255,77,77,0.1)] border border-[rgba(255,77,77,0.2)]'
                      }`}>
                        <span className={isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}>Losses: </span>
                        <span className="font-heading text-[#FF4D4D] font-semibold">{shortAnalysis.losses}</span>
                      </div>
                      <div className={`px-2.5 py-1.5 rounded-lg font-body text-xs font-medium transition-all ${
                        isDark 
                          ? 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]' 
                          : 'bg-gray-100 border border-gray-200'
                      }`}>
                        <span className={isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}>Win Rate: </span>
                        <span className={`font-heading font-semibold ${
                          isDark ? 'text-white' : 'text-[var(--text-primary)]'
                        }`}>{shortAnalysis.winRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Profitability */}
                  <div className="relative aspect-square p-4 rounded-2xl depth-chart depth-hover depth-card-glow flex flex-col overflow-hidden">
                    {/* Top glow line */}
                    <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${
                      isDark ? 'via-[rgba(0,255,153,0.3)]' : 'via-[rgba(0,194,109,0.3)]'
                    } to-transparent`} />
                    <h3 className={`font-heading text-base font-semibold mb-2 text-center tracking-[-0.3px] ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>Profitability</h3>
                    <div className="flex-1 w-full flex items-center justify-center min-h-0">
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
                            innerRadius="38%"
                            outerRadius="70%"
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
                      <div className={`font-heading text-2xl font-semibold tracking-[-0.2px] ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>{trades.length}</div>
                      <div className={`font-body text-xs mt-0.5 ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>Total Trades</div>
                    </div>
                  </div>

                  {/* Long Analysis - Semi-circle Gauge */}
                  <div className="relative p-6 rounded-2xl depth-chart depth-hover depth-card-glow flex flex-col overflow-hidden">
                    {/* Top glow line */}
                    <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${
                      isDark ? 'via-[rgba(0,255,153,0.3)]' : 'via-[rgba(0,194,109,0.3)]'
                    } to-transparent`} />
                    <h3 className={`font-heading text-base font-semibold mb-4 text-center tracking-[-0.3px] ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>Long Analysis</h3>
                    <div className="flex-1 w-full h-[200px]">
                      <SemiCircleGauge
                        profit={longAnalysis.profit}
                        loss={-longAnalysis.loss}
                        isDark={isDark}
                        gradientId="long"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
                      <div className={`px-2.5 py-1.5 rounded-lg font-body text-xs font-medium transition-all ${
                        isDark 
                          ? 'bg-[rgba(0,255,153,0.1)] border border-[rgba(0,255,153,0.2)]' 
                          : 'bg-[rgba(0,194,109,0.1)] border border-[rgba(0,194,109,0.2)]'
                      }`}>
                        <span className={isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}>Wins: </span>
                        <span className={`font-heading font-semibold ${
                          isDark ? 'text-[#00FF99]' : 'text-[#00C26D]'
                        }`}>{longAnalysis.wins}</span>
                      </div>
                      <div className={`px-2.5 py-1.5 rounded-lg font-body text-xs font-medium transition-all ${
                        isDark 
                          ? 'bg-[rgba(255,77,77,0.1)] border border-[rgba(255,77,77,0.2)]' 
                          : 'bg-[rgba(255,77,77,0.1)] border border-[rgba(255,77,77,0.2)]'
                      }`}>
                        <span className={isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}>Losses: </span>
                        <span className="font-heading text-[#FF4D4D] font-semibold">{longAnalysis.losses}</span>
                      </div>
                      <div className={`px-2.5 py-1.5 rounded-lg font-body text-xs font-medium transition-all ${
                        isDark 
                          ? 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]' 
                          : 'bg-gray-100 border border-gray-200'
                      }`}>
                        <span className={isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}>Win Rate: </span>
                        <span className={`font-heading font-semibold ${
                          isDark ? 'text-white' : 'text-[var(--text-primary)]'
                        }`}>{longAnalysis.winRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Second Row: Instrument Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* P&L by Trade Duration (Scatter Plot) */}
                  <div className="relative p-6 rounded-2xl depth-chart depth-hover depth-card-glow overflow-hidden">
                    {/* Top glow line */}
                    <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${
                      isDark ? 'via-[rgba(0,255,153,0.3)]' : 'via-[rgba(0,194,109,0.3)]'
                    } to-transparent`} />
                        <h3 className={`font-heading chart-title text-base font-semibold mb-2 tracking-[-0.3px] ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>P&L by Trade Duration</h3>
                        <p className={`font-body text-xs mb-4 ${isDark ? 'text-[rgba(255,255,255,0.7)]' : 'text-[var(--text-secondary)]'}`}>Profit/Loss vs Duration (minutes)</p>
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

                  {/* Instrument Profit Analysis */}
                  <div className="relative p-6 rounded-2xl depth-chart depth-hover depth-card-glow overflow-hidden">
                    {/* Top glow line */}
                    <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${
                      isDark ? 'via-[rgba(0,255,153,0.3)]' : 'via-[rgba(0,194,109,0.3)]'
                    } to-transparent`} />
                        <h3 className={`font-heading chart-title text-base font-semibold mb-2 tracking-[-0.3px] ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>Instrument Profit Analysis</h3>
                        <p className={`font-body text-xs mb-4 ${isDark ? 'text-[rgba(255,255,255,0.7)]' : 'text-[var(--text-secondary)]'}`}>Profit by Trading Pair</p>
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
                </div>
        </section>
            </div>
          )}

          {activeTab === "history" && (
            <div className="animate-fadeIn">
              {/* ===== Trade History Tab Content ===== */}
              <section className="mb-8">
                <div className="relative p-8 rounded-2xl depth-chart depth-card-glow overflow-hidden">
                  {/* Top glow line */}
                  <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${
                    isDark ? 'via-[rgba(0,255,153,0.3)]' : 'via-[rgba(0,194,109,0.3)]'
                  } to-transparent`} />
                  
                  <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                        <div>
                          <h3 className={`font-heading text-lg lg:text-xl font-semibold mb-1 tracking-[-0.3px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] ${
                            isDark ? 'text-white' : 'text-[var(--text-primary)]'
                          }`}>Trade History</h3>
                          <p className={`font-body text-xs ${isDark ? 'text-[rgba(255,255,255,0.7)]' : 'text-[var(--text-secondary)]'}`}>Complete trading history and analysis</p>
                        </div>

                    <div className="flex items-center gap-3">
                      <MT5Upload onBalanceChange={handleBalanceFromMT5} />
                      <button
                        onClick={() => setShowForm(true)}
                        className="relative flex items-center gap-2 font-semibold px-5 py-3 rounded-xl depth-button-primary depth-hover text-black dark:text-black"
                      >
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[rgba(255,255,255,0.2)] to-transparent opacity-50" />
                        <Plus size={18} className="relative z-10" /> 
                        <span className="relative z-10">Add Trade</span>
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
                    <div className={`mt-8 text-center py-12 rounded-xl depth-recessed ${
                      isDark 
                        ? 'text-[#A0A0A0]' 
                        : 'text-[#666666]'
                    }`}>
                      <p className="text-sm">No trades yet — add one manually or import from MT5.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="animate-fadeIn">
              {/* ===== Settings Tab Content ===== */}
              <section className="mb-8">
                <div className="relative p-8 rounded-2xl depth-chart depth-card-glow overflow-hidden">
                  {/* Top glow line */}
                  <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${
                    isDark ? 'via-[rgba(0,255,153,0.3)]' : 'via-[rgba(0,194,109,0.3)]'
                  } to-transparent`} />
                  
                  <div className="mb-6">
                    <h3 className={`font-heading text-lg lg:text-xl font-semibold mb-1 tracking-[-0.3px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] ${
                      isDark ? 'text-white' : 'text-[var(--text-primary)]'
                    }`}>Risk Management Settings</h3>
                    <p className={`font-body text-xs ${isDark ? 'text-[rgba(255,255,255,0.7)]' : 'text-[var(--text-secondary)]'}`}>Configure account size and drawdown limits</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Account Size */}
                    <div className={`p-6 rounded-xl ${isDark ? 'bg-[rgba(255,255,255,0.05)]' : 'bg-[rgba(0,0,0,0.03)]'} border ${isDark ? 'border-[rgba(255,255,255,0.1)]' : 'border-[rgba(0,0,0,0.1)]'}`}>
                      <label className={`font-body text-sm font-medium mb-3 block ${isDark ? 'text-[rgba(255,255,255,0.8)]' : 'text-[var(--text-primary)]'}`}>
                        Account Size ($)
                      </label>
                      <input
                        type="number"
                        value={accountSize}
                        onChange={(e) => setAccountSize(e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg font-body text-base ${
                          isDark 
                            ? 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white' 
                            : 'bg-white border border-[rgba(0,0,0,0.1)] text-[var(--text-primary)]'
                        } focus:outline-none focus:ring-2 focus:ring-[#00C26D] transition-all`}
                        placeholder="10000"
                        min="0"
                        step="0.01"
                      />
                      <p className={`font-body text-xs mt-2 ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>
                        Your account balance. This will be automatically updated when you upload MT5 HTML.
                      </p>
                    </div>

                    {/* DD Percentage */}
                    <div className={`p-6 rounded-xl ${isDark ? 'bg-[rgba(255,255,255,0.05)]' : 'bg-[rgba(0,0,0,0.03)]'} border ${isDark ? 'border-[rgba(255,255,255,0.1)]' : 'border-[rgba(0,0,0,0.1)]'}`}>
                      <label className={`font-body text-sm font-medium mb-3 block ${isDark ? 'text-[rgba(255,255,255,0.8)]' : 'text-[var(--text-primary)]'}`}>
                        Drawdown Percentage (%)
                      </label>
                      <input
                        type="number"
                        value={ddPercentage}
                        onChange={(e) => setDdPercentage(e.target.value)}
                        className={`w-full px-4 py-3 rounded-lg font-body text-base ${
                          isDark 
                            ? 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white' 
                            : 'bg-white border border-[rgba(0,0,0,0.1)] text-[var(--text-primary)]'
                        } focus:outline-none focus:ring-2 focus:ring-[#00C26D] transition-all`}
                        placeholder="2"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <p className={`font-body text-xs mt-2 ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>
                        Maximum allowed drawdown as percentage of account size. Used for Daily DD and Max DD calculations.
                      </p>
                    </div>
                  </div>

                  {/* Calculated Limits */}
                  <div className={`mt-6 p-6 rounded-xl ${isDark ? 'bg-[rgba(0,255,153,0.1)]' : 'bg-[rgba(0,194,109,0.08)]'} border ${isDark ? 'border-[rgba(0,255,153,0.3)]' : 'border-[rgba(0,194,109,0.3)]'}`}>
                    <h4 className={`font-heading text-base font-semibold mb-4 ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                      Calculated Limits
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className={`font-body text-xs mb-1 ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>Daily DD Limit</div>
                        <div className={`font-heading text-2xl font-bold ${isDark ? 'text-[#00FF99]' : 'text-[#00C26D]'}`}>
                          ${((parseFloat(accountSize) || 0) * (parseFloat(ddPercentage) || 0) / 100).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className={`font-body text-xs mb-1 ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>Max DD Limit</div>
                        <div className={`font-heading text-2xl font-bold ${isDark ? 'text-[#00FF99]' : 'text-[#00C26D]'}`}>
                          ${((parseFloat(accountSize) || 0) * (parseFloat(ddPercentage) || 0) / 100).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-[rgba(255,255,255,0.03)]' : 'bg-[rgba(0,0,0,0.02)]'} border ${isDark ? 'border-[rgba(255,255,255,0.1)]' : 'border-[rgba(0,0,0,0.1)]'}`}>
                    <div className="flex items-start gap-3">
                      <Info className={`w-5 h-5 mt-0.5 ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`} />
                      <div>
                        <p className={`font-body text-sm ${isDark ? 'text-[rgba(255,255,255,0.8)]' : 'text-[var(--text-primary)]'}`}>
                          <strong>How it works:</strong>
                        </p>
                        <ul className={`font-body text-xs mt-2 space-y-1 list-disc list-inside ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>
                          <li>Account size is automatically extracted from MT5 HTML uploads</li>
                          <li>Drawdown percentage determines the maximum allowed Daily DD and Max DD</li>
                          <li>These limits are used in the TnT Score calculation</li>
                          <li>Settings are saved automatically and persist across sessions</li>
                        </ul>
                      </div>
                    </div>
                  </div>
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
