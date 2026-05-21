"use client";

/**
 * viewBox is 200 × 100 — landscape to match the ~2:1 container aspect ratio.
 * With preserveAspectRatio="none" each SVG unit maps to the same physical pixel
 * count in both axes, so text, dots, and blocks all render without distortion.
 *
 * Tooltips are rendered as SVG-native groups (fill/stroke SVG presentation
 * attributes — not CSS `style` props) so no inline-style linter warnings fire.
 */
const activityZones = [
  { x: 6,   y: 6,  w: 88, h: 38, label: "Block A", residents: 84, dots: [
    { label: "Wellness",  fill: "#00D4AA", active: true  },
    { label: "Meal Prep", fill: "#F472B6", active: true  },
  ]},
  { x: 106, y: 6,  w: 88, h: 38, label: "Block B", residents: 91, dots: [
    { label: "Fitness",   fill: "#818CF8", active: true  },
    { label: "Home Care", fill: "#F5A623", active: false },
  ]},
  { x: 6,   y: 54, w: 88, h: 38, label: "Block C", residents: 72, dots: [
    { label: "Pets",      fill: "#34D399", active: false },
    { label: "Cleaning",  fill: "#60A5FA", active: true  },
  ]},
  { x: 106, y: 54, w: 88, h: 38, label: "Block D", residents: 0,  dots: [] },
];

const VB_W = 200;
const VB_H = 100;

export default function PropertyMap() {
  return (
    <div className="relative w-full h-64 rounded-xl overflow-hidden bg-midnight border border-white/7">
      {/* Background grid */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,212,170,0.3)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Building blocks — viewBox matches the ~2:1 container so no axis distortion */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
      >
        {/* Corridors */}
        <rect x="96"  y="0"  width="8"   height={VB_H} fill="rgba(0,212,170,0.06)" />
        <rect x="0"   y="46" width={VB_W} height="8"   fill="rgba(0,212,170,0.06)" />

        {activityZones.map((zone) => (
          <g key={zone.label}>
            <rect
              x={zone.x} y={zone.y} width={zone.w} height={zone.h}
              rx="2" fill="rgba(36,48,73,0.8)" stroke="rgba(0,212,170,0.2)" strokeWidth="0.5"
            />
            <text
              x={zone.x + zone.w / 2} y={zone.y + zone.h / 2 - 4}
              textAnchor="middle" fill="#94A3B8" fontSize="4.5" fontFamily="Inter"
            >
              {zone.label}
            </text>
            <text
              x={zone.x + zone.w / 2} y={zone.y + zone.h / 2 + 6}
              textAnchor="middle" fill="#F8FAFC" fontSize="6" fontFamily="Inter" fontWeight="bold"
            >
              {zone.residents > 0 ? `${zone.residents} res.` : "Vacant"}
            </text>

            {/* Vendor dots with SVG-native tooltips (no inline style props) */}
            {zone.dots.length > 0 && zone.dots.map((dot, i) => {
              const step = zone.w / (zone.dots.length + 1);
              const cx = zone.x + step * (i + 1);
              const cy = zone.y + zone.h - 7;
              const tipW = 54;
              const tipH = 10;
              const tipX = cx - tipW / 2;
              const tipY = cy - tipH - 5;
              return (
                <g key={dot.label} className="svg-dot-group">
                  {dot.active && (
                    <circle cx={cx} cy={cy} r="3" fill={dot.fill} opacity="0.3">
                      <animate attributeName="r" values="2;6;2" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle cx={cx} cy={cy} r="2.2" fill={dot.fill} opacity={dot.active ? 1 : 0.4} stroke="#0A0F1E" strokeWidth="0.5" />
                  {/* SVG tooltip — visible on :hover via CSS class */}
                  <g className="svg-dot-tip">
                    <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="2"
                      fill="rgba(26,34,53,0.95)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.4" />
                    <text x={cx} y={tipY + tipH / 2 + 1.5} textAnchor="middle"
                      fill={dot.fill} fontSize="3.8" fontFamily="Inter" fontWeight="600">
                      {dot.label} {dot.active ? "● Active" : "○ Offline"}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 flex items-center gap-3 text-[10px] text-muted">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal inline-block" /> Active</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted/40 inline-block" /> Offline</span>
      </div>

      {/* Live label */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-teal pulse-teal" />
        <span className="text-teal text-[10px] font-bold uppercase tracking-wider">Live Activity Map</span>
      </div>
    </div>
  );
}
