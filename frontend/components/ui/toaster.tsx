'use client';

import { Toaster as HotToaster } from 'react-hot-toast';

/**
 * App-wide react-hot-toast portal, themed through the same CSS variables as
 * everything else — so toasts wear the active storefront theme (and the
 * admin's neutral slate inside the panel), and follow light/dark for free.
 * Styling lives here rather than at call sites so the 80+ toast() calls
 * stay one-liners.
 */
export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      gutter={8}
      toastOptions={{
        duration: 4000,
        style: {
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          border: '1px solid hsl(var(--border))',
          boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
          borderRadius: 'var(--radius)',
          padding: '10px 14px',
          fontSize: '0.875rem',
        },
        success: {
          iconTheme: {
            primary: 'hsl(var(--primary))',
            secondary: 'hsl(var(--primary-foreground))',
          },
        },
        error: {
          // Errors linger longer — they usually need acting on, not glancing.
          duration: 6000,
          iconTheme: {
            primary: 'hsl(var(--destructive))',
            secondary: 'hsl(var(--destructive-foreground))',
          },
        },
      }}
    />
  );
}
