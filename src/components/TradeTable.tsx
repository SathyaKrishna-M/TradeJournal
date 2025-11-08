"use client";

import React, { useState } from "react";
import { useTheme } from "next-themes";
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
  const { theme, resolvedTheme } = useTheme();
  const isDark = (theme ?? resolvedTheme) === "dark";
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
          className={`flex items-center justify-between p-4 rounded-lg border ${
            isDark 
              ? 'bg-[#111111] border-[rgba(255,255,255,0.08)]' 
              : 'bg-white border-[rgba(0,0,0,0.1)]'
          }`}
        >
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedTrades.size === trades.length && trades.length > 0}
                onChange={handleSelectAll}
                className={`w-4 h-4 rounded border ${
                  isDark 
                    ? 'border-[rgba(255,255,255,0.15)] bg-[#0D0D0D]' 
                    : 'border-[rgba(0,0,0,0.2)] bg-white'
                }`}
              />
              <span className={`text-sm font-medium ${isDark ? 'text-[#EAEAEA]' : 'text-[#111111]'}`}>
                Select All ({selectedTrades.size} selected)
              </span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBulkDelete}
              disabled={selectedTrades.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#FF4D4D] text-white rounded-lg hover:bg-[#FF6B6B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected ({selectedTrades.size})
            </button>
            <button
              onClick={() => {
                setIsBulkMode(false);
                setSelectedTrades(new Set());
              }}
              className={`px-4 py-2 border rounded-lg transition-colors ${
                isDark 
                  ? 'border-[rgba(255,255,255,0.15)] hover:bg-[#1A1A1A] text-[#EAEAEA]' 
                  : 'border-[rgba(0,0,0,0.2)] hover:bg-gray-100 text-[#111111]'
              }`}
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border dark:border-[rgba(255,255,255,0.08)] border-[rgba(0,0,0,0.1)] dark:bg-gradient-to-b dark:from-[#111111] dark:to-[#151515] bg-white">
        <div className="flex items-center justify-between p-5 border-b dark:border-[rgba(255,255,255,0.08)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(255,255,255,0.03)] bg-gray-50">
          <h4 className="font-semibold text-lg dark:text-[#EAEAEA] text-[#111111]">TradeBook ({trades.length})</h4>
          {!isBulkMode && (
            <button
              onClick={() => setIsBulkMode(true)}
              className={`text-sm px-4 py-2 border rounded-lg transition-colors ${
                isDark 
                  ? 'border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[#00FF99]/30 text-[#A0A0A0] hover:text-white' 
                  : 'border-[rgba(0,0,0,0.2)] hover:bg-gray-100 hover:border-[#00C26D]/30 text-[#666666] hover:text-[#111111]'
              }`}
            >
              Bulk Delete
            </button>
          )}
        </div>
        <div className="overflow-x-auto max-h-[650px] overflow-y-auto w-full">
          <table className="min-w-full text-sm text-left">
            <thead className="sticky top-0 z-10 dark:text-[#A0A0A0] text-[#666666] border-b dark:border-[rgba(255,255,255,0.08)] border-[rgba(0,0,0,0.1)] dark:bg-[rgba(13,13,13,0.95)] bg-white backdrop-blur-sm">
              <tr>
              {isBulkMode && (
                <th className="p-4 font-medium">
                  <input
                    type="checkbox"
                    checked={selectedTrades.size === trades.length && trades.length > 0}
                    onChange={handleSelectAll}
                    className={`w-4 h-4 rounded border ${
                      isDark 
                        ? 'border-[rgba(255,255,255,0.15)] bg-[#0D0D0D]' 
                        : 'border-[rgba(0,0,0,0.2)] bg-white'
                    }`}
                  />
                </th>
              )}
              <th className="p-4 font-semibold dark:text-[#A0A0A0] text-[#666666]">Date</th>
              <th className="p-4 font-semibold dark:text-[#A0A0A0] text-[#666666]">Pair</th>
              <th className="p-4 font-semibold dark:text-[#A0A0A0] text-[#666666]">Dir</th>
              <th className="p-4 font-semibold dark:text-[#A0A0A0] text-[#666666]">Entry</th>
              <th className="p-4 font-semibold dark:text-[#A0A0A0] text-[#666666]">SL</th>
              <th className="p-4 font-semibold dark:text-[#A0A0A0] text-[#666666]">TP</th>
              <th className="p-4 font-semibold dark:text-[#A0A0A0] text-[#666666]">P/L</th>
              <th className="p-4 font-semibold dark:text-[#A0A0A0] text-[#666666]">Commission</th>
              <th className="p-4 font-semibold dark:text-[#A0A0A0] text-[#666666]">Swap</th>
              <th className="p-4 font-semibold dark:text-[#A0A0A0] text-[#666666]">RR</th>
              <th className="p-4 font-semibold dark:text-[#A0A0A0] text-[#666666]">Session</th>
              <th className="p-4 font-semibold dark:text-[#A0A0A0] text-[#666666]">Emotion</th>
              <th className="p-4 font-semibold dark:text-[#A0A0A0] text-[#666666]">Notes</th>
              <th className="p-4 font-semibold dark:text-[#A0A0A0] text-[#666666]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade, index) => (
              <tr
                key={trade.id}
                className={`group border-b transition-colors ${
                  isDark 
                    ? `border-[rgba(255,255,255,0.05)] ${index % 2 === 0 ? "bg-[#111111]" : "bg-[#0D0D0D]"} hover:bg-[rgba(0,255,153,0.05)] hover:border-[rgba(0,255,153,0.2)]`
                    : `border-[rgba(0,0,0,0.05)] ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100`
                } ${
                  selectedTrades.has(trade.id) ? (isDark ? "bg-[rgba(0,255,153,0.1)]" : "bg-[rgba(0,194,109,0.1)]") : ""
                }`}
              >
                {isBulkMode && (
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedTrades.has(trade.id)}
                      onChange={() => handleToggleSelect(trade.id)}
                      className={`w-4 h-4 rounded border ${
                        isDark 
                          ? 'border-[rgba(255,255,255,0.15)] bg-[#0D0D0D]' 
                          : 'border-[rgba(0,0,0,0.2)] bg-white'
                      }`}
                    />
                  </td>
                )}
                <td className={`p-4 font-medium ${isDark ? 'text-[#EAEAEA]' : 'text-[#111111]'}`}>{trade.date}</td>
                <td className={`p-4 font-medium ${isDark ? 'text-[#EAEAEA]' : 'text-[#111111]'}`}>{trade.pair}</td>
                <td
                  className={`p-4 font-semibold ${
                    trade.direction === "Buy" 
                      ? (isDark ? "text-[#00FF99]" : "text-[#00C26D]")
                      : "text-[#FF4D4D]"
                  }`}
                >
                  {trade.direction}
                </td>
                <td className={`p-4 ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>{trade.entry.toFixed(2)}</td>
                <td className={`p-4 ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>{trade.stopLoss ? trade.stopLoss.toFixed(2) : "-"}</td>
                <td className={`p-4 ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>{trade.takeProfit ? trade.takeProfit.toFixed(2) : "-"}</td>
                <td
                  className={`p-4 font-bold ${
                    trade.profitLoss > 0
                      ? isDark
                        ? "text-[#00FF99] drop-shadow-[0_0_8px_rgba(0,255,153,0.3)]"
                        : "text-[#00C26D]"
                      : trade.profitLoss < 0
                      ? "text-[#FF4D4D] drop-shadow-[0_0_8px_rgba(255,77,77,0.3)]"
                      : isDark
                      ? "text-[#A0A0A0]"
                      : "text-[#666666]"
                  }`}
                >
                  ${trade.profitLoss.toFixed(2)}
                </td>
                <td className={`p-4 text-xs ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>
                  {trade.commission !== undefined ? `$${trade.commission.toFixed(2)}` : "-"}
                </td>
                <td className={`p-4 text-xs ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>
                  {trade.swap !== undefined ? `$${trade.swap.toFixed(2)}` : "-"}
                </td>
                <td className={`p-4 ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`}>{trade.rrRatio ? trade.rrRatio.toFixed(2) : "-"}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                    isDark 
                      ? 'bg-[#00FF99]/10 text-[#00FF99] border-[#00FF99]/30'
                      : 'bg-[#00C26D]/10 text-[#00C26D] border-[#00C26D]/30'
                  }`}>
                    {trade.session || "-"}
                  </span>
                </td>
                <td className="p-4">
                  {editingId === trade.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editingEmotion}
                        onChange={(e) => setEditingEmotion(e.target.value)}
                        className={`px-2 py-1 text-xs rounded border focus:outline-none focus:ring-2 ${
                          isDark 
                            ? 'border-[rgba(255,255,255,0.15)] bg-[#0D0D0D] text-[#EAEAEA] hover:bg-[#1A1A1A] focus:ring-[#00FF99]/50' 
                            : 'border-[rgba(0,0,0,0.2)] bg-white text-[#111111] hover:bg-gray-50 focus:ring-[#00C26D]/50'
                        }`}
                        autoFocus
                      >
                        {emotionOptions.map((emotion) => (
                          <option key={emotion} value={emotion} className={isDark ? "bg-[#0D0D0D] text-[#EAEAEA]" : "bg-white text-[#111111]"}>
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
                      <span className={trade.emotion ? (isDark ? "text-[#EAEAEA]" : "text-[#111111]") : (isDark ? "text-[#A0A0A0]" : "text-[#666666]")}>
                        {trade.emotion || "-"}
                      </span>
                      {onUpdate && !editingId && (
                        <button
                          onClick={() => handleEdit(trade)}
                          className="p-1 hover:bg-[rgba(255,255,255,0.1)] rounded transition-all opacity-0 group-hover:opacity-100"
                          title="Edit emotion"
                        >
                          <Edit2 className="w-3 h-3 text-gray-400 hover:text-white" />
                        </button>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-4 max-w-[200px]">
                  <div className={`truncate ${isDark ? 'text-[#A0A0A0]' : 'text-[#666666]'}`} title={trade.notes || undefined}>
                    {trade.notes ? (
                      trade.notes.includes("Imported from MT5") ? (
                        <span className={`text-xs ${isDark ? 'text-[#6A6A6A]' : 'text-[#999999]'}`}>MT5 Import</span>
                      ) : (
                        trade.notes
                      )
                    ) : (
                      "-"
                    )}
                  </div>
                </td>
                <td className="p-4">
                  {!isBulkMode && (
                    <button
                      onClick={() => onDelete(trade.id)}
                      className="text-[#FF4D4D] hover:text-[#FF6B6B] font-medium transition-colors flex items-center gap-1.5 opacity-0 group-hover:opacity-100"
                      title="Delete trade"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-xs">Delete</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
