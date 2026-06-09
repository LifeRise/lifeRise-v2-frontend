'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#1A2235',
          color: '#F8FAFC',
          border: '1px solid rgba(255,255,255,0.1)',
        },
      }}
    />
  );
}
