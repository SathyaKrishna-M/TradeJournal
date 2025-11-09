"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useTheme } from "next-themes";
import { Pencil, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Trade } from "@/pages/Index";

interface PerformanceMetricsProps {
  trades: Trade[];
  accountSize: string;
  initialBalance: number; // Initial balance for Max DD calculation
  // User-defined limits (editable)
  targetProfitAmount: number; // $ amount for profit target
  maxAllowedDD: number; // % for max DD limit
  maxAllowedDailyDD: number; // % for daily DD limit
  onInitialBalanceChange: (value: number) => void;
  onTargetProfitAmountChange: (value: number) => void;
  onMaxAllowedDDChange: (value: number) => void;
  onMaxAllowedDailyDDChange: (value: number) => void;
}

export function PerformanceMetrics({
  trades,
  accountSize,
  initialBalance,
  targetProfitAmount,
  maxAllowedDD,
  maxAllowedDailyDD,
  onInitialBalanceChange,
  onTargetProfitAmountChange,
  onMaxAllowedDDChange,
  onMaxAllowedDailyDDChange,
}: PerformanceMetricsProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = (theme ?? resolvedTheme) === "dark";
  
  const [editing, setEditing] = useState<"profitTarget" | "dailyDD" | "maxDD" | "initialBalance" | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const profitTargetInputRef = useRef<HTMLInputElement>(null);
  const dailyDDInputRef = useRef<HTMLInputElement>(null);
  const maxDDInputRef = useRef<HTMLInputElement>(null);
  const initialBalanceInputRef = useRef<HTMLInputElement>(null);

  // Calculate metrics
  const { profitTargetPercent, dailyDDPercent, maxDDPercent, currentBalance, startingBalance, actualMaxDD, actualDailyDD, actualCurrentProfit } = useMemo(() => {
    const accountSizeValue = parseFloat(accountSize) || 10000;
    const totalPL = trades.reduce((s, t) => s + Number(t.profitLoss || 0), 0);
    // Current balance is the account size from HTML (which already includes P&L)
    const currentBalanceValue = accountSizeValue;
    // Starting balance = current balance - total P&L (subtract P&L to get original starting balance)
    const startingBalanceValue = currentBalanceValue - totalPL;
    // Use initialBalance for Max DD calculation (user-defined or default to starting balance)
    const initialBalanceValue = initialBalance > 0 ? initialBalance : startingBalanceValue;

    // 1. Profit Target Calculation
    const currentProfit = currentBalanceValue - startingBalanceValue;
    const profitTargetPercentValue = targetProfitAmount > 0
      ? Math.min(100, Math.max(0, (currentProfit / targetProfitAmount) * 100))
      : 0;

    // 2. Max DD Calculation
    // Calculate equity curve (cumulative P&L over time) starting from initial balance
    const sortedTrades = [...trades].sort((a, b) => {
      const dateA = new Date(a.openTime || a.date).getTime();
      const dateB = new Date(b.openTime || b.date).getTime();
      return dateA - dateB;
    });

    let cumulativePL = 0;
    let peakEquity = initialBalanceValue;
    let lowestEquity = initialBalanceValue;
    let maxDrawdownValue = 0;

    sortedTrades.forEach((trade) => {
      cumulativePL += Number(trade.profitLoss || 0);
      const currentEquity = initialBalanceValue + cumulativePL;
      
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
        lowestEquity = currentEquity; // Reset lowest when new peak is reached
      }
      
      if (currentEquity < lowestEquity) {
        lowestEquity = currentEquity;
      }
      
      const currentDD = peakEquity > 0 ? ((peakEquity - lowestEquity) / peakEquity) * 100 : 0;
      if (currentDD > maxDrawdownValue) {
        maxDrawdownValue = currentDD;
      }
    });

    // If current balance (from initial balance perspective) is above or equal to initial balance, Max DD should be 0
    // This means if you're currently in profit from your initial balance, Max DD is 0
    const finalEquityFromInitial = initialBalanceValue + cumulativePL;
    if (finalEquityFromInitial >= initialBalanceValue) {
      maxDrawdownValue = 0;
    }

    // Max DD Progress = (Current Max DD / Max Allowed DD) * 100
    const maxDDPercentValue = maxAllowedDD > 0
      ? Math.min(100, Math.max(0, (maxDrawdownValue / maxAllowedDD) * 100))
      : 0;

    // 3. Daily DD Calculation
    // Calculate the maximum daily drawdown across all trading days
    const tradesByDate = new Map<string, Trade[]>();
    sortedTrades.forEach((trade) => {
      const tradeDate = new Date(trade.openTime || trade.date).toDateString();
      if (!tradesByDate.has(tradeDate)) {
        tradesByDate.set(tradeDate, []);
      }
      tradesByDate.get(tradeDate)!.push(trade);
    });

    let maxDailyDD = 0;

    // Get all unique dates sorted
    const allDates = Array.from(tradesByDate.keys()).sort();
    
    allDates.forEach((dateStr) => {
      const dayTrades = tradesByDate.get(dateStr)!;
      
      // Sort trades by time within the day
      const sortedDayTrades = [...dayTrades].sort((a, b) => {
        const timeA = new Date(a.openTime || a.date).getTime();
        const timeB = new Date(b.openTime || b.date).getTime();
        return timeA - timeB;
      });

      // Calculate start of day equity (cumulative P&L up to this day, not including this day's trades)
      const previousDaysPL = sortedTrades
        .filter(t => {
          const tDate = new Date(t.openTime || t.date).toDateString();
          return tDate < dateStr;
        })
        .reduce((s, t) => s + Number(t.profitLoss || 0), 0);
      
      const startOfDayEquity = startingBalanceValue + previousDaysPL;
      let dayPeakEquity = startOfDayEquity;
      let dayLowestEquity = startOfDayEquity;
      let dayCumulativePL = 0;

      sortedDayTrades.forEach((trade) => {
        dayCumulativePL += Number(trade.profitLoss || 0);
        const currentDayEquity = startOfDayEquity + dayCumulativePL;
        
        if (currentDayEquity > dayPeakEquity) {
          dayPeakEquity = currentDayEquity;
          dayLowestEquity = currentDayEquity; // Reset lowest when new peak is reached
        }
        
        if (currentDayEquity < dayLowestEquity) {
          dayLowestEquity = currentDayEquity;
        }
      });

      // Calculate daily DD as percentage of start of day equity
      const dailyDD = startOfDayEquity > 0
        ? ((startOfDayEquity - dayLowestEquity) / startOfDayEquity) * 100
        : 0;

      if (dailyDD > maxDailyDD) {
        maxDailyDD = dailyDD;
      }
    });

    // Daily DD Progress = (Current Daily DD / Max Allowed Daily DD) * 100
    const dailyDDPercentValue = maxAllowedDailyDD > 0
      ? Math.min(100, Math.max(0, (maxDailyDD / maxAllowedDailyDD) * 100))
      : 0;

    return {
      profitTargetPercent: Number(profitTargetPercentValue.toFixed(1)),
      dailyDDPercent: Number(dailyDDPercentValue.toFixed(1)),
      maxDDPercent: Number(maxDDPercentValue.toFixed(1)),
      currentBalance: currentBalanceValue,
      startingBalance: startingBalanceValue,
      actualMaxDD: Number(maxDrawdownValue.toFixed(2)),
      actualDailyDD: Number(maxDailyDD.toFixed(2)),
      actualCurrentProfit: Number(currentProfit.toFixed(2)),
    };
  }, [trades, accountSize, initialBalance, targetProfitAmount, maxAllowedDD, maxAllowedDailyDD]);

  // Focus input when editing
  useEffect(() => {
    if (editing === "profitTarget" && profitTargetInputRef.current) {
      profitTargetInputRef.current.focus();
      profitTargetInputRef.current.select();
    } else if (editing === "dailyDD" && dailyDDInputRef.current) {
      dailyDDInputRef.current.focus();
      dailyDDInputRef.current.select();
    } else if (editing === "maxDD" && maxDDInputRef.current) {
      maxDDInputRef.current.focus();
      maxDDInputRef.current.select();
    } else if (editing === "initialBalance" && initialBalanceInputRef.current) {
      initialBalanceInputRef.current.focus();
      initialBalanceInputRef.current.select();
    }
  }, [editing]);

  const handleEdit = (type: "profitTarget" | "dailyDD" | "maxDD" | "initialBalance", currentValue: number) => {
    setEditing(type);
    setEditValue(currentValue.toString());
  };

  const handleSave = (type: "profitTarget" | "dailyDD" | "maxDD" | "initialBalance") => {
    const value = parseFloat(editValue);
    
    if (type === "profitTarget") {
      // Profit Target is in $ amount
      if (isNaN(value) || value < 0) {
        toast({
          title: "Invalid Value",
          description: "Please enter a valid profit target amount ($)",
          variant: "destructive",
        });
        return;
      }
      const roundedValue = Math.round(value * 100) / 100;
      onTargetProfitAmountChange(roundedValue);
      toast({
        title: "Updated",
        description: `Profit Target updated to $${roundedValue}`,
      });
    } else if (type === "dailyDD") {
      // Daily DD is a percentage limit
      if (isNaN(value) || value < 0 || value > 100) {
        toast({
          title: "Invalid Value",
          description: "Please enter a value between 0 and 100",
          variant: "destructive",
        });
        return;
      }
      const roundedValue = Math.round(value * 100) / 100;
      onMaxAllowedDailyDDChange(roundedValue);
      toast({
        title: "Updated",
        description: `Max Allowed Daily DD updated to ${roundedValue}%`,
      });
    } else if (type === "maxDD") {
      // Max DD is a percentage limit
      if (isNaN(value) || value < 0 || value > 100) {
        toast({
          title: "Invalid Value",
          description: "Please enter a value between 0 and 100",
          variant: "destructive",
        });
        return;
      }
      const roundedValue = Math.round(value * 100) / 100;
      onMaxAllowedDDChange(roundedValue);
      toast({
        title: "Updated",
        description: `Max Allowed DD updated to ${roundedValue}%`,
      });
    } else if (type === "initialBalance") {
      // Initial Balance is in $ amount
      if (isNaN(value) || value < 0) {
        toast({
          title: "Invalid Value",
          description: "Please enter a valid initial balance amount ($)",
          variant: "destructive",
        });
        return;
      }
      const roundedValue = Math.round(value * 100) / 100;
      onInitialBalanceChange(roundedValue);
      toast({
        title: "Updated",
        description: `Initial Balance updated to $${roundedValue}`,
      });
    }

    setEditing(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, type: "profitTarget" | "dailyDD" | "maxDD" | "initialBalance") => {
    if (e.key === "Enter") {
      handleSave(type);
    } else if (e.key === "Escape") {
      setEditing(null);
      setEditValue("");
    }
  };

  const MetricItem = ({
    label,
    progressPercent,
    displayValue,
    type,
    limitValue,
    onChange,
    inputRef,
    isAmount = false,
  }: {
    label: string;
    progressPercent: number; // 0-100 for progress bar
    displayValue: number; // Actual calculated value to display
    type: "profitTarget" | "dailyDD" | "maxDD";
    limitValue: number; // User-defined limit
    onChange: (value: number) => void;
    inputRef: React.RefObject<HTMLInputElement>;
    isAmount?: boolean; // If true, display as $ amount, else as %
  }) => {
    const isEditing = editing === type;

    return (
      <div className="mb-6 last:mb-0">
        {/* Label and Percentage */}
        <div className="flex items-center justify-between mb-3">
          <span className={`font-body text-sm font-medium ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>
            {label}
          </span>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <input
                  ref={inputRef}
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleSave(type)}
                  onKeyDown={(e) => handleKeyDown(e, type)}
                  className={`${type === "profitTarget" ? "w-24" : "w-16"} px-2 py-1 rounded text-sm font-heading font-semibold text-center ${
                    isDark
                      ? 'bg-[rgba(255,255,255,0.1)] border border-[rgba(0,255,153,0.3)] text-white'
                      : 'bg-[rgba(0,0,0,0.05)] border border-[rgba(0,194,109,0.3)] text-[var(--text-primary)]'
                  } focus:outline-none focus:ring-2 focus:ring-[#00C26D]`}
                  min={type === "profitTarget" ? "0" : "0"}
                  max={type === "profitTarget" ? undefined : "100"}
                  step={type === "profitTarget" ? "0.01" : "0.1"}
                  placeholder={type === "profitTarget" ? "$0.00" : "0%"}
                />
                <motion.button
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={() => handleSave(type)}
                  className={`p-1 rounded transition-colors ${
                    isDark
                      ? 'hover:bg-[rgba(0,255,153,0.2)] text-[#00FF99]'
                      : 'hover:bg-[rgba(0,194,109,0.1)] text-[#00C26D]'
                  }`}
                >
                  <Check className="w-4 h-4" />
                </motion.button>
              </div>
            ) : (
              <button
                onClick={() => handleEdit(type, limitValue)}
                className="flex items-center gap-1.5 group"
              >
                <div className="flex flex-col items-end">
                  <span className={`font-heading text-lg font-semibold ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                    {isAmount ? `$${displayValue.toFixed(2)}` : `${displayValue.toFixed(1)}%`}
                  </span>
                  <span className={`font-body text-xs ${isDark ? 'text-[rgba(255,255,255,0.5)]' : 'text-[var(--text-muted)]'}`}>
                    Limit: {isAmount ? `$${limitValue.toFixed(2)}` : `${limitValue.toFixed(1)}%`}
                  </span>
                </div>
                <Pencil
                  className={`w-4 h-4 transition-colors ${
                    isDark
                      ? 'text-[rgba(255,255,255,0.4)] group-hover:text-[#00FF99]'
                      : 'text-[var(--text-muted)] group-hover:text-[#00C26D]'
                  }`}
                />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className={`relative h-2 rounded-full overflow-hidden ${
          isDark ? 'bg-[rgba(255,255,255,0.08)]' : 'bg-[rgba(0,0,0,0.08)]'
        }`}>
          <motion.div
            initial={false}
            animate={{
              width: `${Math.min(100, Math.max(0, progressPercent))}%`,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{
              background: isDark
                ? 'linear-gradient(90deg, #00FF99, #00CC66)'
                : 'linear-gradient(90deg, #00C26D, #009955)',
            }}
          />
        </div>

        {/* Min/Max Labels */}
        <div className="flex items-center justify-between mt-2">
          <span className={`font-body text-xs ${isDark ? 'text-[#FF4D4D]' : 'text-[#CC3333]'}`}>
            Min 0%
          </span>
          <span className={`font-body text-xs ${isDark ? 'text-[#00FF99]' : 'text-[#00C26D]'}`}>
            {progressPercent.toFixed(1)}% Max 100%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={`relative p-6 rounded-2xl depth-chart depth-card-glow overflow-hidden h-full flex flex-col ${
      isDark ? 'bg-[#111111]' : 'bg-white'
    }`} style={{
      boxShadow: isDark
        ? '0 0 20px rgba(0,255,153,0.1), 0 4px 16px rgba(0,0,0,0.4)'
        : '0 0 20px rgba(0,194,109,0.1), 0 4px 16px rgba(0,0,0,0.15)',
    }}>
      {/* Top glow line */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${
        isDark ? 'via-[rgba(0,255,153,0.3)]' : 'via-[rgba(0,194,109,0.3)]'
      } to-transparent`} />

      {/* Initial Balance (editable, shown above metrics) */}
      <div className="mb-4 pb-4 border-b border-opacity-20" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
        <div className="flex items-center justify-between">
          <span className={`font-body text-xs font-medium ${isDark ? 'text-[rgba(255,255,255,0.7)]' : 'text-[var(--text-secondary)]'}`}>
            Initial Balance (for Max DD)
          </span>
          <div className="flex items-center gap-2">
            {editing === "initialBalance" ? (
              <div className="flex items-center gap-1">
                <input
                  ref={initialBalanceInputRef}
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleSave("initialBalance")}
                  onKeyDown={(e) => handleKeyDown(e, "initialBalance")}
                  className={`w-24 px-2 py-1 rounded text-sm font-heading font-semibold text-center ${
                    isDark
                      ? 'bg-[rgba(255,255,255,0.1)] border border-[rgba(0,255,153,0.3)] text-white'
                      : 'bg-[rgba(0,0,0,0.05)] border border-[rgba(0,194,109,0.3)] text-[var(--text-primary)]'
                  } focus:outline-none focus:ring-2 focus:ring-[#00C26D]`}
                  min="0"
                  step="0.01"
                  placeholder="$0.00"
                />
                <motion.button
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={() => handleSave("initialBalance")}
                  className={`p-1 rounded transition-colors ${
                    isDark
                      ? 'hover:bg-[rgba(0,255,153,0.2)] text-[#00FF99]'
                      : 'hover:bg-[rgba(0,194,109,0.1)] text-[#00C26D]'
                  }`}
                >
                  <Check className="w-4 h-4" />
                </motion.button>
              </div>
            ) : (
              <button
                onClick={() => handleEdit("initialBalance", initialBalance)}
                className="flex items-center gap-1.5 group"
              >
                <span className={`font-heading text-sm font-semibold ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>
                  ${initialBalance.toFixed(2)}
                </span>
                <Pencil
                  className={`w-3 h-3 transition-colors ${
                    isDark
                      ? 'text-[rgba(255,255,255,0.4)] group-hover:text-[#00FF99]'
                      : 'text-[var(--text-muted)] group-hover:text-[#00C26D]'
                  }`}
                />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="flex-1 flex flex-col justify-center">
        <MetricItem
          label="Profit Target"
          progressPercent={profitTargetPercent}
          displayValue={actualCurrentProfit}
          type="profitTarget"
          limitValue={targetProfitAmount}
          onChange={onTargetProfitAmountChange}
          inputRef={profitTargetInputRef}
          isAmount={true}
        />
        <MetricItem
          label="Daily DD"
          progressPercent={dailyDDPercent}
          displayValue={actualDailyDD}
          type="dailyDD"
          limitValue={maxAllowedDailyDD}
          onChange={onMaxAllowedDailyDDChange}
          inputRef={dailyDDInputRef}
          isAmount={false}
        />
        <MetricItem
          label="Max DD"
          progressPercent={maxDDPercent}
          displayValue={actualMaxDD}
          type="maxDD"
          limitValue={maxAllowedDD}
          onChange={onMaxAllowedDDChange}
          inputRef={maxDDInputRef}
          isAmount={false}
        />
      </div>
    </div>
  );
}

