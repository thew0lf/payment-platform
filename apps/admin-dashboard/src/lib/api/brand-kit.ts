import { apiRequest } from '../api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface BrandKitLogo {
  fullUrl?: string;
  iconUrl?: string;
  monochromeUrl?: string;
  reversedUrl?: string;
}

export interface BrandKitColors {
  primary: string;
  secondary?: string;
  accent?: string;
  background?: string;
  text?: string;
  success?: string;
  warning?: string;
  error?: string;
}

export interface BrandKitTypography {
  headingFont?: string;
  bodyFont?: string;
  baseFontSize?: number;
  headingScale?: number;
  customFonts?: string[];
}

export interface BrandKit {
  logos: BrandKitLogo;
  colors: BrandKitColors;
  typography: BrandKitTypography;
  faviconUrl?: string;
  preset?: 'minimal' | 'bold' | 'elegant' | 'playful' | 'custom';
  updatedAt?: string;
}

export interface BrandKitCapabilities {
  canManageBrandKit: boolean;
  canExtractColors: boolean;
  canGenerateVariants: boolean;
  hasAIColorSuggestions: boolean;
  features: string[];
  message?: string;
}

export interface ExtractedColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  palette: string[];
  suggestions: {
    success: string;
    warning: string;
    error: string;
  };
}

export interface UpdateBrandKitInput {
  logos?: Partial<BrandKitLogo>;
  colors?: Partial<BrandKitColors>;
  typography?: Partial<BrandKitTypography>;
  faviconUrl?: string;
  preset?: 'minimal' | 'bold' | 'elegant' | 'playful' | 'custom';
}

export type BrandKitPreset = 'minimal' | 'bold' | 'elegant' | 'playful';

// ═══════════════════════════════════════════════════════════════
// LOGO GENERATION TYPES
// ═══════════════════════════════════════════════════════════════

export interface LogoCapabilities {
  canUpload: boolean;
  canProcess: boolean;
  canGenerate: boolean;
  generationsRemaining?: number;
  maxFileSize: number;
  allowedTypes: string[];
  processingOptions: string[];
  features: string[];
  message?: string;
}

export type LogoStyle = 'modern' | 'classic' | 'playful' | 'elegant' | 'minimal' | 'bold';
export type LogoElement = 'icon' | 'text' | 'abstract';

export interface LogoGenerationRequest {
  brandName: string;
  industry: string;
  style: LogoStyle;
  primaryColor?: string;
  secondaryColor?: string;
  elements?: LogoElement[];
  description?: string;
}

export interface GeneratedLogo {
  id: string;
  url: string;
  variant: number;
}

export interface LogoGenerationResult {
  jobId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  logos?: GeneratedLogo[];
  error?: string;
}

export interface UploadedLogo {
  key: string;
  url: string;
  cdnUrl?: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface BrandKitPresetConfig {
  colors: BrandKitColors;
  typography: BrandKitTypography;
  preset: BrandKitPreset;
}

// ═══════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const brandKitApi = {
  /**
   * Get brand kit capabilities for the company
   */
  getCapabilities: async (companyId?: string): Promise<BrandKitCapabilities> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<BrandKitCapabilities>(`/api/settings/brand-kit/capabilities${params}`);
  },

  /**
   * Get company brand kit
   */
  get: async (companyId?: string): Promise<BrandKit> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<BrandKit>(`/api/settings/brand-kit${params}`);
  },

  /**
   * Update company brand kit
   */
  update: async (data: UpdateBrandKitInput, companyId?: string): Promise<BrandKit> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.patch<BrandKit>(`/api/settings/brand-kit${params}`, data);
  },

  /**
   * Get available presets
   */
  getPresets: async (): Promise<Record<string, BrandKitPresetConfig>> => {
    return apiRequest.get<Record<string, BrandKitPresetConfig>>('/api/settings/brand-kit/presets');
  },

  /**
   * Apply a preset to the brand kit
   */
  applyPreset: async (preset: BrandKitPreset, companyId?: string): Promise<BrandKit> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<BrandKit>(`/api/settings/brand-kit/preset${params}`, { preset });
  },

  /**
   * Extract colors from a logo URL
   */
  extractColors: async (logoUrl: string, companyId?: string): Promise<ExtractedColors> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<ExtractedColors>(`/api/settings/brand-kit/extract-colors${params}`, {
      logoUrl,
    });
  },

  /**
   * Generate logo variants from a base logo
   */
  generateVariants: async (baseLogoUrl: string, companyId?: string): Promise<BrandKitLogo> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<BrandKitLogo>(`/api/settings/brand-kit/generate-variants${params}`, {
      baseLogoUrl,
    });
  },

  /**
   * Get logo capabilities (upload, process, generate)
   */
  getLogoCapabilities: async (companyId?: string): Promise<LogoCapabilities> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<LogoCapabilities>(`/api/funnels/logo/capabilities${params}`);
  },

  /**
   * Generate logo with AI
   */
  generateLogo: async (request: LogoGenerationRequest, companyId?: string): Promise<LogoGenerationResult> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<LogoGenerationResult>(`/api/funnels/logo/generate${params}`, request);
  },

  /**
   * Check logo generation job status
   */
  getLogoGenerationStatus: async (jobId: string, companyId?: string): Promise<LogoGenerationResult> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<LogoGenerationResult>(`/api/funnels/logo/generate/${jobId}${params}`);
  },

  /**
   * Upload a logo file
   */
  uploadLogo: async (file: File, companyId?: string): Promise<UploadedLogo> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    const formData = new FormData();
    formData.append('file', file);

    return apiRequest.upload<UploadedLogo>(`/api/settings/brand-kit/upload-logo${params}`, formData);
  },

  /**
   * Remove background from a logo
   */
  removeBackground: async (logoUrl: string, companyId?: string): Promise<UploadedLogo> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<UploadedLogo>(`/api/settings/brand-kit/remove-background${params}`, {
      logoUrl,
    });
  },
};

