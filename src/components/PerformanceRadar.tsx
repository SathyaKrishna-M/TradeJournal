"use client";

import React, { useMemo } from "react";
import { useTheme } from "next-themes";
import { Trade } from "@/pages/Index";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { useThemeTooltipStyles } from "@/utils/themeTooltip";

interface PerformanceRadarProps {
  trades: Trade[];
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function PerformanceRadar({ trades }: PerformanceRadarProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = (theme ?? resolvedTheme) === "dark";
  const tooltipStyles = useThemeTooltipStyles();
  const metrics = useMemo(() => {
    const totalTrades = trades.length;
    const wins = trades.filter((t) => Number(t.profitLoss) > 0).length;
    const losses = trades.filter((t) => Number(t.profitLoss) < 0).length;

    const grossProfit = trades
      .filter((t) => Number(t.profitLoss) > 0)
      .reduce((s, t) => s + Number(t.profitLoss || 0), 0);
    const grossLoss = Math.abs(
      trades
        .filter((t) => Number(t.profitLoss) < 0)
        .reduce((s, t) => s + Number(t.profitLoss || 0), 0),
    );

    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 4 : 0; // defensive cap

    // Risk:Reward based on average win / average loss (absolute)
    const avgWin = wins > 0 ? grossProfit / wins : 0;
    const avgLoss = losses > 0 ? grossLoss / losses : 0;
    const rr = avgLoss > 0 ? avgWin / avgLoss : 0;

    // SL usage: percent of trades that have a non-zero stopLoss recorded
    const slUsed = totalTrades > 0
      ? (trades.filter((t) => {
          const sl = (t as any).stopLoss;
          return Number.isFinite(Number(sl)) && Number(sl) !== 0;
        }).length / totalTrades) * 100
      : 0;

    // Expectancy per trade (average P/L)
    const expectancy = totalTrades > 0 ? trades.reduce((s, t) => s + Number(t.profitLoss || 0), 0) / totalTrades : 0;

    // Consistency: lower std dev of trade P/L is better
    const mean = totalTrades > 0 ? trades.reduce((s, t) => s + Number(t.profitLoss || 0), 0) / totalTrades : 0;
    const variance = totalTrades > 0
      ? trades.reduce((s, t) => s + Math.pow(Number(t.profitLoss || 0) - mean, 2), 0) / (totalTrades || 1)
      : 0;
    const stdDev = Math.sqrt(variance);
    const avgAbs = totalTrades > 0 ? trades.reduce((s, t) => s + Math.abs(Number(t.profitLoss || 0)), 0) / totalTrades : 0;

    // Activity: trades per active day (unique dates)
    const activeDays = new Set(trades.map((t) => new Date(t.openTime || t.date).toDateString())).size || 1;
    const tradesPerDay = totalTrades / activeDays;

    // Normalize to 0-100 for radar
    const scoreWinRate = clamp(winRate, 0, 100);
    const scoreProfitFactor = clamp((profitFactor / 2) * 100, 0, 100); // PF=2 => 100
    const scoreAvgRR = clamp((rr / 3) * 100, 0, 100); // RR=3 => 100
    const scoreExpectancy = clamp(((expectancy + 100) / 200) * 100, 0, 100); // map -100..+100 to 0..100
    // Consistency based on coefficient of variation of P/L (bounded)
    const variation = avgAbs > 0 ? stdDev / (avgAbs + 1) : stdDev / 100;
    const scoreConsistency = clamp(100 - variation * 100, 0, 100);
    const scoreActivity = clamp((tradesPerDay / 5) * 100, 0, 100); // 5 trades/day => 100
    const scoreSLUsage = clamp(slUsed, 0, 100);

    const data = [
      { metric: "Consistency", score: Number(scoreConsistency.toFixed(1)) },
      { metric: "SL usage", score: Number(scoreSLUsage.toFixed(1)) },
      { metric: "WR", score: Number(scoreWinRate.toFixed(1)) },
      { metric: "RR", score: Number(scoreAvgRR.toFixed(1)) },
    ];

    // Overall score - equal weights (can be customized)
    const overall = (scoreWinRate + scoreAvgRR + scoreSLUsage + scoreConsistency) / 4;

    return { data, overall };
  }, [trades]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center py-2">
      {/* Radar Chart - Centered and properly sized */}
      <div className="flex-1 w-full flex items-center justify-center min-h-[200px] mb-4">
        <div className="w-full max-w-[240px] max-h-[240px] aspect-square">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={metrics.data} cx="50%" cy="50%" outerRadius="75%">
              <PolarGrid 
                stroke="#2A2A2A" 
                strokeOpacity={0.6}
                gridType="polygon"
                strokeWidth={1}
              />
              <PolarAngleAxis 
                dataKey="metric" 
                tick={{ 
                  fill: "#9A9A9A", 
                  fontSize: 10, 
                  fontWeight: 600,
                  fontFamily: "Inter, system-ui, sans-serif"
                }}
                tickLine={false}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                tick={false} 
                axisLine={false} 
                tickLine={false}
              />
              <Tooltip
                cursor={false}
                formatter={(value: number) => [`${Number(value).toFixed(1)}`, ""]}
                contentStyle={tooltipStyles.contentStyle}
                labelStyle={tooltipStyles.labelStyle}
                wrapperStyle={{ zIndex: 20 }}
              />
              <Radar 
                name="Performance" 
                dataKey="score" 
                stroke={isDark ? "#00FF99" : "#00C26D"} 
                fill={isDark ? "#00FF99" : "#00C26D"} 
                fillOpacity={0.25}
                strokeWidth={2.5}
                dot={{ fill: isDark ? "#00FF99" : "#00C26D", r: 3, strokeWidth: 2, stroke: isDark ? "#00FF99" : "#00C26D" }}
                activeDot={{ r: 5, fill: isDark ? "#33FFB2" : "#00E680", strokeWidth: 2, stroke: isDark ? "#00FF99" : "#00C26D" }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Overall Score - Displayed below radar */}
      <div className="text-center mt-2">
        <div className="text-4xl lg:text-5xl font-bold text-[#00FF99] drop-shadow-[0_0_20px_rgba(0,255,153,0.5)] mb-2">
          {metrics.overall.toFixed(2)}
        </div>
        <div className="text-xs lg:text-sm text-[#9A9A9A] font-medium uppercase tracking-wide">Overall Score</div>
      </div>
    </div>
  );
}
export default PerformanceRadar;
