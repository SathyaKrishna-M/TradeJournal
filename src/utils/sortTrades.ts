// utils/sortTrades.ts
// Utility function to sort trades by date and time (newest first)

import { Trade } from "@/pages/Index";

/**
 * Converts a trade date string to a sortable timestamp
 * Handles various date formats:
 * - "2025-10-31" (date only)
 * - "2025.10.31 21:31:42" (MT5 format with time)
 * - "2025-10-31T21:31:42" (ISO format)
 * - "2025-10-31 21:31:42" (space-separated)
 */
function getTradeTimestamp(trade: Trade): number {
  // Priority: Use openTime from Positions table (for MT5 imports), then closeTime, then date with time
  let dateStr = "";
  
  // First priority: Use openTime from Positions table (maintains order from MT5 HTML)
  if (trade.openTime && trade.openTime.trim()) {
    dateStr = trade.openTime.trim();
  }
  // Second priority: Use closeTime if openTime not available
  else if (trade.closeTime && trade.closeTime.trim()) {
    const closeTime = trade.closeTime.trim();
    if (closeTime.includes(" ")) {
      // closeTime is full datetime: "2025.10.31 21:32:30"
      dateStr = closeTime;
    } else {
      // closeTime is just time, combine with date
      dateStr = `${trade.date || ""} ${closeTime}`;
    }
  }
  // Third priority: Use date if it contains time
  else {
    dateStr = trade.date || "";
    const hasTime = dateStr.includes(":") || dateStr.includes("T");
    if (!hasTime) {
      // No time available, use date with midnight
      dateStr = dateStr + " 00:00:00";
    }
  }
  
  // Normalize date format
  // Replace dots with dashes for date part
  dateStr = dateStr.replace(/(\d{4})\.(\d{2})\.(\d{2})/, "$1-$2-$3");
  
  // Extract time part if present
  let timePart = "";
  const timeMatch = dateStr.match(/\s(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (timeMatch) {
    timePart = timeMatch[0].trim();
  }
  
  // If no time in string, append midnight (this puts date-only trades at bottom)
  if (!timePart && !dateStr.includes("T")) {
    dateStr += " 00:00:00";
  }
  
  // Replace space with T for ISO format if needed
  if (dateStr.includes(" ") && !dateStr.includes("T")) {
    dateStr = dateStr.replace(" ", "T");
  }
  
  const date = new Date(dateStr);
  const timestamp = date.getTime();
  
  // If date is invalid, return 0 (will be sorted to bottom)
  return isNaN(timestamp) ? 0 : timestamp;
}

/**
 * Sorts trades by date and time (newest first)
 */
export function sortTradesByTime(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => {
    const timestampA = getTradeTimestamp(a);
    const timestampB = getTradeTimestamp(b);
    
    // Sort descending (newest first)
    return timestampB - timestampA;
  });
}

