'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Zap,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Check,
  Sparkles,
  PartyPopper,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  publicWaitlistApi,
  VerifyInviteResult,
} from '@/lib/api/waitlist';

type PageState = 'loading' | 'invalid' | 'form' | 'success';

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token') ?? null;

  // State
  const [pageState, setPageState] = useState<PageState>('loading');
  const [inviteData, setInviteData] = useState<VerifyInviteResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Verify invite token on mount
  const verifyToken = useCallback(async () => {
    if (!token) {
      setPageState('invalid');
      setError('No invite token provided');
      return;
    }

    try {
      const result = await publicWaitlistApi.verifyInvite(token);
      if (result.valid) {
        setInviteData(result);
        setFirstName(result.firstName || '');
        setLastName(result.lastName || '');
        setCompanyName(result.companyName || '');
        setPageState('form');
      } else {
        setPageState('invalid');
        setError(result.message || 'Invalid or expired invite');
      }
    } catch (err) {
      setPageState('invalid');
      setError('Failed to verify invite. Please try again.');
    }
  }, [token]);

  useEffect(() => {
    verifyToken();
  }, [verifyToken]);

  // Password validation
  const passwordErrors = [];
  if (password.length > 0 && password.length < 8) {
    passwordErrors.push('At least 8 characters');
  }
  if (password.length > 0 && !/[A-Z]/.test(password)) {
    passwordErrors.push('One uppercase letter');
  }
  if (password.length > 0 && !/[a-z]/.test(password)) {
    passwordErrors.push('One lowercase letter');
  }
  if (password.length > 0 && !/\d/.test(password)) {
    passwordErrors.push('One number');
  }
  const passwordsMatch = password === confirmPassword;
  const passwordValid = password.length >= 8 && passwordErrors.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!passwordValid) {
      setError('Please fix password requirements');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await publicWaitlistApi.register({
        token: token!,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        companyName: companyName || undefined,
      });

      if (result.success) {
        setPageState('success');
        toast.success('Welcome to avnz.io, Founder!');
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying your invite...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />

        <div className="w-full max-w-md relative z-10">
          <div className="backdrop-blur-xl bg-card/80 border border-border rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-semibold text-foreground mb-2">
              Invalid or Expired Invite
            </h1>
            <p className="text-muted-foreground mb-6">
              {error || 'This invite link is no longer valid. Please request a new invite.'}
            </p>
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Go to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />

        <div className="w-full max-w-md relative z-10">
          <div className="backdrop-blur-xl bg-card/80 border border-border rounded-xl p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <PartyPopper className="w-8 h-8 text-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Welcome, Founder!
            </h1>
            <p className="text-muted-foreground mb-2">
              Your account has been created successfully.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              You&apos;re now part of an exclusive group building the future of payments.
            </p>
            <Link href="/login">
              <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600">
                Sign In to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Registration form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-foreground" />
          </div>
          <span className="font-bold text-2xl bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            avnz.io
          </span>
        </div>

        {/* Founder Badge */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-full">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-amber-500">
              Founder #{inviteData?.founderNumber?.replace('FND-', '')}
            </span>
          </div>
        </div>

        {/* Registration Card */}
        <div className="backdrop-blur-xl bg-card/80 border border-border rounded-xl p-8">
          <h1 className="text-xl font-semibold text-foreground text-center mb-2">
            Complete Your Registration
          </h1>
          <p className="text-muted-foreground text-center text-sm mb-6">
            Welcome to the founding team! Set up your account below.
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email (read-only) */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Email</label>
              <Input
                type="email"
                value={inviteData?.email || ''}
                disabled
                className="bg-muted/50"
              />
            </div>

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">First Name</label>
                <Input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Last Name</label>
                <Input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Company name */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Company Name</label>
              <Input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Inc."
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Password requirements */}
              {password.length > 0 && (
                <div className="mt-2 text-xs space-y-1">
                  <div className={`flex items-center gap-1 ${password.length >= 8 ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {password.length >= 8 ? <Check className="w-3 h-3" /> : <span className="w-3 h-3" />}
                    At least 8 characters
                  </div>
                  <div className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {/[A-Z]/.test(password) ? <Check className="w-3 h-3" /> : <span className="w-3 h-3" />}
                    One uppercase letter
                  </div>
                  <div className={`flex items-center gap-1 ${/[a-z]/.test(password) ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {/[a-z]/.test(password) ? <Check className="w-3 h-3" /> : <span className="w-3 h-3" />}
                    One lowercase letter
                  </div>
                  <div className={`flex items-center gap-1 ${/\d/.test(password) ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {/\d/.test(password) ? <Check className="w-3 h-3" /> : <span className="w-3 h-3" />}
                    One number
                  </div>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Confirm Password</label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Terms checkbox */}
            <div>
              <button
                type="button"
                onClick={() => setAgreedToTerms(!agreedToTerms)}
                className="flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <div
                  className={`w-4 h-4 mt-0.5 rounded border ${
                    agreedToTerms ? 'bg-primary border-primary' : 'border-border'
                  } flex items-center justify-center transition-colors flex-shrink-0`}
                >
                  {agreedToTerms && <Check className="w-3 h-3 text-foreground" />}
                </div>
                <span>
                  I agree to the{' '}
                  <span className="text-primary hover:underline">Terms of Service</span> and{' '}
                  <span className="text-primary hover:underline">Privacy Policy</span>
                </span>
              </button>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
              disabled={isSubmitting || !passwordValid || !passwordsMatch || !agreedToTerms}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating your account...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Complete Registration
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
