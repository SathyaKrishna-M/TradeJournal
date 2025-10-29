import { Trade } from "@/pages/Index";
import { TrendingUp, TrendingDown, Target, BarChart3 } from "lucide-react";

interface TradeSummaryProps {
  trades: Trade[];
}

export const TradeSummary = ({ trades }: TradeSummaryProps) => {
  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.profitLoss > 0).length;
  const losingTrades = trades.filter((t) => t.profitLoss < 0).length;
  const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : "0.0";
  const totalPL = trades.reduce((sum, t) => sum + t.profitLoss, 0);
  const avgRR = totalTrades > 0 
    ? (trades.reduce((sum, t) => sum + t.rrRatio, 0) / totalTrades).toFixed(2) 
    : "0.00";

  const stats = [
    {
      label: "Total P/L",
      value: `$${totalPL.toFixed(2)}`,
      icon: totalPL >= 0 ? TrendingUp : TrendingDown,
      color: totalPL >= 0 ? "text-success" : "text-destructive",
      bgColor: totalPL >= 0 ? "bg-success/10" : "bg-destructive/10",
    },
    {
      label: "Win Rate",
      value: `${winRate}%`,
      icon: Target,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Avg RR Ratio",
      value: avgRR,
      icon: BarChart3,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Total Trades",
      value: totalTrades.toString(),
      subValue: `${winningTrades}W / ${losingTrades}L`,
      icon: BarChart3,
      color: "text-foreground",
      bgColor: "bg-muted",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">{stat.label}</span>
              <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            {stat.subValue && (
              <div className="text-xs text-muted-foreground mt-1">{stat.subValue}</div>
            )}
          </div>
        );
      })}
    </div>
  );
};
