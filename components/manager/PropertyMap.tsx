"use client";

const activityZones = [
  { x: 8,  y: 8,  w: 40, h: 38, label: "Block A", residents: 84, dots: [
    { label: "Wellness",  color: "#00D4AA", active: true  },
    { label: "Meal Prep", color: "var(--color-rose)", active: true  },
  ]},
  { x: 52, y: 8,  w: 40, h: 38, label: "Block B", residents: 91, dots: [
    { label: "Fitness",   color: "#818CF8", active: true  },
    { label: "Home Care", color: "#F5A623", active: false },
  ]},
  { x: 8,  y: 54, w: 40, h: 38, label: "Block C", residents: 72, dots: [
    { label: "Pets",      color: "var(--color-emerald)", active: false },
    { label: "Cleaning",  color: "#60A5FA", active: true  },
  ]},
  { x: 52, y: 54, w: 40, h: 38, label: "Block D", residents: 0,  dots: [] },
];

export default function PropertyMap() {
  return (
    <div className="relative w-full h-64 rounded-xl overflow-hidden bg-midnight border border-white/[0.07]">
      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,212,170,0.3)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Building blocks + dots */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Pathways — match the corridor gaps between blocks */}
        <rect x="48" y="0"  width="4"  height="100" fill="rgba(0,212,170,0.06)" />
        <rect x="0"  y="46" width="100" height="8"  fill="rgba(0,212,170,0.06)" />

        {activityZones.map((zone) => (
          <g key={zone.label}>
            <rect
              x={zone.x} y={zone.y} width={zone.w} height={zone.h}
              rx="2" fill="rgba(36,48,73,0.8)" stroke="rgba(0,212,170,0.2)" strokeWidth="0.5"
            />
            <text x={zone.x + zone.w / 2} y={zone.y + zone.h / 2 - 3} textAnchor="middle" fill="#94A3B8" fontSize="4" fontFamily="Inter">{zone.label}</text>
            <text x={zone.x + zone.w / 2} y={zone.y + zone.h / 2 + 5} textAnchor="middle" fill="#F8FAFC" fontSize="5" fontFamily="Inter" fontWeight="bold">
              {zone.residents > 0 ? `${zone.residents} res.` : "Vacant"}
            </text>

            {/* Vendor dots — evenly spaced at the bottom of the building */}
            {zone.dots.length > 0 && (
              <g transform={`translate(0, ${zone.y + zone.h - 6})`}>
                {zone.dots.map((dot, i) => {
                  const step = zone.w / (zone.dots.length + 1);
                  const cx = zone.x + step * (i + 1);
                  return (
                    <g key={dot.label}>
                      {dot.active && (
                        <circle cx={cx} cy={0} r="2.5" fill={dot.color} opacity="0.3">
                          <animate attributeName="r" values="2;5;2" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                        </circle>
                      )}
                      <circle cx={cx} cy={0} r="1.8" fill={dot.color} opacity={dot.active ? 1 : 0.4} stroke="#0A0F1E" strokeWidth="0.4" />
                    </g>
                  );
                })}
              </g>
            )}
          </g>
        ))}
      </svg>

      {/* HTML tooltips overlay — positioned via percentage to match SVG coords */}
      {activityZones.map((zone) =>
        zone.dots.map((dot, i) => {
          const step = zone.w / (zone.dots.length + 1);
          const leftPct = zone.x + step * (i + 1);
          const topPct = zone.y + zone.h - 6;
          return (
            <div
              key={`${zone.label}-${dot.label}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              style={{ left: `${leftPct}%`, top: `${topPct}%` }}
            >
              <div className="w-3 h-3 rounded-full" />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 whitespace-nowrap">
                <div className="glass rounded-lg px-2 py-1 text-[10px] font-semibold" style={{ color: dot.color }}>
                  {dot.label} {dot.active ? "● Active" : "○ Offline"}
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Legend */}
      <div className="absolute bottom-3 right-3 flex items-center gap-3 text-[10px] text-muted">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal inline-block" /> Active</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted/40 inline-block" /> Offline</span>
      </div>

      {/* Top label */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-teal pulse-teal" />
        <span className="text-teal text-[10px] font-bold uppercase tracking-wider">Live Activity Map</span>
      </div>
    </div>
  );
}
