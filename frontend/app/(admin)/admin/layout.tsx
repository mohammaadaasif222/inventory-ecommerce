import { ReactNode } from 'react';
import { AdminSidebar } from '@/components/shared/admin-sidebar';
import { AdminTopbar } from '@/components/shared/admin-topbar';
import { AdminGuard } from '@/components/shared/admin-guard';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex flex-1 flex-col">
          <AdminTopbar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}
