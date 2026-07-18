'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Users,
  MessagesSquare,
  Ticket,
  BookOpen,
  Palette,
  Settings,
  HardDrive,
  BarChart3,
  LayoutTemplate,
  Megaphone,
  Search,
  FileText,
  Menu as MenuIcon,
  CreditCard,
  Truck,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    section: 'Commerce',
    items: [
      { label: 'Products', href: '/admin/products', icon: Package },
      { label: 'Inventory', href: '/admin/inventory', icon: Boxes },
      { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
      { label: 'Customers', href: '/admin/customers', icon: Users },
    ],
  },
  {
    section: 'Support',
    items: [
      { label: 'Chat', href: '/admin/chat', icon: MessagesSquare },
      { label: 'Tickets', href: '/admin/tickets', icon: Ticket },
      { label: 'Knowledge Base', href: '/admin/knowledge-base', icon: BookOpen },
    ],
  },
  {
    section: 'Website',
    items: [
      { label: 'Homepage', href: '/admin/website/homepage', icon: LayoutTemplate },
      { label: 'Pages', href: '/admin/website/pages', icon: FileText },
      { label: 'Menus', href: '/admin/website/menus', icon: MenuIcon },
      { label: 'Theme', href: '/admin/website/theme', icon: Palette },
      { label: 'Popups', href: '/admin/website/popups', icon: Megaphone },
      { label: 'SEO', href: '/admin/website/seo', icon: Search },
    ],
  },
  {
    section: 'Settings',
    items: [
      { label: 'General', href: '/admin/settings/general', icon: Settings },
      { label: 'Storage', href: '/admin/settings/storage', icon: HardDrive },
      { label: 'Payments', href: '/admin/settings/payments', icon: CreditCard },
      { label: 'Shipping', href: '/admin/settings/shipping', icon: Truck },
      { label: 'Notifications', href: '/admin/settings/notifications', icon: Bell },
      { label: 'Security', href: '/admin/settings/security', icon: ShieldCheck },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/admin" className="font-semibold">
          Commerce Admin
        </Link>
      </div>
      <nav className="flex flex-col gap-6 p-4">
        {NAV.map((group) => (
          <div key={group.section}>
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {group.section}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== '/admin' && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
