/**
 * Company Onboarding Wizard State Store
 *
 * Manages the multi-step onboarding wizard state for new companies:
 * - Welcome step
 * - Brand Kit setup
 * - Completion
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ═══════════════════════════════════════════════════════════════
// WIZARD STEP DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export type OnboardingStep = 'welcome' | 'brand-kit' | 'complete';

export const ONBOARDING_STEPS: {
  id: OnboardingStep;
  label: string;
  description: string;
}[] = [
  { id: 'welcome', label: 'Welcome', description: "Let's get you set up" },
  { id: 'brand-kit', label: 'Branding', description: 'Make it yours' },
  { id: 'complete', label: 'Ready!', description: "You're all set" },
];

export const getStepIndex = (step: OnboardingStep): number => {
  return ONBOARDING_STEPS.findIndex((s) => s.id === step);
};

export const getStepById = (step: OnboardingStep) => {
  return ONBOARDING_STEPS.find((s) => s.id === step);
};

// ═══════════════════════════════════════════════════════════════
// BRAND KIT DATA TYPES
// ═══════════════════════════════════════════════════════════════

export interface BrandKitColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface BrandKitTypography {
  headingFont: string;
  bodyFont: string;
}

export interface BrandKitData {
  logoUrl?: string;
  faviconUrl?: string;
  colors: BrandKitColors;
  typography: BrandKitTypography;
  preset?: 'minimal' | 'bold' | 'elegant' | 'playful' | 'custom';
}

/** Input type for updateBrandKit - allows partial color/typography updates */
export interface BrandKitUpdateInput {
  logoUrl?: string;
  faviconUrl?: string;
  colors?: Partial<BrandKitColors>;
  typography?: Partial<BrandKitTypography>;
  preset?: BrandKitData['preset'];
}

// ═══════════════════════════════════════════════════════════════
// WIZARD STATE TYPES
// ═══════════════════════════════════════════════════════════════

export interface OnboardingState {
  // Navigation
  currentStep: OnboardingStep;
  completedSteps: Set<OnboardingStep>;
  isWizardOpen: boolean;

  // Brand Kit data
  brandKit: BrandKitData;
  logoFile: File | null;
  faviconFile: File | null;

  // Completion tracking
  hasCompletedOnboarding: boolean;
  skippedOnboarding: boolean;
  onboardingCompletedAt: string | null;

  // Loading/error states
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

export interface OnboardingActions {
  // Navigation
  openWizard: () => void;
  closeWizard: () => void;
  resetWizard: () => void;
  goToStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  markStepComplete: (step: OnboardingStep) => void;
  canNavigateTo: (step: OnboardingStep) => boolean;

  // Brand Kit
  updateBrandKit: (data: BrandKitUpdateInput) => void;
  setLogoFile: (file: File | null) => void;
  setFaviconFile: (file: File | null) => void;
  applyPreset: (preset: BrandKitData['preset']) => void;

  // Completion
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  resetOnboardingStatus: () => void;

  // Loading/error
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
}

// ═══════════════════════════════════════════════════════════════
// PRESET CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

export const BRAND_KIT_PRESETS: Record<
  NonNullable<BrandKitData['preset']>,
  Omit<BrandKitData, 'logoUrl' | 'faviconUrl'>
> = {
  minimal: {
    colors: {
      primary: '#1a1a1a',
      secondary: '#666666',
      accent: '#0066cc',
      background: '#ffffff',
      text: '#1a1a1a',
    },
    typography: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
    },
    preset: 'minimal',
  },
  bold: {
    colors: {
      primary: '#000000',
      secondary: '#ff4444',
      accent: '#ffcc00',
      background: '#ffffff',
      text: '#000000',
    },
    typography: {
      headingFont: 'Montserrat',
      bodyFont: 'Open Sans',
    },
    preset: 'bold',
  },
  elegant: {
    colors: {
      primary: '#2c3e50',
      secondary: '#8e44ad',
      accent: '#d4af37',
      background: '#fdfbf7',
      text: '#2c3e50',
    },
    typography: {
      headingFont: 'Playfair Display',
      bodyFont: 'Lora',
    },
    preset: 'elegant',
  },
  playful: {
    colors: {
      primary: '#6366f1',
      secondary: '#ec4899',
      accent: '#fbbf24',
      background: '#ffffff',
      text: '#1f2937',
    },
    typography: {
      headingFont: 'Poppins',
      bodyFont: 'Nunito',
    },
    preset: 'playful',
  },
  custom: {
    colors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      accent: '#10b981',
      background: '#ffffff',
      text: '#0f172a',
    },
    typography: {
      headingFont: 'Inter',
      bodyFont: 'Inter',
    },
    preset: 'custom',
  },
};

