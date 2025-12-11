'use client';

import React from 'react';
import { Palette, Monitor, Sun, Moon, PanelLeftClose, PanelLeft, Check } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { usePreferences } from '@/contexts/preferences-context';
import { ThemePreference } from '@/lib/api/profile';
import { cn } from '@/lib/utils';

const themeOptions: { value: ThemePreference; label: string; description: string; icon: React.ElementType }[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Light background with dark text',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Dark background with light text',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Follows your device settings',
    icon: Monitor,
  },
];

export default function AppearanceSettingsPage() {
  const { theme, setTheme, sidebarCollapsed, setSidebarCollapsed, isLoading } = usePreferences();

  if (isLoading) {
    return (
      <>
        <Header
          title="Appearance"
          subtitle="Customize your dashboard experience"
        />
        <div className="p-6 max-w-3xl">
          <div className="animate-pulse space-y-6">
            <div className="h-48 bg-muted rounded-lg" />
            <div className="h-32 bg-muted rounded-lg" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Appearance"
        subtitle="Customize your dashboard experience"
      />

      <div className="p-6 space-y-6 max-w-3xl">
        {/* Theme Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <CardTitle>Theme</CardTitle>
            </div>
            <CardDescription>Choose how the dashboard looks to you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = theme === option.value;

                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={cn(
                      'relative flex flex-col items-center p-4 rounded-lg border-2 transition-all',
                      'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50',
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:bg-muted'
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Check className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center mb-3',
                        isSelected ? 'bg-primary/20' : 'bg-muted'
                      )}
                    >
                      <Icon className={cn('w-6 h-6', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <span className={cn('font-medium', isSelected ? 'text-foreground' : 'text-muted-foreground')}>
                      {option.label}
                    </span>
                    <span className="text-xs text-muted-foreground text-center mt-1">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PanelLeft className="w-5 h-5 text-primary" />
              <CardTitle>Sidebar</CardTitle>
            </div>
            <CardDescription>Configure the navigation sidebar behavior</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Collapsed Toggle */}
              <div className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    {sidebarCollapsed ? (
                      <PanelLeftClose className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <PanelLeft className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Collapse sidebar by default</p>
                    <p className="text-sm text-muted-foreground">
                      When enabled, the sidebar will show only icons
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className={cn(
                    'relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background',
                    sidebarCollapsed ? 'bg-primary' : 'bg-muted'
                  )}
                  role="switch"
                  aria-checked={sidebarCollapsed}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform',
                      sidebarCollapsed && 'translate-x-5'
                    )}
                  />
                </button>
              </div>

              {/* Visual Preview */}
              <div className="p-4 bg-card border border-border rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">Preview</p>
                <div className="flex gap-2 h-24 bg-background rounded-lg overflow-hidden border border-border">
                  {/* Sidebar preview */}
                  <div
                    className={cn(
                      'bg-card border-r border-border transition-all duration-200 flex flex-col items-center py-2 gap-1',
                      sidebarCollapsed ? 'w-8' : 'w-20'
                    )}
                  >
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-2 rounded bg-muted',
                          sidebarCollapsed ? 'w-4' : 'w-14'
                        )}
                      />
                    ))}
                  </div>
                  {/* Content preview */}
                  <div className="flex-1 p-2">
                    <div className="h-3 w-16 bg-muted rounded mb-2" />
                    <div className="h-2 w-24 bg-muted/50 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Note */}
        <div className="flex items-start gap-3 p-4 bg-card border border-border rounded-lg">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Monitor className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm text-foreground">
              Your preferences are automatically saved and synced across all your devices.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              You can also toggle the sidebar using the button in the navigation bar.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