// ═══════════════════════════════════════════════════════════════
// PRESET METADATA (for UI display)
// ═══════════════════════════════════════════════════════════════

export const PRESET_METADATA: Record<
  BrandKitPreset,
  {
    name: string;
    description: string;
    icon: string;
  }
> = {
  minimal: {
    name: 'Minimal',
    description: 'Clean and understated. Perfect for professional brands.',
    icon: '○',
  },
  bold: {
    name: 'Bold',
    description: 'Strong and confident. Makes a statement.',
    icon: '■',
  },
  elegant: {
    name: 'Elegant',
    description: 'Sophisticated and refined. Timeless appeal.',
    icon: '◇',
  },
  playful: {
    name: 'Playful',
    description: 'Fun and energetic. Great for creative brands.',
    icon: '★',
  },
};

// ═══════════════════════════════════════════════════════════════
// FONT OPTIONS
// ═══════════════════════════════════════════════════════════════

export const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter', category: 'Sans-serif' },
  { value: 'Open Sans', label: 'Open Sans', category: 'Sans-serif' },
  { value: 'Roboto', label: 'Roboto', category: 'Sans-serif' },
  { value: 'Montserrat', label: 'Montserrat', category: 'Sans-serif' },
  { value: 'Poppins', label: 'Poppins', category: 'Sans-serif' },
  { value: 'Nunito', label: 'Nunito', category: 'Sans-serif' },
  { value: 'Lato', label: 'Lato', category: 'Sans-serif' },
  { value: 'Playfair Display', label: 'Playfair Display', category: 'Serif' },
  { value: 'Lora', label: 'Lora', category: 'Serif' },
  { value: 'Merriweather', label: 'Merriweather', category: 'Serif' },
  { value: 'Georgia', label: 'Georgia', category: 'Serif' },
  { value: 'Source Code Pro', label: 'Source Code Pro', category: 'Monospace' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono', category: 'Monospace' },
];

// ═══════════════════════════════════════════════════════════════
// FUNNEL BRAND KIT API (Funnel-level overrides)
// ═══════════════════════════════════════════════════════════════

export interface FunnelBrandKitResponse {
  brandKit: BrandKit | null;
  useCompanyDefaults: boolean;
  companyBrandKit?: BrandKit;
}

export const funnelBrandKitApi = {
  /**
   * Get brand kit capabilities for a funnel
   */
  getCapabilities: async (funnelId: string, companyId?: string): Promise<BrandKitCapabilities> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<BrandKitCapabilities>(`/api/funnels/${funnelId}/brand-kit/capabilities${params}`);
  },

  /**
   * Get funnel brand kit (or null if using company defaults)
   */
  get: async (funnelId: string, companyId?: string): Promise<BrandKit | null> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.get<BrandKit | null>(`/api/funnels/${funnelId}/brand-kit${params}`);
  },

  /**
   * Update funnel brand kit
   */
  update: async (funnelId: string, data: UpdateBrandKitInput, companyId?: string): Promise<BrandKit> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.patch<BrandKit>(`/api/funnels/${funnelId}/brand-kit${params}`, data);
  },

  /**
   * Reset funnel brand kit to use company defaults
   */
  reset: async (funnelId: string, companyId?: string): Promise<void> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    await apiRequest.delete(`/api/funnels/${funnelId}/brand-kit${params}`);
  },

  /**
   * Apply a preset to the funnel brand kit
   */
  applyPreset: async (funnelId: string, preset: BrandKitPreset, companyId?: string): Promise<BrandKit> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<BrandKit>(`/api/funnels/${funnelId}/brand-kit/preset${params}`, { preset });
  },

  /**
   * Extract colors from a logo URL for a funnel
   */
  extractColors: async (funnelId: string, logoUrl: string, companyId?: string): Promise<ExtractedColors> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<ExtractedColors>(`/api/funnels/${funnelId}/brand-kit/extract-colors${params}`, {
      logoUrl,
    });
  },

  /**
   * Generate logo variants for a funnel
   */
  generateVariants: async (funnelId: string, baseLogoUrl: string, companyId?: string): Promise<BrandKitLogo> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return apiRequest.post<BrandKitLogo>(`/api/funnels/${funnelId}/brand-kit/generate-variants${params}`, {
      baseLogoUrl,
    });
  },
};
