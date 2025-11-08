import { useTheme } from "next-themes";

export interface TooltipStyles {
  contentStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  formatterColor: (isPositive?: boolean) => string;
}

export function useThemeTooltipStyles(): TooltipStyles {
  const { theme, resolvedTheme } = useTheme();
  const isDark = (theme ?? resolvedTheme) === "dark";

  if (isDark) {
    return {
      contentStyle: {
        backgroundColor: "#0D0D0D",
        border: "1px solid rgba(0,255,153,0.4)",
        color: "#FFFFFF",
        borderRadius: "8px",
        padding: "10px 14px",
        boxShadow: "0 0 10px rgba(0,255,153,0.4)",
        fontFamily: "Inter",
        fontSize: "13px",
      },
      labelStyle: {
        color: "#FFFFFF",
        fontFamily: "Inter",
        fontSize: "12px",
        fontWeight: "500",
      },
      formatterColor: (isPositive = true) => (isPositive ? "#00FF99" : "#FF4D4D"),
    };
  } else {
    return {
      contentStyle: {
        backgroundColor: "#FFFFFF",
        border: "1px solid rgba(0,194,109,0.4)",
        color: "#111111",
        borderRadius: "8px",
        padding: "10px 14px",
        boxShadow: "0 0 10px rgba(0,194,109,0.4)",
        fontFamily: "Inter",
        fontSize: "13px",
      },
      labelStyle: {
        color: "#111111",
        fontFamily: "Inter",
        fontSize: "12px",
        fontWeight: "500",
      },
      formatterColor: (isPositive = true) => (isPositive ? "#00C26D" : "#FF4D4D"),
    };
  }
}

