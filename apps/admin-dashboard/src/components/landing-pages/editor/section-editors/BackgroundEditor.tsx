'use client';

import { useState, useCallback } from 'react';
import { Image, Palette, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { SectionStyles } from '@/lib/api/landing-pages';

export type BackgroundType = 'default' | 'color' | 'image';

export interface BackgroundEditorProps {
  styles?: SectionStyles;
  onStyleUpdate: (styles: Partial<SectionStyles>) => void;
  defaultBackground?: string; // Default from theme
}

// Common preset colors
const PRESET_COLORS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Light Gray', value: '#f5f5f5' },
  { name: 'Gray', value: '#e5e5e5' },
  { name: 'Dark', value: '#18181b' },
  { name: 'Slate', value: '#1e293b' },
  { name: 'Blue', value: '#1e40af' },
  { name: 'Indigo', value: '#3730a3' },
  { name: 'Purple', value: '#6b21a8' },
  { name: 'Green', value: '#166534' },
  { name: 'Teal', value: '#115e59' },
  { name: 'Orange', value: '#c2410c' },
  { name: 'Red', value: '#b91c1c' },
];

// Overlay opacity presets
const OVERLAY_PRESETS = [
  { name: 'None', value: '' },
  { name: 'Light', value: 'rgba(0,0,0,0.2)' },
  { name: 'Medium', value: 'rgba(0,0,0,0.4)' },
  { name: 'Dark', value: 'rgba(0,0,0,0.6)' },
  { name: 'Heavy', value: 'rgba(0,0,0,0.8)' },
];

