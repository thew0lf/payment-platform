'use client';

import React, { useState, useCallback } from 'react';
import { Sparkles, Loader2, Wand2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { aiApi, GrammarCheckResult, ImprovedDescription } from '@/lib/api/products';
import { cn } from '@/lib/utils';

type AIAction = 'generate' | 'improve' | 'grammar';

interface AIGenerateButtonProps {
  productName: string;
  currentText?: string;
  companyId?: string;
  onOpenGenerateModal: () => void;
  onApplyText?: (text: string) => void;
  onGrammarCheck?: (result: GrammarCheckResult) => void;
  onImprove?: (result: ImprovedDescription) => void;
  variant?: 'button' | 'icon' | 'dropdown';
  size?: 'sm' | 'default';
  disabled?: boolean;
  className?: string;
}

export function AIGenerateButton({
  productName,
  currentText,
  companyId,
  onOpenGenerateModal,
  onApplyText,
  onGrammarCheck,
  onImprove,
  variant = 'dropdown',
  size = 'default',
  disabled = false,
  className,
}: AIGenerateButtonProps) {
  const [isLoading, setIsLoading] = useState<AIAction | null>(null);
  const [success, setSuccess] = useState<AIAction | null>(null);

  const handleGrammarCheck = useCallback(async () => {
    if (!currentText || !onGrammarCheck) return;

    setIsLoading('grammar');
    try {
      const result = await aiApi.checkGrammar({ text: currentText });
      onGrammarCheck(result);
      if (result.issueCount === 0) {
        setSuccess('grammar');
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch (err) {
      console.error('Grammar check failed:', err);
    } finally {
      setIsLoading(null);
    }
  }, [currentText, onGrammarCheck]);

  const handleImprove = useCallback(async () => {
    if (!currentText || !onImprove) return;

    setIsLoading('improve');
    try {
      const result = await aiApi.improveDescription({
        description: currentText,
        companyId,
      });
      onImprove(result);
      if (onApplyText) {
        onApplyText(result.improved);
      }
      setSuccess('improve');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error('Improve failed:', err);
    } finally {
      setIsLoading(null);
    }
  }, [currentText, companyId, onImprove, onApplyText]);

  // Icon-only button
  if (variant === 'icon') {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onOpenGenerateModal}
        disabled={disabled || !productName}
        className={cn('p-2 h-8 w-8', className)}
        title="Generate with AI"
      >
        <Sparkles className="h-4 w-4 text-cyan-400" />
      </Button>
    );
  }

  // Simple button
  if (variant === 'button') {
    return (
      <Button
        type="button"
        variant="outline"
        size={size}
        onClick={onOpenGenerateModal}
        disabled={disabled || !productName}
        className={cn(
          'gap-2 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10',
          className
        )}
      >
        <Sparkles className="h-4 w-4" />
        Generate with AI
      </Button>
    );
  }

  // Dropdown with options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size}
          disabled={disabled || !productName}
          className={cn(
            'gap-2 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10',
            className
          )}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          AI Tools
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={onOpenGenerateModal}
          disabled={!productName}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4 text-cyan-400" />
          Generate Description
        </DropdownMenuItem>

        {currentText && (
          <>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={handleImprove}
              disabled={isLoading === 'improve'}
              className="gap-2"
            >
              {isLoading === 'improve' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : success === 'improve' ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : (
                <Wand2 className="h-4 w-4 text-purple-400" />
              )}
              Improve Description
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleGrammarCheck}
              disabled={isLoading === 'grammar'}
              className="gap-2"
            >
              {isLoading === 'grammar' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : success === 'grammar' ? (
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              ) : (
                <span className="h-4 w-4 flex items-center justify-center text-xs font-medium text-orange-400">
                  Aa
                </span>
              )}
              Check Grammar
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Grammar check inline component for text fields
interface GrammarCheckInlineProps {
  text: string;
  onApplyCorrected: (text: string) => void;
  language?: string;
  className?: string;
}

export function GrammarCheckInline({
  text,
  onApplyCorrected,
  language = 'en-US',
  className,
}: GrammarCheckInlineProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<GrammarCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = useCallback(async () => {
    if (!text) return;

    setIsChecking(true);
    setError(null);
    setResult(null);

    try {
      const checkResult = await aiApi.checkGrammar({ text, language });
      setResult(checkResult);
    } catch (err: any) {
      setError(err.message || 'Grammar check failed');
    } finally {
      setIsChecking(false);
    }
  }, [text, language]);

  const handleApply = useCallback(() => {
    if (result?.corrected) {
      onApplyCorrected(result.corrected);
      setResult(null);
    }
  }, [result, onApplyCorrected]);

  const handleDismiss = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  if (!text) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Check Button */}
      {!result && !error && (
        <button
          type="button"
          onClick={handleCheck}
          disabled={isChecking}
          className="text-xs text-zinc-400 hover:text-cyan-400 flex items-center gap-1.5 transition-colors"
        >
          {isChecking ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span className="font-medium">Aa</span>
          )}
          {isChecking ? 'Checking...' : 'Check Grammar'}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="text-xs text-red-400 flex items-center gap-2">
          <span>{error}</span>
          <button
            type="button"
            onClick={handleDismiss}
            className="underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="text-xs space-y-2 p-2 rounded bg-zinc-800/50 border border-zinc-700">
          {result.issueCount === 0 ? (
            <div className="text-green-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              No issues found
            </div>
          ) : (
            <>
              <div className="text-orange-400">
                Found {result.issueCount} issue{result.issueCount > 1 ? 's' : ''}
              </div>
              <div className="space-y-1">
                {result.issues.slice(0, 3).map((issue, i) => (
                  <div key={i} className="text-zinc-400">
                    • {issue.message}
                  </div>
                ))}
                {result.issues.length > 3 && (
                  <div className="text-zinc-500">
                    +{result.issues.length - 3} more
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleApply}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  Apply Fixes
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="text-zinc-500 hover:text-zinc-400"
                >
                  Dismiss
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
