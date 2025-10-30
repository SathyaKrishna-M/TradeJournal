// src/components/TradeSummary.tsx
import { Trade } from "@/pages/Index";

interface TradeSummaryProps {
  trades: Trade[];
}

export const TradeSummary = ({ trades }: TradeSummaryProps) => {
  if (trades.length === 0) return null; // optional

  return (
    <div className="mt-10 bg-black/40 backdrop-blur-md border border-[#00FF9C]/10 rounded-2xl p-6 shadow-[0_0_30px_rgba(0,255,156,0.08)]">
      <h2 className="text-xl font-semibold text-white mb-4">Trade Summary</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div>
          <p className="text-slate-400 text-sm">Total Trades</p>
          <p className="text-2xl font-bold text-[#00FF9C]">{trades.length}</p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Winning Trades</p>
          <p className="text-2xl font-bold text-green-400">
            {trades.filter(t => t.profitLoss > 0).length}
          </p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Losing Trades</p>
          <p className="text-2xl font-bold text-red-400">
            {trades.filter(t => t.profitLoss < 0).length}
          </p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Avg R:R</p>
          <p className="text-2xl font-bold text-[#00FF9C]">
            {(
              trades.reduce((s, t) => s + (t.rrRatio || 0), 0) /
              (trades.length || 1)
            ).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};
