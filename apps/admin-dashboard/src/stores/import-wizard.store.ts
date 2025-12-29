/**
 * Product Import Wizard State Store
 *
 * Manages the multi-step import wizard state including:
 * - Current step and navigation
 * - Provider selection
 * - Connection/integration settings
 * - Product selection for import
 * - Field mapping configuration
 * - Import job progress
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  ImportProvider,
  FieldMapping,
  PreviewProduct,
  ConflictStrategy,
  ImportJob,
  ImportJobError,
} from '@/lib/api/product-import';

// ═══════════════════════════════════════════════════════════════
// WIZARD STEP DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export type WizardStep =
  | 'provider'
  | 'connection'
  | 'preview'
  | 'mapping'
  | 'importing';

export const WIZARD_STEPS: { id: WizardStep; label: string; description: string }[] = [
  { id: 'provider', label: 'Source', description: 'Choose where to import from' },
  { id: 'connection', label: 'Connect', description: 'Set up your connection' },
  { id: 'preview', label: 'Preview', description: 'Review products to import' },
  { id: 'mapping', label: 'Map Fields', description: 'Configure field mappings' },
  { id: 'importing', label: 'Import', description: 'Watch the magic happen' },
];

export const getStepIndex = (step: WizardStep): number => {
  return WIZARD_STEPS.findIndex((s) => s.id === step);
};

export const getStepById = (step: WizardStep) => {
  return WIZARD_STEPS.find((s) => s.id === step);
};

// ═══════════════════════════════════════════════════════════════
// WIZARD STATE TYPES
// ═══════════════════════════════════════════════════════════════

export interface ImportOptions {
  importImages: boolean;
  generateThumbnails: boolean;
  conflictStrategy: ConflictStrategy;
}

export interface WizardState {
  // Navigation
  currentStep: WizardStep;
  completedSteps: Set<WizardStep>;
  isWizardOpen: boolean;

  // Step 1: Provider
  selectedProvider: ImportProvider | null;

  // Step 2: Connection
  selectedIntegrationId: string | null;
  connectionVerified: boolean;

  // Step 3: Preview
  previewProducts: PreviewProduct[];
  selectedProductIds: Set<string>;
  selectAll: boolean;

  // Step 4: Mapping
  fieldMappings: FieldMapping[];
  savedMappingProfileId: string | null;
  mappingsModified: boolean;
  availableSourceFields: string[]; // Fields available from source data

  // Step 5: Import options and progress
  importOptions: ImportOptions;
  currentJobId: string | null;
  currentJob: ImportJob | null;
  importErrors: ImportJobError[];

  // Loading/error states
  isLoading: boolean;
  error: string | null;
}

export interface WizardActions {
  // Navigation
  openWizard: () => void;
  closeWizard: () => void;
  resetWizard: () => void;
  goToStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  markStepComplete: (step: WizardStep) => void;
  canNavigateTo: (step: WizardStep) => boolean;

  // Provider selection
  setProvider: (provider: ImportProvider) => void;
  clearProvider: () => void;

  // Connection
  setIntegration: (integrationId: string) => void;
  setConnectionVerified: (verified: boolean) => void;

  // Preview
  setPreviewProducts: (products: PreviewProduct[]) => void;
  toggleProductSelection: (productId: string) => void;
  toggleSelectAll: () => void;
  setSelectedProductIds: (ids: string[]) => void;
  clearProductSelection: () => void;
  getSelectedProducts: () => PreviewProduct[];

  // Mappings
  setFieldMappings: (mappings: FieldMapping[]) => void;
  setSavedMappingProfileId: (profileId: string | null) => void;
  setMappingsModified: (modified: boolean) => void;
  setAvailableSourceFields: (fields: string[]) => void;
  updateMapping: (index: number, mapping: Partial<FieldMapping>) => void;
  addMapping: (mapping: FieldMapping) => void;
  removeMapping: (index: number) => void;

  // Import options
  setImportOptions: (options: Partial<ImportOptions>) => void;

  // Job tracking
  setCurrentJob: (job: ImportJob | null) => void;
  setCurrentJobId: (jobId: string | null) => void;
  addImportError: (error: ImportJobError) => void;
  clearImportErrors: () => void;

  // Loading/error
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// ═══════════════════════════════════════════════════════════════
// INITIAL STATE
// ═══════════════════════════════════════════════════════════════

const initialState: WizardState = {
  currentStep: 'provider',
  completedSteps: new Set(),
  isWizardOpen: false,
  selectedProvider: null,
  selectedIntegrationId: null,
  connectionVerified: false,
  previewProducts: [],
  selectedProductIds: new Set(),
  selectAll: false,
  fieldMappings: [],
  savedMappingProfileId: null,
  mappingsModified: false,
  availableSourceFields: [],
  importOptions: {
    importImages: true,
    generateThumbnails: true,
    conflictStrategy: 'SKIP',
  },
  currentJobId: null,
  currentJob: null,
  importErrors: [],
  isLoading: false,
  error: null,
};

// ═══════════════════════════════════════════════════════════════
// STORE DEFINITION
// ═══════════════════════════════════════════════════════════════

export const useImportWizardStore = create<WizardState & WizardActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ─────────────────────────────────────────────────────────────
      // NAVIGATION
      // ─────────────────────────────────────────────────────────────

      openWizard: () => set({ isWizardOpen: true }),

      closeWizard: () => set({ isWizardOpen: false }),

      resetWizard: () =>
        set({
          ...initialState,
          // Preserve isWizardOpen state
          isWizardOpen: get().isWizardOpen,
        }),

      goToStep: (step: WizardStep) => {
        const state = get();
        if (state.canNavigateTo(step)) {
          set({ currentStep: step, error: null });
        }
      },

      nextStep: () => {
        const state = get();
        const currentIndex = getStepIndex(state.currentStep);
        if (currentIndex < WIZARD_STEPS.length - 1) {
          const nextStep = WIZARD_STEPS[currentIndex + 1].id;
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
            currentStep: WIZARD_STEPS[currentIndex - 1].id,
            error: null,
          });
        }
      },

      markStepComplete: (step: WizardStep) => {
        const state = get();
        set({ completedSteps: new Set([...state.completedSteps, step]) });
      },

      canNavigateTo: (step: WizardStep): boolean => {
        const state = get();
        const targetIndex = getStepIndex(step);
        const currentIndex = getStepIndex(state.currentStep);

        // Can always go back
        if (targetIndex <= currentIndex) return true;

        // Can only go forward if all previous steps are complete
        for (let i = 0; i < targetIndex; i++) {
          if (!state.completedSteps.has(WIZARD_STEPS[i].id)) {
            return false;
          }
        }
        return true;
      },

      // ─────────────────────────────────────────────────────────────
      // PROVIDER SELECTION
      // ─────────────────────────────────────────────────────────────

      setProvider: (provider: ImportProvider) =>
        set({
          selectedProvider: provider,
          // Reset downstream state when provider changes
          selectedIntegrationId: null,
          connectionVerified: false,
          previewProducts: [],
          selectedProductIds: new Set(),
          fieldMappings: [],
          savedMappingProfileId: null,
        }),

      clearProvider: () =>
        set({
          selectedProvider: null,
          selectedIntegrationId: null,
          connectionVerified: false,
        }),

      // ─────────────────────────────────────────────────────────────
      // CONNECTION
      // ─────────────────────────────────────────────────────────────

      setIntegration: (integrationId: string) =>
        set({
          selectedIntegrationId: integrationId,
          connectionVerified: false,
        }),

      setConnectionVerified: (verified: boolean) =>
        set({ connectionVerified: verified }),

      // ─────────────────────────────────────────────────────────────
      // PREVIEW
      // ─────────────────────────────────────────────────────────────

      setPreviewProducts: (products: PreviewProduct[]) =>
        set({
          previewProducts: products,
          // Auto-select all by default
          selectedProductIds: new Set(products.map((p) => p.externalId)),
          selectAll: true,
        }),

      toggleProductSelection: (productId: string) => {
        const state = get();
        const newSelected = new Set(state.selectedProductIds);
        if (newSelected.has(productId)) {
          newSelected.delete(productId);
        } else {
          newSelected.add(productId);
        }
        set({
          selectedProductIds: newSelected,
          selectAll: newSelected.size === state.previewProducts.length,
        });
      },

      toggleSelectAll: () => {
        const state = get();
        if (state.selectAll) {
          set({ selectedProductIds: new Set(), selectAll: false });
        } else {
          set({
            selectedProductIds: new Set(state.previewProducts.map((p) => p.externalId)),
            selectAll: true,
          });
        }
      },

      setSelectedProductIds: (ids: string[]) =>
        set({
          selectedProductIds: new Set(ids),
          selectAll: ids.length === get().previewProducts.length,
        }),

      clearProductSelection: () =>
        set({ selectedProductIds: new Set(), selectAll: false }),

      getSelectedProducts: () => {
        const state = get();
        return state.previewProducts.filter((p) =>
          state.selectedProductIds.has(p.externalId)
        );
      },

      // ─────────────────────────────────────────────────────────────
      // MAPPINGS
      // ─────────────────────────────────────────────────────────────

      setFieldMappings: (mappings: FieldMapping[]) =>
        set({ fieldMappings: mappings }),

      setSavedMappingProfileId: (profileId: string | null) =>
        set({ savedMappingProfileId: profileId }),

      setMappingsModified: (modified: boolean) =>
        set({ mappingsModified: modified }),

      setAvailableSourceFields: (fields: string[]) =>
        set({ availableSourceFields: fields }),

      updateMapping: (index: number, mapping: Partial<FieldMapping>) => {
        const state = get();
        const newMappings = [...state.fieldMappings];
        newMappings[index] = { ...newMappings[index], ...mapping };
        set({ fieldMappings: newMappings, mappingsModified: true });
      },

      addMapping: (mapping: FieldMapping) => {
        const state = get();
        set({
          fieldMappings: [...state.fieldMappings, mapping],
          mappingsModified: true,
        });
      },

      removeMapping: (index: number) => {
        const state = get();
        const newMappings = state.fieldMappings.filter((_, i) => i !== index);
        set({ fieldMappings: newMappings, mappingsModified: true });
      },

      // ─────────────────────────────────────────────────────────────
      // IMPORT OPTIONS
      // ─────────────────────────────────────────────────────────────

      setImportOptions: (options: Partial<ImportOptions>) => {
        const state = get();
        set({
          importOptions: { ...state.importOptions, ...options },
        });
      },

      // ─────────────────────────────────────────────────────────────
      // JOB TRACKING
      // ─────────────────────────────────────────────────────────────

      setCurrentJob: (job: ImportJob | null) => set({ currentJob: job }),

      setCurrentJobId: (jobId: string | null) => set({ currentJobId: jobId }),

      addImportError: (error: ImportJobError) => {
        const state = get();
        set({ importErrors: [...state.importErrors, error] });
      },

      clearImportErrors: () => set({ importErrors: [] }),

      // ─────────────────────────────────────────────────────────────
      // LOADING / ERROR
      // ─────────────────────────────────────────────────────────────

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      setError: (error: string | null) => set({ error }),
    }),
    {
      name: 'import-wizard-state',
      version: 2, // Increment to force clear old cached data
      storage: createJSONStorage(() => sessionStorage),
      // Persist essential state including field mappings and product selection
      partialize: (state) => ({
        currentStep: state.currentStep,
        completedSteps: Array.from(state.completedSteps),
        selectedProvider: state.selectedProvider,
        selectedIntegrationId: state.selectedIntegrationId,
        importOptions: state.importOptions,
        savedMappingProfileId: state.savedMappingProfileId,
        fieldMappings: state.fieldMappings,
        selectedProductIds: Array.from(state.selectedProductIds),
        previewProducts: state.previewProducts,
        availableSourceFields: state.availableSourceFields,
      }),
      // Handle version migrations
      migrate: (persistedState: unknown, version: number) => {
        if (version < 2) {
          // Reset to initial state for older versions
          return initialState;
        }
        return persistedState as WizardState;
      },
      // Rehydrate Sets from arrays
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.completedSteps = new Set(state.completedSteps as unknown as WizardStep[]);
          state.selectedProductIds = new Set(state.selectedProductIds as unknown as string[]);
        }
      },
    }
  )
);

// ═══════════════════════════════════════════════════════════════
// SELECTOR HOOKS (for performance optimization)
// ═══════════════════════════════════════════════════════════════

/** Get current step info */
export const useCurrentStep = () =>
  useImportWizardStore((state) => ({
    step: state.currentStep,
    index: getStepIndex(state.currentStep),
    info: getStepById(state.currentStep),
  }));

/** Get navigation state */
export const useWizardNavigation = () =>
  useImportWizardStore((state) => ({
    currentStep: state.currentStep,
    completedSteps: state.completedSteps,
    canGoBack: getStepIndex(state.currentStep) > 0,
    canGoForward: getStepIndex(state.currentStep) < WIZARD_STEPS.length - 1,
    isFirstStep: getStepIndex(state.currentStep) === 0,
    isLastStep: getStepIndex(state.currentStep) === WIZARD_STEPS.length - 1,
    goToStep: state.goToStep,
    nextStep: state.nextStep,
    prevStep: state.prevStep,
  }));

/** Get selected product count */
export const useSelectedProductCount = () =>
  useImportWizardStore((state) => state.selectedProductIds.size);

/** Check if wizard is ready to import */
export const useCanStartImport = () =>
  useImportWizardStore((state) => {
    return (
      state.selectedProvider !== null &&
      state.selectedIntegrationId !== null &&
      state.connectionVerified &&
      state.selectedProductIds.size > 0 &&
      state.fieldMappings.length > 0
    );
  });
