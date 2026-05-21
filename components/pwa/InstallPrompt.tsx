"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { X, Download, Smartphone } from "lucide-react";
import { usePWA } from "./PWAProvider";

export function InstallPrompt() {
  const { canShowInstall, triggerInstall, dismissInstall } = usePWA();

  return (
    <AnimatePresence>
      {canShowInstall && (
        <>
          {/* Backdrop (mobile only) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-midnight/60 backdrop-blur-sm z-60 sm:hidden"
            onClick={dismissInstall}
          />

          {/* Prompt container */}
          <motion.div
            initial={{ opacity: 0, y: 120, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 120, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 sm:bottom-6 sm:left-auto sm:right-6 sm:w-95 z-70"
          >
            <div className="glass-dark rounded-t-3xl sm:rounded-3xl border border-white/8 shadow-2xl overflow-hidden">
              {/* Glow accent strip */}
              <div className="h-1 w-full bg-linear-to-r from-teal via-gold to-purple-accent" />

              <div className="p-5 sm:p-6">
                {/* Header row */}
                <div className="flex items-start gap-4 mb-4">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 25 }}
                    className="w-14 h-14 rounded-2xl bg-linear-to-br from-teal/20 to-gold/20 flex items-center justify-center shrink-0 border border-white/8"
                  >
                    <Image
                      src="/liferise_logo.png"
                      alt="LifeRise"
                      width={40}
                      height={40}
                      className="h-8 w-auto object-contain"
                    />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-bold text-lr-white text-lg leading-tight tracking-tight">
                      Install LifeRise
                    </h3>
                    <p className="text-muted text-xs mt-1 leading-relaxed">
                      Add to your home screen for instant access to your portal, offline support, and a native app experience.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={dismissInstall}
                    className="shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-muted hover:text-lr-white hover:bg-white/10 transition-colors"
                    aria-label="Dismiss install prompt"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Feature pills */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {["Offline Access", "Native Feel", "Instant Launch"].map((feat, i) => (
                    <motion.span
                      key={feat}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.06 }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-white/4 border border-white/6 text-lr-white/80"
                    >
                      {i === 0 ? <Smartphone size={10} className="text-teal" /> : null}
                      {feat}
                    </motion.span>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={triggerInstall}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-teal text-midnight font-bold text-sm tracking-wide transition-all teal-glow"
                  >
                    <Download size={16} />
                    Install App
                  </motion.button>
                  <button
                    type="button"
                    onClick={dismissInstall}
                    className="px-4 py-3 rounded-xl text-muted text-sm font-medium hover:text-lr-white transition-colors"
                  >
                    Not now
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