// ═══════════════════════════════════════════════════════════════
// INITIAL STATE
// ═══════════════════════════════════════════════════════════════

const initialState: OnboardingState = {
  currentStep: 'welcome',
  completedSteps: new Set(),
  isWizardOpen: false,
  brandKit: BRAND_KIT_PRESETS.minimal,
  logoFile: null,
  faviconFile: null,
  hasCompletedOnboarding: false,
  skippedOnboarding: false,
  onboardingCompletedAt: null,
  isLoading: false,
  isSaving: false,
  error: null,
};

// ═══════════════════════════════════════════════════════════════
// STORE DEFINITION
// ═══════════════════════════════════════════════════════════════

export const useOnboardingWizardStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ─────────────────────────────────────────────────────────────
      // NAVIGATION
      // ─────────────────────────────────────────────────────────────

      openWizard: () => set({ isWizardOpen: true, error: null }),

      closeWizard: () => set({ isWizardOpen: false }),

      resetWizard: () =>
        set({
          ...initialState,
          // Preserve completion status
          hasCompletedOnboarding: get().hasCompletedOnboarding,
          skippedOnboarding: get().skippedOnboarding,
          onboardingCompletedAt: get().onboardingCompletedAt,
        }),

      goToStep: (step: OnboardingStep) => {
        const state = get();
        if (state.canNavigateTo(step)) {
          set({ currentStep: step, error: null });
        }
      },

      nextStep: () => {
        const state = get();
        const currentIndex = getStepIndex(state.currentStep);
        if (currentIndex < ONBOARDING_STEPS.length - 1) {
          const nextStep = ONBOARDING_STEPS[currentIndex + 1].id;
          set({
            currentStep: nextStep,
            completedSteps: new Set([...state.completedSteps, state.currentStep]),
            error: null,
          });
        }
      },

      prevStep: () => {
        const state = get();
        const currentIndex = getStepIndex(state.currentStep);
        if (currentIndex > 0) {
          set({
            currentStep: ONBOARDING_STEPS[currentIndex - 1].id,
            error: null,
          });
        }
      },

      markStepComplete: (step: OnboardingStep) => {
        const state = get();
        set({ completedSteps: new Set([...state.completedSteps, step]) });
      },

      canNavigateTo: (step: OnboardingStep): boolean => {
        const state = get();
        const targetIndex = getStepIndex(step);
        const currentIndex = getStepIndex(state.currentStep);

        // Can always go back
        if (targetIndex <= currentIndex) return true;

        // Can only go forward if all previous steps are complete
        for (let i = 0; i < targetIndex; i++) {
          if (!state.completedSteps.has(ONBOARDING_STEPS[i].id)) {
            return false;
          }
        }
        return true;
      },

      // ─────────────────────────────────────────────────────────────
      // BRAND KIT
      // ─────────────────────────────────────────────────────────────

      updateBrandKit: (data: BrandKitUpdateInput) => {
        const state = get();
        set({
          brandKit: {
            ...state.brandKit,
            ...data,
            colors: {
              ...state.brandKit.colors,
              ...(data.colors || {}),
            },
            typography: {
              ...state.brandKit.typography,
              ...(data.typography || {}),
            },
            preset: 'custom', // Mark as custom when user makes changes
          },
        });
      },

      setLogoFile: (file: File | null) => set({ logoFile: file }),

      setFaviconFile: (file: File | null) => set({ faviconFile: file }),

      applyPreset: (preset: BrandKitData['preset']) => {
        if (!preset || preset === 'custom') return;
        const presetConfig = BRAND_KIT_PRESETS[preset];
        const state = get();
        set({
          brandKit: {
            ...state.brandKit,
            ...presetConfig,
            // Preserve uploaded assets
            logoUrl: state.brandKit.logoUrl,
            faviconUrl: state.brandKit.faviconUrl,
          },
        });
      },

      // ─────────────────────────────────────────────────────────────
      // COMPLETION
      // ─────────────────────────────────────────────────────────────

      completeOnboarding: () =>
        set({
          hasCompletedOnboarding: true,
          skippedOnboarding: false,
          onboardingCompletedAt: new Date().toISOString(),
          isWizardOpen: false,
          completedSteps: new Set(ONBOARDING_STEPS.map((s) => s.id)),
        }),

      skipOnboarding: () =>
        set({
          hasCompletedOnboarding: false,
          skippedOnboarding: true,
          isWizardOpen: false,
        }),

      resetOnboardingStatus: () =>
        set({
          hasCompletedOnboarding: false,
          skippedOnboarding: false,
          onboardingCompletedAt: null,
        }),

      // ─────────────────────────────────────────────────────────────
      // LOADING / ERROR
      // ─────────────────────────────────────────────────────────────

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      setSaving: (saving: boolean) => set({ isSaving: saving }),

      setError: (error: string | null) => set({ error }),
    }),
    {
      name: 'onboarding-wizard-state',
      version: 1,
      storage: createJSONStorage(() => localStorage), // Use localStorage for persistence
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        skippedOnboarding: state.skippedOnboarding,
        onboardingCompletedAt: state.onboardingCompletedAt,
        brandKit: state.brandKit,
        completedSteps: Array.from(state.completedSteps),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.completedSteps = new Set(
            state.completedSteps as unknown as OnboardingStep[]
          );
        }
      },
    }
  )
);

