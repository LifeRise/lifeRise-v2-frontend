'use client';

import { motion } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';
import Image from 'next/image';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 gradient-mesh">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="glass rounded-3xl p-8 sm:p-10 max-w-md w-full text-center border border-white/8"
      >
        <div className="w-16 h-16 rounded-2xl bg-teal/10 border border-teal/20 flex items-center justify-center mx-auto mb-6">
          <Image
            src="/liferise_logo.png"
            alt="LifeRise"
            width={40}
            height={40}
            className="h-8 w-auto object-contain"
          />
        </div>

        <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-5">
          <WifiOff size={28} className="text-muted" />
        </div>

        <h1 className="font-heading font-bold text-lr-white text-2xl mb-2">You&apos;re Offline</h1>
        <p className="text-muted text-sm leading-relaxed mb-8">
          LifeRise is available offline for pages you&apos;ve already visited. Connect to the
          internet to browse new content.
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal text-midnight font-bold text-sm tracking-wide transition-all hover:opacity-90 teal-glow"
        >
          <RefreshCw size={15} />
          Try Again
        </button>
      </motion.div>
    </div>
  );
}
