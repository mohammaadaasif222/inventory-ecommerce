'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  StorageConfigFormValues,
  StorageConfigView,
} from '@/schemas/storage.schema';

const KEY = ['storage-config'];

export function useStorageConfig() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get<StorageConfigView>('/upload/storage-config'),
  });
}

export function useSaveStorageConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: StorageConfigFormValues) =>
      api.put<StorageConfigView>('/upload/storage-config', values),
    onSuccess: (data) => {
      qc.setQueryData(KEY, data);
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (values: StorageConfigFormValues) =>
      api.post<{ ok: boolean; provider: string }>(
        '/upload/storage-config/test',
        values,
      ),
  });
}
