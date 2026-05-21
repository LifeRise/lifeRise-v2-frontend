"use client";

import { AlertTriangle } from "lucide-react";

export default function ManagerError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={20} className="text-red-400" />
        </div>
        <h2 className="font-heading text-lg font-bold text-lr-white mb-2">Something went wrong</h2>
        <p className="text-sm text-muted mb-6">{error.message || "An unexpected error occurred in the manager portal."}</p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-purple-accent/10 text-purple-accent text-sm font-medium hover:bg-purple-accent/20 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
