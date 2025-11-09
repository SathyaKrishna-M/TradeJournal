"use client";

import React, { useMemo } from "react";
import { useTheme } from "next-themes";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Trade } from "@/pages/Index";
interface TnTScoreProps {
  trades: Trade[];
}

export function TnTScore({ trades }: TnTScoreProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDark = (theme ?? resolvedTheme) === "dark";

  const { scoreData, overallScore } = useMemo(() => {
    if (trades.length === 0) {
      return {
        scoreData: [
          { metric: "Consistency", score: 0 },
          { metric: "Risk Reward (RR)", score: 0 },
          { metric: "Win Rate (WR)", score: 0 },
          { metric: "SL Usage", score: 0 },
        ],
        overallScore: 0,
      };
    }

    // Calculate Win Rate
    const wins = trades.filter((t) => Number(t.profitLoss) > 0).length;
    const winRate = (wins / trades.length) * 100;

    // Calculate Average Risk Reward (RR) Ratio
    const tradesWithRR = trades.filter((t) => Number(t.rrRatio || 0) > 0);
    const avgRR = tradesWithRR.length > 0
      ? tradesWithRR.reduce((s, t) => s + Number(t.rrRatio || 0), 0) / tradesWithRR.length
      : 0;

    // Calculate SL Usage (percentage of trades with stop loss)
    const tradesWithSL = trades.filter((t) => Number(t.stopLoss || 0) > 0).length;
    const slUsage = (tradesWithSL / trades.length) * 100;

    // Calculate Consistency (based on coefficient of variation)
    const plValues = trades.map((t) => Number(t.profitLoss || 0));
    const meanPL = plValues.reduce((s, v) => s + v, 0) / plValues.length;
    const variance = plValues.reduce((s, v) => s + Math.pow(v - meanPL, 2), 0) / plValues.length;
    const stdDev = Math.sqrt(variance);
    const meanAbs = Math.abs(meanPL) || 1;
    const coefficientOfVariation = stdDev / meanAbs;
    const consistency = Math.max(0, 100 - (coefficientOfVariation * 50)); // Lower CV = Higher consistency

    // Normalize scores to 0-100
    const normalizeScore = (value: number, max: number) => Math.min(100, Math.max(0, (value / max) * 100));

    const scoreConsistency = normalizeScore(consistency, 100);
    const scoreRR = normalizeScore(avgRR, 3); // RR of 3 => 100
    const scoreWR = normalizeScore(winRate, 100);
    const scoreSLUsage = normalizeScore(slUsage, 100);

    // 4 metrics for radar chart
    const scoreData = [
      { metric: "Consistency", score: Number(scoreConsistency.toFixed(1)) },
      { metric: "Risk Reward (RR)", score: Number(scoreRR.toFixed(1)) },
      { metric: "Win Rate (WR)", score: Number(scoreWR.toFixed(1)) },
      { metric: "SL Usage", score: Number(scoreSLUsage.toFixed(1)) },
    ];

    // Overall score (average of 4 metrics)
    const overallScore = (
      scoreConsistency +
      scoreRR +
      scoreWR +
      scoreSLUsage
    ) / 4;

    return { 
      scoreData, 
      overallScore: Number(overallScore.toFixed(2)),
    };
  }, [trades]);

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

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <h3 className={`font-heading text-base font-semibold tracking-[-0.3px] ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>
          TnT Score
        </h3>
      </div>

      {/* Radar Chart - 4 metrics */}
      <div className="w-full flex-1 min-h-[280px] mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={scoreData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <defs>
              <linearGradient id="radarFillGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isDark ? "rgba(0, 255, 153, 0.4)" : "rgba(0, 194, 109, 0.3)"} />
                <stop offset="100%" stopColor={isDark ? "rgba(0, 255, 153, 0.1)" : "rgba(0, 194, 109, 0.1)"} />
              </linearGradient>
            </defs>
            <PolarGrid 
              stroke={isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}
              strokeWidth={1}
            />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ 
                fill: isDark ? "rgba(255, 255, 255, 0.7)" : "var(--text-secondary)",
                fontSize: 11,
                fontFamily: "Inter",
                fontWeight: 500,
              }}
              tickLine={false}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={false}
              axisLine={false}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke={isDark ? "#00FF99" : "#00C26D"}
              fill="url(#radarFillGreen)"
              strokeWidth={2.5}
              fillOpacity={0.6}
              animationDuration={800}
              animationBegin={0}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Score Display */}
      <div className="flex items-center justify-center mt-auto">
        <div className={`font-heading text-3xl font-bold tracking-[-0.3px] ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>
          {overallScore.toFixed(2)}
        </div>
      </div>
    </div>
  );
}

