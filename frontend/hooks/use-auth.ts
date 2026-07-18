'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore, type AuthUser } from '@/store/auth-store';

interface AuthResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api.post<AuthResult>('/auth/login', input),
    onSuccess: ({ user, accessToken, refreshToken }) =>
      setSession({ user, accessToken, refreshToken }),
  });
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      api.post<AuthResult>('/auth/register', input),
    onSuccess: ({ user, accessToken, refreshToken }) =>
      setSession({ user, accessToken, refreshToken }),
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout').catch(() => undefined);
    },
    onSuccess: () => clear(),
  });
}
