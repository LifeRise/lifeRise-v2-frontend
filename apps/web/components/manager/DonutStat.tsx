'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface DonutStatProps {
  label: string;
  value: number;
  max: number;
  accent: string;
}

export function DonutStat({ label, value, max, accent }: DonutStatProps) {
  const safeMax = Math.max(max, 1);
  const data = [
    { name: 'filled', value: Math.min(value, safeMax) },
    { name: 'remainder', value: Math.max(safeMax - value, 0) },
  ];
  const muted = '#2D3E5A';

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-24 h-24 sm:w-28 sm:h-28">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="70%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="none"
              dataKey="value"
              animationDuration={800}
            >
              <Cell fill={value > 0 ? accent : muted} />
              <Cell fill={muted} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-heading font-bold text-lg text-lr-white">{value}</span>
        </div>
      </div>
      <span className="mt-2 text-xs text-muted text-center leading-tight">{label}</span>
    </div>
  );
}
