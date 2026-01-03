'use client';

import React, { useState, useEffect, useId, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import {
  X,
  Palette,
  Type,
  Image,
  RotateCcw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  AlertCircle,
  Upload,
  Wand2,
  Crown,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  brandKitApi,
  funnelBrandKitApi,
  BrandKit,
  BrandKitCapabilities,
  UpdateBrandKitInput,
  BrandKitPreset,
  PRESET_METADATA,
  FONT_OPTIONS,
  LogoCapabilities,
  LogoStyle,
  LogoGenerationRequest,
  LogoGenerationResult,
} from '@/lib/api/brand-kit';
import { funnelsApi } from '@/lib/api/funnels';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface BrandingPanelProps {
  funnelId: string;
  companyId?: string;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════════
// LOGO STYLE CONSTANTS
// ═══════════════════════════════════════════════════════════════

const LOGO_STYLES: { value: LogoStyle; label: string; description: string }[] = [
  { value: 'modern', label: 'Modern', description: 'Clean lines, minimalist' },
  { value: 'classic', label: 'Classic', description: 'Timeless, professional' },
  { value: 'playful', label: 'Playful', description: 'Fun, creative, colorful' },
  { value: 'elegant', label: 'Elegant', description: 'Sophisticated, refined' },
  { value: 'minimal', label: 'Minimal', description: 'Simple, iconic' },
  { value: 'bold', label: 'Bold', description: 'Strong, impactful' },
];

const INDUSTRY_OPTIONS = [
  'Technology',
  'E-commerce',
  'Food & Beverage',
  'Health & Wellness',
  'Fashion',
  'Finance',
  'Education',
  'Entertainment',
  'Real Estate',
  'Travel',
  'Consulting',
  'Other',
];

const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ═══════════════════════════════════════════════════════════════
// COLLAPSIBLE SECTION
// ═══════════════════════════════════════════════════════════════

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();
  const buttonId = useId();

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        id={buttonId}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-inset"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium text-gray-900">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-500" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" aria-hidden="true" />
        )}
      </button>
      <div
        id={contentId}
        role="region"
        aria-labelledby={buttonId}
        className={cn(
          'transition-all duration-200',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        )}
      >
        <div className="p-4 bg-white">{children}</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COLOR INPUT
// ═══════════════════════════════════════════════════════════════

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

