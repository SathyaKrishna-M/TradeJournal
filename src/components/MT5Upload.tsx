"use client";

import React, { useState, useRef } from "react";
import { Upload, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, writeBatch, doc } from "firebase/firestore";
import { parseMT5HTML, type ParsedTrade } from "@/utils/parseMT5HTML";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { getSessionFromTradeDate } from "@/utils/sessionDetector";

type UploadState = "idle" | "parsing" | "uploading" | "done" | "error";

interface UploadProgress {
  current: number;
  total: number;
  message: string;
}

export const MT5Upload: React.FC = () => {
  const { currentUser } = useAuth();
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState<UploadProgress>({
    current: 0,
    total: 0,
    message: "",
  });
  const [errorMessage, setErrorMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Convert ParsedTrade to Trade format compatible with Firestore
   */
  const convertToTrade = (parsed: ParsedTrade) => {
    // Calculate RR ratio if we have stop loss and take profit
    let rrRatio = 0;
    const stopLoss = parsed.stopLoss || 0;
    const takeProfit = parsed.takeProfit || 0;
    const entry = Number(parsed.entry) || 0;

    if (stopLoss > 0 && takeProfit > 0 && entry > 0) {
      if (parsed.direction === "Buy") {
        const risk = Math.abs(entry - stopLoss);
        const reward = Math.abs(takeProfit - entry);
        rrRatio = risk > 0 ? reward / risk : 0;
      } else {
        const risk = Math.abs(stopLoss - entry);
        const reward = Math.abs(entry - takeProfit);
        rrRatio = risk > 0 ? reward / risk : 0;
      }
    }

    // If no RR ratio, calculate a simple one based on profit/loss
    if (rrRatio === 0 && parsed.profitLoss !== 0 && entry > 0) {
      // Rough estimate: assume 1:1 RR if we don't have SL/TP data
      rrRatio = 1;
    }

    // Auto-detect session from trade date
    const tradeDate = parsed.date || new Date().toISOString().split("T")[0];
    const session = getSessionFromTradeDate(parsed.closeTime || parsed.date || tradeDate);

    // Calculate net PnL including commission and swap
    const commission = Number(parsed.commission) || 0;
    const swap = Number(parsed.swap) || 0;
    const grossProfitLoss = Number(parsed.profitLoss) || 0;
    // Net PnL = Gross Profit/Loss + Commission + Swap
    const netProfitLoss = grossProfitLoss + commission + swap;

    return {
      date: tradeDate,
      pair: parsed.pair || "XAUUSD",
      direction: parsed.direction || "Buy",
      entry: entry,
      stopLoss: stopLoss,
      takeProfit: takeProfit,
      profitLoss: netProfitLoss, // Store net PnL (including commission and swap)
      commission: commission,
      swap: swap,
      rrRatio: rrRatio || 0,
      lotSize: Number(parsed.lotSize) || 0,
      session: session,
      openTime: parsed.openTime || "", // Store openTime from Positions table for sorting
      closeTime: parsed.closeTime || "",
      notes: `Imported from MT5 - Close: ${parsed.closePrice || "N/A"}, Time: ${parsed.closeTime || "N/A"}`,
    };
  };

  /**
   * Upload trades to Firestore using batch writes for performance
   */
  const uploadTradesToFirestore = async (trades: ParsedTrade[]) => {
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const tradesRef = collection(db, "users", currentUser.uid, "trades");
    const batch = writeBatch(db);
    const batchLimit = 500; // Firestore batch limit
    let uploaded = 0;

    // Process trades in batches
    for (let i = 0; i < trades.length; i += batchLimit) {
      const batchTrades = trades.slice(i, i + batchLimit);
      
      // Add trades to current batch
      batchTrades.forEach((parsedTrade) => {
        const tradeDocRef = doc(tradesRef);
        const trade = convertToTrade(parsedTrade);
        batch.set(tradeDocRef, trade);
      });

      // Commit this batch
      await batch.commit();
      uploaded += batchTrades.length;

      // Update progress
      setProgress({
        current: uploaded,
        total: trades.length,
        message: `Uploading trades... ${uploaded}/${trades.length}`,
      });

      // Small delay to prevent overwhelming Firestore
      if (i + batchLimit < trades.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setState("idle");
      return;
    }

    // Validate file type
    if (!file.name.endsWith(".html") && !file.name.endsWith(".htm")) {
      setState("error");
      setErrorMessage("Please select a valid HTML file (.html or .htm)");
      toast({
        title: "Invalid File Type",
        description: "Please select an HTML file exported from MT5.",
        variant: "destructive",
      });
      return;
    }

    // Reset state
    setState("parsing");
    setProgress({ current: 0, total: 0, message: "Reading file..." });
    setErrorMessage("");

    try {
      // Step 1: Read file
      const text = await file.text();
      
      if (!text || text.length === 0) {
        throw new Error("File is empty or could not be read");
      }

      setProgress({ current: 0, total: 0, message: "Parsing MT5 report..." });

      // Step 2: Parse HTML (with delay to show parsing state)
      await new Promise((resolve) => setTimeout(resolve, 300));
      const { trades, balance, results } = parseMT5HTML(text);

      // Step 3: Validate parsed data
      if (!trades || trades.length === 0) {
        throw new Error(
          "No trades found in the MT5 report. Please ensure you exported a full HTML report with trade history."
        );
      }

      console.log("✅ Parsed Trades:", trades.length);
      console.log("💰 Final Balance:", balance);
      console.log("📊 Summary Results:", results);

      setState("uploading");
      setProgress({
        current: 0,
        total: trades.length,
        message: `Uploading ${trades.length} trades...`,
      });

      // Step 4: Upload to Firestore
      await uploadTradesToFirestore(trades);

      // Success!
      setState("done");
      setProgress({
        current: trades.length,
        total: trades.length,
        message: `Successfully uploaded ${trades.length} trades!`,
      });

      toast({
        title: "✅ Upload Complete",
        description: `Successfully imported ${trades.length} trades from MT5 report.`,
      });

      // Reset to idle after 2 seconds
      setTimeout(() => {
        setState("idle");
        setProgress({ current: 0, total: 0, message: "" });
      }, 2000);

    } catch (err) {
      console.error("Error importing MT5 report:", err);
      setState("error");
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Failed to import MT5 report. Please check the file and try again.";
      setErrorMessage(errorMsg);
      
      toast({
        title: "❌ Upload Failed",
        description: errorMsg,
        variant: "destructive",
      });

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setState("idle");
        setErrorMessage("");
      }, 3000);
    } finally {
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUploadClick = () => {
    if (state === "uploading" || state === "parsing") return;
    fileInputRef.current?.click();
  };

  const getButtonContent = () => {
    switch (state) {
      case "parsing":
        return (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Parsing...</span>
          </>
        );
      case "uploading":
        return (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Uploading...</span>
          </>
        );
      case "done":
        return (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span>Done!</span>
          </>
        );
      case "error":
        return (
          <>
            <XCircle className="w-4 h-4" />
            <span>Error</span>
          </>
        );
      default:
        return (
          <>
            <Upload className="w-4 h-4" />
            <span>Upload HTML</span>
          </>
        );
    }
  };

  const progressPercent =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm"
        onChange={handleFileSelect}
        className="hidden"
      />

      <button
        onClick={handleUploadClick}
        disabled={state === "uploading" || state === "parsing"}
        className="flex items-center gap-2 bg-[#00FF9C] hover:bg-[#00cc7a] text-black font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {getButtonContent()}
      </button>

      {/* Progress Indicator */}
      <AnimatePresence>
        {(state === "parsing" || state === "uploading") && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 left-0 right-0 z-50 min-w-[300px] bg-card border border-border rounded-lg p-4 shadow-lg"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{progress.message}</span>
                {progress.total > 0 && (
                  <span className="text-muted-foreground">
                    {progress.current}/{progress.total}
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#00FF9C] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {state === "uploading" && progress.total > 0 && (
                <p className="text-xs text-muted-foreground">
                  {Math.round(progressPercent)}% complete
                </p>
              )}
            </div>
          </motion.div>
        )}

        {/* Error Message */}
        {state === "error" && errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 left-0 right-0 z-50 min-w-[300px] bg-destructive/10 border border-destructive rounded-lg p-4 shadow-lg"
          >
            <p className="text-sm text-destructive">{errorMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
