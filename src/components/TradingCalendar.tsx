"use client";

import React, { useState, useMemo } from "react";
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
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateMonth("prev")}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <button
            onClick={() => navigateMonth("next")}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {/* Day headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="p-2 text-center text-sm font-semibold text-muted-foreground">
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
                relative p-2 rounded-lg border transition-all min-h-[100px]
                ${!isCurrentMonth ? "opacity-30" : ""}
                ${isToday ? "ring-2 ring-[#00FF9C]" : ""}
                ${hasTrades 
                  ? stats.pnl > 0 
                    ? "bg-green-500/20 border-green-500/50 hover:bg-green-500/30" 
                    : "bg-red-500/20 border-red-500/50 hover:bg-red-500/30"
                  : "bg-card border-border hover:bg-muted/50"
                }
              `}
            >
              <div className="text-left space-y-1">
                <div className={`text-sm font-semibold ${isCurrentMonth ? "" : "text-muted-foreground"}`}>
                  {day.date.getDate()}
                </div>
                {hasTrades && stats && (
                  <>
                    <div className={`text-xs font-semibold ${stats.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {formatCurrency(stats.pnl)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stats.tradeCount} {stats.tradeCount === 1 ? "trade" : "trades"}
                    </div>
                    <div className="text-xs text-muted-foreground">
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
        <div className="mt-6 grid grid-cols-5 gap-2">
          {weeklySummaries.map((week, index) => (
            <div key={index} className="p-3 rounded-lg bg-card border border-border">
              <div className="text-xs text-muted-foreground mb-1">Week {week.week}</div>
              <div className={`text-sm font-semibold ${week.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                {formatCurrency(week.pnl)}
              </div>
              <div className="text-xs text-muted-foreground">{week.days} days</div>
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
              className="bg-card rounded-2xl border border-border p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold">
                  {new Date(selectedDay.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Day Summary */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-1">P&L</div>
                  <div className={`text-lg font-bold ${selectedDay.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {formatCurrency(selectedDay.pnl)}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-1">Trades</div>
                  <div className="text-lg font-bold">{selectedDay.tradeCount}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-1">Win Rate</div>
                  <div className="text-lg font-bold">{selectedDay.winRate.toFixed(1)}%</div>
                </div>
                <div className="p-4 rounded-lg bg-muted/30">
                  <div className="text-xs text-muted-foreground mb-1">Avg R</div>
                  <div className="text-lg font-bold">{selectedDay.avgR.toFixed(2)}R</div>
                </div>
              </div>

              {/* Trade List */}
              <div className="space-y-2">
                <h4 className="font-semibold mb-3">Trades</h4>
                {selectedDay.trades.map((trade) => (
                  <div
                    key={trade.id}
                    className="p-3 rounded-lg border border-border bg-muted/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{trade.pair}</span>
                        <span className={`text-sm font-semibold ${
                          trade.direction === "Buy" ? "text-green-500" : "text-red-400"
                        }`}>
                          {trade.direction}
                        </span>
                      </div>
                      <div className={`font-semibold ${
                        trade.profitLoss >= 0 ? "text-green-400" : "text-red-400"
                      }`}>
                        {formatCurrency(trade.profitLoss)}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
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

