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
    <section className="mb-8">
      <div className="p-6 rounded-2xl bg-[rgba(255,255,255,0.03)] backdrop-blur-sm border border-[#1a1f2e]/50 shadow-lg hover:shadow-xl transition-all duration-300">
        <h2 className="text-xl lg:text-2xl font-semibold mb-2 flex items-center gap-2 text-white">
          <BarChart2 className="w-5 h-5 text-[#00FF9D]" /> Trade Performance Summary
        </h2>
        <p className="text-xs text-gray-400 mb-6">Detailed trading analytics and insights</p>

        {trades.length === 0 ? (
          <div className="text-gray-400 text-sm text-center py-12 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[#1a1f2e]/30">
            No trades logged yet — start journaling to see your insights here.
          </div>
        ) : (
          <>
            {/* Summary Stats Grid - Four cards in one row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
              <SummaryCard
                title="Total P/L"
                value={`$${summary.totalPL >= 0 ? "+" : ""}${summary.totalPL.toFixed(2)}`}
                icon={<TrendingUp className="w-5 h-5" />}
                accent={summary.totalPL >= 0 ? "#00FF9D" : "#FF4D4D"}
              />
              <SummaryCard
                title="Win Rate"
                value={`${summary.winRate}%`}
                icon={<BarChart2 className="w-5 h-5" />}
                accent="#00FF9D"
              />
              <SummaryCard
                title="Avg R:R"
                value={summary.avgRR}
                icon={<Target className="w-5 h-5" />}
                accent="#00FF9D"
              />
              <SummaryCard
                title="Total Trades"
                value={trades.length}
                icon={<Clock className="w-5 h-5" />}
                accent="#00FF9D"
              />
            </div>

            {/* Best & Worst Trades - Two equal-width cards side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {summary.bestTrade && (
                <TradeDetailCard
                  title="Best Trade"
                  trade={summary.bestTrade}
                  color="#00FF9D"
                  icon="🏆"
                />
              )}
              {summary.worstTrade && (
                <TradeDetailCard
                  title="Worst Trade"
                  trade={summary.worstTrade}
                  color="#FF4D4D"
                  icon="📉"
                />
              )}
            </div>
          </>
        )}
      </div>
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
    <div className="p-5 lg:p-6 rounded-xl bg-[rgba(255,255,255,0.03)] backdrop-blur-sm border border-[#1a1f2e]/50 flex flex-col items-start justify-center transition-all duration-200 hover:bg-[rgba(255,255,255,0.05)] hover:shadow-lg hover:scale-[1.02] min-h-[110px] group relative overflow-hidden">
      {accent && (
        <div 
          className="absolute inset-0 bg-gradient-to-br to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: `linear-gradient(to bottom right, ${accent}1a, transparent)` }}
        ></div>
      )}
      <div className="relative z-10 w-full">
        <div className="flex items-center gap-2 text-gray-400 text-xs lg:text-sm mb-3 font-medium">
          <span style={{ color: accent || "#9ca3af" }}>
            {icon}
          </span>
          <span>{title}</span>
        </div>
        <div
          className={`text-xl lg:text-2xl font-bold ${
            accent === "#00FF9D" ? "text-[#00FF9D] drop-shadow-[0_0_10px_rgba(0,255,157,0.4)]" :
            accent === "#FF4D4D" ? "text-[#FF4D4D] drop-shadow-[0_0_10px_rgba(255,77,77,0.4)]" :
            "text-white"
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

/* 📄 Trade Detail Card (shows full info) */
function TradeDetailCard({
  title,
  trade,
  color,
  icon,
}: {
  title: string;
  trade: Trade;
  color: string;
  icon?: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-[rgba(255,255,255,0.03)] backdrop-blur-sm border border-[#1a1f2e]/50 hover:shadow-xl hover:scale-[1.01] transition-all duration-200 group">
      <h3
        className="text-lg font-semibold mb-4 flex items-center gap-2"
        style={{ color }}
      >
        {icon && <span>{icon}</span>}
        {title}
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
        <Info label="Pair" value={trade.pair} />
        <Info label="Direction" value={trade.direction} color={trade.direction === "Buy" ? "#00FF9D" : "#FF4D4D"} />
        <Info label="Date" value={trade.date} />
        <Info label="Session" value={trade.session ?? "N/A"} />
        <Info label="Lot Size" value={trade.lotSize ?? "-"} />
        <Info label="P/L" value={`$${trade.profitLoss.toFixed(2)}`} color={trade.profitLoss >= 0 ? "#00FF9D" : "#FF4D4D"} />
        <Info label="R:R" value={trade.rrRatio?.toFixed(2) ?? "-"} />
        <Info label="Emotion" value={trade.emotion ?? "N/A"} />
      </div>

      {trade.notes && (
        <div className="mt-4 p-3 rounded-md bg-[rgba(255,255,255,0.03)] border border-[#1a1f2e]/50 text-sm">
          <strong className="text-gray-400 block mb-1">Notes:</strong>
          <p className="text-gray-300">{trade.notes}</p>
        </div>
      )}

      {trade.lesson && (
        <div className="mt-3 p-3 rounded-md bg-[rgba(255,255,255,0.03)] border border-[#1a1f2e]/50 text-sm">
          <strong className="text-gray-400 block mb-1">Lesson:</strong>
          <p className="text-gray-300">{trade.lesson}</p>
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
      <span className="text-xs text-gray-400 mb-1 font-medium">{label}</span>
      <span
        className="font-semibold text-base"
        style={{ color: color || "#ffffff" }}
      >
        {value}
      </span>
    </div>
  );
}
