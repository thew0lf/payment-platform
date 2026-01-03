'use client';

/**
 * Brand Kit Step
 *
 * Second step of the onboarding wizard for setting up brand colors and fonts.
 */

import { useState, useId, useCallback, useEffect, useMemo } from 'react';
import { Check, Upload, Wand2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useOnboardingWizardStore,
  BRAND_KIT_PRESETS,
  type BrandKitData,
} from '@/stores/onboarding-wizard.store';
import { toast } from 'sonner';

// Available font options
const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter', category: 'Sans-serif' },
  { value: 'Open Sans', label: 'Open Sans', category: 'Sans-serif' },
  { value: 'Roboto', label: 'Roboto', category: 'Sans-serif' },
  { value: 'Montserrat', label: 'Montserrat', category: 'Sans-serif' },
  { value: 'Poppins', label: 'Poppins', category: 'Sans-serif' },
  { value: 'Nunito', label: 'Nunito', category: 'Sans-serif' },
  { value: 'Playfair Display', label: 'Playfair Display', category: 'Serif' },
  { value: 'Lora', label: 'Lora', category: 'Serif' },
  { value: 'Merriweather', label: 'Merriweather', category: 'Serif' },
];

// Preset metadata
const PRESET_INFO: Record<
  Exclude<BrandKitData['preset'], 'custom' | undefined>,
  { name: string; description: string; icon: string }
> = {
  minimal: {
    name: 'Minimal',
    description: 'Clean and professional',
    icon: '○',
  },
  bold: {
    name: 'Bold',
    description: 'Strong and confident',
    icon: '■',
  },
  elegant: {
    name: 'Elegant',
    description: 'Sophisticated and refined',
    icon: '◇',
  },
  playful: {
    name: 'Playful',
    description: 'Fun and energetic',
    icon: '★',
  },
};

// Color validation
const isValidHexColor = (hex: string): boolean => {
  if (!hex) return true;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
};

