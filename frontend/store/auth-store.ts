'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'VENDOR'
  | 'CUSTOMER'
  | 'SUPPORT_AGENT';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
  avatarUrl: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (s: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
  }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clear: () => void;
  hasRole: (...roles: Role[]) => boolean;
  isAdmin: () => boolean;
}

/** Persisted auth session (tokens + user). Read by the axios client. */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken }),
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      clear: () => set({ user: null, accessToken: null, refreshToken: null }),
      hasRole: (...roles) => {
        const u = get().user;
        if (!u) return false;
        if (u.roles.includes('SUPER_ADMIN')) return true;
        return roles.some((r) => u.roles.includes(r));
      },
      isAdmin: () => get().hasRole('ADMIN', 'SUPER_ADMIN'),
    }),
    { name: 'ecom-auth' },
  ),
);
