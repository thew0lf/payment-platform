'use client';

import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import {
  SparklesIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  DocumentTextIcon,
  CubeIcon,
  EnvelopeIcon,
  UserGroupIcon,
  CreditCardIcon,
  GiftIcon,
} from '@heroicons/react/24/outline';
import * as aiFunnelApi from '@/lib/api/ai-funnel';
import type { GeneratedFunnelContent, GenerationProgress } from '@/lib/api/ai-funnel';

interface GenerationProgressStepProps {
  generationId: string;
  companyId?: string;
  onComplete: (content: GeneratedFunnelContent) => void;
  onFailed: () => void;
}

const STAGE_CONFIG: Record<
  GenerationProgress['stage'],
  { icon: typeof DocumentTextIcon; label: string; description: string }
> = {
  landing: {
    icon: DocumentTextIcon,
    label: 'Landing Page',
    description: 'Crafting compelling headlines and copy...',
  },
  products: {
    icon: CubeIcon,
    label: 'Product Descriptions',
    description: 'Enhancing product copy with benefits...',
  },
  emails: {
    icon: EnvelopeIcon,
    label: 'Email Sequence',
    description: 'Writing persuasive email series...',
  },
  leadCapture: {
    icon: UserGroupIcon,
    label: 'Lead Capture',
    description: 'Creating lead magnet content...',
  },
  checkout: {
    icon: CreditCardIcon,
    label: 'Checkout',
    description: 'Adding trust and urgency elements...',
  },
  success: {
    icon: GiftIcon,
    label: 'Success Page',
    description: 'Crafting thank-you experience...',
  },
};

export function GenerationProgressStep({
  generationId,
  companyId,
  onComplete,
  onFailed,
}: GenerationProgressStepProps) {
  const [progress, setProgress] = useState<GenerationProgress[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Start timer
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);

    // Poll for progress
    const pollProgress = async () => {
      try {
        const result = await aiFunnelApi.getGeneration(generationId, companyId);
        setProgress(result.progress);

        if (result.status === 'COMPLETED' && result.content) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          onComplete(result.content);
        } else if (result.status === 'FAILED') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          setError(result.error || 'Generation failed. Please try again.');
          toast.error(result.error || 'Generation failed');
        }
      } catch (err) {
        console.error('Failed to poll progress:', err);
      }
    };

    // Initial poll
    pollProgress();
    // Poll every 2 seconds
    pollIntervalRef.current = setInterval(pollProgress, 2000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [generationId, companyId, onComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const completedCount = progress.filter(p => p.status === 'complete').length;
  const totalCount = progress.length || 6;
  const percentComplete = Math.round((completedCount / totalCount) * 100);

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
          <ExclamationCircleIcon className="h-8 w-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-foreground mb-2">
          Generation Failed
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
        <button
          onClick={onFailed}
          className="px-6 py-3 bg-purple-600 text-foreground font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
          <SparklesIcon className="h-10 w-10 text-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-foreground">
          Generating Your Funnel
        </h2>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Our AI is crafting compelling copy for each section...
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {percentComplete}% Complete
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {formatTime(elapsedSeconds)} elapsed
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Stage list */}
      <div className="space-y-3">
        {(Object.keys(STAGE_CONFIG) as GenerationProgress['stage'][]).map(stage => {
          const config = STAGE_CONFIG[stage];
          const stageProgress = progress.find(p => p.stage === stage);
          const status = stageProgress?.status || 'pending';
          const Icon = config.icon;

          return (
            <div
              key={stage}
              className={`
                flex items-center gap-4 p-4 rounded-xl border transition-all
                ${status === 'complete' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}
                ${status === 'generating' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' : ''}
                ${status === 'pending' ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' : ''}
                ${status === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : ''}
              `}
            >
              {/* Status icon */}
              <div
                className={`
                  w-10 h-10 rounded-lg flex items-center justify-center
                  ${status === 'complete' ? 'bg-green-100 dark:bg-green-800' : ''}
                  ${status === 'generating' ? 'bg-purple-100 dark:bg-purple-800' : ''}
                  ${status === 'pending' ? 'bg-gray-200 dark:bg-gray-700' : ''}
                  ${status === 'error' ? 'bg-red-100 dark:bg-red-800' : ''}
                `}
              >
                {status === 'complete' ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : status === 'generating' ? (
                  <div className="animate-spin">
                    <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                ) : status === 'error' ? (
                  <ExclamationCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                ) : (
                  <Icon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3
                  className={`
                    font-medium
                    ${status === 'complete' ? 'text-green-700 dark:text-green-400' : ''}
                    ${status === 'generating' ? 'text-purple-700 dark:text-purple-400' : ''}
                    ${status === 'pending' ? 'text-gray-500 dark:text-gray-400' : ''}
                    ${status === 'error' ? 'text-red-700 dark:text-red-400' : ''}
                  `}
                >
                  {config.label}
                </h3>
                <p
                  className={`
                    text-sm
                    ${status === 'complete' ? 'text-green-600 dark:text-green-500' : ''}
                    ${status === 'generating' ? 'text-purple-600 dark:text-purple-500' : ''}
                    ${status === 'pending' ? 'text-gray-400 dark:text-gray-500' : ''}
                    ${status === 'error' ? 'text-red-600 dark:text-red-500' : ''}
                  `}
                >
                  {status === 'complete'
                    ? 'Complete!'
                    : status === 'generating'
                    ? config.description
                    : status === 'error'
                    ? 'Failed'
                    : 'Waiting...'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tips */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          While you wait...
        </h4>
        <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <li>• You can edit all generated content before saving</li>
          <li>• Regenerate any section that doesn&apos;t fit your brand</li>
          <li>• The more specific your answers, the better the copy</li>
        </ul>
      </div>
    </div>
  );
}