// ═══════════════════════════════════════════════════════════════
// SELECTOR HOOKS
// ═══════════════════════════════════════════════════════════════

/** Check if onboarding should be shown */
export const useShouldShowOnboarding = () =>
  useOnboardingWizardStore(
    (state) => !state.hasCompletedOnboarding && !state.skippedOnboarding
  );

/** Get current step info */
export const useCurrentOnboardingStep = () =>
  useOnboardingWizardStore((state) => ({
    step: state.currentStep,
    index: getStepIndex(state.currentStep),
    info: getStepById(state.currentStep),
  }));

/** Get navigation state */
export const useOnboardingNavigation = () =>
  useOnboardingWizardStore((state) => ({
    currentStep: state.currentStep,
    completedSteps: state.completedSteps,
    canGoBack: getStepIndex(state.currentStep) > 0,
    canGoForward: getStepIndex(state.currentStep) < ONBOARDING_STEPS.length - 1,
    isFirstStep: getStepIndex(state.currentStep) === 0,
    isLastStep: getStepIndex(state.currentStep) === ONBOARDING_STEPS.length - 1,
    goToStep: state.goToStep,
    nextStep: state.nextStep,
    prevStep: state.prevStep,
  }));

/** Get brand kit state */
export const useOnboardingBrandKit = () =>
  useOnboardingWizardStore((state) => ({
    brandKit: state.brandKit,
    logoFile: state.logoFile,
    faviconFile: state.faviconFile,
    updateBrandKit: state.updateBrandKit,
    setLogoFile: state.setLogoFile,
    setFaviconFile: state.setFaviconFile,
    applyPreset: state.applyPreset,
  }));
