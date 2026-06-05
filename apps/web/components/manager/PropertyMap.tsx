"use client";

import { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, X } from "lucide-react";

/**
 * viewBox is 200 × 100 — landscape to match the ~2:1 container aspect ratio.
 * With preserveAspectRatio="none" each SVG unit maps to the same physical pixel
 * count in both axes, so text, dots, and blocks all render without distortion.
 *
 * Tooltips are now tap-driven (not CSS hover) for reliable touch interaction.
 * SVG pulse animations pause when the map scrolls off-screen via IntersectionObserver.
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

function MapSVG({
  activeDot,
  onToggleDot,
  isInView,
}: {
  activeDot: string | null;
  onToggleDot: (id: string) => void;
  isInView: boolean;
}) {
  return (
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

          {/* Vendor dots with tap-driven tooltips */}
          {zone.dots.length > 0 && zone.dots.map((dot, i) => {
            const step = zone.w / (zone.dots.length + 1);
            const cx = zone.x + step * (i + 1);
            const cy = zone.y + zone.h - 7;
            const tipW = 54;
            const tipH = 10;
            const tipX = cx - tipW / 2;
            const tipY = cy - tipH - 5;
            const dotId = `${zone.label}-${dot.label}`;
            const isActive = activeDot === dotId;
            return (
              <g
                key={dot.label}
                className="cursor-pointer"
                onClick={() => onToggleDot(dotId)}
              >
                {dot.active && (
                  <circle cx={cx} cy={cy} r="3" fill={dot.fill} opacity="0.3">
                    <animate
                      attributeName="r"
                      values="2;6;2"
                      dur="2s"
                      repeatCount="indefinite"
                      calcMode="spline"
                      keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.4;0;0.4"
                      dur="2s"
                      repeatCount="indefinite"
                      calcMode="spline"
                      keySplines="0.4 0 0.2 1;0.4 0 0.2 1"
                    />
                  </circle>
                )}
                <circle
                  cx={cx} cy={cy} r="2.2"
                  fill={dot.fill}
                  opacity={dot.active ? 1 : 0.4}
                  stroke="#0A0F1E"
                  strokeWidth="0.5"
                />
                {/* Tap-driven tooltip — visible when activeDot matches */}
                <g
                  className={`transition-opacity duration-150 pointer-events-none ${isActive ? "opacity-100" : "opacity-0"}`}
                >
                  <rect
                    x={tipX} y={tipY} width={tipW} height={tipH} rx="2"
                    fill="rgba(26,34,53,0.95)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.4"
                  />
                  <text
                    x={cx} y={tipY + tipH / 2 + 1.5}
                    textAnchor="middle"
                    fill={dot.fill} fontSize="3.8" fontFamily="Inter" fontWeight="600"
                  >
                    {dot.label} {dot.active ? "● Active" : "○ Offline"}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      ))}

      {/* Pause SVG animations when off-screen to save battery */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          animate { animation-play-state: paused !important; }
        }
      `}</style>
      {!isInView && (
        <rect width="0" height="0" display="none">
          <animate attributeName="opacity" from="1" to="1" dur="0s" />
        </rect>
      )}
    </svg>
  );
}

export default function PropertyMap() {
  const [activeDot, setActiveDot] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInView, setIsInView] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggleDot = (id: string) => {
    setActiveDot((prev) => (prev === id ? null : id));
  };

  /* IntersectionObserver to pause SVG animations off-screen */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
        // Pause/resume SMIL animations in the SVG
        const svg = el.querySelector("svg");
        if (svg) {
          const anims = svg.querySelectorAll("animate");
          anims.forEach((anim) => {
            const a = anim as SVGAnimateElement;
            if (entry.isIntersecting) {
              a.beginElement?.();
            } else {
              a.endElement?.();
            }
          });
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const mapContent = (
    <>
      {/* Background grid */}
      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,212,170,0.3)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <MapSVG activeDot={activeDot} onToggleDot={handleToggleDot} isInView={isInView} />

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

      {/* Fullscreen toggle */}
      <button
        type="button"
        onClick={() => setIsFullscreen(true)}
        className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-midnight/60 border border-white/8 flex items-center justify-center text-muted hover:text-lr-white transition-colors"
        aria-label="Expand map"
      >
        <Maximize2 size={12} />
      </button>
    </>
  );

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full h-72 sm:h-64 rounded-xl overflow-hidden bg-midnight border border-white/7"
      >
        {mapContent}
      </div>

      {/* Fullscreen Dialog */}
      <Dialog.Root open={isFullscreen} onOpenChange={setIsFullscreen}>
        <AnimatePresence>
          {isFullscreen && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div
                  className="fixed inset-0 z-50 bg-midnight/90 backdrop-blur-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  className="fixed inset-0 z-50 flex flex-col p-4 sm:p-6"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title className="font-heading font-bold text-lr-white text-lg">
                      Property Activity Map
                    </Dialog.Title>
                    <Dialog.Close className="w-8 h-8 rounded-lg flex items-center justify-center glass hover:bg-white/10 transition-colors text-muted hover:text-lr-white">
                      <X size={16} />
                    </Dialog.Close>
                  </div>
                  <div className="relative flex-1 rounded-xl overflow-hidden bg-midnight border border-white/7">
                    {mapContent}
                  </div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </>
  );
}
