"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface SemiCircleGaugeProps {
  profit: number;
  loss: number;
  isDark: boolean;
  gradientId: string;
}

export function SemiCircleGauge({ profit, loss, gradientId, isDark }: SemiCircleGaugeProps) {
  // Ensure we have positive values for the gauge
  const profitValue = Math.max(0, profit);
  const lossValue = Math.max(0, Math.abs(loss));
  const total = profitValue + lossValue;
  
  // Calculate angles for semi-circle
  // Left side (0-90 degrees) for profit, right side (90-180 degrees) for loss
  // We'll use 180 degrees total, split at the center
  const profitAngle = total > 0 ? (profitValue / total) * 180 : 0;
  const lossAngle = total > 0 ? (lossValue / total) * 180 : 0;

  // Create data for semi-circle
  // Profit goes from 180 (left) to (180 - profitAngle)
  // Loss goes from (180 - profitAngle) to 0 (right)
  const data = [];
  if (profitValue > 0) {
    data.push({ name: "Profit", value: profitValue, startAngle: 180, endAngle: 180 - profitAngle });
  }
  if (lossValue > 0) {
    data.push({ name: "Loss", value: lossValue, startAngle: 180 - profitAngle, endAngle: 0 });
  }

  // If no data, show empty state
  if (data.length === 0) {
    data.push({ name: "Empty", value: 1, startAngle: 180, endAngle: 0 });
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            <linearGradient id={`profitGradient-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isDark ? "#00FF99" : "#00C26D"} />
              <stop offset="100%" stopColor={isDark ? "#00CC66" : "#009955"} />
            </linearGradient>
            <linearGradient id={`lossGradient-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF4D4D" />
              <stop offset="100%" stopColor="#CC3333" />
            </linearGradient>
          </defs>
          {data.map((entry, index) => {
            if (entry.name === "Empty") {
              return null;
            }
            return (
              <Pie
                key={`pie-${index}`}
                data={[{ value: entry.value }]}
                cx="50%"
                cy="100%"
                innerRadius="60%"
                outerRadius="90%"
                startAngle={entry.startAngle}
                endAngle={entry.endAngle}
                dataKey="value"
                fill={entry.name === "Profit" ? `url(#profitGradient-${gradientId})` : `url(#lossGradient-${gradientId})`}
              >
                <Cell
                  fill={entry.name === "Profit" ? `url(#profitGradient-${gradientId})` : `url(#lossGradient-${gradientId})`}
                />
              </Pie>
            );
          })}
        </PieChart>
      </ResponsiveContainer>
      
      {/* Values below the gauge */}
      <div className="flex items-center justify-between w-full px-4 mt-4">
        <div className={`font-heading text-base font-semibold tracking-[-0.2px] ${isDark ? 'text-[#00FF99]' : 'text-[#00C26D]'}`}>
          {profitValue > 0 ? profitValue.toFixed(0) : '0'}
        </div>
        <div className={`font-heading text-base font-semibold tracking-[-0.2px] ${isDark ? 'text-[rgba(255,255,255,0.6)]' : 'text-[var(--text-muted)]'}`}>
          0
        </div>
        <div className={`font-heading text-base font-semibold tracking-[-0.2px] text-[#FF4D4D]`}>
          {lossValue > 0 ? lossValue.toFixed(0) : '0'}
        </div>
      </div>
    </div>
  );
}