function ColorInput({ label, value, onChange, description }: ColorInputProps) {
  const colorPickerId = useId();
  const textInputId = useId();
  const descriptionId = useId();

  return (
    <div className="space-y-2">
      <label htmlFor={textInputId} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg border border-gray-200 shadow-sm cursor-pointer relative overflow-hidden min-h-[44px] min-w-[44px] focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2"
          style={{ backgroundColor: value }}
        >
          <input
            id={colorPickerId}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`${label} color picker`}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
        <input
          id={textInputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          aria-label={`${label} hex value`}
          aria-describedby={description ? descriptionId : undefined}
          className="font-mono text-sm w-28 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[44px]"
        />
      </div>
      {description && (
        <p id={descriptionId} className="text-xs text-gray-500">
          {description}
        </p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PRESET SELECTOR
// ═══════════════════════════════════════════════════════════════

interface PresetSelectorProps {
  currentPreset?: BrandKitPreset | 'custom';
  onApply: (preset: BrandKitPreset) => void;
  isApplying: boolean;
}

function PresetSelector({ currentPreset, onApply, isApplying }: PresetSelectorProps) {
  const presets: BrandKitPreset[] = ['minimal', 'bold', 'elegant', 'playful'];

  return (
    <div className="grid grid-cols-2 gap-2">
      {presets.map((preset) => {
        const meta = PRESET_METADATA[preset];
        const isSelected = currentPreset === preset;

        return (
          <button
            key={preset}
            onClick={() => onApply(preset)}
            disabled={isApplying}
            aria-pressed={isSelected}
            aria-label={`Apply ${meta.name} preset. ${meta.description}`}
            className={cn(
              'relative p-3 rounded-xl border-2 transition-all text-left min-h-[44px]',
              'hover:border-indigo-300 hover:shadow-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
              'touch-manipulation active:scale-[0.98]',
              isSelected
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 bg-white',
              isApplying && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">{meta.icon}</span>
              <span className="text-sm font-medium text-gray-900">{meta.name}</span>
              {isSelected && (
                <Check className="w-4 h-4 text-indigo-600 ml-auto" aria-hidden="true" />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export function BrandingPanel({ funnelId, companyId, onClose }: BrandingPanelProps) {
  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [useCompanyDefaults, setUseCompanyDefaults] = useState(true);
  const [companyBrandKit, setCompanyBrandKit] = useState<BrandKit | null>(null);
  const [funnelBrandKit, setFunnelBrandKit] = useState<BrandKit | null>(null);
  const [capabilities, setCapabilities] = useState<BrandKitCapabilities | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Logo state
  const [logoUrl, setLogoUrl] = useState('');
  const [logoCapabilities, setLogoCapabilities] = useState<LogoCapabilities | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedLogos, setGeneratedLogos] = useState<Array<{ id: string; url: string }>>([]);
  const [logoStyle, setLogoStyle] = useState<LogoStyle>('modern');
  const [logoIndustry, setLogoIndustry] = useState('Technology');
  const [logoDescription, setLogoDescription] = useState('');
  const [logoSource, setLogoSource] = useState<'company' | 'custom' | 'generated'>('company');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state - local edits before saving
  const [colors, setColors] = useState({
    primary: '#1a1a1a',
    secondary: '#666666',
    accent: '#0066cc',
    background: '#ffffff',
    text: '#1a1a1a',
    success: '#008a3e',
    warning: '#b38600',
    error: '#cc0029',
  });

  const [typography, setTypography] = useState({
    headingFont: 'Inter',
    bodyFont: 'Inter',
    baseFontSize: 16,
    headingScale: 1.25,
  });

  // IDs for accessibility
  const toggleId = useId();
  const toggleDescId = useId();

  // ─────────────────────────────────────────────────────────────
  // LOAD DATA
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    loadBrandKitData();
  }, [funnelId, companyId]);

  const loadBrandKitData = async () => {
    try {
      setLoading(true);

      // Load company brand kit, funnel brand kit, and logo capabilities in parallel
      const [companyData, funnelData, capabilitiesData, logoCaps] = await Promise.all([
        brandKitApi.get(companyId),
        funnelBrandKitApi.get(funnelId, companyId).catch(() => null),
        funnelBrandKitApi.getCapabilities(funnelId, companyId).catch(() => null),
        companyId ? brandKitApi.getLogoCapabilities(companyId).catch(() => null) : Promise.resolve(null),
      ]);

      setCompanyBrandKit(companyData);
      setFunnelBrandKit(funnelData);
      setCapabilities(capabilitiesData);
      setLogoCapabilities(logoCaps);

      // Determine if using company defaults
      const hasCustomBranding = funnelData !== null;
      setUseCompanyDefaults(!hasCustomBranding);

      // Set initial form values
      const activeBrandKit = hasCustomBranding ? funnelData : companyData;
      if (activeBrandKit) {
        setColors({
          primary: activeBrandKit.colors.primary || '#1a1a1a',
          secondary: activeBrandKit.colors.secondary || '#666666',
          accent: activeBrandKit.colors.accent || '#0066cc',
          background: activeBrandKit.colors.background || '#ffffff',
          text: activeBrandKit.colors.text || '#1a1a1a',
          success: activeBrandKit.colors.success || '#008a3e',
          warning: activeBrandKit.colors.warning || '#b38600',
          error: activeBrandKit.colors.error || '#cc0029',
        });
        setTypography({
          headingFont: activeBrandKit.typography.headingFont || 'Inter',
          bodyFont: activeBrandKit.typography.bodyFont || 'Inter',
          baseFontSize: activeBrandKit.typography.baseFontSize || 16,
          headingScale: activeBrandKit.typography.headingScale || 1.25,
        });
        const funnelLogo = activeBrandKit.logos?.fullUrl || '';
        setLogoUrl(funnelLogo);
        // Determine logo source
        if (funnelLogo && companyData?.logos?.fullUrl && funnelLogo === companyData.logos.fullUrl) {
          setLogoSource('company');
        } else if (funnelLogo) {
          setLogoSource('custom');
        } else {
          setLogoSource('company');
        }
      }
    } catch (error) {
      console.error('Failed to load brand kit:', error);
      toast.error("Couldn't load your branding. Give it another try?");
    } finally {
      setLoading(false);
    }
  };

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clear state references on unmount
      setLoading(false);
      setSaving(false);
      setApplyingPreset(false);
      setResetting(false);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────

  const handleToggleDefaults = async (useDefaults: boolean) => {
    if (useDefaults && funnelBrandKit) {
      // Confirm reset to company defaults
      setResetting(true);
      try {
        await funnelBrandKitApi.reset(funnelId, companyId);
        setFunnelBrandKit(null);
        setUseCompanyDefaults(true);
        setHasChanges(false);

        // Reset form to company values
        if (companyBrandKit) {
          setColors({
            primary: companyBrandKit.colors.primary || '#1a1a1a',
            secondary: companyBrandKit.colors.secondary || '#666666',
            accent: companyBrandKit.colors.accent || '#0066cc',
            background: companyBrandKit.colors.background || '#ffffff',
            text: companyBrandKit.colors.text || '#1a1a1a',
            success: companyBrandKit.colors.success || '#008a3e',
            warning: companyBrandKit.colors.warning || '#b38600',
            error: companyBrandKit.colors.error || '#cc0029',
          });
          setTypography({
            headingFont: companyBrandKit.typography.headingFont || 'Inter',
            bodyFont: companyBrandKit.typography.bodyFont || 'Inter',
            baseFontSize: companyBrandKit.typography.baseFontSize || 16,
            headingScale: companyBrandKit.typography.headingScale || 1.25,
          });
          setLogoUrl(companyBrandKit.logos?.fullUrl || '');
        }
        toast.success('Back to company branding! Fresh start');
      } catch (error) {
        console.error('Failed to reset branding:', error);
        toast.error("Reset didn't work. Your custom settings are still active—try again?");
      } finally {
        setResetting(false);
      }
    } else {
      setUseCompanyDefaults(useDefaults);
      if (!useDefaults) {
        setHasChanges(true);
      }
    }
  };

  // Validate hex color format
  const isValidHexColor = (hex: string): boolean => {
    if (!hex) return true; // Empty is allowed, will use default
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
  };

  const handleColorChange = (key: keyof typeof colors, value: string) => {
    // Always update the input to allow typing
    setColors((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);

    // Show validation warning for invalid hex (but don't block input)
    if (value && !isValidHexColor(value)) {
      // Visual feedback will be handled in save validation
    }
  };

  const handleTypographyChange = (key: keyof typeof typography, value: string | number) => {
    setTypography((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleApplyPreset = async (preset: BrandKitPreset) => {
    setApplyingPreset(true);
    try {
      const updated = await funnelBrandKitApi.applyPreset(funnelId, preset, companyId);
      setFunnelBrandKit(updated);
      setUseCompanyDefaults(false);

      // Update form with preset values
      setColors({
        primary: updated.colors.primary || '#1a1a1a',
        secondary: updated.colors.secondary || '#666666',
        accent: updated.colors.accent || '#0066cc',
        background: updated.colors.background || '#ffffff',
        text: updated.colors.text || '#1a1a1a',
        success: updated.colors.success || '#008a3e',
        warning: updated.colors.warning || '#b38600',
        error: updated.colors.error || '#cc0029',
      });
      setTypography({
        headingFont: updated.typography.headingFont || 'Inter',
        bodyFont: updated.typography.bodyFont || 'Inter',
        baseFontSize: updated.typography.baseFontSize || 16,
        headingScale: updated.typography.headingScale || 1.25,
      });

      setHasChanges(false);
      toast.success(`${PRESET_METADATA[preset].name} preset applied! Looking good`);
    } catch (error) {
      console.error('Failed to apply preset:', error);
      toast.error("Preset didn't apply. Your current design is safe—try again?");
    } finally {
      setApplyingPreset(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // LOGO HANDLERS
  // ─────────────────────────────────────────────────────────────

  const validateLogoFile = (file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return 'Please use PNG, JPG, SVG, or WebP format';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File is too large. Please use a file under 5MB';
    }
    return null;
  };

  const handleLogoUpload = async (file: File) => {
    const error = validateLogoFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    if (!companyId) {
      toast.error('Company context required for upload');
      return;
    }

    setIsUploadingLogo(true);
    try {
      const result = await funnelsApi.uploadLogo(funnelId, file, companyId);
      const newLogoUrl = result.cdnUrl || result.url;
      setLogoUrl(newLogoUrl);
      setLogoSource('custom');
      setHasChanges(true);
      setUseCompanyDefaults(false);
      toast.success('Logo uploaded!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload logo';
      toast.error(message);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
  };

  const handleRemoveLogo = async () => {
    if (!companyId) return;
    try {
      await funnelsApi.removeLogo(funnelId, companyId);
      setLogoUrl('');
      setLogoSource('company');
      setHasChanges(true);
      toast.success('Logo removed');
    } catch (err) {
      toast.error('Failed to remove logo');
    }
  };

  const handleUseCompanyLogo = () => {
    const companyLogo = companyBrandKit?.logos?.fullUrl || '';
    setLogoUrl(companyLogo);
    setLogoSource('company');
    setHasChanges(true);
  };

  const handleGenerateLogo = async () => {
    if (!companyId) {
      toast.error('Company context required');
      return;
    }

    if (!logoCapabilities?.canGenerate) {
      toast.error('AI logo generation requires an Enterprise plan');
      return;
    }

    setIsGeneratingLogo(true);
    setGenerationProgress(0);
    setGeneratedLogos([]);

    try {
      const request: LogoGenerationRequest = {
        brandName: companyBrandKit?.logos?.fullUrl ? 'Your Brand' : 'Your Brand',
        industry: logoIndustry,
        style: logoStyle,
        primaryColor: colors.primary,
        secondaryColor: colors.secondary,
        description: logoDescription || undefined,
      };

      const result = await brandKitApi.generateLogo(request, companyId);

      if (result.status === 'COMPLETED' && result.logos) {
        setGeneratedLogos(result.logos);
        setGenerationProgress(100);
        toast.success('Logos generated! Pick your favorite');
      } else if (result.jobId) {
        // Poll for completion
        const pollInterval = setInterval(async () => {
          try {
            const status = await brandKitApi.getLogoGenerationStatus(result.jobId, companyId);
            setGenerationProgress(status.progress);

            if (status.status === 'COMPLETED' && status.logos) {
              clearInterval(pollInterval);
              setGeneratedLogos(status.logos);
              setIsGeneratingLogo(false);
              toast.success('Logos generated! Pick your favorite');
            } else if (status.status === 'FAILED') {
              clearInterval(pollInterval);
              setIsGeneratingLogo(false);
              toast.error(status.error || 'Logo generation failed');
            }
          } catch (pollError) {
            clearInterval(pollInterval);
            setIsGeneratingLogo(false);
            toast.error('Failed to check generation status');
          }
        }, 2000);

        // Timeout after 2 minutes
        setTimeout(() => {
          if (isGeneratingLogo) {
            clearInterval(pollInterval);
            setIsGeneratingLogo(false);
            toast.error('Logo generation timed out');
          }
        }, 120000);
      }
    } catch (err) {
      setIsGeneratingLogo(false);
      toast.error('Failed to start logo generation');
    }
  };

  const handleSelectGeneratedLogo = (url: string) => {
    setLogoUrl(url);
    setLogoSource('generated');
    setHasChanges(true);
    setUseCompanyDefaults(false);
    toast.success('Logo selected!');
  };

  const handleSave = async () => {
    if (useCompanyDefaults) {
      toast.info("You're using company branding—switch to custom to save your own style");
      return;
    }

    // Validate all colors before saving
    const invalidColors = Object.entries(colors).filter(
      ([_, value]) => value && !isValidHexColor(value)
    );
    if (invalidColors.length > 0) {
      const fieldNames = invalidColors.map(([key]) => key).join(', ');
      toast.error(`Invalid hex color${invalidColors.length > 1 ? 's' : ''}: ${fieldNames}. Use format like #FF5500`);
      return;
    }

    setSaving(true);
    try {
      const updateData: UpdateBrandKitInput = {
        colors,
        typography,
        logos: logoUrl ? { fullUrl: logoUrl } : undefined,
        preset: 'custom',
      };

      const updated = await funnelBrandKitApi.update(funnelId, updateData, companyId);
      setFunnelBrandKit(updated);
      setHasChanges(false);
      toast.success("Branding locked in! Your funnel's looking sharp");
    } catch (error) {
      console.error('Failed to save branding:', error);
      toast.error("Save didn't work. Check your connection and try again?");
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
              <Palette className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Branding</h3>
              <p className="text-sm text-gray-500">Loading...</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close branding panel"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
            <Palette className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Branding</h3>
            <p className="text-sm text-gray-500">
              {useCompanyDefaults ? 'Using company defaults' : 'Custom branding'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close branding panel"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Use Company Defaults Toggle */}
        <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <label htmlFor={toggleId} className="block text-sm font-medium text-gray-900">
                Use company brand kit
              </label>
              <p id={toggleDescId} className="text-xs text-gray-500 mt-1">
                Stay consistent with your company's look and feel—no extra work needed
              </p>
            </div>
            <button
              id={toggleId}
              role="switch"
              aria-checked={useCompanyDefaults}
              aria-describedby={toggleDescId}
              onClick={() => handleToggleDefaults(!useCompanyDefaults)}
              disabled={resetting}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 min-h-[44px] min-w-[44px] items-center justify-center',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
                useCompanyDefaults ? 'bg-indigo-600' : 'bg-gray-200',
                resetting && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 absolute',
                  useCompanyDefaults ? 'translate-x-2.5' : '-translate-x-2.5'
                )}
              />
            </button>
          </div>
          {resetting && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Resetting to company defaults...</span>
            </div>
          )}
        </div>

        {/* Custom branding note when disabled */}
        {useCompanyDefaults && (
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">Using company branding</p>
              <p className="mt-0.5">
                Want to make this funnel pop? Toggle off above to customize colors, fonts, and more!
              </p>
            </div>
          </div>
        )}

        {/* Quick Presets - always visible */}
        <CollapsibleSection
          title="Quick Presets"
          icon={<Sparkles className="w-5 h-5 text-indigo-500" />}
          defaultOpen={!useCompanyDefaults}
        >
          <PresetSelector
            currentPreset={funnelBrandKit?.preset as BrandKitPreset | 'custom' | undefined}
            onApply={handleApplyPreset}
            isApplying={applyingPreset}
          />
        </CollapsibleSection>

        {/* Colors Section */}
        <CollapsibleSection
          title="Colors"
          icon={<Palette className="w-5 h-5 text-purple-500" />}
          defaultOpen={!useCompanyDefaults}
        >
          <fieldset disabled={useCompanyDefaults} className="space-y-4">
            <legend className="sr-only">Brand colors</legend>
            <div className="grid grid-cols-2 gap-4">
              <ColorInput
                label="Primary"
                value={colors.primary}
                onChange={(v) => handleColorChange('primary', v)}
                description="Main brand color"
              />
              <ColorInput
                label="Secondary"
                value={colors.secondary}
                onChange={(v) => handleColorChange('secondary', v)}
                description="Supporting color"
              />
              <ColorInput
                label="Accent"
                value={colors.accent}
                onChange={(v) => handleColorChange('accent', v)}
                description="Highlight color"
              />
              <ColorInput
                label="Background"
                value={colors.background}
                onChange={(v) => handleColorChange('background', v)}
                description="Page background"
              />
            </div>
            <div className="h-px bg-gray-200" />
            <div className="grid grid-cols-2 gap-4">
              <ColorInput
                label="Text"
                value={colors.text}
                onChange={(v) => handleColorChange('text', v)}
              />
              <ColorInput
                label="Success"
                value={colors.success}
                onChange={(v) => handleColorChange('success', v)}
              />
              <ColorInput
                label="Warning"
                value={colors.warning}
                onChange={(v) => handleColorChange('warning', v)}
              />
              <ColorInput
                label="Error"
                value={colors.error}
                onChange={(v) => handleColorChange('error', v)}
              />
            </div>
          </fieldset>
        </CollapsibleSection>

        {/* Typography Section */}
        <CollapsibleSection
          title="Typography"
          icon={<Type className="w-5 h-5 text-green-500" />}
          defaultOpen={false}
        >
          <fieldset disabled={useCompanyDefaults} className="space-y-4">
            <legend className="sr-only">Typography settings</legend>

            <div>
              <label htmlFor="heading-font" className="block text-sm font-medium text-gray-700 mb-1.5">
                Heading Font
              </label>
              <select
                id="heading-font"
                value={typography.headingFont}
                onChange={(e) => handleTypographyChange('headingFont', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[44px]"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label} ({font.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="body-font" className="block text-sm font-medium text-gray-700 mb-1.5">
                Body Font
              </label>
              <select
                id="body-font"
                value={typography.bodyFont}
                onChange={(e) => handleTypographyChange('bodyFont', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[44px]"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label} ({font.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="base-font-size" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Base Size (px)
                </label>
                <input
                  id="base-font-size"
                  type="number"
                  min="12"
                  max="24"
                  value={typography.baseFontSize}
                  onChange={(e) => handleTypographyChange('baseFontSize', parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[44px]"
                />
              </div>
              <div>
                <label htmlFor="heading-scale" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Heading Scale
                </label>
                <select
                  id="heading-scale"
                  value={typography.headingScale}
                  onChange={(e) => handleTypographyChange('headingScale', parseFloat(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[44px]"
                >
                  <option value={1.125}>Minor Second (1.125)</option>
                  <option value={1.2}>Minor Third (1.2)</option>
                  <option value={1.25}>Major Third (1.25)</option>
                  <option value={1.333}>Perfect Fourth (1.333)</option>
                  <option value={1.5}>Perfect Fifth (1.5)</option>
                </select>
              </div>
            </div>
          </fieldset>
        </CollapsibleSection>

        {/* Logo Section - Enhanced */}
        <CollapsibleSection
          title="Logo"
          icon={<Image className="w-5 h-5 text-orange-500" />}
          defaultOpen={!useCompanyDefaults}
        >
          <div className="space-y-4">
            {/* Tier badge */}
            {logoCapabilities?.canGenerate && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 text-xs font-medium rounded-full">
                <Crown className="w-3.5 h-3.5" />
                AI Generation Available
              </div>
            )}

            {/* Current Logo Preview */}
            {logoUrl && (
              <div className="relative p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Current Logo</p>
                  <div className="flex items-center gap-2">
                    {logoSource === 'company' && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                        <Building2 className="w-3 h-3" />
                        Company
                      </span>
                    )}
                    {logoSource === 'generated' && (
                      <span className="inline-flex items-center gap-1 text-xs text-purple-600">
                        <Wand2 className="w-3 h-3" />
                        AI Generated
                      </span>
                    )}
                    {logoSource === 'custom' && (
                      <span className="inline-flex items-center gap-1 text-xs text-indigo-600">
                        <Upload className="w-3 h-3" />
                        Custom
                      </span>
                    )}
                    {!useCompanyDefaults && (
                      <button
                        onClick={handleRemoveLogo}
                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                        aria-label="Remove logo"
                      >
                        <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="h-16 flex items-center justify-center bg-white rounded-lg border border-gray-100">
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            {/* Logo Source Tabs */}
            {!useCompanyDefaults && (
              <div className="space-y-3">
                {/* Company Logo Option */}
                {companyBrandKit?.logos?.fullUrl && (
                  <button
                    onClick={handleUseCompanyLogo}
                    disabled={logoSource === 'company'}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left min-h-[44px]',
                      logoSource === 'company'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                    )}
                  >
                    <div className="w-10 h-10 bg-white rounded-lg border border-gray-200 flex items-center justify-center">
                      <img
                        src={companyBrandKit.logos.fullUrl}
                        alt="Company logo"
                        className="max-h-8 max-w-8 object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Use Company Logo</p>
                      <p className="text-xs text-gray-500">Keep it consistent across all funnels</p>
                    </div>
                    {logoSource === 'company' && (
                      <Check className="w-5 h-5 text-indigo-600" />
                    )}
                  </button>
                )}

                {/* Upload Custom Logo */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Or upload a custom logo</p>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Upload logo. Drag and drop a file or click to browse."
                    aria-busy={isUploadingLogo}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      'relative cursor-pointer rounded-xl border-2 border-dashed p-6 transition-colors',
                      'hover:border-indigo-300 hover:bg-indigo-50/50',
                      'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
                      'min-h-[100px]',
                      isDragOver && 'border-indigo-500 bg-indigo-50',
                      isUploadingLogo && 'pointer-events-none opacity-50'
                    )}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ALLOWED_FILE_TYPES.join(',')}
                      onChange={handleFileChange}
                      className="hidden"
                      aria-hidden="true"
                    />
                    <div className="flex flex-col items-center justify-center text-center">
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="h-6 w-6 text-indigo-600 animate-spin mb-2" />
                          <p className="text-sm text-gray-600">Uploading...</p>
                        </>
                      ) : (
                        <>
                          <div className="mb-2 p-2 rounded-full bg-gray-100">
                            <Upload className="h-5 w-5 text-gray-500" />
                          </div>
                          <p className="text-sm font-medium text-gray-700">
                            Drop your logo here or click to upload
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            PNG, JPG, SVG, or WebP up to 5MB
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Logo Generation - Enterprise Only */}
                {logoCapabilities?.canGenerate && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-gray-200" />
                      <span className="text-xs text-gray-500 uppercase tracking-wide">Or</span>
                      <div className="h-px flex-1 bg-gray-200" />
                    </div>

                    <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                      <div className="flex items-center gap-2 mb-3">
                        <Wand2 className="w-5 h-5 text-purple-600" />
                        <h4 className="font-medium text-gray-900">AI Logo Generator</h4>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                          <Crown className="w-3 h-3" />
                          Enterprise
                        </span>
                      </div>

                      {/* Style Selection */}
                      <div className="space-y-2 mb-3">
                        <label className="block text-sm font-medium text-gray-700">Style</label>
                        <div className="grid grid-cols-3 gap-2">
                          {LOGO_STYLES.map((style) => (
                            <button
                              key={style.value}
                              type="button"
                              onClick={() => setLogoStyle(style.value)}
                              className={cn(
                                'p-2 rounded-lg border text-center transition-all text-sm',
                                logoStyle === style.value
                                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                                  : 'border-gray-200 hover:border-purple-300 text-gray-700'
                              )}
                            >
                              {style.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Industry */}
                      <div className="space-y-2 mb-3">
                        <label className="block text-sm font-medium text-gray-700">Industry</label>
                        <select
                          value={logoIndustry}
                          onChange={(e) => setLogoIndustry(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 min-h-[44px] text-sm"
                        >
                          {INDUSTRY_OPTIONS.map((industry) => (
                            <option key={industry} value={industry}>
                              {industry}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Description */}
                      <div className="space-y-2 mb-4">
                        <label className="block text-sm font-medium text-gray-700">
                          Description <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <Textarea
                          value={logoDescription}
                          onChange={(e) => setLogoDescription(e.target.value)}
                          placeholder="Describe your brand or any specific elements you want..."
                          className="min-h-[60px] text-sm"
                          rows={2}
                        />
                      </div>

                      {/* Generation Progress */}
                      {isGeneratingLogo && (
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Generating logos...</span>
                            <span className="text-purple-600">{generationProgress}%</span>
                          </div>
                          <Progress value={generationProgress} className="h-2" />
                        </div>
                      )}

                      {/* Generate Button */}
                      <Button
                        onClick={handleGenerateLogo}
                        disabled={isGeneratingLogo}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                      >
                        {isGeneratingLogo ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Logos
                          </>
                        )}
                      </Button>

                      {/* Generated Logos Grid */}
                      {generatedLogos.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Select a logo:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {generatedLogos.map((logo) => (
                              <button
                                key={logo.id}
                                onClick={() => handleSelectGeneratedLogo(logo.url)}
                                className={cn(
                                  'p-3 bg-white rounded-lg border-2 transition-all hover:shadow-md',
                                  logoUrl === logo.url
                                    ? 'border-purple-500 ring-2 ring-purple-500/20'
                                    : 'border-gray-200 hover:border-purple-300'
                                )}
                              >
                                <img
                                  src={logo.url}
                                  alt={`Generated logo option`}
                                  className="w-full h-16 object-contain"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Upgrade prompt for non-Enterprise */}
                {!logoCapabilities?.canGenerate && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Wand2 className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">AI Logo Generation</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Upgrade to Enterprise to generate unique logos with AI
                        </p>
                      </div>
                      <a
                        href="/settings/billing"
                        className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-700"
                      >
                        Upgrade
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Disabled state message */}
            {useCompanyDefaults && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <Building2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Using company logo</p>
                  <p className="mt-0.5">
                    Toggle off "Use company brand kit" above to customize this funnel's logo
                  </p>
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 space-y-3">
        {!useCompanyDefaults && hasChanges && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 p-2 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            <span>Save your changes before leaving, or they'll be lost</span>
          </div>
        )}
        <div className="flex gap-3">
          {!useCompanyDefaults && (
            <button
              onClick={() => handleToggleDefaults(true)}
              disabled={resetting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || useCompanyDefaults || !hasChanges}
            className={cn(
              'flex-1 py-2.5 rounded-xl font-medium transition-all min-h-[44px]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
              useCompanyDefaults || !hasChanges
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700',
              saving && 'opacity-50 cursor-not-allowed'
            )}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BrandingPanel;
