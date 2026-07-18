'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuthStore, type AuthUser } from '@/store/auth-store';

/**
 * Receives the Google OAuth redirect. The backend hands tokens in the URL
 * fragment (#access_token=...&refresh_token=...); we store them, load the
 * profile, then route into the app.
 */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken || !refreshToken) {
      setError('Missing tokens in callback');
      return;
    }

    useAuthStore.getState().setTokens(accessToken, refreshToken);
    api
      .get<AuthUser>('/users/me')
      .then((user) => {
        useAuthStore.getState().setSession({ user, accessToken, refreshToken });
        router.replace(useAuthStore.getState().isAdmin() ? '/admin' : '/account');
      })
      .catch(() => setError('Failed to load profile'));
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center text-muted-foreground">
      {error ? (
        <p className="text-destructive">{error}</p>
      ) : (
        <p className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Signing you in…
        </p>
      )}
    </main>
  );
}