export function BackgroundEditor({ styles, onStyleUpdate, defaultBackground }: BackgroundEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showCustomColor, setShowCustomColor] = useState(false);

  // Determine current background type
  const getBackgroundType = useCallback((): BackgroundType => {
    if (styles?.backgroundImage) return 'image';
    if (styles?.backgroundColor) return 'color';
    return 'default';
  }, [styles]);

  const [backgroundType, setBackgroundType] = useState<BackgroundType>(getBackgroundType());

  const handleTypeChange = (type: BackgroundType) => {
    setBackgroundType(type);

    if (type === 'default') {
      // Clear all background styles to use theme default
      onStyleUpdate({
        backgroundColor: undefined,
        backgroundImage: undefined,
        backgroundOverlay: undefined,
      });
    } else if (type === 'color') {
      // Set a default color, clear image
      onStyleUpdate({
        backgroundColor: styles?.backgroundColor || '#ffffff',
        backgroundImage: undefined,
        backgroundOverlay: undefined,
      });
    } else if (type === 'image') {
      // Keep or initialize image URL
      onStyleUpdate({
        backgroundColor: undefined,
        backgroundImage: styles?.backgroundImage || '',
        backgroundOverlay: styles?.backgroundOverlay || 'rgba(0,0,0,0.4)',
      });
    }
  };

  const handleColorChange = (color: string) => {
    onStyleUpdate({ backgroundColor: color });
  };

  const handleImageChange = (url: string) => {
    onStyleUpdate({ backgroundImage: url });
  };

  const handleOverlayChange = (overlay: string) => {
    onStyleUpdate({ backgroundOverlay: overlay || undefined });
  };

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/50 hover:bg-muted transition-colors"
      >
        <span className="text-sm font-medium text-foreground">Background</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="p-3 space-y-4 border-t border-border">
          {/* Background Type Selection */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleTypeChange('default')}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-colors ${
                backgroundType === 'default'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                  : 'bg-muted border-border text-muted-foreground hover:border-border'
              }`}
            >
              <RotateCcw className="h-4 w-4" />
              <span className="text-xs font-medium">Default</span>
            </button>
            <button
              onClick={() => handleTypeChange('color')}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-colors ${
                backgroundType === 'color'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                  : 'bg-muted border-border text-muted-foreground hover:border-border'
              }`}
            >
              <Palette className="h-4 w-4" />
              <span className="text-xs font-medium">Color</span>
            </button>
            <button
              onClick={() => handleTypeChange('image')}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-colors ${
                backgroundType === 'image'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                  : 'bg-muted border-border text-muted-foreground hover:border-border'
              }`}
            >
              <Image className="h-4 w-4" />
              <span className="text-xs font-medium">Image</span>
            </button>
          </div>

          {/* Default Type Info */}
          {backgroundType === 'default' && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2.5">
              Uses the theme's default background color for this section type.
              {defaultBackground && (
                <div className="flex items-center gap-2 mt-2">
                  <span>Current default:</span>
                  <div
                    className="w-4 h-4 rounded border border-border"
                    style={{ backgroundColor: defaultBackground }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Color Picker */}
          {backgroundType === 'color' && (
            <div className="space-y-3">
              {/* Preset Colors Grid */}
              <div>
                <label className="block text-xs text-muted-foreground mb-2">Preset Colors</label>
                <div className="grid grid-cols-6 gap-1.5">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => handleColorChange(preset.value)}
                      className={`w-full aspect-square rounded-md border-2 transition-all ${
                        styles?.backgroundColor === preset.value
                          ? 'border-blue-500 scale-110'
                          : 'border-transparent hover:border-border'
                      }`}
                      style={{ backgroundColor: preset.value }}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>

              {/* Custom Color Input */}
              <div>
                <button
                  onClick={() => setShowCustomColor(!showCustomColor)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {showCustomColor ? 'Hide' : 'Show'} custom color
                </button>

                {showCustomColor && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="color"
                      value={styles?.backgroundColor || '#ffffff'}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="w-10 h-8 rounded cursor-pointer border border-border"
                    />
                    <input
                      type="text"
                      value={styles?.backgroundColor || ''}
                      onChange={(e) => handleColorChange(e.target.value)}
                      className="flex-1 px-2 py-1 bg-muted border border-border rounded text-foreground text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="#ffffff or rgb(255,255,255)"
                    />
                  </div>
                )}
              </div>

              {/* Preview */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Preview</label>
                <div
                  className="h-12 rounded-lg border border-border"
                  style={{ backgroundColor: styles?.backgroundColor || '#ffffff' }}
                />
              </div>
            </div>
          )}

          {/* Image Settings */}
          {backgroundType === 'image' && (
            <div className="space-y-3">
              {/* Image URL Input */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Image URL</label>
                <input
                  type="text"
                  value={styles?.backgroundImage || ''}
                  onChange={(e) => handleImageChange(e.target.value)}
                  className="w-full px-2.5 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="https://images.unsplash.com/..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use high-resolution images (1920px+ width recommended)
                </p>
              </div>

              {/* Overlay Selection */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Overlay Darkness</label>
                <div className="flex gap-1.5">
                  {OVERLAY_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleOverlayChange(preset.value)}
                      className={`flex-1 py-1.5 px-1 text-xs rounded transition-colors ${
                        (styles?.backgroundOverlay || '') === preset.value
                          ? 'bg-blue-600 text-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Overlay Input */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Custom Overlay (optional)</label>
                <input
                  type="text"
                  value={styles?.backgroundOverlay || ''}
                  onChange={(e) => handleOverlayChange(e.target.value)}
                  className="w-full px-2.5 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="rgba(0,0,0,0.5) or linear-gradient(...)"
                />
              </div>

              {/* Preview */}
              {styles?.backgroundImage && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Preview</label>
                  <div
                    className="h-24 rounded-lg border border-border bg-cover bg-center relative overflow-hidden"
                    style={{ backgroundImage: `url(${styles.backgroundImage})` }}
                  >
                    {styles?.backgroundOverlay && (
                      <div
                        className="absolute inset-0"
                        style={{ background: styles.backgroundOverlay }}
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-foreground text-xs font-medium bg-black/50 px-2 py-1 rounded">
                        Sample text
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
