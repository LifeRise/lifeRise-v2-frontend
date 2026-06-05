'use client';

import { AlertTriangle } from 'lucide-react';

export default function ResidentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="glass rounded-2xl p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={20} className="text-red-400" />
        </div>
        <h2 className="font-heading text-lg font-bold text-lr-white mb-2">Something went wrong</h2>
        <p className="text-sm text-muted mb-6">
          {error.message || 'An unexpected error occurred in the resident portal.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-teal/10 text-teal text-sm font-medium hover:bg-teal/20 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
