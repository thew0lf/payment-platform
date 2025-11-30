'use client';

import React, { useState, useCallback } from 'react';
import { Sparkles, Loader2, Copy, Check, RefreshCw } from 'lucide-react';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  aiApi,
  AI_TONES,
  AI_LENGTHS,
  AITone,
  AILength,
  GeneratedDescription,
} from '@/lib/api/products';
import { cn } from '@/lib/utils';

interface AIDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  category?: string;
  attributes?: Record<string, unknown>;
  currentDescription?: string;
  onApply: (result: GeneratedDescription) => void;
  companyId?: string;
}

export function AIDescriptionModal({
  isOpen,
  onClose,
  productName,
  category,
  attributes,
  currentDescription,
  onApply,
  companyId,
}: AIDescriptionModalProps) {
  const [tone, setTone] = useState<AITone>('professional');
  const [length, setLength] = useState<AILength>('medium');
  const [targetAudience, setTargetAudience] = useState('');
  const [includeSEO, setIncludeSEO] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GeneratedDescription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const generated = await aiApi.generateDescription({
        productName,
        category,
        attributes,
        tone,
        length,
        targetAudience: targetAudience || undefined,
        includeSEO,
        companyId,
      });
      setResult(generated);
    } catch (err: any) {
      setError(err.message || 'Failed to generate description');
    } finally {
      setIsGenerating(false);
    }
  }, [productName, category, attributes, tone, length, targetAudience, includeSEO, companyId]);

  const handleCopy = useCallback(async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const handleApply = useCallback(() => {
    if (result) {
      onApply(result);
      onClose();
    }
  }, [result, onApply, onClose]);

  const handleClose = useCallback(() => {
    setResult(null);
    setError(null);
    onClose();
  }, [onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="AI Description Generator"
      description={`Generate product description for "${productName}"`}
    >
      <div className="space-y-6 p-4">
        {/* Configuration */}
        {!result && (
          <div className="space-y-4">
            {/* Tone Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Tone</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {AI_TONES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTone(t.value as AITone)}
                    className={cn(
                      'px-3 py-2 text-sm rounded-lg border transition-colors',
                      tone === t.value
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Length Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Length</label>
              <div className="grid grid-cols-3 gap-2">
                {AI_LENGTHS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setLength(l.value as AILength)}
                    className={cn(
                      'px-3 py-2 text-sm rounded-lg border transition-colors',
                      length === l.value
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">
                Target Audience{' '}
                <span className="text-zinc-500 font-normal">(optional)</span>
              </label>
              <Input
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g., Coffee enthusiasts, Home baristas"
                className="bg-zinc-800"
              />
            </div>

            {/* Include SEO */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSEO}
                onChange={(e) => setIncludeSEO(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-cyan-500 focus:ring-cyan-500/20"
              />
              <span className="text-sm text-zinc-300">
                Include SEO meta title and description
              </span>
            </label>

            {/* Current Description Preview */}
            {currentDescription && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-500">
                  Current Description
                </label>
                <p className="text-sm text-zinc-400 bg-zinc-800/50 rounded-lg p-3 line-clamp-3">
                  {currentDescription}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            {/* Generated Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-300">
                  Generated Description
                </label>
                <button
                  onClick={() => handleCopy(result.description, 'description')}
                  className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                  title="Copy"
                >
                  {copiedField === 'description' ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="bg-zinc-800 rounded-lg p-4 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {result.description}
              </div>
            </div>

            {/* Meta Title */}
            {result.metaTitle && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-300">
                    Meta Title{' '}
                    <span className="text-zinc-500">({result.metaTitle.length}/60)</span>
                  </label>
                  <button
                    onClick={() => handleCopy(result.metaTitle!, 'metaTitle')}
                    className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                    title="Copy"
                  >
                    {copiedField === 'metaTitle' ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3 text-sm text-zinc-200">
                  {result.metaTitle}
                </div>
              </div>
            )}

            {/* Meta Description */}
            {result.metaDescription && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-zinc-300">
                    Meta Description{' '}
                    <span className="text-zinc-500">
                      ({result.metaDescription.length}/160)
                    </span>
                  </label>
                  <button
                    onClick={() => handleCopy(result.metaDescription!, 'metaDescription')}
                    className="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                    title="Copy"
                  >
                    {copiedField === 'metaDescription' ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="bg-zinc-800 rounded-lg p-3 text-sm text-zinc-200">
                  {result.metaDescription}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">
                  Key Highlights
                </label>
                <ul className="space-y-1">
                  {result.suggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      className="text-sm text-zinc-400 flex items-start gap-2"
                    >
                      <span className="text-cyan-400 mt-1">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        {result ? (
          <>
            <Button
              variant="outline"
              onClick={() => setResult(null)}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </Button>
            <Button onClick={handleApply} className="gap-2">
              <Check className="h-4 w-4" />
              Apply to Product
            </Button>
          </>
        ) : (
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !productName}
            className="gap-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isGenerating ? 'Generating...' : 'Generate Description'}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
