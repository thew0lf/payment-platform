/**
 * Onboarding Wizard Store Tests
 *
 * Tests for the onboarding wizard state management.
 */

import {
  useOnboardingWizardStore,
  ONBOARDING_STEPS,
  BRAND_KIT_PRESETS,
  getStepIndex,
  getStepById,
  type OnboardingStep,
} from './onboarding-wizard.store';

describe('Onboarding Wizard Store', () => {
  // Reset store before each test
  beforeEach(() => {
    const store = useOnboardingWizardStore.getState();
    store.resetWizard();
    store.resetOnboardingStatus();
    store.closeWizard();
  });

  // ═══════════════════════════════════════════════════════════════
  // UTILITY FUNCTION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getStepIndex', () => {
    it('returns correct index for each step', () => {
      expect(getStepIndex('welcome')).toBe(0);
      expect(getStepIndex('brand-kit')).toBe(1);
      expect(getStepIndex('complete')).toBe(2);
    });

    it('returns -1 for unknown step', () => {
      expect(getStepIndex('unknown' as OnboardingStep)).toBe(-1);
    });
  });

  describe('getStepById', () => {
    it('returns step info for valid step', () => {
      const step = getStepById('welcome');
      expect(step).toBeDefined();
      expect(step?.id).toBe('welcome');
      expect(step?.label).toBe('Welcome');
    });

    it('returns undefined for unknown step', () => {
      expect(getStepById('unknown' as OnboardingStep)).toBeUndefined();
    });
  });

  describe('ONBOARDING_STEPS', () => {
    it('has correct number of steps', () => {
      expect(ONBOARDING_STEPS.length).toBe(3);
    });

    it('has all required properties', () => {
      ONBOARDING_STEPS.forEach((step) => {
        expect(step.id).toBeDefined();
        expect(step.label).toBeDefined();
        expect(step.description).toBeDefined();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // NAVIGATION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Navigation', () => {
    it('starts at welcome step', () => {
      const state = useOnboardingWizardStore.getState();
      expect(state.currentStep).toBe('welcome');
    });

    it('opens and closes wizard', () => {
      const store = useOnboardingWizardStore.getState();

      store.openWizard();
      expect(useOnboardingWizardStore.getState().isWizardOpen).toBe(true);

      store.closeWizard();
      expect(useOnboardingWizardStore.getState().isWizardOpen).toBe(false);
    });

    it('advances to next step', () => {
      const store = useOnboardingWizardStore.getState();

      store.nextStep();
      expect(useOnboardingWizardStore.getState().currentStep).toBe('brand-kit');
      expect(useOnboardingWizardStore.getState().completedSteps.has('welcome')).toBe(true);
    });

    it('goes back to previous step', () => {
      const store = useOnboardingWizardStore.getState();

      store.nextStep(); // Go to brand-kit
      store.prevStep(); // Back to welcome
      expect(useOnboardingWizardStore.getState().currentStep).toBe('welcome');
    });

    it('does not go before first step', () => {
      const store = useOnboardingWizardStore.getState();

      store.prevStep();
      expect(useOnboardingWizardStore.getState().currentStep).toBe('welcome');
    });

    it('does not go past last step', () => {
      const store = useOnboardingWizardStore.getState();

      // Navigate to last step
      for (let i = 0; i < ONBOARDING_STEPS.length; i++) {
        store.nextStep();
      }
      expect(useOnboardingWizardStore.getState().currentStep).toBe('complete');

      // Try to go further
      store.nextStep();
      expect(useOnboardingWizardStore.getState().currentStep).toBe('complete');
    });

    it('marks steps as complete', () => {
      const store = useOnboardingWizardStore.getState();

      store.markStepComplete('welcome');
      expect(useOnboardingWizardStore.getState().completedSteps.has('welcome')).toBe(true);
    });

    it('navigates to specific step when allowed', () => {
      const store = useOnboardingWizardStore.getState();

      // Complete first step
      store.markStepComplete('welcome');

      // Can navigate to step 2
      store.goToStep('brand-kit');
      expect(useOnboardingWizardStore.getState().currentStep).toBe('brand-kit');
    });

    it('cannot navigate to step if previous steps not complete', () => {
      const store = useOnboardingWizardStore.getState();

      // Try to skip to complete without completing earlier steps
      store.goToStep('complete');
      expect(useOnboardingWizardStore.getState().currentStep).toBe('welcome');
    });

    it('resets wizard state', () => {
      const store = useOnboardingWizardStore.getState();

      // Set up some state
      store.openWizard();
      store.nextStep();

      // Reset
      store.resetWizard();

      const state = useOnboardingWizardStore.getState();
      expect(state.currentStep).toBe('welcome');
      expect(state.completedSteps.size).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // BRAND KIT TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Brand Kit', () => {
    it('starts with minimal preset', () => {
      const state = useOnboardingWizardStore.getState();
      expect(state.brandKit.preset).toBe('minimal');
      expect(state.brandKit.colors.primary).toBe('#1a1a1a');
    });

    it('updates brand kit and marks as custom', () => {
      const store = useOnboardingWizardStore.getState();

      store.updateBrandKit({ colors: { primary: '#ff0000' } });

      const state = useOnboardingWizardStore.getState();
      expect(state.brandKit.colors.primary).toBe('#ff0000');
      expect(state.brandKit.preset).toBe('custom');
    });

    it('preserves other color values when updating', () => {
      const store = useOnboardingWizardStore.getState();
      const originalSecondary = store.brandKit.colors.secondary;

      store.updateBrandKit({ colors: { primary: '#ff0000' } });

      expect(useOnboardingWizardStore.getState().brandKit.colors.secondary).toBe(
        originalSecondary
      );
    });

    it('applies preset configuration', () => {
      const store = useOnboardingWizardStore.getState();

      store.applyPreset('bold');

      const state = useOnboardingWizardStore.getState();
      expect(state.brandKit.preset).toBe('bold');
      expect(state.brandKit.colors.primary).toBe(BRAND_KIT_PRESETS.bold.colors.primary);
      expect(state.brandKit.typography.headingFont).toBe(
        BRAND_KIT_PRESETS.bold.typography.headingFont
      );
    });

    it('preserves logo URLs when applying preset', () => {
      const store = useOnboardingWizardStore.getState();

      store.updateBrandKit({ logoUrl: 'https://example.com/logo.png' });
      store.applyPreset('elegant');

      expect(useOnboardingWizardStore.getState().brandKit.logoUrl).toBe(
        'https://example.com/logo.png'
      );
    });

    it('stores logo file reference', () => {
      const store = useOnboardingWizardStore.getState();
      const mockFile = new File([''], 'logo.png', { type: 'image/png' });

      store.setLogoFile(mockFile);

      expect(useOnboardingWizardStore.getState().logoFile).toBe(mockFile);
    });

    it('stores favicon file reference', () => {
      const store = useOnboardingWizardStore.getState();
      const mockFile = new File([''], 'favicon.ico', { type: 'image/x-icon' });

      store.setFaviconFile(mockFile);

      expect(useOnboardingWizardStore.getState().faviconFile).toBe(mockFile);
    });

    it('does not apply preset when preset is custom', () => {
      const store = useOnboardingWizardStore.getState();
      const originalState = { ...store.brandKit };

      store.applyPreset('custom');

      // Colors should not change
      expect(useOnboardingWizardStore.getState().brandKit.colors.primary).toBe(
        originalState.colors.primary
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // COMPLETION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Completion', () => {
    it('completes onboarding', () => {
      const store = useOnboardingWizardStore.getState();

      store.completeOnboarding();

      const state = useOnboardingWizardStore.getState();
      expect(state.hasCompletedOnboarding).toBe(true);
      expect(state.skippedOnboarding).toBe(false);
      expect(state.onboardingCompletedAt).toBeTruthy();
      expect(state.isWizardOpen).toBe(false);
    });

    it('skips onboarding', () => {
      const store = useOnboardingWizardStore.getState();

      store.skipOnboarding();

      const state = useOnboardingWizardStore.getState();
      expect(state.hasCompletedOnboarding).toBe(false);
      expect(state.skippedOnboarding).toBe(true);
      expect(state.isWizardOpen).toBe(false);
    });

    it('resets onboarding status', () => {
      const store = useOnboardingWizardStore.getState();

      store.completeOnboarding();
      store.resetOnboardingStatus();

      const state = useOnboardingWizardStore.getState();
      expect(state.hasCompletedOnboarding).toBe(false);
      expect(state.skippedOnboarding).toBe(false);
      expect(state.onboardingCompletedAt).toBeNull();
    });

    it('preserves completion status on resetWizard', () => {
      const store = useOnboardingWizardStore.getState();

      store.completeOnboarding();
      store.resetWizard();

      expect(useOnboardingWizardStore.getState().hasCompletedOnboarding).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // LOADING STATE TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Loading and Error States', () => {
    it('sets loading state', () => {
      const store = useOnboardingWizardStore.getState();

      store.setLoading(true);
      expect(useOnboardingWizardStore.getState().isLoading).toBe(true);

      store.setLoading(false);
      expect(useOnboardingWizardStore.getState().isLoading).toBe(false);
    });

    it('sets saving state', () => {
      const store = useOnboardingWizardStore.getState();

      store.setSaving(true);
      expect(useOnboardingWizardStore.getState().isSaving).toBe(true);

      store.setSaving(false);
      expect(useOnboardingWizardStore.getState().isSaving).toBe(false);
    });

    it('sets error state', () => {
      const store = useOnboardingWizardStore.getState();

      store.setError('Something went wrong');
      expect(useOnboardingWizardStore.getState().error).toBe('Something went wrong');

      store.setError(null);
      expect(useOnboardingWizardStore.getState().error).toBeNull();
    });

    it('clears error when navigating', () => {
      const store = useOnboardingWizardStore.getState();

      store.setError('Some error');
      store.nextStep();

      expect(useOnboardingWizardStore.getState().error).toBeNull();
    });

    it('clears error when opening wizard', () => {
      const store = useOnboardingWizardStore.getState();

      store.setError('Some error');
      store.openWizard();

      expect(useOnboardingWizardStore.getState().error).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PRESET TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Presets', () => {
    it('all presets have required color fields', () => {
      const requiredColorKeys = ['primary', 'secondary', 'accent', 'background', 'text'];

      Object.entries(BRAND_KIT_PRESETS).forEach(([presetName, preset]) => {
        requiredColorKeys.forEach((key) => {
          expect(preset.colors).toHaveProperty(key);
          expect(typeof preset.colors[key as keyof typeof preset.colors]).toBe('string');
        });
      });
    });

    it('all presets have required typography fields', () => {
      const requiredTypographyKeys = ['headingFont', 'bodyFont'];

      Object.entries(BRAND_KIT_PRESETS).forEach(([presetName, preset]) => {
        requiredTypographyKeys.forEach((key) => {
          expect(preset.typography).toHaveProperty(key);
          expect(
            typeof preset.typography[key as keyof typeof preset.typography]
          ).toBe('string');
        });
      });
    });

    it('all preset colors are valid hex codes', () => {
      const hexRegex = /^#[A-Fa-f0-9]{6}$/;

      Object.entries(BRAND_KIT_PRESETS).forEach(([presetName, preset]) => {
        Object.entries(preset.colors).forEach(([colorKey, colorValue]) => {
          expect(colorValue).toMatch(hexRegex);
        });
      });
    });

    it('has all expected presets', () => {
      const expectedPresets = ['minimal', 'bold', 'elegant', 'playful', 'custom'];
      expectedPresets.forEach((preset) => {
        expect(BRAND_KIT_PRESETS).toHaveProperty(preset);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CANNAVIGATETO TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('canNavigateTo', () => {
    it('can always go back', () => {
      const store = useOnboardingWizardStore.getState();

      store.nextStep(); // Go to brand-kit
      expect(store.canNavigateTo('welcome')).toBe(true);
    });

    it('cannot go forward without completing steps', () => {
      const store = useOnboardingWizardStore.getState();

      expect(store.canNavigateTo('brand-kit')).toBe(false);
      expect(store.canNavigateTo('complete')).toBe(false);
    });

    it('can go forward after completing previous steps', () => {
      const store = useOnboardingWizardStore.getState();

      store.markStepComplete('welcome');
      expect(useOnboardingWizardStore.getState().canNavigateTo('brand-kit')).toBe(true);

      store.markStepComplete('brand-kit');
      expect(useOnboardingWizardStore.getState().canNavigateTo('complete')).toBe(true);
    });
  });
});
