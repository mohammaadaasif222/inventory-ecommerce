'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

/**
 * Client-side guard for the admin panel: redirects to /login (preserving the
 * intended path) unless the persisted session holds an admin role.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait a tick for the persisted Zustand store to hydrate.
    const isAdmin = useAuthStore.getState().isAdmin();
    if (!isAdmin) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else {
      setReady(true);
    }
  }, [router, pathname]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking access…
      </div>
    );
  }
  return <>{children}</>;
}
