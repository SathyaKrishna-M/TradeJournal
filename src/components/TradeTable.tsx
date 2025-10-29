import { useState } from "react";
import { Trade } from "@/pages/Index";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, TrendingUp, TrendingDown, Eye } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TradeTableProps {
  trades: Trade[];
  onDelete: (id: string) => void;
}

const ExpandableText = ({ content, title }: { content: string; title: string }) => {
  if (!content) return <span className="text-muted-foreground">—</span>;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="group flex items-center gap-2 text-left hover:text-primary transition-colors">
          <div className="truncate text-sm text-muted-foreground group-hover:text-primary max-w-[180px]">
            {content}
          </div>
          <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 p-4 rounded-lg bg-muted text-sm whitespace-pre-wrap max-h-[400px] overflow-y-auto">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const TradeTable = ({ trades, onDelete }: TradeTableProps) => {
  if (trades.length === 0) {
    return (
      <div className="p-12 text-center rounded-xl bg-card border border-border">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <TrendingUp className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No trades yet</h3>
          <p className="text-sm text-muted-foreground">
            Start journaling your trades to track your progress and improve your trading strategy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Pair</TableHead>
              <TableHead className="font-semibold">Direction</TableHead>
              <TableHead className="font-semibold">Setup</TableHead>
              <TableHead className="font-semibold">Lot Size</TableHead>
              <TableHead className="font-semibold">Entry</TableHead>
              <TableHead className="font-semibold">SL</TableHead>
              <TableHead className="font-semibold">TP</TableHead>
              <TableHead className="font-semibold">P/L</TableHead>
              <TableHead className="font-semibold">RR</TableHead>
              <TableHead className="font-semibold">Session</TableHead>
              <TableHead className="font-semibold">Emotion</TableHead>
              <TableHead className="font-semibold">Reason</TableHead>
              <TableHead className="font-semibold">Notes</TableHead>
              <TableHead className="font-semibold">Lesson</TableHead>
              <TableHead className="font-semibold w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trades.map((trade) => (
              <TableRow key={trade.id} className="hover:bg-muted/30">
                <TableCell className="font-medium whitespace-nowrap">
                  {new Date(trade.date).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                    {trade.pair}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                      trade.direction === "Buy"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {trade.direction === "Buy" ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {trade.direction}
                  </span>
                </TableCell>
                <TableCell>{trade.setupType}</TableCell>
                <TableCell>{trade.lotSize.toFixed(2)}</TableCell>
                <TableCell>{trade.entry.toFixed(3)}</TableCell>
                <TableCell>{trade.stopLoss.toFixed(3)}</TableCell>
                <TableCell>{trade.takeProfit.toFixed(3)}</TableCell>
                <TableCell>
                  <span
                    className={`font-semibold ${
                      trade.profitLoss >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    ${trade.profitLoss.toFixed(2)}
                  </span>
                </TableCell>
                <TableCell>{trade.rrRatio.toFixed(2)}</TableCell>
                <TableCell>{trade.session}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${
                      trade.emotion === "Calm"
                        ? "bg-success/10 text-success"
                        : trade.emotion === "Fear"
                        ? "bg-destructive/10 text-destructive"
                        : trade.emotion === "Greedy"
                        ? "bg-yellow-500/10 text-yellow-500"
                        : "bg-orange-500/10 text-orange-500"
                    }`}
                  >
                    {trade.emotion}
                  </span>
                </TableCell>
                <TableCell>
                  <ExpandableText content={trade.reason} title="Trade Reason" />
                </TableCell>
                <TableCell>
                  <ExpandableText content={trade.notes} title="Trade Notes" />
                </TableCell>
                <TableCell>
                  <ExpandableText content={trade.lesson} title="Lesson Learned" />
                </TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Trade?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete this trade
                          from your journal.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(trade.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
