import { useState } from "react";
import { Trade } from "@/pages/Index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";

interface TradeFormProps {
  onSubmit: (trade: Omit<Trade, "id">) => void;
  showForm: boolean;
  setShowForm: (show: boolean) => void;
}

export const TradeForm = ({ onSubmit, showForm, setShowForm }: TradeFormProps) => {
  const [formData, setFormData] = useState<Omit<Trade, "id">>({
    date: new Date().toISOString().split("T")[0],
    pair: "XAUUSD",
    direction: "Buy",
    setupType: "Breakout",
    lotSize: 0,
    entry: 0,
    stopLoss: 0,
    takeProfit: 0,
    profitLoss: 0,
    rrRatio: 0,
    session: "London",
    emotion: "Calm",
    reason: "",
    notes: "",
    lesson: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    // Reset form
    setFormData({
      date: new Date().toISOString().split("T")[0],
      pair: "XAUUSD",
      direction: "Buy",
      setupType: "Breakout",
      lotSize: 0,
      entry: 0,
      stopLoss: 0,
      takeProfit: 0,
      profitLoss: 0,
      rrRatio: 0,
      session: "London",
      emotion: "Calm",
      reason: "",
      notes: "",
      lesson: "",
    });
  };

  if (!showForm) {
    return (
      <div className="mb-8">
        <Button
          onClick={() => setShowForm(true)}
          size="lg"
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Trade
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-8 p-6 rounded-xl bg-card border border-border">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">New Trade Entry</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowForm(false)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          {/* Pair */}
          <div className="space-y-2">
            <Label htmlFor="pair">Pair</Label>
            <Select
              value={formData.pair}
              onValueChange={(value: "XAUUSD" | "XAGUSD") =>
                setFormData({ ...formData, pair: value })
              }
            >
              <SelectTrigger id="pair">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="XAUUSD">XAUUSD</SelectItem>
                <SelectItem value="XAGUSD">XAGUSD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Direction */}
          <div className="space-y-2">
            <Label htmlFor="direction">Direction</Label>
            <Select
              value={formData.direction}
              onValueChange={(value: "Buy" | "Sell") =>
                setFormData({ ...formData, direction: value })
              }
            >
              <SelectTrigger id="direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Buy">Buy</SelectItem>
                <SelectItem value="Sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Setup Type */}
          <div className="space-y-2">
            <Label htmlFor="setupType">Setup Type</Label>
            <Select
              value={formData.setupType}
              onValueChange={(value: Trade["setupType"]) =>
                setFormData({ ...formData, setupType: value })
              }
            >
              <SelectTrigger id="setupType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Breakout">Breakout</SelectItem>
                <SelectItem value="Reversal">Reversal</SelectItem>
                <SelectItem value="Range">Range</SelectItem>
                <SelectItem value="News">News</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lot Size */}
          <div className="space-y-2">
            <Label htmlFor="lotSize">Lot Size</Label>
            <Input
              id="lotSize"
              type="number"
              step="0.01"
              value={formData.lotSize}
              onChange={(e) =>
                setFormData({ ...formData, lotSize: parseFloat(e.target.value) })
              }
              required
            />
          </div>

          {/* Entry */}
          <div className="space-y-2">
            <Label htmlFor="entry">Entry</Label>
            <Input
              id="entry"
              type="number"
              step="0.001"
              value={formData.entry}
              onChange={(e) =>
                setFormData({ ...formData, entry: parseFloat(e.target.value) })
              }
              required
            />
          </div>

          {/* Stop Loss */}
          <div className="space-y-2">
            <Label htmlFor="stopLoss">Stop Loss</Label>
            <Input
              id="stopLoss"
              type="number"
              step="0.001"
              value={formData.stopLoss}
              onChange={(e) =>
                setFormData({ ...formData, stopLoss: parseFloat(e.target.value) })
              }
              required
            />
          </div>

          {/* Take Profit */}
          <div className="space-y-2">
            <Label htmlFor="takeProfit">Take Profit</Label>
            <Input
              id="takeProfit"
              type="number"
              step="0.001"
              value={formData.takeProfit}
              onChange={(e) =>
                setFormData({ ...formData, takeProfit: parseFloat(e.target.value) })
              }
              required
            />
          </div>

          {/* P/L */}
          <div className="space-y-2">
            <Label htmlFor="profitLoss">P/L ($)</Label>
            <Input
              id="profitLoss"
              type="number"
              step="0.01"
              value={formData.profitLoss}
              onChange={(e) =>
                setFormData({ ...formData, profitLoss: parseFloat(e.target.value) })
              }
              required
            />
          </div>

          {/* RR Ratio */}
          <div className="space-y-2">
            <Label htmlFor="rrRatio">RR Ratio</Label>
            <Input
              id="rrRatio"
              type="number"
              step="0.1"
              value={formData.rrRatio}
              onChange={(e) =>
                setFormData({ ...formData, rrRatio: parseFloat(e.target.value) })
              }
              required
            />
          </div>

          {/* Session */}
          <div className="space-y-2">
            <Label htmlFor="session">Session</Label>
            <Select
              value={formData.session}
              onValueChange={(value: Trade["session"]) =>
                setFormData({ ...formData, session: value })
              }
            >
              <SelectTrigger id="session">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="London">London</SelectItem>
                <SelectItem value="New York">New York</SelectItem>
                <SelectItem value="Asian">Asian</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Emotion */}
          <div className="space-y-2">
            <Label htmlFor="emotion">Emotion</Label>
            <Select
              value={formData.emotion}
              onValueChange={(value: Trade["emotion"]) =>
                setFormData({ ...formData, emotion: value })
              }
            >
              <SelectTrigger id="emotion">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Calm">Calm</SelectItem>
                <SelectItem value="Fear">Fear</SelectItem>
                <SelectItem value="Greedy">Greedy</SelectItem>
                <SelectItem value="Revenge">Revenge</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Text Areas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Why did you take this trade?"
              className="resize-none h-24"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional observations..."
              className="resize-none h-24"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lesson">Lesson</Label>
            <Textarea
              id="lesson"
              value={formData.lesson}
              onChange={(e) => setFormData({ ...formData, lesson: e.target.value })}
              placeholder="What did you learn?"
              className="resize-none h-24"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowForm(false)}
          >
            Cancel
          </Button>
          <Button type="submit">Add Trade</Button>
        </div>
      </form>
    </div>
  );
};
