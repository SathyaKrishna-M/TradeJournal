// utils/parseMT5HTML.ts
// Parser for MT5 HTML Trade History Reports
export interface ParsedTrade {
  date: string;
  pair: string;
  direction: "Buy" | "Sell";
  entry: number;
  stopLoss?: number;
  takeProfit?: number;
  lotSize: number;
  openTime: string; // Full datetime from Positions table (e.g., "2025.10.31 21:31:42")
  closeTime: string;
  closePrice: number;
  profitLoss: number;
  commission: number;
  swap: number;
}

export interface ParsedResults {
  totalNetProfit: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  expectedPayoff: number;
  recoveryFactor: number;
  sharpeRatio: number;
  totalTrades: number;
  winRate: number;
}

export interface ParseResult {
  trades: ParsedTrade[];
  balance: number;
  results: ParsedResults;
}

/**
 * Parse MT5 HTML report and extract trades, balance, and statistics
 * @param html - The HTML content of the MT5 report
 * @returns Parsed trades, balance, and results
 */
export function parseMT5HTML(html: string): ParseResult {
  if (!html || typeof html !== "string") {
    throw new Error("Invalid HTML content provided");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Check if the document is valid
  const parserError = doc.querySelector("parsererror");
  if (parserError) {
    throw new Error("Failed to parse HTML. Please ensure the file is a valid HTML document.");
  }

  const trades: ParsedTrade[] = [];

  // Get all table rows
  const allRows = Array.from(doc.querySelectorAll("table tr"));

  // Find the Positions section - look for header row with "Positions" text
  let positionsHeaderIdx = -1;
  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    const rowText = row.textContent?.toLowerCase() || "";
    
    // Check if this row contains "Positions" and has a th element (header row)
    const hasTh = row.querySelector("th") !== null;
    
    if (hasTh && rowText.includes("positions")) {
      // Make sure it's not mentioning "positions" in Orders/Deals sections
      if (!rowText.includes("order") && !rowText.includes("deal")) {
        positionsHeaderIdx = i;
        break;
      }
    }
  }

  // Alternative: Look for row with <th colspan="14"><b>Positions</b></th> or nested structure
  if (positionsHeaderIdx === -1) {
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      // Try both colspan="14" and any colspan with "Positions"
      const th = row.querySelector('th[colspan]') || row.querySelector("th");
      if (th) {
        const thText = th.textContent?.toLowerCase().trim() || "";
        const innerB = th.querySelector("b");
        const innerDiv = th.querySelector("div");
        
        // Check if text or nested elements contain "Positions"
        if (thText.includes("positions") || 
            (innerB && innerB.textContent?.toLowerCase().includes("positions")) ||
            (innerDiv && innerDiv.textContent?.toLowerCase().includes("positions"))) {
          positionsHeaderIdx = i;
          break;
        }
      }
    }
  }

  // Another fallback: Look for table structure with Positions header row (any th element)
  if (positionsHeaderIdx === -1) {
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      const th = row.querySelector("th");
      if (th) {
        // Get text from th and any nested b or div elements
        let thText = th.textContent?.toLowerCase().trim() || "";
        const innerB = th.querySelector("b");
        const innerDiv = th.querySelector("div");
        
        if (innerB) {
          thText = innerB.textContent?.toLowerCase().trim() || thText;
        }
        if (innerDiv) {
          thText = innerDiv.textContent?.toLowerCase().trim() || thText;
        }
        
        if (thText === "positions" || (thText.includes("positions") && !thText.includes("order") && !thText.includes("deal"))) {
          positionsHeaderIdx = i;
          break;
        }
      }
    }
  }

  if (positionsHeaderIdx === -1) {
    // Last resort: look for any row that looks like a trade row (has date pattern and symbol-like text) and work backwards
    for (let i = 0; i < allRows.length; i++) {
      const rowText = allRows[i].textContent?.toLowerCase() || "";
      const cells = Array.from(allRows[i].querySelectorAll("td"));
      
      // Check if this row has a date pattern (YYYY.MM.DD or similar) and multiple cells (trade data structure)
      const hasDatePattern = rowText.match(/\d{4}\.\d{2}\.\d{2}/) || rowText.match(/\d{4}-\d{2}-\d{2}/);
      const hasBuyOrSell = rowText.includes("buy") || rowText.includes("sell");
      const hasMultipleCells = cells.length >= 8;
      
      if (hasDatePattern && hasBuyOrSell && hasMultipleCells && 
          !rowText.includes("symbol") && 
          !rowText.includes("orders") && 
          !rowText.includes("deals")) {
        // Found a potential trade row, search backwards for header
        for (let j = i - 1; j >= 0 && j >= i - 20; j--) {
          const headerText = allRows[j].textContent?.toLowerCase() || "";
          if (headerText.includes("positions") || headerText.includes("position")) {
            positionsHeaderIdx = j;
            break;
          }
        }
        if (positionsHeaderIdx !== -1) break;
      }
    }
  }

  if (positionsHeaderIdx === -1) {
    throw new Error("Could not find Positions table in the HTML report. Please ensure this is a valid MT5 Trade History Report.");
  }

  // Find the column header row (usually right after "Positions" header)
  let columnHeaderIdx = positionsHeaderIdx + 1;
  while (columnHeaderIdx < allRows.length && columnHeaderIdx < positionsHeaderIdx + 5) {
    const headerRow = allRows[columnHeaderIdx];
    const headerText = headerRow.textContent?.toLowerCase() || "";
    
    // Check if this is the column header row
    if (headerText.includes("time") && 
        headerText.includes("symbol") && 
        (headerText.includes("position") || headerText.includes("volume"))) {
      break; // Found the column headers
    }
    columnHeaderIdx++;
  }

  // Start parsing data rows after the column header
  let dataStartIdx = columnHeaderIdx + 1;

  // Parse positions table rows
  while (dataStartIdx < allRows.length) {
    const row = allRows[dataStartIdx];
    const rowText = row.textContent?.toLowerCase() || "";
    
    // Stop if we've reached the next section
    const th = row.querySelector("th");
    if (th) {
      const thText = th.textContent?.toLowerCase() || "";
      if (thText.includes("orders") || thText.includes("deals") || thText.includes("results")) {
        break;
      }
    }
    
    // Check if row looks like a trade row (has date pattern, buy/sell, and multiple cells)
    const hasDatePattern = rowText.match(/\d{4}\.\d{2}\.\d{2}/) || rowText.match(/\d{4}-\d{2}-\d{2}/);
    const hasTimePattern = rowText.match(/\d{2}:\d{2}:\d{2}/);
    const hasBuyOrSell = rowText.includes("buy") || rowText.includes("sell");
    
    if (hasDatePattern && hasTimePattern && hasBuyOrSell) {
      try {
        const cells = Array.from(row.querySelectorAll("td"));
        
        if (cells.length < 10) {
          dataStartIdx++;
          continue;
        }

        // Find symbol cell - look for cell that comes after Position column and contains symbol-like text
        let symbolCellIdx = -1;
        
        // Method 1: Look for a cell that contains a symbol pattern (letters, numbers, dots, like "XAUUSD.x", "EURUSD", etc.)
        // Symbols are typically 2-8 letters/numbers followed by optional dots and suffix letters
        // Pattern: starts with 2-8 alphanumeric chars, may have dots and letters (like .x, .m, .pro)
        const symbolPattern = /^[A-Z0-9]{2,8}(\.[A-Z0-9]+)?$/i;
        
        for (let i = 0; i < cells.length; i++) {
          const cellText = cells[i]?.textContent?.trim() || "";
          
          // Check if it looks like a symbol (2-12 chars, matches symbol pattern)
          if (cellText.length >= 2 && cellText.length <= 12 && symbolPattern.test(cellText)) {
            // Make sure it's not a date, time, or pure number
            if (!cellText.match(/^\d+$/) && 
                !cellText.match(/^\d{4}[.\-]\d{2}[.\-]\d{2}/) && 
                !cellText.match(/^\d{2}:\d{2}:\d{2}/)) {
              // Check if next cell is "buy" or "sell" (typical structure: Symbol | Type)
              const nextCellText = cells[i + 1]?.textContent?.trim().toLowerCase() || "";
              if (nextCellText === "buy" || nextCellText === "sell") {
                symbolCellIdx = i;
                break;
              }
            }
          }
        }
        
        // Method 2: If we couldn't find by pattern, try to find based on position
        // Usually: Time | Position | Symbol | Type | Volume | Price | ...
        if (symbolCellIdx === -1 && cells.length >= 4) {
          // Look for cell after first cell (Time) that might be symbol
          for (let i = 1; i < Math.min(5, cells.length); i++) {
            const cellText = cells[i]?.textContent?.trim() || "";
            const nextCellText = cells[i + 1]?.textContent?.trim().toLowerCase() || "";
            
            // Check if cell looks like a symbol (has letters, not just numbers)
            const hasLetters = /[A-Za-z]/.test(cellText);
            const isNotPureNumber = !cellText.match(/^\d+$/);
            const reasonableLength = cellText.length >= 2 && cellText.length <= 12;
            
            if (hasLetters && isNotPureNumber && reasonableLength && 
                (nextCellText === "buy" || nextCellText === "sell")) {
              symbolCellIdx = i;
              break;
            }
          }
        }
        
        if (symbolCellIdx === -1) {
          dataStartIdx++;
          continue;
        }

        // Extract basic info
        const openTime = cells[0]?.textContent?.trim() || "";
        // Extract symbol as-is from HTML (uppercase for consistency)
        const symbol = cells[symbolCellIdx]?.textContent?.trim().toUpperCase() || "";
        const type = cells[symbolCellIdx + 1]?.textContent?.trim().toLowerCase() || "";

        // Find the hidden colspan cell and get data after it
        let hiddenColspanIdx = -1;
        for (let i = symbolCellIdx + 2; i < cells.length; i++) {
          const cell = cells[i];
          if (cell.classList.contains("hidden") || cell.getAttribute("colspan") === "8") {
            hiddenColspanIdx = i;
            break;
          }
        }

        if (hiddenColspanIdx === -1) {
        // Try without hidden cell detection - direct indexing
        // Structure: Time(0) | Position(1) | Symbol(2) | Type(3) | Volume(4) | Price(5) | S/L(6) | T/P(7) | CloseTime(8) | ClosePrice(9) | ... | Profit(last)
        const volume = parseFloat(cells[4]?.textContent?.trim().replace(/,/g, "").replace(/\s+/g, "") || "0");
        const entryPrice = parseFloat(cells[5]?.textContent?.trim().replace(/,/g, "").replace(/\s+/g, "") || "0");
        const slCandidate = parseFloat(cells[6]?.textContent?.trim().replace(/,/g, "").replace(/\s+/g, "") || "0");
        const tpCandidate = parseFloat(cells[7]?.textContent?.trim().replace(/,/g, "").replace(/\s+/g, "") || "0");
          
          // Look for close time (date pattern)
          let closeTime = "";
          let closePrice = 0;
          let closePriceIdx = -1;
        for (let i = 8; i < cells.length; i++) {
            const text = cells[i]?.textContent?.trim() || "";
            if (text.match(/\d{4}\.\d{2}\.\d{2}/)) {
              closeTime = text;
              if (i + 1 < cells.length) {
                closePrice = parseFloat(cells[i + 1]?.textContent?.trim().replace(/,/g, "").replace(/\s+/g, "") || "0");
                closePriceIdx = i + 1;
              }
              break;
            }
          }

          // Extract commission, swap, and profit
          // Structure after ClosePrice: Commission | Swap | Profit (last)
          let commission = 0;
          let swap = 0;
          let profitLoss = 0;
          
          // After ClosePrice, we should have Commission, Swap, and then Profit
          if (closePriceIdx >= 0 && cells.length > closePriceIdx + 3) {
            // Commission is usually after closePrice
            const commissionText = cells[closePriceIdx + 1]?.textContent?.trim() || "";
            commission = parseFloat(commissionText.replace(/[^\d.-]/g, "").replace(/\s+/g, "") || "0");
            
            // Swap is after commission
            if (cells.length > closePriceIdx + 2) {
              const swapText = cells[closePriceIdx + 2]?.textContent?.trim() || "";
              swap = parseFloat(swapText.replace(/[^\d.-]/g, "").replace(/\s+/g, "") || "0");
            }
          }
          
          // Profit is typically last cell (might be in a colspan cell)
          const profitText = cells[cells.length - 1]?.textContent?.trim() || "";
          profitLoss = parseFloat(profitText.replace(/[^\d.-]/g, "").replace(/\s+/g, "") || "0");
          
          // If profit is 0, try second-to-last cell (in case of colspan)
          if (profitLoss === 0 && cells.length > 1) {
            const secondLastText = cells[cells.length - 2]?.textContent?.trim() || "";
            const altProfit = parseFloat(secondLastText.replace(/[^\d.-]/g, "").replace(/\s+/g, "") || "0");
            if (altProfit !== 0 || secondLastText.includes("-")) {
              profitLoss = altProfit;
            }
          }

          if (symbol && entryPrice > 0 && volume > 0) {
            let tradeDate = openTime;
            if (openTime.includes(" ")) {
              tradeDate = openTime.split(" ")[0].replace(/\./g, "-");
            } else if (openTime.includes(".")) {
              tradeDate = openTime.replace(/\./g, "-").split(" ")[0];
            }

            trades.push({
              date: tradeDate || new Date().toISOString().split("T")[0],
              pair: symbol,
              direction: type === "buy" ? "Buy" : "Sell",
              entry: entryPrice,
              stopLoss: Number.isFinite(slCandidate) && slCandidate !== 0 ? slCandidate : undefined,
              takeProfit: Number.isFinite(tpCandidate) && tpCandidate !== 0 ? tpCandidate : undefined,
              lotSize: volume,
              openTime: openTime || "", // Store full openTime from Positions table
              closeTime: closeTime || "",
              closePrice: closePrice || entryPrice,
              profitLoss: profitLoss,
              commission: commission,
              swap: swap,
            });
          }
        } else {
          // Extract data after hidden colspan
          const dataCells: string[] = [];
          for (let i = hiddenColspanIdx + 1; i < cells.length; i++) {
            const cell = cells[i];
            const text = cell.textContent?.trim() || "";
            dataCells.push(text);
          }

          if (dataCells.length < 5) {
            dataStartIdx++;
            continue;
          }

          // Structure after hidden colspan: Volume | EntryPrice | S/L | T/P | CloseTime | ClosePrice | Commission | Swap | Profit
          const volume = parseFloat(dataCells[0]?.replace(/,/g, "").replace(/\s+/g, "") || "0");
          const entryPrice = parseFloat(dataCells[1]?.replace(/,/g, "").replace(/\s+/g, "") || "0");
          const slVal = parseFloat(dataCells[2]?.replace(/,/g, "").replace(/\s+/g, "") || "0");
          const tpVal = parseFloat(dataCells[3]?.replace(/,/g, "").replace(/\s+/g, "") || "0");
          const closeTime = dataCells[4] || "";
          const closePrice = parseFloat(dataCells[5]?.replace(/,/g, "").replace(/\s+/g, "") || "0");
          
          // Extract commission, swap, and profit
          // Structure: Volume(0) | EntryPrice(1) | S/L(2) | T/P(3) | CloseTime(4) | ClosePrice(5) | Commission(6) | Swap(7) | Profit(8)
          let commission = 0;
          let swap = 0;
          let profitLoss = 0;
          
          if (dataCells.length >= 9) {
            // We have all 9 cells - extract directly
            commission = parseFloat(dataCells[6]?.replace(/[^\d.-]/g, "").replace(/\s+/g, "") || "0");
            swap = parseFloat(dataCells[7]?.replace(/[^\d.-]/g, "").replace(/\s+/g, "") || "0");
            profitLoss = parseFloat(dataCells[8]?.replace(/[^\d.-]/g, "").replace(/\s+/g, "") || "0");
          } else if (dataCells.length >= 8) {
            // We have at least 8 cells - commission and swap, profit in last
            commission = parseFloat(dataCells[6]?.replace(/[^\d.-]/g, "").replace(/\s+/g, "") || "0");
            swap = parseFloat(dataCells[7]?.replace(/[^\d.-]/g, "").replace(/\s+/g, "") || "0");
            // Profit is in the last cell
            const lastCell = dataCells[dataCells.length - 1] || "";
            profitLoss = parseFloat(lastCell.replace(/[^\d.-]/g, "").replace(/\s+/g, "") || "0");
          } else {
            // Fallback: try to find profit in last cell
            const lastCell = dataCells[dataCells.length - 1] || "";
            profitLoss = parseFloat(lastCell.replace(/[^\d.-]/g, "").replace(/\s+/g, "") || "0");
          }

          if (symbol && entryPrice > 0 && volume > 0) {
            let tradeDate = openTime;
            if (openTime.includes(" ")) {
              tradeDate = openTime.split(" ")[0].replace(/\./g, "-");
            } else if (openTime.includes(".")) {
              tradeDate = openTime.replace(/\./g, "-").split(" ")[0];
            }

            trades.push({
              date: tradeDate || new Date().toISOString().split("T")[0],
              pair: symbol,
              direction: type === "buy" ? "Buy" : "Sell",
              entry: entryPrice,
              stopLoss: Number.isFinite(slVal) && slVal !== 0 ? slVal : undefined,
              takeProfit: Number.isFinite(tpVal) && tpVal !== 0 ? tpVal : undefined,
              lotSize: volume,
              openTime: openTime || "", // Store full openTime from Positions table
              closeTime: closeTime || "",
              closePrice: closePrice || entryPrice,
              profitLoss: profitLoss,
              commission: commission,
              swap: swap,
            });
          }
        }
      } catch (err) {
        console.warn("Failed to parse trade row:", err, row.textContent);
      }
    }
    
    dataStartIdx++;
  }

  // Parse Balance
  let balance = 0;
  const balanceRow = Array.from(doc.querySelectorAll("tr")).find((r) => {
    const text = r.textContent || "";
    return text.includes("Balance:") && text.includes("<b>");
  });
  
  if (balanceRow) {
    const balanceMatch = balanceRow.innerHTML.match(/<b>([\d\s,]+\.\d+)<\/b>/);
    if (balanceMatch) {
      balance = parseFloat(balanceMatch[1].replace(/[^\d.-]/g, "").replace(/\s+/g, "") || "0");
    } else {
      const bText = balanceRow.querySelector("b")?.textContent?.trim() || "";
      balance = parseFloat(bText.replace(/[^\d.-]/g, "").replace(/\s+/g, "") || "0");
    }
  }

  // If balance not found, try finding it in summary rows
  if (balance === 0) {
    const summaryRow = Array.from(doc.querySelectorAll("tr")).find((r) => {
      const text = r.textContent || "";
      return text.includes("Balance:") && !text.includes("Credit Facility");
    });
    if (summaryRow) {
      const balanceMatch = summaryRow.innerHTML.match(/<b>([\d\s,]+\.\d+)<\/b>/);
      if (balanceMatch) {
        balance = parseFloat(balanceMatch[1].replace(/[^\d.-]/g, "").replace(/\s+/g, "") || "0");
      }
    }
  }

  // Parse Results Section
  const results: ParsedResults = {
    totalNetProfit: extractNumberAfterLabel(doc, "Total Net Profit:"),
    grossProfit: extractNumberAfterLabel(doc, "Gross Profit:"),
    grossLoss: extractNumberAfterLabel(doc, "Gross Loss:"),
    profitFactor: extractNumberAfterLabel(doc, "Profit Factor:"),
    expectedPayoff: extractNumberAfterLabel(doc, "Expected Payoff:"),
    recoveryFactor: extractNumberAfterLabel(doc, "Recovery Factor:"),
    sharpeRatio: extractNumberAfterLabel(doc, "Sharpe Ratio:"),
    totalTrades: extractNumberAfterLabel(doc, "Total Trades:"),
    winRate: extractWinRate(doc),
  };

  return { trades, balance, results };
}

function extractNumberAfterLabel(doc: Document, label: string): number {
  const rows = Array.from(doc.querySelectorAll("tr"));
  const row = rows.find((r) => {
    const text = r.textContent || "";
    return text.includes(label);
  });
  
  if (!row) return 0;
  
  const bTag = row.querySelector("b");
  if (bTag) {
    const num = bTag.textContent?.replace(/[^\d.-]/g, "").replace(/\s+/g, "") ?? "0";
    return parseFloat(num) || 0;
  }
  
  const text = row.textContent || "";
  const match = text.match(/[\d\s,]+\.\d+/);
  if (match) {
    return parseFloat(match[0].replace(/[^\d.-]/g, "").replace(/\s+/g, "") || "0");
  }
  
  return 0;
}

function extractWinRate(doc: Document): number {
  const rows = Array.from(doc.querySelectorAll("tr"));
  const row = rows.find((r) => {
    const text = r.textContent || "";
    return text.includes("Profit Trades") && text.includes("%");
  });
  
  if (!row) return 0;
  
  const text = row.textContent || "";
  const match = text.match(/\((\d+\.\d+)%\)/);
  if (match) {
    return parseFloat(match[1]) || 0;
  }
  
  return 0;
}