export function BrandKitStep() {
  const formId = useId();
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');

  const { brandKit, updateBrandKit, applyPreset, setLogoFile, logoFile } =
    useOnboardingWizardStore();

  // CRITICAL FIX: Properly manage blob URL to prevent memory leaks
  // Create URL only once per file change and clean up on unmount/change
  const logoPreviewUrl = useMemo(() => {
    if (!logoFile) return null;
    return URL.createObjectURL(logoFile);
  }, [logoFile]);

  // Cleanup blob URL on unmount or when logoFile changes
  useEffect(() => {
    return () => {
      if (logoPreviewUrl) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  // Handle preset selection
  const handlePresetSelect = useCallback(
    (preset: Exclude<BrandKitData['preset'], 'custom' | undefined>) => {
      applyPreset(preset);
      toast.success(`${PRESET_INFO[preset].name} style applied!`);
    },
    [applyPreset]
  );

  // Handle color change with validation
  const handleColorChange = useCallback(
    (colorKey: keyof BrandKitData['colors'], value: string) => {
      if (value && !isValidHexColor(value)) {
        // AVNZ voice: friendly, helpful error message
        toast.error("Hmm, that doesn't look like a hex color. Try something like #FF5500!", {
          description: 'Hex colors start with # followed by 6 letters/numbers.',
        });
        return;
      }
      updateBrandKit({ colors: { ...brandKit.colors, [colorKey]: value } });
    },
    [brandKit.colors, updateBrandKit]
  );

  // Handle logo upload
  const handleLogoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        // AVNZ voice: helpful, not blaming
        toast.error("Oops! That file type won't work for a logo.", {
          description: 'We support PNG, JPG, GIF, and SVG images.',
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        // AVNZ voice: empathetic, solution-focused
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        toast.error(`Your logo is ${sizeMB}MB—just a bit too big!`, {
          description: 'Try compressing it or using a smaller version. Max size is 5MB.',
        });
        return;
      }

      setLogoFile(file);
      toast.success('Logo uploaded! Looking good. ✨');
    },
    [setLogoFile]
  );

  return (
    <div className="space-y-6">
      {/* Tab switcher */}
      <div className="flex gap-2 rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={cn(
            'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'presets'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Wand2 className="mr-2 inline-block h-4 w-4" />
          Start with a Style
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('custom')}
          className={cn(
            'flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            activeTab === 'custom'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Customize Colors
        </button>
      </div>

      {activeTab === 'presets' ? (
        /* Presets tab */
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pick a style that matches your brand vibe. You can always tweak it later!
          </p>
          {/* MOBILE FIX: 2x2 grid on mobile, stacks nicely */}
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(PRESET_INFO) as Array<keyof typeof PRESET_INFO>).map(
              (presetKey) => {
                const preset = PRESET_INFO[presetKey];
                const config = BRAND_KIT_PRESETS[presetKey];
                const isSelected = brandKit.preset === presetKey;

                return (
                  <button
                    key={presetKey}
                    type="button"
                    onClick={() => handlePresetSelect(presetKey)}
                    className={cn(
                      // MOBILE FIX: min-h-[88px] for proper touch targets
                      'relative flex flex-col rounded-lg border p-3 sm:p-4 text-left transition-all min-h-[88px] touch-manipulation',
                      isSelected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'hover:border-primary/50 hover:bg-muted/50 active:bg-muted/70'
                    )}
                  >
                    {isSelected && (
                      <div className="absolute right-2 top-2 sm:right-3 sm:top-3">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <span className="text-xl sm:text-2xl">{preset.icon}</span>
                      <div>
                        <h4 className="font-medium text-foreground text-sm sm:text-base">
                          {preset.name}
                        </h4>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {preset.description}
                        </p>
                      </div>
                    </div>
                    {/* Color preview */}
                    <div className="flex gap-1">
                      {Object.values(config.colors).slice(0, 5).map((color, i) => (
                        <div
                          key={i}
                          className="h-3 w-3 sm:h-4 sm:w-4 rounded-full border"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </div>
      ) : (
        /* Custom colors tab */
        <div className="space-y-6">
          {/* Logo upload */}
          <div className="space-y-2">
            <Label htmlFor={`${formId}-logo`}>Logo</Label>
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed flex-shrink-0',
                  logoPreviewUrl ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                )}
              >
                {logoPreviewUrl ? (
                  <img
                    src={logoPreviewUrl}
                    alt="Logo preview"
                    className="h-12 w-12 object-contain"
                  />
                ) : (
                  <Upload className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                {/* MOBILE FIX: min-h-[44px] for touch targets */}
                <Button variant="outline" size="sm" asChild className="min-h-[44px] touch-manipulation">
                  <label htmlFor={`${formId}-logo`} className="cursor-pointer">
                    {logoPreviewUrl ? 'Change Logo' : 'Upload Logo'}
                  </label>
                </Button>
                <input
                  id={`${formId}-logo`}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="sr-only"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  PNG, JPG, or SVG up to 5MB
                </p>
              </div>
            </div>
          </div>

          {/* Color inputs - MOBILE FIX: stacks on mobile, 2-col on desktop */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {(
              [
                { key: 'primary', label: 'Primary Color', hint: 'Your main brand color' },
                { key: 'secondary', label: 'Secondary Color', hint: 'Supporting color' },
                { key: 'accent', label: 'Accent Color', hint: 'For buttons and highlights' },
                { key: 'background', label: 'Background', hint: 'Page background' },
              ] as const
            ).map(({ key, label, hint }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`${formId}-${key}`} className="text-sm font-medium">
                  {label}
                </Label>
                <div className="flex gap-2 items-center">
                  {/* Color preview - also acts as native color picker on tap (hidden) */}
                  <div className="relative">
                    <div
                      className="h-10 w-10 rounded-md border flex-shrink-0 cursor-pointer"
                      style={{ backgroundColor: brandKit.colors[key] || '#ffffff' }}
                    />
                    {/* Native color picker for mobile - overlays the preview */}
                    <input
                      type="color"
                      value={brandKit.colors[key] || '#ffffff'}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-10 h-10"
                      aria-label={`Pick ${label}`}
                    />
                  </div>
                  <Input
                    id={`${formId}-${key}`}
                    type="text"
                    placeholder="#000000"
                    value={brandKit.colors[key] || ''}
                    onChange={(e) => handleColorChange(key, e.target.value)}
                    className="font-mono min-h-[44px]"
                    aria-describedby={`${formId}-${key}-hint`}
                  />
                </div>
                <p id={`${formId}-${key}-hint`} className="text-xs text-muted-foreground">
                  {hint}
                </p>
              </div>
            ))}
          </div>

          {/* Typography */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-heading-font`}>Heading Font</Label>
              <Select
                value={brandKit.typography.headingFont}
                onValueChange={(value) =>
                  updateBrandKit({
                    typography: { ...brandKit.typography, headingFont: value },
                  })
                }
              >
                <SelectTrigger id={`${formId}-heading-font`}>
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-body-font`}>Body Font</Label>
              <Select
                value={brandKit.typography.bodyFont}
                onValueChange={(value) =>
                  updateBrandKit({
                    typography: { ...brandKit.typography, bodyFont: value },
                  })
                }
              >
                <SelectTrigger id={`${formId}-body-font`}>
                  <SelectValue placeholder="Select font" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Live preview */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">
          Live Preview
        </p>
        <div
          className="rounded-lg border p-4"
          style={{ backgroundColor: brandKit.colors.background }}
        >
          <h4
            className="text-lg font-bold mb-2"
            style={{
              color: brandKit.colors.text,
              fontFamily: brandKit.typography.headingFont,
            }}
          >
            Your Checkout Page
          </h4>
          <p
            className="text-sm mb-3"
            style={{
              color: brandKit.colors.text,
              fontFamily: brandKit.typography.bodyFont,
              opacity: 0.8,
            }}
          >
            This is how your brand will appear to customers.
          </p>
          <button
            type="button"
            className="px-4 py-2 rounded-md text-white text-sm font-medium"
            style={{ backgroundColor: brandKit.colors.primary }}
          >
            Complete Purchase
          </button>
        </div>
      </div>
    </div>
  );
}
