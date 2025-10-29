// src/pages/Index.tsx
import { useEffect, useState } from "react";
import { TradeSummary } from "@/components/TradeSummary";
import { TradeForm } from "@/components/TradeForm";
import { TradeTable } from "@/components/TradeTable";
import { Brain } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Trade {
  id: string;
  date: string;
  pair: "XAUUSD" | "XAGUSD";
  direction: "Buy" | "Sell";
  setupType: "Breakout" | "Reversal" | "Range" | "News";
  lotSize: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  profitLoss: number;
  rrRatio: number;
  session: "London" | "New York" | "Asian";
  emotion: "Calm" | "Fear" | "Greedy" | "Revenge";
  reason: string;
  notes: string;
  lesson: string;
}

const Index = () => {
  const { user, logout } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [showForm, setShowForm] = useState(false);

  // 🧩 Load trades from Firestore in real-time
  useEffect(() => {
    if (!user) return;

    const tradesRef = collection(db, "users", user.uid, "trades");
    const unsubscribe = onSnapshot(tradesRef, (snapshot) => {
      const data = snapshot.docs.map(
        (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Trade)
      );
      setTrades(data.sort((a, b) => b.date.localeCompare(a.date)));
    });

    return unsubscribe;
  }, [user]);

  // ➕ Add trade to Firestore
  const handleAddTrade = async (trade: Omit<Trade, "id">) => {
    if (!user) return alert("Please log in first.");
    try {
      const tradesRef = collection(db, "users", user.uid, "trades");
      await addDoc(tradesRef, trade);
      setShowForm(false);
    } catch (err) {
      console.error("Error adding trade:", err);
    }
  };

  // ❌ Delete a trade
  const handleDeleteTrade = async (id: string) => {
    if (!user) return;
    try {
      const tradeRef = doc(db, "users", user.uid, "trades", id);
      await deleteDoc(tradeRef);
    } catch (err) {
      console.error("Error deleting trade:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trade Journal</h1>
            <p className="text-sm text-muted-foreground">
              Track your XAUUSD & XAGUSD trades
            </p>
          </div>
        </div>

        {/* 🔹 Logout button */}
        <button
          onClick={() => logout()}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Logout
        </button>
      </div>


        {/* Summary Stats */}
        <TradeSummary trades={trades} />

        {/* Trade Form */}
        <TradeForm
          onSubmit={handleAddTrade}
          showForm={showForm}
          setShowForm={setShowForm}
        />

        {/* Trade Table */}
        <TradeTable trades={trades} onDelete={handleDeleteTrade} />

        {/* Tips */}
        {trades.length === 0 && (
          <div className="mt-8 p-6 rounded-xl bg-card border border-border">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-medium mb-1">Pro Tip</p>
                <p className="text-sm text-muted-foreground">
                  Journal every trade right after closing it. Add your emotions
                  and lessons — these matter more than P/L.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
