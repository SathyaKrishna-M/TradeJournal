"use client";

import React, { useState } from "react";
import { Trade } from "@/pages/Index";
import { Edit2, Trash2, X, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TradeTableProps {
  trades: Trade[];
  onDelete: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Trade>) => void;
  onBulkDelete?: (ids: string[]) => void;
}

export function TradeTable({ trades, onDelete, onUpdate, onBulkDelete }: TradeTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingEmotion, setEditingEmotion] = useState<string>("");
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set());
  const [isBulkMode, setIsBulkMode] = useState(false);

  const emotionOptions: Array<"Calm" | "Fear" | "Greedy" | "Revenge"> = [
    "Calm",
    "Fear",
    "Greedy",
    "Revenge",
  ];

  const handleEdit = (trade: Trade) => {
    setEditingId(trade.id);
    setEditingEmotion(trade.emotion || "Calm");
  };

  const handleSave = (id: string) => {
    if (onUpdate) {
      onUpdate(id, { emotion: editingEmotion as Trade["emotion"] });
    }
    setEditingId(null);
    setEditingEmotion("");
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingEmotion("");
  };

  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedTrades);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTrades(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTrades.size === trades.length) {
      setSelectedTrades(new Set());
    } else {
      setSelectedTrades(new Set(trades.map(t => t.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedTrades.size === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedTrades.size} trade(s)?`)) {
      if (onBulkDelete) {
        onBulkDelete(Array.from(selectedTrades));
      } else {
        // Fallback to individual deletes
        selectedTrades.forEach(id => onDelete(id));
      }
      setSelectedTrades(new Set());
      setIsBulkMode(false);
    }
  };

  if (trades.length === 0) {
    return (
      <div className="text-center text-gray-400 py-6">No trades recorded yet.</div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {isBulkMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border"
        >
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedTrades.size === trades.length && trades.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-border"
              />
              <span className="text-sm font-medium">
                Select All ({selectedTrades.size} selected)
              </span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBulkDelete}
              disabled={selectedTrades.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedTrades.size})
            </button>
            <button
              onClick={() => {
                setIsBulkMode(false);
                setSelectedTrades(new Set());
              }}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h4 className="font-semibold">Trades ({trades.length})</h4>
          {!isBulkMode && (
            <button
              onClick={() => setIsBulkMode(true)}
              className="text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Bulk Delete
            </button>
          )}
        </div>
        <table className="min-w-full text-sm text-left">
          <thead className="text-gray-500 border-b border-border bg-muted/30">
            <tr>
              {isBulkMode && (
                <th className="p-3 font-semibold">
                  <input
                    type="checkbox"
                    checked={selectedTrades.size === trades.length && trades.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-border"
                  />
                </th>
              )}
              <th className="p-3 font-semibold">Date</th>
              <th className="p-3 font-semibold">Pair</th>
              <th className="p-3 font-semibold">Dir</th>
              <th className="p-3 font-semibold">Entry</th>
              <th className="p-3 font-semibold">SL</th>
              <th className="p-3 font-semibold">TP</th>
              <th className="p-3 font-semibold">P/L</th>
              <th className="p-3 font-semibold">RR</th>
              <th className="p-3 font-semibold">Session</th>
              <th className="p-3 font-semibold">Emotion</th>
              <th className="p-3 font-semibold">Notes</th>
              <th className="p-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr
                key={trade.id}
                className={`group border-b border-border hover:bg-muted/30 transition ${
                  selectedTrades.has(trade.id) ? "bg-muted/50" : ""
                }`}
              >
                {isBulkMode && (
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedTrades.has(trade.id)}
                      onChange={() => handleToggleSelect(trade.id)}
                      className="w-4 h-4 rounded border-border"
                    />
                  </td>
                )}
                <td className="p-3 text-foreground">{trade.date}</td>
                <td className="p-3">{trade.pair}</td>
                <td
                  className={`p-3 font-semibold ${
                    trade.direction === "Buy" ? "text-green-500" : "text-red-400"
                  }`}
                >
                  {trade.direction}
                </td>
                <td className="p-3">{trade.entry}</td>
                <td className="p-3">{trade.stopLoss}</td>
                <td className="p-3">{trade.takeProfit}</td>
                <td
                  className={`p-3 font-semibold ${
                    trade.profitLoss > 0
                      ? "text-green-400"
                      : trade.profitLoss < 0
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  {trade.profitLoss}
                </td>
                <td className="p-3">{trade.rrRatio ? trade.rrRatio.toFixed(2) : "-"}</td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded text-xs bg-primary/20 text-primary">
                    {trade.session || "-"}
                  </span>
                </td>
                <td className="p-3">
                  {editingId === trade.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editingEmotion}
                        onChange={(e) => setEditingEmotion(e.target.value)}
                        className="px-2 py-1 text-xs rounded border border-border bg-background"
                        autoFocus
                      >
                        {emotionOptions.map((emotion) => (
                          <option key={emotion} value={emotion}>
                            {emotion}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleSave(trade.id)}
                        className="p-1 hover:bg-green-500/20 rounded transition-colors"
                        title="Save"
                      >
                        <Save className="w-3 h-3 text-green-500" />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="p-1 hover:bg-red-500/20 rounded transition-colors"
                        title="Cancel"
                      >
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={trade.emotion ? "" : "text-muted-foreground"}>
                        {trade.emotion || "-"}
                      </span>
                      {onUpdate && !editingId && (
                        <button
                          onClick={() => handleEdit(trade)}
                          className="p-1 hover:bg-muted rounded transition-all opacity-0 group-hover:opacity-100"
                          title="Edit emotion"
                        >
                          <Edit2 className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3 max-w-[160px] truncate">{trade.notes || "-"}</td>
                <td className="p-3">
                  {!isBulkMode && (
                    <button
                      onClick={() => onDelete(trade.id)}
                      className="text-red-400 hover:text-red-500 font-semibold transition flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
