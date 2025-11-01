// utils/sessionDetector.ts
// Automatically detects trading session based on IST (Indian Standard Time) timing

export type SessionType = 
  | "Sydney Session"
  | "Sydney + Tokyo"
  | "Tokyo Session"
  | "Tokyo + London"
  | "London Session"
  | "London + NewYork"
  | "NewYork Session";

/**
 * Detects trading session based on trade time in IST (Indian Standard Time)
 * 
 * IST Session Ranges:
 * 1. Sydney Session - 3:30AM to 5:30AM
 * 2. Sydney + Tokyo - 5:30AM to 12:30PM
 * 3. Tokyo Session - 12:30PM to 1:30PM
 * 4. Tokyo + London - 1:30PM to 2:30PM
 * 5. London Session - 2:30PM to 6:30PM
 * 6. London + NewYork - 6:30PM to 10:30PM
 * 7. NewYork Session - 10:30PM to 3:30AM
 * 
 * @param dateTime - Date string or Date object (assumed to be in IST or will be converted)
 * @returns Session type string
 */
export function detectSession(dateTime: string | Date): SessionType {
  let date: Date;
  
  if (typeof dateTime === "string") {
    // Parse the date string - handle various formats
    // Formats: "2025-10-31", "2025.10.31 21:31:42", "2025-10-31T21:31:42", etc.
    let dateStr = dateTime.trim();
    
    // Replace dots with dashes for date part
    if (dateStr.includes(".")) {
      dateStr = dateStr.replace(/(\d{4})\.(\d{2})\.(\d{2})/, "$1-$2-$3");
    }
    
    // If no time provided, assume 12:00 PM
    if (!dateStr.includes(" ") && !dateStr.includes("T")) {
      dateStr += " 12:00:00";
    }
    
    // Replace space with T for ISO format if needed
    if (dateStr.includes(" ") && !dateStr.includes("T")) {
      dateStr = dateStr.replace(" ", "T");
    }
    
    date = new Date(dateStr);
  } else {
    date = new Date(dateTime);
  }

  // Parse time from date string - handle various MT5 date formats
  // Format examples: "2025.10.31 21:31:42", "2025-10-31T21:31:42", "2025-10-31 21:31:42"
  let hours = 0;
  let minutes = 0;
  
  // Try to extract time from the date string if it's a string
  if (typeof dateTime === "string") {
    const timeMatch = dateTime.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
    } else {
      // If no time in string, use date object
      hours = date.getHours();
      minutes = date.getMinutes();
    }
  } else {
    // Use date object directly
    hours = date.getHours();
    minutes = date.getMinutes();
  }
  
  // Note: We assume the time is already in IST format
  // MT5 reports typically export in server time, but user specified IST ranges
  
  // Convert to total minutes since midnight for easier comparison
  const totalMinutes = hours * 60 + minutes;

  // Define session ranges in minutes since midnight
  // Sydney Session: 3:30AM (210 min) to 5:30AM (330 min)
  if (totalMinutes >= 210 && totalMinutes < 330) {
    return "Sydney Session";
  }
  
  // Sydney + Tokyo: 5:30AM (330 min) to 12:30PM (750 min)
  if (totalMinutes >= 330 && totalMinutes < 750) {
    return "Sydney + Tokyo";
  }
  
  // Tokyo Session: 12:30PM (750 min) to 1:30PM (810 min)
  if (totalMinutes >= 750 && totalMinutes < 810) {
    return "Tokyo Session";
  }
  
  // Tokyo + London: 1:30PM (810 min) to 2:30PM (870 min)
  if (totalMinutes >= 810 && totalMinutes < 870) {
    return "Tokyo + London";
  }
  
  // London Session: 2:30PM (870 min) to 6:30PM (1170 min)
  if (totalMinutes >= 870 && totalMinutes < 1170) {
    return "London Session";
  }
  
  // London + NewYork: 6:30PM (1170 min) to 10:30PM (1410 min)
  if (totalMinutes >= 1170 && totalMinutes < 1410) {
    return "London + NewYork";
  }
  
  // NewYork Session: 10:30PM (1410 min) to 3:30AM next day (210 min)
  // This spans midnight, so we check both cases
  if (totalMinutes >= 1410 || totalMinutes < 210) {
    return "NewYork Session";
  }
  
  // Default fallback (shouldn't reach here)
  return "London Session";
}

/**
 * Get session from a trade date string
 * Extracts time from various date formats and detects session
 */
export function getSessionFromTradeDate(dateString: string): SessionType {
  try {
    return detectSession(dateString);
  } catch (error) {
    console.warn("Failed to detect session for date:", dateString, error);
    return "London Session"; // Default fallback
  }
}

