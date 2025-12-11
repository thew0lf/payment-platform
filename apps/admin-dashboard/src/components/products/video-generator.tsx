'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Video,
  Loader2,
  Play,
  Download,
  RefreshCw,
  Wand2,
  FileText,
  Share2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  marketingVideosApi,
  MarketingVideoType,
  VideoPlatform,
  VideoGenerationStatus,
  VIDEO_TYPE_LABELS,
  VIDEO_STATUS_LABELS,
  PLATFORM_LABELS,
  getStatusColor,
  formatDuration,
  type GeneratedScript,
  type MarketingVideo,
} from '@/lib/api/marketing-videos';

interface VideoGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  companyId?: string;
  onVideoCreated?: (video: MarketingVideo) => void;
}

type Step = 'configure' | 'script' | 'generating' | 'complete';

const VIDEO_TYPES: MarketingVideoType[] = [
  'PRODUCT_SHOWCASE',
  'PRODUCT_LAUNCH',
  'SALE_PROMO',
  'TUTORIAL',
  'SOCIAL_AD',
];

const PLATFORMS: VideoPlatform[] = [
  'TIKTOK',
  'INSTAGRAM_REELS',
  'INSTAGRAM_FEED',
  'YOUTUBE_SHORTS',
  'YOUTUBE',
  'FACEBOOK_FEED',
];

const MOODS = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'luxury', label: 'Luxury' },
  { value: 'playful', label: 'Playful' },
] as const;

