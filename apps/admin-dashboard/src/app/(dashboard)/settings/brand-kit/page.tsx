'use client';

import { useState, useEffect, useCallback, useId } from 'react';
import { toast } from 'sonner';
import {
  Palette,
  Type,
  Image as ImageIcon,
  Sparkles,
  Check,
  Loader2,
  Upload,
  RefreshCw,
  AlertCircle,
  Wand2,
  Eye,
  Crown,
  Zap,
  X,
  Building2,
  Paintbrush,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  brandKitApi,
  BrandKit,
  BrandKitCapabilities,
  BrandKitPreset,
  BrandKitPresetConfig,
  PRESET_METADATA,
  FONT_OPTIONS,
  LogoCapabilities,
  LogoGenerationRequest,
  LogoGenerationResult,
  GeneratedLogo,
  LogoStyle,
} from '@/lib/api/brand-kit';

// ═══════════════════════════════════════════════════════════════
// LOGO STYLE OPTIONS
// ═══════════════════════════════════════════════════════════════

const LOGO_STYLES: { value: LogoStyle; label: string; description: string }[] = [
  { value: 'modern', label: 'Modern', description: 'Clean, minimalist, contemporary' },
  { value: 'classic', label: 'Classic', description: 'Traditional, timeless, professional' },
  { value: 'playful', label: 'Playful', description: 'Fun, friendly, approachable' },
  { value: 'elegant', label: 'Elegant', description: 'Sophisticated, refined, luxurious' },
  { value: 'minimal', label: 'Minimal', description: 'Simple, essential, understated' },
  { value: 'bold', label: 'Bold', description: 'Strong, impactful, confident' },
];

