"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { engagementData } from "@/lib/mock-data";

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (active && payload && payload.length) {
    return (
      <div className="glass rounded-xl px-3 py-2 text-xs">
        <p className="text-lr-white font-semibold">{payload[0].name}</p>
        <p className="text-muted">{payload[0].value}% of bookings</p>
      </div>
    );
  }
  return null;
}

export default function EngagementChart() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 0); return () => clearTimeout(t); }, []);
  if (!mounted) return <div className="h-52 flex items-center justify-center text-muted text-xs">Loading chart…</div>;
  return (
    <div className="h-52 min-h-52">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <PieChart>
          <Pie data={engagementData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
            paddingAngle={3} dataKey="value" strokeWidth={0} animationBegin={200} animationDuration={900}>
            {engagementData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: "#94A3B8" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
