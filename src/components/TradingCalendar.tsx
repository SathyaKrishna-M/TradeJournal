"use client";

import React, { useState, useMemo } from "react";
import { useTheme } from "next-themes";
import { Trade } from "@/pages/Index";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DailyStats {
  date: string;
  pnl: number;
  tradeCount: number;
  winRate: number;
  avgR: number;
  trades: Trade[];
}

interface TradingCalendarProps {
  trades: Trade[];
}

export function TradingCalendar({ trades }: TradingCalendarProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = (theme ?? resolvedTheme) === "dark";
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DailyStats | null>(null);

  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Calculate daily stats
  const dailyStats = useMemo(() => {
    const statsMap = new Map<string, DailyStats>();

    trades.forEach((trade) => {
      // Get date string - handle various formats
      let tradeDate = trade.date || "";
      
      // If date includes time, extract just the date part
      if (tradeDate.includes(" ")) {
        tradeDate = tradeDate.split(" ")[0];
      }
      if (tradeDate.includes("T")) {
        tradeDate = tradeDate.split("T")[0];
      }
      
      // Normalize date format (ensure YYYY-MM-DD)
      if (tradeDate.includes(".")) {
        tradeDate = tradeDate.replace(/\./g, "-");
      }
      
      // If still no valid date, skip
      if (!tradeDate || tradeDate.length < 8) {
        return;
      }
      
      if (!statsMap.has(tradeDate)) {
        statsMap.set(tradeDate, {
          date: tradeDate,
          pnl: 0,
          tradeCount: 0,
          winRate: 0,
          avgR: 0,
          trades: [],
        });
      }

      const dayStats = statsMap.get(tradeDate)!;
      dayStats.pnl += Number(trade.profitLoss || 0);
      dayStats.tradeCount += 1;
      dayStats.trades.push(trade);
    });

    // Calculate win rate and avg R for each day
    statsMap.forEach((stats) => {
      const winningTrades = stats.trades.filter((t) => Number(t.profitLoss) > 0).length;
      stats.winRate = stats.tradeCount > 0 ? (winningTrades / stats.tradeCount) * 100 : 0;
      
      const totalR = stats.trades.reduce((sum, t) => sum + Number(t.rrRatio || 0), 0);
      stats.avgR = stats.tradeCount > 0 ? totalR / stats.tradeCount : 0;
    });

    return statsMap;
  }, [trades]);

  // Get days for current month
  const monthDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Array<{ date: Date; stats?: DailyStats }> = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ date: new Date(currentYear, currentMonth, -startingDayOfWeek + i + 1) });
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      // Format date as YYYY-MM-DD
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const stats = dailyStats.get(dateStr);
      days.push({ date, stats });
    }

    return days;
  }, [currentYear, currentMonth, dailyStats]);

  // Calculate weekly summaries
  const weeklySummaries = useMemo(() => {
    const weeks: Array<{ week: number; pnl: number; days: number }> = [];
    
    monthDays.forEach((day, index) => {
      if (day.stats) {
        const week = Math.floor(index / 7);
        if (!weeks[week]) {
          weeks[week] = { week: week + 1, pnl: 0, days: 0 };
        }
        weeks[week].pnl += day.stats.pnl;
        if (day.stats.tradeCount > 0) {
          weeks[week].days += 1;
        }
      }
    });

    return weeks.filter((w) => w !== undefined);
  }, [monthDays]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 1000) {
      // Format with comma separator for thousands
      if (absValue >= 1000000) {
        return `$${(absValue / 1000000).toFixed(2)}M`;
      }
      // Show with 2 decimals for K format: $1.05K instead of $1.05K
      const kValue = absValue / 1000;
      // If it's a whole number in K, show without decimals
      if (kValue % 1 === 0) {
        return `${value < 0 ? "-" : ""}$${kValue.toFixed(0)}K`;
      }
      return `${value < 0 ? "-" : ""}$${kValue.toFixed(2)}K`;
    }
    // For values less than 1000, show with 2 decimals
    return `${value < 0 ? "-" : ""}$${absValue.toFixed(2)}`;
  };

  const handleDayClick = (stats?: DailyStats) => {
    if (stats) {
      setSelectedDay(stats);
    }
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 lg:gap-4">
          <button
            onClick={() => navigateMonth("prev")}
            className="p-2.5 rounded-xl depth-button depth-hover transition-all"
            aria-label="Previous month"
          >
            <ChevronLeft className={`w-5 h-5 ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`} />
          </button>
          <h2 className={`font-heading text-lg lg:text-xl font-semibold tracking-[-0.3px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] ${
            isDark ? 'text-white' : 'text-[var(--text-primary)]'
          }`}>
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <button
            onClick={() => navigateMonth("next")}
            className="p-2.5 rounded-xl depth-button depth-hover transition-all"
            aria-label="Next month"
          >
            <ChevronRight className={`w-5 h-5 ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {/* Day headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className={`font-body p-2 text-center text-sm font-medium ${isDark ? 'text-[rgba(255,255,255,0.45)]' : 'text-[var(--text-muted)]'}`}>
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {monthDays.map((day, index) => {
          const isCurrentMonth = day.date.getMonth() === currentMonth;
          const isToday = day.date.toDateString() === new Date().toDateString();
          const stats = day.stats;
          const hasTrades = stats && stats.tradeCount > 0;

          return (
            <button
              key={index}
              onClick={() => handleDayClick(stats)}
              className={`
                group relative p-3 rounded-xl min-h-[100px] text-left transition-all duration-300
                ${!isCurrentMonth ? "opacity-30" : ""}
                ${isToday ? "ring-2 ring-[#00FF99] dark:ring-[#00FF99] ring-[#00C26D] ring-opacity-50" : ""}
              `}
              style={{
                background: hasTrades && stats.pnl > 0
                  ? isDark
                    ? 'linear-gradient(135deg, rgba(0, 40, 30, 0.8) 0%, rgba(0, 60, 45, 0.6) 100%)'
                    : 'linear-gradient(135deg, rgba(0, 194, 109, 0.12) 0%, rgba(0, 153, 85, 0.08) 100%)'
                  : hasTrades && stats.pnl < 0
                  ? isDark
                    ? 'linear-gradient(135deg, rgba(60, 20, 20, 0.8) 0%, rgba(80, 30, 30, 0.6) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 77, 77, 0.12) 0%, rgba(204, 51, 51, 0.08) 100%)'
                  : isDark
                  ? 'linear-gradient(135deg, rgba(18, 18, 18, 0.6) 0%, rgba(15, 15, 15, 0.8) 100%)'
                  : 'linear-gradient(135deg, rgba(248, 248, 248, 0.8) 0%, rgba(242, 242, 242, 1) 100%)',
                border: hasTrades && stats.pnl > 0
                  ? isDark
                    ? '1px solid rgba(0, 255, 153, 0.3)'
                    : '1px solid rgba(0, 194, 109, 0.35)'
                  : hasTrades && stats.pnl < 0
                  ? '1px solid rgba(255, 77, 77, 0.3)'
                  : isDark
                  ? '1px solid rgba(255, 255, 255, 0.08)'
                  : '1px solid rgba(0, 0, 0, 0.1)',
                boxShadow: hasTrades && stats.pnl > 0
                  ? isDark
                    ? '0 4px 12px rgba(0, 255, 153, 0.15), inset 0 1px 2px rgba(0, 255, 153, 0.1)'
                    : '0 4px 12px rgba(0, 194, 109, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.5)'
                  : hasTrades && stats.pnl < 0
                  ? isDark
                    ? '0 4px 12px rgba(255, 77, 77, 0.15), inset 0 1px 2px rgba(255, 77, 77, 0.1)'
                    : '0 4px 12px rgba(255, 77, 77, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.5)'
                  : isDark
                  ? 'inset 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.05), 0 1px 2px rgba(0, 0, 0, 0.4)'
                  : 'inset 0 2px 4px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(255, 255, 255, 0.8), 0 1px 2px rgba(0, 0, 0, 0.15)'
              }}
            >
              {/* Hover elevation effect */}
              <div 
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: hasTrades && stats.pnl > 0
                    ? isDark
                      ? 'linear-gradient(135deg, rgba(0, 255, 153, 0.15) 0%, rgba(0, 255, 102, 0.05) 100%)'
                      : 'linear-gradient(135deg, rgba(0, 194, 109, 0.2) 0%, rgba(0, 153, 85, 0.1) 100%)'
                    : hasTrades && stats.pnl < 0
                    ? 'linear-gradient(135deg, rgba(255, 77, 77, 0.15) 0%, rgba(204, 51, 51, 0.05) 100%)'
                    : isDark
                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, transparent 100%)'
                    : 'linear-gradient(135deg, rgba(0, 0, 0, 0.03) 0%, transparent 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: hasTrades && stats.pnl > 0
                    ? isDark
                      ? '0 8px 24px rgba(0, 255, 153, 0.25), inset 0 1px 2px rgba(0, 255, 153, 0.2)'
                      : '0 8px 24px rgba(0, 194, 109, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.6)'
                    : '0 8px 24px rgba(0, 0, 0, 0.2)'
                }}
              />
              
              <div className="relative z-10 space-y-1.5">
                <div className={`font-body text-sm font-medium ${isCurrentMonth ? (isDark ? "text-white" : "text-[var(--text-primary)]") : (isDark ? "text-[rgba(255,255,255,0.4)]" : "text-[var(--text-muted)]")}`}>
                  {day.date.getDate()}
                </div>
                {hasTrades && stats && (
                  <>
                    <div className={`font-heading text-xs font-semibold tracking-[-0.1px] ${
                      stats.pnl >= 0 
                        ? (isDark ? "text-[#00FF99]" : "text-[#00C26D]") 
                        : "text-[#FF4D4D]"
                    }`}>
                      {formatCurrency(stats.pnl)}
                    </div>
                    <div className={`font-body text-xs ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                      {stats.tradeCount} {stats.tradeCount === 1 ? "trade" : "trades"}
                    </div>
                    <div className={`font-body text-xs ${isDark ? 'text-[rgba(255,255,255,0.7)]' : 'text-[var(--text-secondary)]'}`}>
                      {stats.avgR.toFixed(2)}R, {stats.winRate.toFixed(1)}%
                    </div>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Weekly Summaries */}
      {weeklySummaries.length > 0 && (
        <div className="mt-6 grid grid-cols-5 gap-3">
          {weeklySummaries.map((week, index) => (
            <div key={index} className="p-3 rounded-xl depth-recessed">
              <div className={`font-body text-xs mb-1 ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>Week {week.week}</div>
              <div className={`font-heading text-sm font-semibold tracking-[-0.1px] ${week.pnl >= 0 ? (isDark ? "text-[#00FF99]" : "text-[#00C26D]") : "text-[#FF4D4D]"}`}>
                {formatCurrency(week.pnl)}
              </div>
              <div className={`font-body text-xs ${isDark ? 'text-[rgba(255,255,255,0.45)]' : 'text-[var(--text-muted)]'}`}>{week.days} days</div>
            </div>
          ))}
        </div>
      )}

      {/* Day Details Modal */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedDay(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="backdrop-blur-md rounded-2xl depth-layer-3 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              style={{
                boxShadow: '0 12px 48px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
              }}
            >
              {/* Top glow line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.1)] to-transparent dark:via-[rgba(255,255,255,0.05)]" />
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-heading text-2xl font-bold tracking-[-0.3px] ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                  {new Date(selectedDay.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <button
                  onClick={() => setSelectedDay(null)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDark 
                      ? 'hover:bg-[#1A1A1A] text-[rgba(255,255,255,0.6)] hover:text-white' 
                      : 'hover:bg-gray-100 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Day Summary */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl depth-recessed">
                  <div className={`font-body text-xs mb-1 ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>P&L</div>
                  <div className={`font-heading text-lg font-semibold tracking-[-0.2px] ${selectedDay.pnl >= 0 ? (isDark ? "text-[#00FF99]" : "text-[#00C26D]") : "text-[#FF4D4D]"}`}>
                    {formatCurrency(selectedDay.pnl)}
                  </div>
                </div>
                <div className="p-4 rounded-xl depth-recessed">
                  <div className={`font-body text-xs mb-1 ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>Trades</div>
                  <div className={`font-heading text-lg font-semibold tracking-[-0.2px] ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>{selectedDay.tradeCount}</div>
                </div>
                <div className="p-4 rounded-xl depth-recessed">
                  <div className={`font-body text-xs mb-1 ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>Win Rate</div>
                  <div className={`font-heading text-lg font-semibold tracking-[-0.2px] ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>{selectedDay.winRate.toFixed(1)}%</div>
                </div>
                <div className="p-4 rounded-xl depth-recessed">
                  <div className={`font-body text-xs mb-1 ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>Avg R</div>
                  <div className={`font-heading text-lg font-semibold tracking-[-0.2px] ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>{selectedDay.avgR.toFixed(2)}R</div>
                </div>
              </div>

              {/* Trade List */}
              <div className="space-y-2">
                <h4 className={`font-heading font-semibold mb-3 tracking-[-0.2px] ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>Trades</h4>
                {selectedDay.trades.map((trade) => (
                  <div
                    key={trade.id}
                    className="p-3 rounded-xl depth-recessed mb-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`font-heading font-semibold ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>{trade.pair}</span>
                        <span className={`font-heading text-sm font-semibold tracking-[-0.1px] ${
                          trade.direction === "Buy" 
                            ? (isDark ? "text-[#00FF99]" : "text-[#00C26D]")
                            : "text-[#FF4D4D]"
                        }`}>
                          {trade.direction}
                        </span>
                      </div>
                      <div className={`font-heading font-semibold tracking-[-0.1px] ${
                        trade.profitLoss >= 0 
                          ? (isDark ? "text-[#00FF99]" : "text-[#00C26D]")
                          : "text-[#FF4D4D]"
                      }`}>
                        {formatCurrency(trade.profitLoss)}
                      </div>
                    </div>
                    <div className={`font-body flex items-center gap-4 mt-2 text-xs ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-secondary)]'}`}>
                      <span>Entry: {trade.entry}</span>
                      <span>R:R: {trade.rrRatio?.toFixed(2) || "-"}</span>
                      {trade.session && <span>Session: {trade.session}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

