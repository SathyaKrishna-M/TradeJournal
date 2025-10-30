import React from "react";
import { Trade } from "@/pages/Index";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";

interface TradeTableProps {
  trades: Trade[];
  onDelete: (id: string) => void;
}

export const TradeTable: React.FC<TradeTableProps> = ({ trades, onDelete }) => {
  if (trades.length === 0) {
    return (
      <motion.div
        className="text-center text-slate-400 mt-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        No trades yet. Add your first one to start tracking 📈
      </motion.div>
    );
  }

  return (
    <div className="mt-10 overflow-x-auto rounded-xl border border-[#00FF9C]/20 bg-black/40 backdrop-blur-xl shadow-[0_0_25px_rgba(0,255,156,0.08)]">
      <table className="w-full text-sm text-left text-slate-300">
        <thead className="text-xs uppercase bg-[#00FF9C]/10 text-[#00FF9C]">
          <tr>
            <th className="px-6 py-4">Date</th>
            <th className="px-6 py-4">Pair</th>
            <th className="px-6 py-4">Direction</th>
            <th className="px-6 py-4">Setup</th>
            <th className="px-6 py-4">Entry</th>
            <th className="px-6 py-4">SL</th>
            <th className="px-6 py-4">TP</th>
            <th className="px-6 py-4">P/L</th>
            <th className="px-6 py-4">RR</th>
            <th className="px-6 py-4">Session</th>
            <th className="px-6 py-4">Emotion</th>
            <th className="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <motion.tr
              key={trade.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-t border-[#00FF9C]/10 hover:bg-[#00FF9C]/5 transition-colors"
            >
              <td className="px-6 py-4">{trade.date}</td>
              <td className="px-6 py-4">{trade.pair}</td>
              <td
                className={`px-6 py-4 font-medium ${
                  trade.direction === "Buy" ? "text-green-400" : "text-red-400"
                }`}
              >
                {trade.direction}
              </td>
              <td className="px-6 py-4">{trade.setupType}</td>
              <td className="px-6 py-4">{trade.entry}</td>
              <td className="px-6 py-4">{trade.stopLoss}</td>
              <td className="px-6 py-4">{trade.takeProfit}</td>
              <td
                className={`px-6 py-4 font-semibold ${
                  trade.profitLoss >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {trade.profitLoss}
              </td>
              <td className="px-6 py-4">{trade.rrRatio.toFixed(2)}</td>
              <td className="px-6 py-4">{trade.session}</td>
              <td className="px-6 py-4">{trade.emotion}</td>
              <td className="px-6 py-4 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(trade.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-500/10 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
