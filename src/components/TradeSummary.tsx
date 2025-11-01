"use client";

import React, { useMemo } from "react";
import { TrendingUp, BarChart2, Clock, Target, Smile, AlertCircle } from "lucide-react";
import type { Trade } from "@/pages/Index";

interface TradeSummaryProps {
  trades: Trade[];
}

export function TradeSummary({ trades }: TradeSummaryProps) {
  // Compute analytics
  const summary = useMemo(() => {
    if (trades.length === 0)
      return {
        avgRR: 0,
        winRate: 0,
        totalPL: 0,
        bestTrade: null as Trade | null,
        worstTrade: null as Trade | null,
      };

    const totalPL = trades.reduce((s, t) => s + Number(t.profitLoss || 0), 0);
    const avgRR =
      trades.reduce((s, t) => s + Number(t.rrRatio || 0), 0) / trades.length;
    const wins = trades.filter((t) => Number(t.profitLoss) > 0).length;
    const winRate = (wins / trades.length) * 100;
    const bestTrade = trades.reduce((best, t) =>
      t.profitLoss > (best?.profitLoss ?? -Infinity) ? t : best
    );
    const worstTrade = trades.reduce((worst, t) =>
      t.profitLoss < (worst?.profitLoss ?? Infinity) ? t : worst
    );

    return {
      avgRR: Number(avgRR.toFixed(2)),
      winRate: Number(winRate.toFixed(1)),
      totalPL: Number(totalPL.toFixed(2)),
      bestTrade,
      worstTrade,
    };
  }, [trades]);

  return (
    <section className="p-6 rounded-2xl bg-card border border-border shadow-md transition-colors">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-[#00FF9C]" /> Trade Performance Summary
      </h2>

      {trades.length === 0 ? (
        <div className="text-muted-foreground text-sm text-center py-6">
          No trades logged yet — start journaling to see your insights here.
        </div>
      ) : (
        <>
          {/* Summary Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <SummaryCard
              title="Total P/L"
              value={`${summary.totalPL >= 0 ? "+" : ""}${summary.totalPL}`}
              icon={<TrendingUp className="text-[#00FF9C]" />}
              accent={summary.totalPL >= 0 ? "#00FF9C" : "#FF5555"}
            />
            <SummaryCard
              title="Win Rate"
              value={`${summary.winRate}%`}
              icon={<BarChart2 className="text-[#00FF9C]" />}
            />
            <SummaryCard
              title="Avg R:R"
              value={summary.avgRR}
              icon={<Target className="text-[#00FF9C]" />}
            />
            <SummaryCard
              title="Total Trades"
              value={trades.length}
              icon={<Clock className="text-[#00FF9C]" />}
            />
          </div>

          {/* Best & Worst Trades */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {summary.bestTrade && (
              <TradeDetailCard
                title="🏆 Best Trade"
                trade={summary.bestTrade}
                color="#00FF9C"
              />
            )}
            {summary.worstTrade && (
              <TradeDetailCard
                title="💀 Worst Trade"
                trade={summary.worstTrade}
                color="#FF5555"
              />
            )}
          </div>
        </>
      )}
    </section>
  );
}

/* 🧱 Summary Stat Card */
function SummaryCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-background/50 border border-border flex flex-col items-start justify-center transition hover:bg-background/70">
      <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
        {icon}
        <span>{title}</span>
      </div>
      <div
        className="text-2xl font-semibold"
        style={{ color: accent || "hsl(var(--foreground))" }}
      >
        {value}
      </div>
    </div>
  );
}

/* 📄 Trade Detail Card (shows full info) */
function TradeDetailCard({
  title,
  trade,
  color,
}: {
  title: string;
  trade: Trade;
  color: string;
}) {
  return (
    <div className="p-5 rounded-2xl bg-background/50 border border-border hover:shadow-[0_0_15px_rgba(0,255,156,0.15)] transition-all">
      <h3
        className="text-lg font-semibold mb-3"
        style={{ color }}
      >
        {title}
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <Info label="Pair" value={trade.pair} />
        <Info label="Direction" value={trade.direction} />
        <Info label="Date" value={trade.date} />
        <Info label="Session" value={trade.session ?? "N/A"} />
        <Info label="Lot Size" value={trade.lotSize ?? "-"} />
        <Info label="P/L" value={trade.profitLoss} color={trade.profitLoss >= 0 ? "#00FF9C" : "#FF5555"} />
        <Info label="R:R" value={trade.rrRatio} />
        <Info label="Emotion" value={trade.emotion ?? "N/A"} />
      </div>

      {trade.notes && (
        <div className="mt-4 p-3 rounded-md bg-muted/30 border border-border text-sm">
          <strong className="text-muted-foreground block mb-1">Notes:</strong>
          <p>{trade.notes}</p>
        </div>
      )}

      {trade.lesson && (
        <div className="mt-3 p-3 rounded-md bg-muted/30 border border-border text-sm">
          <strong className="text-muted-foreground block mb-1">Lesson:</strong>
          <p>{trade.lesson}</p>
        </div>
      )}
    </div>
  );
}

/* 🧩 Reusable Info Field */
function Info({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className="font-medium"
        style={{ color: color || "hsl(var(--foreground))" }}
      >
        {value}
      </span>
    </div>
  );
}
