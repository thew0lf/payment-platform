'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, AlertCircle, Eye, EyeOff, Loader2, Check, Shield } from 'lucide-react';

// Demo accounts for testing - ONLY shown in development mode
// These are real accounts from the database seed
const isDevelopment = process.env.NODE_ENV === 'development';
const demoAccounts = isDevelopment ? [
  { label: 'Organization', email: 'admin@avnz.io', color: 'from-cyan-400 to-blue-500' },
  { label: 'Client', email: 'owner@velocityagency.com', color: 'from-violet-400 to-purple-500' },
  { label: 'Company', email: 'manager@coffee-co.com', color: 'from-emerald-400 to-green-500' },
] : [];

export default function LoginPage() {
  const { login, isLoading, error, authConfig } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showLocalLogin, setShowLocalLogin] = useState(false);

  // Determine if we should show Auth0 login
  const auth0Enabled = authConfig?.auth0Enabled ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (err) {
      // Error handled by context
    }
  };

  const handleAuth0Login = async () => {
    try {
      await login();
    } catch (err) {
      // Error handled by context
    }
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo123');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-foreground" />
          </div>
          <span className="font-bold text-2xl bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            avnz.io
          </span>
        </div>

        {/* Login Card - Glassmorphism */}
        <div className="backdrop-blur-xl bg-card/80 border border-border rounded-xl p-8">
          <h1 className="text-xl font-semibold text-foreground text-center mb-2">
            Welcome back
          </h1>
          <p className="text-muted-foreground text-center text-sm mb-6">
            Sign in to your account
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Auth0 Login Button (if enabled and not showing local login) */}
          {auth0Enabled && !showLocalLogin ? (
            <div className="space-y-4">
              <Button
                onClick={handleAuth0Login}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-foreground"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Sign in with SSO
                  </>
                )}
              </Button>

              {/* Option to use local login as fallback */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-card text-muted-foreground">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLocalLogin(true)}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Sign in with email and password
              </button>
            </div>
          ) : (
            <>
              {/* Local Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Remember me checkbox */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setRememberMe(!rememberMe)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <div className={`w-4 h-4 rounded border ${rememberMe ? 'bg-primary border-primary' : 'border-border'} flex items-center justify-center transition-colors`}>
                      {rememberMe && <Check className="w-3 h-3 text-foreground" />}
                    </div>
                    Remember me
                  </button>
                  <button type="button" className="text-sm text-primary hover:text-primary transition-colors">
                    Forgot password?
                  </button>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>

              {/* Back to SSO button if Auth0 is enabled */}
              {auth0Enabled && showLocalLogin && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowLocalLogin(false)}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    Back to SSO login
                  </button>
                </div>
              )}

              {/* Demo accounts - Clickable (only show for local login in development) */}
              {(!auth0Enabled || showLocalLogin) && demoAccounts.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center mb-3">Click to use demo account (password: demo123)</p>
                  <div className="space-y-2">
                    {demoAccounts.map((account) => (
                      <button
                        key={account.email}
                        onClick={() => fillDemoAccount(account.email)}
                        className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted border border-border/50 hover:border-border transition-all text-sm group"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded bg-gradient-to-br ${account.color} flex items-center justify-center text-xs font-bold text-foreground`}>
                            {account.label.charAt(0)}
                          </div>
                          <span className="text-muted-foreground group-hover:text-foreground">{account.label}</span>
                        </div>
                        <code className="text-primary text-xs">{account.email}</code>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
