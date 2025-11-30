'use client';

import React, { useState } from 'react';
import {
  Shield,
  Key,
  Smartphone,
  Lock,
  AlertTriangle,
  Check,
  ChevronRight,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SessionManager } from '@/components/rbac/session-manager';
import { useAuth } from '@/contexts/auth-context';

export default function SecurityPage() {
  const { user } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  return (
    <>
      <Header
        title="Security"
        subtitle="Manage your account security settings"
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Security Overview */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Lock className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Password</p>
                  <p className="font-medium text-white">Set</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg">
                  <Smartphone className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Two-Factor Auth</p>
                  <p className="font-medium text-white">Not Enabled</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Shield className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Account Status</p>
                  <p className="font-medium text-white">Secure</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Password Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Password
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">
                  Last changed: <span className="text-zinc-300">Never</span>
                </p>
              </div>
              <Button variant="outline" onClick={() => setShowPasswordModal(true)}>
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-400 mb-1">
                  Two-factor authentication is not enabled
                </p>
                <p className="text-sm text-zinc-400 mb-3">
                  Protect your account by requiring a second verification step when signing in.
                </p>
                <Button size="sm">
                  Enable 2FA
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Active Sessions
            </CardTitle>
            <CardDescription>
              Manage your active sign-in sessions across devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SessionManager currentSessionToken={undefined} />
          </CardContent>
        </Card>

        {/* Security Log */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Recent Security Activity
            </CardTitle>
            <CardDescription>
              Review recent security-related activity on your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { event: 'Successful sign-in', location: 'San Francisco, US', time: '2 minutes ago', icon: Check, color: 'emerald' },
                { event: 'Password verification', location: 'San Francisco, US', time: '1 hour ago', icon: Lock, color: 'cyan' },
                { event: 'New session started', location: 'San Francisco, US', time: '3 hours ago', icon: Shield, color: 'cyan' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 bg-${item.color}-500/20 rounded`}>
                      <item.icon className={`w-4 h-4 text-${item.color}-400`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item.event}</p>
                      <p className="text-xs text-zinc-500">{item.location}</p>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500">{item.time}</span>
                </div>
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4 text-zinc-400">
              View All Activity
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
