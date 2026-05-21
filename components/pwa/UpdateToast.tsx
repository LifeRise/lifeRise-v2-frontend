"use client";

import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Zap, X } from "lucide-react";
import { usePWA } from "./PWAProvider";

export function UpdateToast() {
  const { updateAvailable, acceptUpdate } = usePWA();

  return (
    <AnimatePresence>
      {updateAvailable && (
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="fixed top-0 left-0 right-0 z-[80] flex justify-center px-4 pt-4 pointer-events-none"
        >
          <div className="pointer-events-auto glass-dark rounded-2xl border border-white/[0.08] shadow-2xl px-4 py-3 sm:px-5 sm:py-3.5 flex items-center gap-3 sm:gap-4 max-w-lg w-full">
            {/* Icon */}
            <div className="shrink-0 w-9 h-9 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center">
              <Zap size={16} className="text-teal" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="font-heading font-semibold text-lr-white text-sm tracking-tight">
                New Version Available
              </p>
              <p className="text-muted text-[11px] mt-0.5">
                A fresh build is ready. Reload to get the latest features.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={acceptUpdate}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal text-midnight text-xs font-bold tracking-wide transition-all teal-glow"
              >
                <RefreshCw size={12} />
                Reload
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
