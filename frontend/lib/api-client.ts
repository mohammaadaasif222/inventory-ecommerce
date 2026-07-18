'use client';

import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';
import { config } from './config';
import { useAuthStore } from '@/store/auth-store';

/** Canonical API envelope returned by the NestJS backend. */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  meta?: ApiMeta;
  error?: { code: string; message: string; details?: unknown };
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  nextCursor?: string | null;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const instance: AxiosInstance = axios.create({
  baseURL: config.apiUrl,
  headers: { 'Content-Type': 'application/json' },
});

// Attach the access token to every request.
instance.interceptors.request.use((req: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

// Single-flight refresh: queue requests while a refresh is in progress.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, clear } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const res = await axios.post<ApiEnvelope<{ accessToken: string; refreshToken: string }>>(
      `${config.apiUrl}/auth/refresh`,
      { refreshToken },
    );
    const { accessToken, refreshToken: newRefresh } = res.data.data;
    setTokens(accessToken, newRefresh);
    return accessToken;
  } catch {
    clear();
    return null;
  }
}

instance.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean;
    };
    const status = error.response?.status;

    if (status === 401 && original && !original._retried) {
      original._retried = true;
      refreshing = refreshing ?? refreshAccessToken();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return instance(original);
      }
    }

    const body = error.response?.data;
    throw new ApiError(
      body?.error?.code ?? 'NETWORK_ERROR',
      body?.message ?? error.message,
      status ?? 0,
      body?.error?.details,
    );
  },
);

/** Thin typed wrapper that unwraps the envelope's `data`. */
export const api = {
  raw: instance,
  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const res = await instance.get<ApiEnvelope<T>>(url, { params });
    return res.data.data;
  },
  async getFull<T>(
    url: string,
    params?: Record<string, unknown>,
  ): Promise<ApiEnvelope<T>> {
    const res = await instance.get<ApiEnvelope<T>>(url, { params });
    return res.data;
  },
  async post<T>(url: string, body?: unknown): Promise<T> {
    const res = await instance.post<ApiEnvelope<T>>(url, body);
    return res.data.data;
  },
  async put<T>(url: string, body?: unknown): Promise<T> {
    const res = await instance.put<ApiEnvelope<T>>(url, body);
    return res.data.data;
  },
  async patch<T>(url: string, body?: unknown): Promise<T> {
    const res = await instance.patch<ApiEnvelope<T>>(url, body);
    return res.data.data;
  },
  async del<T>(url: string, body?: unknown): Promise<T> {
    const res = await instance.delete<ApiEnvelope<T>>(url, { data: body });
    return res.data.data;
  },
  async upload<T>(
    url: string,
    formData: FormData,
    onProgress?: (pct: number) => void,
  ): Promise<T> {
    const res = await instance.post<ApiEnvelope<T>>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });
    return res.data.data;
  },
};
