"use client";

import React, { useState, useEffect } from "react";

export interface TradeData {
  date: string;
  pair: "XAUUSD" | "XAGUSD";
  direction: "Buy" | "Sell";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  profitLoss: number;
  rrRatio: number;
  notes: string;
  session: "London" | "New York" | "Asian";
  emotion: "Calm" | "Fear" | "Greedy" | "Revenge";
}

interface TradeFormProps {
  showForm: boolean;
  setShowForm: (v: boolean) => void;
  onSubmit: (trade: Omit<TradeData, "id">) => Promise<void> | void;
}

export const TradeForm: React.FC<TradeFormProps> = ({
  showForm,
  setShowForm,
  onSubmit,
}) => {
  const [date, setDate] = useState("");
  const [pair, setPair] = useState<"XAUUSD" | "XAGUSD">("XAUUSD");
  const [direction, setDirection] = useState<"Buy" | "Sell">("Buy");
  const [entry, setEntry] = useState<number | "">("");
  const [stopLoss, setStopLoss] = useState<number | "">("");
  const [takeProfit, setTakeProfit] = useState<number | "">("");
  const [profitLoss, setProfitLoss] = useState<number | "">("");
  const [rrRatio, setRrRatio] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [session, setSession] = useState<"London" | "New York" | "Asian">("London");
  const [emotion, setEmotion] = useState<"Calm" | "Fear" | "Greedy" | "Revenge">("Calm");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!showForm) resetForm();
  }, [showForm]);

  const resetForm = () => {
    setDate("");
    setPair("XAUUSD");
    setDirection("Buy");
    setEntry("");
    setStopLoss("");
    setTakeProfit("");
    setProfitLoss("");
    setRrRatio("");
    setNotes("");
    setSession("London");
    setEmotion("Calm");
    setLoading(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    try {
      if (!date) {
        alert("Please pick a date");
        setLoading(false);
        return;
      }

      const payload: TradeData = {
        date,
        pair,
        direction,
        entry: Number(entry || 0),
        stopLoss: Number(stopLoss || 0),
        takeProfit: Number(takeProfit || 0),
        profitLoss: Number(profitLoss || 0),
        rrRatio: Number(rrRatio || 0),
        notes,
        session,
        emotion,
      };

      await onSubmit(payload);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setShowForm(false);
    }
  };

  if (!showForm) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setShowForm(false)}
      />

      {/* form */}
      <form
        onSubmit={handleSubmit}
        className="relative z-50 w-full max-w-lg p-6 rounded-2xl bg-card border border-border shadow-lg text-foreground"
      >
        {/* header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Trade</h3>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {/* form fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Date */}
          <div className="flex flex-col">
            <label className="text-sm mb-1 text-muted-foreground">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="p-2 rounded-md bg-background/30 border border-border"
              required
            />
          </div>

          {/* Pair */}
          <div className="flex flex-col">
            <label className="text-sm mb-1 text-muted-foreground">Pair</label>
            <select
              value={pair}
              onChange={(e) => setPair(e.target.value as "XAUUSD" | "XAGUSD")}
              className="p-2 rounded-md bg-background/30 border border-border"
            >
              <option value="XAUUSD">XAUUSD</option>
              <option value="XAGUSD">XAGUSD</option>
            </select>
          </div>

          {/* Direction */}
          <div className="flex flex-col">
            <label className="text-sm mb-1 text-muted-foreground">Direction</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as "Buy" | "Sell")}
              className="p-2 rounded-md bg-background/30 border border-border"
            >
              <option value="Buy">Buy</option>
              <option value="Sell">Sell</option>
            </select>
          </div>

          {/* Entry */}
          <div className="flex flex-col">
            <label className="text-sm mb-1 text-muted-foreground">Entry</label>
            <input
              type="number"
              placeholder="Entry"
              value={entry}
              onChange={(e) =>
                setEntry(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="p-2 rounded-md bg-background/30 border border-border"
            />
          </div>

          {/* Stop Loss */}
          <div className="flex flex-col">
            <label className="text-sm mb-1 text-muted-foreground">Stop Loss</label>
            <input
              type="number"
              placeholder="Stop Loss"
              value={stopLoss}
              onChange={(e) =>
                setStopLoss(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="p-2 rounded-md bg-background/30 border border-border"
            />
          </div>

          {/* Take Profit */}
          <div className="flex flex-col">
            <label className="text-sm mb-1 text-muted-foreground">Take Profit</label>
            <input
              type="number"
              placeholder="Take Profit"
              value={takeProfit}
              onChange={(e) =>
                setTakeProfit(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="p-2 rounded-md bg-background/30 border border-border"
            />
          </div>

          {/* P/L */}
          <div className="flex flex-col">
            <label className="text-sm mb-1 text-muted-foreground">P/L</label>
            <input
              type="number"
              placeholder="Profit / Loss"
              value={profitLoss}
              onChange={(e) =>
                setProfitLoss(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="p-2 rounded-md bg-background/30 border border-border"
            />
          </div>

          {/* RR Ratio */}
          <div className="flex flex-col">
            <label className="text-sm mb-1 text-muted-foreground">R:R Ratio</label>
            <input
              type="number"
              placeholder="Reward : Risk"
              value={rrRatio}
              onChange={(e) =>
                setRrRatio(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="p-2 rounded-md bg-background/30 border border-border"
            />
          </div>

          {/* Session */}
          <div className="flex flex-col">
            <label className="text-sm mb-1 text-muted-foreground">Session</label>
            <select
              value={session}
              onChange={(e) =>
                setSession(e.target.value as "London" | "New York" | "Asian")
              }
              className="p-2 rounded-md bg-background/30 border border-border"
            >
              <option value="London">London</option>
              <option value="New York">New York</option>
              <option value="Asian">Asian</option>
            </select>
          </div>

          {/* Emotion */}
          <div className="flex flex-col">
            <label className="text-sm mb-1 text-muted-foreground">Emotion</label>
            <select
              value={emotion}
              onChange={(e) =>
                setEmotion(
                  e.target.value as "Calm" | "Fear" | "Greedy" | "Revenge"
                )
              }
              className="p-2 rounded-md bg-background/30 border border-border"
            >
              <option value="Calm">Calm</option>
              <option value="Fear">Fear</option>
              <option value="Greedy">Greedy</option>
              <option value="Revenge">Revenge</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div className="flex flex-col mt-4">
          <label className="text-sm mb-1 text-muted-foreground">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Trade reasoning, emotions, lessons..."
            className="p-2 rounded-md bg-background/30 border border-border min-h-[80px]"
          />
        </div>

        {/* actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="px-4 py-2 rounded-md border border-border text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-[#00FF9C] text-black font-semibold hover:bg-[#00cc7a]"
          >
            {loading ? "Saving..." : "Save Trade"}
          </button>
        </div>
      </form>
    </div>
  );
};
