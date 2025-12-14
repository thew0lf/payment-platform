'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Bell, Settings, ChevronRight, Menu, ArrowLeft, User, LogOut, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/auth-context';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { useMobileMenu } from '@/contexts/mobile-menu-context';
import { CommandPalette } from './command-palette';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  backLink?: { href: string; label: string };
}

export function Header({ title, subtitle, actions, badge, backLink }: HeaderProps) {
  const { user, logout } = useAuth();
  const { selectedClient, selectedCompany } = useHierarchy();
  const { openMenu } = useMobileMenu();
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch - theme is undefined on server
  useEffect(() => {
    setMounted(true);
  }, []);

  // Build breadcrumb based on hierarchy
  const breadcrumbs: Array<{ label: string; href?: string }> = [];

  if (selectedClient) {
    breadcrumbs.push({ label: selectedClient.name, href: `/clients/${selectedClient.id}` });
  }
  if (selectedCompany) {
    breadcrumbs.push({ label: selectedCompany.name, href: `/companies/${selectedCompany.id}` });
  }

  return (
    <>
      <header className="h-14 border-b border-border flex items-center justify-between px-4 md:px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Hamburger Menu - Mobile Only */}
          <button
            onClick={openMenu}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors md:hidden"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search */}
          <button
            onClick={() => setShowCommandPalette(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-muted border border-border rounded-lg text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search...</span>
            <div className="hidden sm:flex items-center gap-1 ml-4">
              <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">⌘</kbd>
              <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs">K</kbd>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          </button>

          {/* Settings Link */}
          <Link
            href="/settings/general"
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5" />
          </Link>

          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-8 h-8 bg-gradient-to-br from-primary to-blue-500 rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
                {user?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user?.email || 'User'}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || ''}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/profile" className="flex items-center cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/general" className="flex items-center cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Theme</DropdownMenuLabel>
              {mounted && (
                <DropdownMenuRadioGroup value={theme ?? 'system'} onValueChange={setTheme}>
                  <DropdownMenuRadioItem value="light" className="cursor-pointer">
                    <Sun className="mr-2 h-4 w-4" />
                    Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark" className="cursor-pointer">
                    <Moon className="mr-2 h-4 w-4" />
                    Dark
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system" className="cursor-pointer">
                    <Monitor className="mr-2 h-4 w-4" />
                    System
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              )}
              {!mounted && (
                <div className="py-2 px-2">
                  <div className="h-8 bg-muted rounded animate-pulse" />
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout()}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Page Header */}
      <div className="px-4 md:px-6 py-4 md:py-6 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            {/* Back Link */}
            {backLink && (
              <Link
                href={backLink.href}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to {backLink.label}
              </Link>
            )}
            {/* Breadcrumbs - only show if no backLink */}
            {!backLink && breadcrumbs.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                {breadcrumbs.map((crumb, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <ChevronRight className="w-4 h-4" />}
                    <span className={index === breadcrumbs.length - 1 ? 'text-foreground' : ''}>
                      {crumb.label}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl md:text-2xl font-semibold text-foreground">{title}</h1>
              {badge}
            </div>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={showCommandPalette}
        onOpenChange={setShowCommandPalette}
      />
    </>
  );
}
