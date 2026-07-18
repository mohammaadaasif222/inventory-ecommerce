'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import { useLogout } from '@/hooks/use-auth';

export function AdminTopbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <span className="text-sm text-muted-foreground">Admin Panel</span>
      <div className="flex items-center gap-3">
        {user && (
          <span className="text-sm">
            {user.fullName || user.email}
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {user.roles[0]}
            </span>
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            logout.mutate(undefined, { onSuccess: () => router.push('/login') })
          }
        >
          <LogOut className="mr-1 h-4 w-4" /> Sign out
        </Button>
      </div>
    </header>
  );
}
