'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  ShoppingBag,
  MoreHorizontal,
  X,
  PackageCheck,
  Plug,
  Settings,
  CreditCard,
  GitBranch,
  Users,
  Key,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isPathActive, NavBadges } from '@/lib/navigation';

interface MobileTabBarProps {
  badges?: NavBadges;
}

// Primary tabs shown in the tab bar
const primaryTabs = [
  { id: 'home', label: 'Home', href: '/', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', href: '/orders', icon: ShoppingCart, badgeKey: 'orders' as const },
  { id: 'products', label: 'Products', href: '/products', icon: ShoppingBag, badgeKey: 'lowStock' as const },
  { id: 'transactions', label: 'Txns', href: '/transactions', icon: Receipt },
];

// Additional items shown in the "More" drawer
const moreItems = [
  { id: 'customers', label: 'Customers', href: '/customers', icon: Users },
  { id: 'shipments', label: 'Shipments', href: '/shipments', icon: PackageCheck },
  { id: 'integrations', label: 'Integrations', href: '/integrations', icon: Plug },
  { id: 'routing', label: 'Routing Rules', href: '/routing', icon: GitBranch },
  { id: 'merchant-accounts', label: 'Merchant Accounts', href: '/settings/merchant-accounts', icon: CreditCard },
  { id: 'api-keys', label: 'API Keys', href: '/settings/api-keys', icon: Key },
  { id: 'settings', label: 'Settings', href: '/settings/general', icon: Settings },
];

export function MobileTabBar({ badges }: MobileTabBarProps) {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);

  // Check if any "More" item is active
  const isMoreActive = moreItems.some((item) => isPathActive(item.href, pathname || ''));

  return (
    <>
      {/* Tab Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900 border-t border-zinc-800 md:hidden"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around h-16 px-2 safe-area-inset-bottom">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = isPathActive(tab.href, pathname || '');
            const badgeValue = tab.badgeKey ? badges?.[tab.badgeKey] : undefined;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]',
                  isActive
                    ? 'text-cyan-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  {badgeValue !== undefined && badgeValue > 0 && (
                    <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                      {badgeValue > 99 ? '99+' : badgeValue}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setShowMore(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]',
              isMoreActive || showMore
                ? 'text-cyan-400'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
            aria-expanded={showMore}
            aria-haspopup="dialog"
          >
            <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* More Drawer */}
      {showMore && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50 md:hidden"
            onClick={() => setShowMore(false)}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl md:hidden animate-slide-up"
            role="dialog"
            aria-modal="true"
            aria-label="More navigation options"
          >
            {/* Handle */}
            <div className="flex justify-center py-2">
              <div className="w-10 h-1 bg-zinc-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-2 border-b border-zinc-800">
              <h2 className="text-sm font-medium text-white">More</h2>
              <button
                onClick={() => setShowMore(false)}
                className="p-2 text-zinc-500 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items Grid */}
            <div className="grid grid-cols-3 gap-2 p-4 max-h-[50vh] overflow-y-auto">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = isPathActive(item.href, pathname || '');

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setShowMore(false)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl transition-colors',
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-400'
                        : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    )}
                  >
                    <Icon className="w-6 h-6" aria-hidden="true" />
                    <span className="text-xs font-medium text-center">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Safe area padding */}
            <div className="h-8 safe-area-inset-bottom" />
          </div>
        </>
      )}

      {/* Add bottom padding to page content to account for tab bar */}
      <style jsx global>{`
        @media (max-width: 768px) {
          main {
            padding-bottom: 80px;
          }
        }

        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }

        .safe-area-inset-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </>
  );
}
