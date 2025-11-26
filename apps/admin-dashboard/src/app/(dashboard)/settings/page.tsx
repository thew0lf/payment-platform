'use client';

import React from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <>
      <Header title="Settings" subtitle="Manage your account and preferences" />

      <div className="p-6 max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">First Name</label>
                <Input defaultValue={user?.firstName || ''} />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Last Name</label>
                <Input defaultValue={user?.lastName || ''} />
              </div>
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Email</label>
              <Input defaultValue={user?.email || ''} disabled />
            </div>
            <Button>Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Manage your password and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Current Password</label>
              <Input type="password" />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">New Password</label>
              <Input type="password" />
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Confirm New Password</label>
              <Input type="password" />
            </div>
            <Button variant="outline">Update Password</Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