const INDUSTRY_OPTIONS = [
  'Technology',
  'E-commerce',
  'Food & Beverage',
  'Health & Wellness',
  'Finance',
  'Education',
  'Entertainment',
  'Fashion',
  'Travel',
  'Real Estate',
  'Professional Services',
  'Non-profit',
  'Other',
];

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
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
      <Label htmlFor={textInputId} className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg border shadow-sm cursor-pointer relative overflow-hidden min-h-[44px] min-w-[44px]"
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
        <Input
          id={textInputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          aria-label={`${label} hex value`}
          aria-describedby={description ? descriptionId : undefined}
          className="font-mono text-sm w-28"
        />
      </div>
      {description && (
        <p id={descriptionId} className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

interface PresetCardProps {
  preset: BrandKitPreset;
  isSelected: boolean;
  isApplying: boolean;
  onSelect: () => void;
  colors: {
    primary: string;
    secondary?: string;
    accent?: string;
  };
}

function PresetCard({ preset, isSelected, isApplying, onSelect, colors }: PresetCardProps) {
  const meta = PRESET_METADATA[preset];

  return (
    <button
      onClick={onSelect}
      disabled={isApplying}
      aria-pressed={isSelected}
      aria-label={`Apply ${meta.name} preset. ${meta.description}`}
      className={cn(
        'relative p-4 rounded-xl border-2 transition-all text-left w-full min-h-[44px]',
        'hover:border-primary/50 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'touch-manipulation active:scale-[0.98]',
        isSelected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-card',
      )}
    >
      {isApplying && (
        <div className="absolute inset-0 bg-background/80 rounded-xl flex items-center justify-center z-10">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{meta.icon}</span>
          <span className="font-semibold">{meta.name}</span>
        </div>
        {isSelected && (
          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-3">{meta.description}</p>
      <div className="flex gap-1.5" role="img" aria-label={`Color palette: primary ${colors.primary}${colors.secondary ? `, secondary ${colors.secondary}` : ''}${colors.accent ? `, accent ${colors.accent}` : ''}`}>
        <div
          className="w-6 h-6 rounded-full border shadow-sm"
          style={{ backgroundColor: colors.primary }}
          aria-hidden="true"
        />
        {colors.secondary && (
          <div
            className="w-6 h-6 rounded-full border shadow-sm"
            style={{ backgroundColor: colors.secondary }}
            aria-hidden="true"
          />
        )}
        {colors.accent && (
          <div
            className="w-6 h-6 rounded-full border shadow-sm"
            style={{ backgroundColor: colors.accent }}
            aria-hidden="true"
          />
        )}
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function BrandKitSettingsPage() {
  const { selectedCompanyId, accessLevel } = useHierarchy();
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [capabilities, setCapabilities] = useState<BrandKitCapabilities | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState<BrandKitPreset | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Logo capabilities and generation state
  const [logoCapabilities, setLogoCapabilities] = useState<LogoCapabilities | null>(null);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedLogos, setGeneratedLogos] = useState<GeneratedLogo[]>([]);
  const [showLogoGenerator, setShowLogoGenerator] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [isExtractingColors, setIsExtractingColors] = useState(false);
  const [logoVariants, setLogoVariants] = useState<{ iconUrl?: string; monochromeUrl?: string } | null>(null);

  // Logo generation form
  const [logoForm, setLogoForm] = useState<LogoGenerationRequest>({
    brandName: '',
    industry: 'Technology',
    style: 'modern',
    primaryColor: undefined,
    secondaryColor: undefined,
    description: '',
  });

  // Form state
  const [logoUrl, setLogoUrl] = useState('');
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
  const [currentPreset, setCurrentPreset] = useState<BrandKitPreset | 'custom'>('minimal');

  // Preset configs
  const [presetConfigs, setPresetConfigs] = useState<Record<string, BrandKitPresetConfig>>({});

  // Needs company selection check
  const needsCompanySelection =
    (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId;

  // Load data
  const loadData = useCallback(async () => {
    if (needsCompanySelection) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [brandKitData, capabilitiesData, presetsData, logoCapabilitiesData] = await Promise.all([
        brandKitApi.get(selectedCompanyId || undefined),
        brandKitApi.getCapabilities(selectedCompanyId || undefined),
        brandKitApi.getPresets(),
        brandKitApi.getLogoCapabilities(selectedCompanyId || undefined).catch(() => null),
      ]);

      setBrandKit(brandKitData);
      setCapabilities(capabilitiesData);
      setPresetConfigs(presetsData);
      setLogoCapabilities(logoCapabilitiesData);

      // Initialize form state
      setLogoUrl(brandKitData.logos?.fullUrl || '');
      setColors({
        primary: brandKitData.colors?.primary || '#1a1a1a',
        secondary: brandKitData.colors?.secondary || '#666666',
        accent: brandKitData.colors?.accent || '#0066cc',
        background: brandKitData.colors?.background || '#ffffff',
        text: brandKitData.colors?.text || '#1a1a1a',
        success: brandKitData.colors?.success || '#008a3e',
        warning: brandKitData.colors?.warning || '#b38600',
        error: brandKitData.colors?.error || '#cc0029',
      });
      setTypography({
        headingFont: brandKitData.typography?.headingFont || 'Inter',
        bodyFont: brandKitData.typography?.bodyFont || 'Inter',
        baseFontSize: brandKitData.typography?.baseFontSize || 16,
        headingScale: brandKitData.typography?.headingScale || 1.25,
      });
      setCurrentPreset(brandKitData.preset || 'minimal');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to load brand kit:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to load brand kit. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompanyId, needsCompanySelection]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle color change
  const handleColorChange = (key: keyof typeof colors, value: string) => {
    setColors((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setCurrentPreset('custom');
  };

  // Handle typography change
  const handleTypographyChange = (key: keyof typeof typography, value: string | number) => {
    setTypography((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setCurrentPreset('custom');
  };

  // Handle logo URL change
  const handleLogoUrlChange = (value: string) => {
    setLogoUrl(value);
    setHasChanges(true);
  };

  // Apply preset
  const handleApplyPreset = async (preset: BrandKitPreset) => {
    setApplyingPreset(preset);
    try {
      const updated = await brandKitApi.applyPreset(preset, selectedCompanyId || undefined);
      setBrandKit(updated);
      setColors({
        primary: updated.colors?.primary || '#1a1a1a',
        secondary: updated.colors?.secondary || '#666666',
        accent: updated.colors?.accent || '#0066cc',
        background: updated.colors?.background || '#ffffff',
        text: updated.colors?.text || '#1a1a1a',
        success: updated.colors?.success || '#008a3e',
        warning: updated.colors?.warning || '#b38600',
        error: updated.colors?.error || '#cc0029',
      });
      setTypography({
        headingFont: updated.typography?.headingFont || 'Inter',
        bodyFont: updated.typography?.bodyFont || 'Inter',
        baseFontSize: updated.typography?.baseFontSize || 16,
        headingScale: updated.typography?.headingScale || 1.25,
      });
      setCurrentPreset(preset);
      setHasChanges(false);
      toast.success(`Applied ${PRESET_METADATA[preset].name} preset!`);
    } catch (error) {
      console.error('Failed to apply preset:', error);
      // Show the actual error message from the API if available
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to apply preset. Please try again.';
      toast.error(errorMessage);
    } finally {
      setApplyingPreset(null);
    }
  };

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await brandKitApi.update(
        {
          logos: logoUrl ? { fullUrl: logoUrl } : undefined,
          colors,
          typography,
          preset: currentPreset as BrandKitPreset,
        },
        selectedCompanyId || undefined,
      );
      setBrandKit(updated);
      setHasChanges(false);
      toast.success('Brand kit saved successfully!');
    } catch (error) {
      console.error('Failed to save brand kit:', error);
      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to save. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!logoCapabilities?.canUpload) {
      toast.error('Logo upload is not available for your plan.');
      return;
    }

    // Validate file type
    const allowedTypes = logoCapabilities?.allowedTypes || ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(`Unsupported file type. Please upload: ${allowedTypes.map(t => t.split('/')[1].toUpperCase()).join(', ')}`);
      return;
    }

    // Validate file size
    const maxSize = logoCapabilities?.maxFileSize || 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB.`);
      return;
    }

    setIsUploading(true);
    try {
      const result = await brandKitApi.uploadLogo(file, selectedCompanyId || undefined);
      setLogoUrl(result.cdnUrl || result.url);
      setHasChanges(true);
      toast.success('Logo uploaded successfully!');
    } catch (error) {
      console.error('Failed to upload logo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload logo.';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle AI logo generation
  const handleGenerateLogo = async () => {
    if (!logoCapabilities?.canGenerate) {
      toast.error('AI logo generation requires an Enterprise plan.');
      return;
    }

    if (!logoForm.brandName.trim()) {
      toast.error('Please enter your brand name.');
      return;
    }

    setIsGeneratingLogo(true);
    setGenerationProgress(0);
    setGeneratedLogos([]);

    try {
      // Add current colors to the request
      const request: LogoGenerationRequest = {
        ...logoForm,
        primaryColor: colors.primary,
        secondaryColor: colors.secondary,
      };

      const result = await brandKitApi.generateLogo(request, selectedCompanyId || undefined);

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes max
      const pollInterval = 2000;

      const poll = async () => {
        if (attempts >= maxAttempts) {
          throw new Error('Logo generation timed out. Please try again.');
        }

        const status = await brandKitApi.getLogoGenerationStatus(result.jobId, selectedCompanyId || undefined);
        setGenerationProgress(status.progress);

        if (status.status === 'COMPLETED' && status.logos) {
          setGeneratedLogos(status.logos);
          setShowLogoGenerator(false);
          toast.success('Logos generated! Select one to use as your brand logo.');
          return;
        }

        if (status.status === 'FAILED') {
          throw new Error(status.error || 'Logo generation failed.');
        }

        attempts++;
        setTimeout(poll, pollInterval);
      };

      await poll();
    } catch (error) {
      console.error('Failed to generate logo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate logo.';
      toast.error(errorMessage);
    } finally {
      setIsGeneratingLogo(false);
      setGenerationProgress(0);
    }
  };

  // Select a generated logo
  const handleSelectGeneratedLogo = (logo: GeneratedLogo) => {
    setLogoUrl(logo.url);
    setHasChanges(true);
    setGeneratedLogos([]);
    toast.success('Logo selected! Remember to save your changes.');
  };

  // Generate logo variants (icon, monochrome, etc.)
  const handleGenerateVariants = async () => {
    if (!logoUrl) {
      toast.error('Please upload a logo first.');
      return;
    }

    setIsGeneratingVariants(true);
    try {
      const variants = await brandKitApi.generateVariants(logoUrl, selectedCompanyId || undefined);

      // Store variants in state and show them
      if (variants.iconUrl || variants.monochromeUrl) {
        setLogoVariants({
          iconUrl: variants.iconUrl,
          monochromeUrl: variants.monochromeUrl,
        });
        setHasChanges(true);
        toast.success('Logo variants generated! Select one to use or save to apply all.');
      } else {
        toast.info('Variants generated but no changes detected.');
      }
    } catch (error) {
      console.error('Failed to generate variants:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate variants.';
      toast.error(errorMessage);
    } finally {
      setIsGeneratingVariants(false);
    }
  };

  // Remove background from logo
  const handleRemoveBackground = async () => {
    if (!logoUrl) {
      toast.error('Please upload a logo first.');
      return;
    }

    setIsRemovingBackground(true);
    try {
      const result = await brandKitApi.removeBackground(logoUrl, selectedCompanyId || undefined);
      setLogoUrl(result.cdnUrl || result.url);
      setHasChanges(true);
      toast.success('Background removed! Remember to save your changes.');
    } catch (error) {
      console.error('Failed to remove background:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove background.';
      toast.error(errorMessage);
    } finally {
      setIsRemovingBackground(false);
    }
  };

  // Extract colors from logo
  const handleExtractColors = async () => {
    if (!logoUrl) {
      toast.error('Please upload a logo first.');
      return;
    }

    setIsExtractingColors(true);
    try {
      const extractedColors = await brandKitApi.extractColors(logoUrl, selectedCompanyId || undefined);

      // Apply extracted colors to the form
      setColors((prev) => ({
        ...prev,
        primary: extractedColors.primary || prev.primary,
        secondary: extractedColors.secondary || prev.secondary,
        accent: extractedColors.accent || prev.accent,
        background: extractedColors.background || prev.background,
        text: extractedColors.text || prev.text,
        success: extractedColors.suggestions?.success || prev.success,
        warning: extractedColors.suggestions?.warning || prev.warning,
        error: extractedColors.suggestions?.error || prev.error,
      }));

      setHasChanges(true);
      setCurrentPreset('custom');
      toast.success('Colors extracted! Review the palette and save your changes.');
    } catch (error) {
      console.error('Failed to extract colors:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to extract colors.';
      toast.error(errorMessage);
    } finally {
      setIsExtractingColors(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Company selection required
  if (needsCompanySelection) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Select a Company</h3>
            <p className="text-sm text-muted-foreground">
              Please select a company from the dropdown above to manage its brand kit.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6" />
            Brand Kit
          </h1>
          <p className="text-muted-foreground mt-1">
            Define your brand identity. These settings apply to all funnels by default.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              Unsaved changes
            </Badge>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="min-h-[44px] touch-manipulation active:scale-[0.98]"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>

      {/* Capabilities message */}
      {capabilities?.message && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="py-4 flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Unlock More Features
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">{capabilities.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Presets Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Style Presets
          </CardTitle>
          <CardDescription>
            Quick-start with a pre-designed style. Customize further below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(['minimal', 'bold', 'elegant', 'playful'] as const).map((preset) => (
              <PresetCard
                key={preset}
                preset={preset}
                isSelected={currentPreset === preset}
                isApplying={applyingPreset === preset}
                onSelect={() => handleApplyPreset(preset)}
                colors={
                  presetConfigs[preset]?.colors || {
                    primary: '#1a1a1a',
                    secondary: '#666666',
                    accent: '#0066cc',
                  }
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Logo Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Logo
              </CardTitle>
              <CardDescription>
                Your primary logo. Upload, provide a URL, or generate with AI.
              </CardDescription>
            </div>
            {/* Tier badges */}
            <div className="flex items-center gap-2">
              {logoCapabilities?.canGenerate && (
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0">
                  <Crown className="h-3 w-3 mr-1" />
                  AI Generation
                </Badge>
              )}
              {logoCapabilities?.canProcess && !logoCapabilities?.canGenerate && (
                <Badge className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0">
                  <Zap className="h-3 w-3 mr-1" />
                  Pro Features
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Preview & Upload Area */}
          <div className="flex flex-col md:flex-row gap-6">
            {/* Current logo preview */}
            <div className="shrink-0">
              <Label className="text-sm font-medium mb-2 block">Current Logo</Label>
              <div className="w-40 h-40 rounded-xl border-2 flex items-center justify-center bg-muted/30 relative overflow-hidden">
                {logoUrl ? (
                  <>
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="max-w-full max-h-full object-contain rounded-lg p-2"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <button
                      onClick={() => {
                        setLogoUrl('');
                        setHasChanges(true);
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-destructive/90 text-destructive-foreground hover:bg-destructive transition-colors"
                      aria-label="Remove logo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <span className="text-xs">No logo set</span>
                  </div>
                )}
              </div>
            </div>

            {/* Upload / Generate Area */}
            <div className="flex-1 space-y-4">
              {/* Drag & Drop Upload */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer min-h-[160px] flex flex-col items-center justify-center',
                  isDragOver
                    ? 'border-primary bg-primary/5 scale-[1.02]'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30',
                  isUploading && 'opacity-50 pointer-events-none',
                )}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = logoCapabilities?.allowedTypes?.join(',') || 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleFileUpload(file);
                  };
                  input.click();
                }}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
                    <p className="text-sm font-medium">Uploading...</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm font-medium">
                      Drop your logo here or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, SVG, WebP up to {Math.round((logoCapabilities?.maxFileSize || 5242880) / 1024 / 1024)}MB
                    </p>
                  </>
                )}
              </div>

              {/* OR divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">or</span>
                </div>
              </div>

              {/* URL Input */}
              <div className="space-y-2">
                <Label htmlFor="logo-url" className="text-sm">Enter URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="logo-url"
                    value={logoUrl}
                    onChange={(e) => handleLogoUrlChange(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AI Logo Generation (Enterprise only) */}
          {logoCapabilities?.canGenerate && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h4 className="font-semibold">AI Logo Generator</h4>
                  {logoCapabilities.generationsRemaining !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      {logoCapabilities.generationsRemaining} generations left
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLogoGenerator(!showLogoGenerator)}
                >
                  {showLogoGenerator ? 'Hide' : 'Generate with AI'}
                </Button>
              </div>

              {showLogoGenerator && (
                <div className="bg-muted/30 rounded-xl p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand-name">Brand Name *</Label>
                      <Input
                        id="brand-name"
                        value={logoForm.brandName}
                        onChange={(e) => setLogoForm({ ...logoForm, brandName: e.target.value })}
                        placeholder="Enter your brand name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Select
                        value={logoForm.industry}
                        onValueChange={(v) => setLogoForm({ ...logoForm, industry: v })}
                      >
                        <SelectTrigger id="industry">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRY_OPTIONS.map((industry) => (
                            <SelectItem key={industry} value={industry}>
                              {industry}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Style</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                      {LOGO_STYLES.map((style) => (
                        <button
                          key={style.value}
                          onClick={() => setLogoForm({ ...logoForm, style: style.value })}
                          className={cn(
                            'p-3 rounded-lg border text-center transition-all',
                            logoForm.style === style.value
                              ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                              : 'border-border hover:border-primary/50',
                          )}
                        >
                          <Paintbrush className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-xs font-medium">{style.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      value={logoForm.description || ''}
                      onChange={(e) => setLogoForm({ ...logoForm, description: e.target.value })}
                      placeholder="Describe what you want in your logo..."
                      className="resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Colors from your brand palette will be used automatically.
                    </p>
                    <Button
                      onClick={handleGenerateLogo}
                      disabled={isGeneratingLogo || !logoForm.brandName.trim()}
                      className="gap-2"
                    >
                      {isGeneratingLogo ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4" />
                          Generate Logos
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Generation Progress */}
                  {isGeneratingLogo && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Generating logos...</span>
                        <span className="font-medium">{generationProgress}%</span>
                      </div>
                      <Progress value={generationProgress} className="h-2" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Upgrade prompt for non-Enterprise */}
          {logoCapabilities && !logoCapabilities.canGenerate && (
            <div className="pt-4 border-t">
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-4 flex items-center gap-4">
                <div className="p-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shrink-0">
                  <Crown className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">Unlock AI Logo Generation</h4>
                  <p className="text-sm text-muted-foreground">
                    Upgrade to Enterprise to create stunning logos with AI. Get unlimited generations.
                  </p>
                </div>
                <Button variant="outline" className="shrink-0">
                  Upgrade Plan
                </Button>
              </div>
            </div>
          )}

          {/* Generated Logos Selection */}
          {generatedLogos.length > 0 && (
            <div className="pt-4 border-t">
              <Label className="mb-3 block">Select a logo to use:</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {generatedLogos.map((logo) => (
                  <button
                    key={logo.id}
                    onClick={() => handleSelectGeneratedLogo(logo)}
                    className="group relative rounded-xl border-2 p-4 transition-all hover:border-primary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <img
                      src={logo.url}
                      alt={`Generated logo variant ${logo.variant}`}
                      className="w-full h-24 object-contain"
                    />
                    <div className="absolute inset-0 rounded-xl bg-primary/0 group-hover:bg-primary/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Badge className="bg-primary text-primary-foreground">
                        <Check className="h-3 w-3 mr-1" />
                        Select
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setGeneratedLogos([])}
                className="mt-3"
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Variant generation for uploaded logos (Pro+) */}
          {logoCapabilities?.canProcess && logoUrl && !generatedLogos.length && (
            <div
              className="flex items-center gap-2 pt-2"
              aria-busy={isGeneratingVariants || isRemovingBackground}
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-2 min-h-[44px] touch-manipulation"
                onClick={handleGenerateVariants}
                disabled={isGeneratingVariants || isRemovingBackground}
              >
                {isGeneratingVariants ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {isGeneratingVariants ? 'Generating...' : 'Generate Variants'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 min-h-[44px] touch-manipulation"
                onClick={handleRemoveBackground}
                disabled={isGeneratingVariants || isRemovingBackground}
              >
                {isRemovingBackground ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {isRemovingBackground ? 'Removing...' : 'Remove Background'}
              </Button>
            </div>
          )}

          {/* Display Generated Variants */}
          {logoVariants && (logoVariants.iconUrl || logoVariants.monochromeUrl) && (
            <div className="pt-4 border-t mt-4">
              <div className="flex items-center justify-between mb-3">
                <Label className="font-medium">Generated Variants</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogoVariants(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Dismiss
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Original */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center">Original</p>
                  <div className="aspect-square rounded-lg border bg-muted/30 p-2 flex items-center justify-center">
                    <img
                      src={logoUrl}
                      alt="Original logo"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
                {/* Icon Variant */}
                {logoVariants.iconUrl && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground text-center">Icon (Square)</p>
                    <button
                      onClick={() => {
                        setLogoUrl(logoVariants.iconUrl!);
                        setLogoVariants(null);
                        setHasChanges(true);
                        toast.success('Icon variant selected as main logo.');
                      }}
                      className="relative aspect-square rounded-lg border bg-muted/30 p-2 flex items-center justify-center w-full hover:border-primary hover:bg-primary/5 transition-all group"
                    >
                      <img
                        src={logoVariants.iconUrl}
                        alt="Icon variant"
                        className="max-w-full max-h-full object-contain"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 rounded-lg transition-opacity">
                        <Badge className="bg-primary text-primary-foreground">Use This</Badge>
                      </div>
                    </button>
                  </div>
                )}
                {/* Monochrome Variant */}
                {logoVariants.monochromeUrl && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground text-center">Monochrome</p>
                    <button
                      onClick={() => {
                        setLogoUrl(logoVariants.monochromeUrl!);
                        setLogoVariants(null);
                        setHasChanges(true);
                        toast.success('Monochrome variant selected as main logo.');
                      }}
                      className="relative aspect-square rounded-lg border bg-muted/30 p-2 flex items-center justify-center w-full hover:border-primary hover:bg-primary/5 transition-all group"
                    >
                      <img
                        src={logoVariants.monochromeUrl}
                        alt="Monochrome variant"
                        className="max-w-full max-h-full object-contain"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 rounded-lg transition-opacity">
                        <Badge className="bg-primary text-primary-foreground">Use This</Badge>
                      </div>
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Click a variant to use it as your main logo, or save to keep all variants in your brand kit.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Colors Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Colors
          </CardTitle>
          <CardDescription>
            Define your color palette. These colors are used throughout your funnels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
              description="CTAs & highlights"
            />
            <ColorInput
              label="Background"
              value={colors.background}
              onChange={(v) => handleColorChange('background', v)}
              description="Page background"
            />
            <ColorInput
              label="Text"
              value={colors.text}
              onChange={(v) => handleColorChange('text', v)}
              description="Body text color"
            />
            <ColorInput
              label="Success"
              value={colors.success}
              onChange={(v) => handleColorChange('success', v)}
              description="Success states"
            />
            <ColorInput
              label="Warning"
              value={colors.warning}
              onChange={(v) => handleColorChange('warning', v)}
              description="Warning states"
            />
            <ColorInput
              label="Error"
              value={colors.error}
              onChange={(v) => handleColorChange('error', v)}
              description="Error states"
            />
          </div>

          {capabilities?.canExtractColors && logoUrl && (
            <div className="mt-6 pt-6 border-t">
              <Button
                variant="outline"
                className="gap-2 min-h-[44px] touch-manipulation"
                onClick={handleExtractColors}
                disabled={isExtractingColors}
              >
                {isExtractingColors ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {isExtractingColors ? 'Extracting...' : 'Extract Colors from Logo'}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Automatically detect and apply colors from your uploaded logo.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Typography Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Typography
          </CardTitle>
          <CardDescription>Configure fonts and text sizing for your brand.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="heading-font">Heading Font</Label>
              <Select
                value={typography.headingFont}
                onValueChange={(v) => handleTypographyChange('headingFont', v)}
              >
                <SelectTrigger id="heading-font" aria-label="Select heading font">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({font.category})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="body-font">Body Font</Label>
              <Select
                value={typography.bodyFont}
                onValueChange={(v) => handleTypographyChange('bodyFont', v)}
              >
                <SelectTrigger id="body-font" aria-label="Select body font">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({font.category})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="base-font-size">Base Font Size</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="base-font-size"
                  type="number"
                  value={typography.baseFontSize}
                  onChange={(e) =>
                    handleTypographyChange('baseFontSize', parseInt(e.target.value) || 16)
                  }
                  min={12}
                  max={24}
                  aria-label="Base font size in pixels"
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground" aria-hidden="true">px</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="heading-scale">Heading Scale</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="heading-scale"
                  type="number"
                  value={typography.headingScale}
                  onChange={(e) =>
                    handleTypographyChange('headingScale', parseFloat(e.target.value) || 1.25)
                  }
                  min={1}
                  max={2}
                  step={0.05}
                  aria-label="Heading scale multiplier"
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground" aria-hidden="true">× multiplier</span>
              </div>
            </div>
          </div>

          {/* Typography preview */}
          <div className="mt-6 pt-6 border-t">
            <Label className="mb-3 block">Preview</Label>
            <div
              className="p-4 rounded-lg border bg-card"
              style={{
                fontFamily: typography.bodyFont,
                fontSize: typography.baseFontSize,
                color: colors.text,
                backgroundColor: colors.background,
              }}
            >
              <h2
                style={{
                  fontFamily: typography.headingFont,
                  fontSize: typography.baseFontSize * typography.headingScale * 1.5,
                  color: colors.primary,
                  marginBottom: '0.5rem',
                }}
              >
                Heading Example
              </h2>
              <p style={{ marginBottom: '0.5rem' }}>
                This is how your body text will appear. The quick brown fox jumps over the lazy
                dog.
              </p>
              <a
                href="#"
                style={{ color: colors.accent }}
                onClick={(e) => e.preventDefault()}
              >
                This is a link
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last updated */}
      {brandKit?.updatedAt && (
        <p className="text-xs text-muted-foreground text-center">
          Last updated: {new Date(brandKit.updatedAt).toLocaleDateString()} at{' '}
          {new Date(brandKit.updatedAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