export function VideoGenerator({
  isOpen,
  onClose,
  productId,
  productName,
  companyId,
  onVideoCreated,
}: VideoGeneratorProps) {
  // State
  const [step, setStep] = useState<Step>('configure');
  const [videoType, setVideoType] = useState<MarketingVideoType>('PRODUCT_SHOWCASE');
  const [mood, setMood] = useState<string>('professional');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<VideoPlatform[]>(['INSTAGRAM_REELS']);
  const [generateScript, setGenerateScript] = useState(true);

  // Script state
  const [script, setScript] = useState<GeneratedScript | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [editedScript, setEditedScript] = useState('');

  // Generation state
  const [videoId, setVideoId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<VideoGenerationStatus | null>(null);
  const [currentStepLabel, setCurrentStepLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Complete state
  const [completedVideo, setCompletedVideo] = useState<MarketingVideo | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep('configure');
      setVideoType('PRODUCT_SHOWCASE');
      setMood('professional');
      setCustomPrompt('');
      setSelectedPlatforms(['INSTAGRAM_REELS']);
      setGenerateScript(true);
      setScript(null);
      setEditedScript('');
      setVideoId(null);
      setProgress(0);
      setStatus(null);
      setError(null);
      setCompletedVideo(null);
    }
  }, [isOpen]);

  // Poll for progress
  useEffect(() => {
    if (!videoId || step !== 'generating') return;

    const pollInterval = setInterval(async () => {
      try {
        const progressData = await marketingVideosApi.getProgress(videoId);
        setProgress(progressData.progress);
        setStatus(progressData.status);
        setCurrentStepLabel(progressData.currentStep);

        if (progressData.status === 'COMPLETED') {
          clearInterval(pollInterval);
          const video = await marketingVideosApi.get(videoId);
          setCompletedVideo(video);
          setStep('complete');
          onVideoCreated?.(video);
        } else if (progressData.status === 'FAILED') {
          clearInterval(pollInterval);
          setError(progressData.error || 'Video generation failed');
        }
      } catch (err) {
        console.error('Failed to poll progress:', err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [videoId, step, onVideoCreated]);

  // Handlers
  const handleGenerateScript = useCallback(async () => {
    setIsGeneratingScript(true);
    setError(null);

    try {
      const result = await marketingVideosApi.generateScript({
        productId,
        type: videoType,
        targetDuration: 30,
        tone: mood,
        additionalContext: customPrompt || undefined,
      });
      setScript(result);
      setEditedScript(result.script);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate script';
      setError(message);
    } finally {
      setIsGeneratingScript(false);
    }
  }, [productId, videoType, mood, customPrompt]);

  const handleStartGeneration = useCallback(async () => {
    setError(null);
    setStep('generating');

    try {
      const result = await marketingVideosApi.generateFromProduct(
        {
          productId,
          type: videoType,
          style: { mood: mood as 'professional' | 'casual' | 'luxury' | 'playful' },
          platforms: selectedPlatforms,
          customPrompt: customPrompt || undefined,
          generateScript,
        },
        companyId,
      );
      setVideoId(result.videoId);
      setStatus(result.status);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start video generation';
      setError(message);
      setStep('configure');
    }
  }, [productId, videoType, mood, selectedPlatforms, customPrompt, generateScript, companyId]);

  const handlePlatformToggle = useCallback((platform: VideoPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  }, []);

  const handleClose = useCallback(() => {
    if (step === 'generating' && videoId) {
      // Video is being generated, show confirmation
      setShowCloseConfirm(true);
      return;
    }
    onClose();
  }, [step, videoId, onClose]);

  const confirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    toast.info('Video will continue generating in the background');
    onClose();
  }, [onClose]);

  const handleDownload = useCallback(() => {
    if (completedVideo?.outputUrl) {
      window.open(completedVideo.outputUrl, '_blank');
    }
  }, [completedVideo]);

  // Render
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Generate Marketing Video"
      description={`Create AI-powered video for "${productName}"`}
    >
      <div className="p-4">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {(['configure', 'script', 'generating', 'complete'] as Step[]).map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <div className="w-8 h-0.5 bg-gray-200" />}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  step === s
                    ? 'bg-blue-600 text-foreground'
                    : (['configure', 'script', 'generating', 'complete'].indexOf(step) >
                        ['configure', 'script', 'generating', 'complete'].indexOf(s))
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                )}
              >
                {i + 1}
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Step: Configure */}
        {step === 'configure' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Video Type</label>
              <select
                value={videoType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setVideoType(e.target.value as MarketingVideoType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {VIDEO_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {VIDEO_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Style/Mood</label>
              <select
                value={mood}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMood(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                {MOODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Platforms</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {PLATFORMS.map((platform) => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => handlePlatformToggle(platform)}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-full border transition-colors',
                      selectedPlatforms.includes(platform)
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {PLATFORM_LABELS[platform]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Instructions (Optional)
              </label>
              <textarea
                value={customPrompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomPrompt(e.target.value)}
                placeholder="Add any specific instructions for the video..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="generateScript"
                checked={generateScript}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGenerateScript(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="generateScript" className="text-sm text-gray-700">
                Generate AI script first (recommended)
              </label>
            </div>
          </div>
        )}

        {/* Step: Script */}
        {step === 'script' && (
          <div className="space-y-4">
            {!script ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Generate an AI-powered script for your video</p>
                <Button onClick={handleGenerateScript} disabled={isGeneratingScript}>
                  {isGeneratingScript ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Script
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">Generated Script</label>
                  <Button variant="ghost" size="sm" onClick={handleGenerateScript}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Regenerate
                  </Button>
                </div>
                <textarea
                  value={editedScript}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedScript(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-gray-500">Estimated Duration</p>
                    <p className="font-medium">{formatDuration(script.estimatedDuration)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-gray-500">Scenes</p>
                    <p className="font-medium">{script.scenes.length}</p>
                  </div>
                </div>

                {script.callToAction && (
                  <div className="p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-600 font-medium">Call to Action</p>
                    <p className="text-blue-800">{script.callToAction}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step: Generating */}
        {step === 'generating' && (
          <div className="py-8 text-center">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
              <div
                className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"
                style={{ animationDuration: '1.5s' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Video className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Generating Your Video
            </h3>
            <p className="text-gray-500 mb-4">{currentStepLabel || 'Initializing...'}</p>

            <div className="max-w-xs mx-auto">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">{progress}% complete</p>
            </div>

            {status && (
              <div className="mt-4">
                <span className={cn('px-3 py-1 text-sm rounded-full', getStatusColor(status))}>
                  {VIDEO_STATUS_LABELS[status]}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && completedVideo && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Video Generated!</h3>
              <p className="text-gray-500">Your marketing video is ready</p>
            </div>

            {completedVideo.thumbnailUrl && (
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
                <img
                  src={completedVideo.thumbnailUrl}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                />
                {completedVideo.outputUrl && (
                  <a
                    href={completedVideo.outputUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                  >
                    <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                      <Play className="h-8 w-8 text-gray-900 ml-1" />
                    </div>
                  </a>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-gray-500">Duration</p>
                <p className="font-medium">
                  {completedVideo.duration ? formatDuration(completedVideo.duration) : 'N/A'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-gray-500">Credits Used</p>
                <p className="font-medium">{completedVideo.creditsUsed || 0}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" className="flex-1">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Close Confirmation Modal */}
      {showCloseConfirm && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 rounded-lg">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-2">
              Video in Progress
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Your video is still generating. It will continue in the background if you close this dialog.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCloseConfirm(false)}>
                Keep Open
              </Button>
              <Button onClick={confirmClose}>
                Close Anyway
              </Button>
            </div>
          </div>
        </div>
      )}

      <ModalFooter>
        {step === 'configure' && (
          <>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {generateScript ? (
              <Button onClick={() => setStep('script')}>
                Next: Script
              </Button>
            ) : (
              <Button onClick={handleStartGeneration}>
                <Video className="h-4 w-4 mr-2" />
                Generate Video
              </Button>
            )}
          </>
        )}

        {step === 'script' && (
          <>
            <Button variant="outline" onClick={() => setStep('configure')}>
              Back
            </Button>
            <Button onClick={handleStartGeneration} disabled={!script && generateScript}>
              <Video className="h-4 w-4 mr-2" />
              Generate Video
            </Button>
          </>
        )}

        {step === 'generating' && (
          <Button variant="outline" onClick={handleClose}>
            Run in Background
          </Button>
        )}

        {step === 'complete' && (
          <Button onClick={handleClose}>Done</Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
