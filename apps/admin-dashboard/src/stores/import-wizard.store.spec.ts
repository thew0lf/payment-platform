/**
 * Import Wizard Store Tests
 *
 * Tests for the Zustand store managing wizard state.
 */

import { act } from 'react';
import {
  useImportWizardStore,
  WIZARD_STEPS,
  getStepIndex,
  getStepById,
  type WizardStep,
} from './import-wizard.store';
import type { ImportProvider, FieldMapping, PreviewProduct } from '@/lib/api/product-import';

// Mock provider for testing
const mockProvider: ImportProvider = {
  id: 'roastify',
  name: 'Roastify',
  description: 'Test provider',
  icon: '/test.svg',
  category: 'fulfillment',
  isAvailable: true,
  requiredCredentials: ['apiKey'],
};

// Mock preview products
const mockProducts: PreviewProduct[] = [
  {
    externalId: 'prod-1',
    sku: 'SKU-001',
    name: 'Product 1',
    price: 10.99,
    currency: 'USD',
    imageCount: 2,
    variantCount: 1,
    willImport: true,
    mappedData: {},
  },
  {
    externalId: 'prod-2',
    sku: 'SKU-002',
    name: 'Product 2',
    price: 20.99,
    currency: 'USD',
    imageCount: 3,
    variantCount: 2,
    willImport: true,
    mappedData: {},
  },
];

// Mock field mapping
const mockMapping: FieldMapping = {
  sourceField: 'name',
  targetField: 'productName',
  transform: 'capitalize',
};

describe('Import Wizard Store', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const store = useImportWizardStore.getState();
    store.resetWizard();
    store.closeWizard();
  });

  // ═══════════════════════════════════════════════════════════════
  // UTILITY FUNCTION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('getStepIndex', () => {
    it('returns correct index for each step', () => {
      expect(getStepIndex('provider')).toBe(0);
      expect(getStepIndex('connection')).toBe(1);
      expect(getStepIndex('preview')).toBe(2);
      expect(getStepIndex('mapping')).toBe(3);
      expect(getStepIndex('importing')).toBe(4);
    });

    it('returns -1 for unknown step', () => {
      expect(getStepIndex('unknown' as WizardStep)).toBe(-1);
    });
  });

  describe('getStepById', () => {
    it('returns step info for valid step', () => {
      const step = getStepById('provider');
      expect(step).toBeDefined();
      expect(step?.id).toBe('provider');
      expect(step?.label).toBe('Source');
    });

    it('returns undefined for unknown step', () => {
      expect(getStepById('unknown' as WizardStep)).toBeUndefined();
    });
  });

  describe('WIZARD_STEPS', () => {
    it('has correct number of steps', () => {
      expect(WIZARD_STEPS.length).toBe(5);
    });

    it('has all required properties', () => {
      WIZARD_STEPS.forEach((step) => {
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
    it('starts on provider step', () => {
      const state = useImportWizardStore.getState();
      expect(state.currentStep).toBe('provider');
    });

    it('opens and closes wizard', () => {
      const store = useImportWizardStore.getState();

      store.openWizard();
      expect(useImportWizardStore.getState().isWizardOpen).toBe(true);

      store.closeWizard();
      expect(useImportWizardStore.getState().isWizardOpen).toBe(false);
    });

    it('advances to next step', () => {
      const store = useImportWizardStore.getState();

      store.nextStep();
      expect(useImportWizardStore.getState().currentStep).toBe('connection');
      expect(useImportWizardStore.getState().completedSteps.has('provider')).toBe(true);
    });

    it('goes back to previous step', () => {
      const store = useImportWizardStore.getState();

      store.nextStep(); // Go to connection
      store.prevStep(); // Back to provider
      expect(useImportWizardStore.getState().currentStep).toBe('provider');
    });

    it('does not go before first step', () => {
      const store = useImportWizardStore.getState();

      store.prevStep();
      expect(useImportWizardStore.getState().currentStep).toBe('provider');
    });

    it('does not go past last step', () => {
      const store = useImportWizardStore.getState();

      // Navigate to last step
      for (let i = 0; i < WIZARD_STEPS.length; i++) {
        store.nextStep();
      }
      expect(useImportWizardStore.getState().currentStep).toBe('importing');

      // Try to go further
      store.nextStep();
      expect(useImportWizardStore.getState().currentStep).toBe('importing');
    });

    it('marks steps as complete', () => {
      const store = useImportWizardStore.getState();

      store.markStepComplete('provider');
      expect(useImportWizardStore.getState().completedSteps.has('provider')).toBe(true);
    });

    it('navigates to specific step when allowed', () => {
      const store = useImportWizardStore.getState();

      // Complete first two steps
      store.markStepComplete('provider');
      store.markStepComplete('connection');

      // Can navigate to step 3
      store.goToStep('preview');
      expect(useImportWizardStore.getState().currentStep).toBe('preview');
    });

    it('cannot navigate to step if previous steps not complete', () => {
      const store = useImportWizardStore.getState();

      // Try to skip to step 3 without completing earlier steps
      store.goToStep('preview');
      expect(useImportWizardStore.getState().currentStep).toBe('provider');
    });

    it('resets wizard state', () => {
      const store = useImportWizardStore.getState();

      // Set up some state
      store.openWizard();
      store.setProvider(mockProvider);
      store.nextStep();

      // Reset
      store.resetWizard();

      const state = useImportWizardStore.getState();
      expect(state.currentStep).toBe('provider');
      expect(state.selectedProvider).toBeNull();
      expect(state.completedSteps.size).toBe(0);
      // isWizardOpen should be preserved
      expect(state.isWizardOpen).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PROVIDER SELECTION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Provider Selection', () => {
    it('sets selected provider', () => {
      const store = useImportWizardStore.getState();

      store.setProvider(mockProvider);
      expect(useImportWizardStore.getState().selectedProvider).toEqual(mockProvider);
    });

    it('clears downstream state when provider changes', () => {
      const store = useImportWizardStore.getState();

      // Set up some state
      store.setProvider(mockProvider);
      store.setIntegration('int-1');
      store.setConnectionVerified(true);
      store.setPreviewProducts(mockProducts);
      store.setFieldMappings([mockMapping]);

      // Change provider
      const newProvider = { ...mockProvider, id: 'shopify', name: 'Shopify' };
      store.setProvider(newProvider);

      const state = useImportWizardStore.getState();
      expect(state.selectedProvider).toEqual(newProvider);
      expect(state.selectedIntegrationId).toBeNull();
      expect(state.connectionVerified).toBe(false);
      expect(state.previewProducts.length).toBe(0);
      expect(state.fieldMappings.length).toBe(0);
    });

    it('clears provider', () => {
      const store = useImportWizardStore.getState();

      store.setProvider(mockProvider);
      store.clearProvider();

      expect(useImportWizardStore.getState().selectedProvider).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // CONNECTION TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Connection', () => {
    it('sets integration', () => {
      const store = useImportWizardStore.getState();

      store.setIntegration('int-123');
      expect(useImportWizardStore.getState().selectedIntegrationId).toBe('int-123');
      expect(useImportWizardStore.getState().connectionVerified).toBe(false);
    });

    it('sets connection verified', () => {
      const store = useImportWizardStore.getState();

      store.setConnectionVerified(true);
      expect(useImportWizardStore.getState().connectionVerified).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PRODUCT PREVIEW TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Product Preview', () => {
    it('sets preview products and auto-selects all', () => {
      const store = useImportWizardStore.getState();

      store.setPreviewProducts(mockProducts);

      const state = useImportWizardStore.getState();
      expect(state.previewProducts.length).toBe(2);
      expect(state.selectedProductIds.size).toBe(2);
      expect(state.selectAll).toBe(true);
    });

    it('toggles individual product selection', () => {
      const store = useImportWizardStore.getState();

      store.setPreviewProducts(mockProducts);
      store.toggleProductSelection('prod-1');

      const state = useImportWizardStore.getState();
      expect(state.selectedProductIds.has('prod-1')).toBe(false);
      expect(state.selectedProductIds.has('prod-2')).toBe(true);
      expect(state.selectAll).toBe(false);
    });

    it('toggles select all', () => {
      const store = useImportWizardStore.getState();

      store.setPreviewProducts(mockProducts);

      // Deselect all
      store.toggleSelectAll();
      expect(useImportWizardStore.getState().selectedProductIds.size).toBe(0);
      expect(useImportWizardStore.getState().selectAll).toBe(false);

      // Select all again
      store.toggleSelectAll();
      expect(useImportWizardStore.getState().selectedProductIds.size).toBe(2);
      expect(useImportWizardStore.getState().selectAll).toBe(true);
    });

    it('sets specific product IDs', () => {
      const store = useImportWizardStore.getState();

      store.setPreviewProducts(mockProducts);
      store.setSelectedProductIds(['prod-1']);

      const state = useImportWizardStore.getState();
      expect(state.selectedProductIds.size).toBe(1);
      expect(state.selectedProductIds.has('prod-1')).toBe(true);
    });

    it('clears product selection', () => {
      const store = useImportWizardStore.getState();

      store.setPreviewProducts(mockProducts);
      store.clearProductSelection();

      expect(useImportWizardStore.getState().selectedProductIds.size).toBe(0);
    });

    it('gets selected products', () => {
      const store = useImportWizardStore.getState();

      store.setPreviewProducts(mockProducts);
      store.toggleProductSelection('prod-2');

      const selected = store.getSelectedProducts();
      expect(selected.length).toBe(1);
      expect(selected[0].externalId).toBe('prod-1');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // FIELD MAPPING TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Field Mappings', () => {
    it('sets field mappings', () => {
      const store = useImportWizardStore.getState();

      store.setFieldMappings([mockMapping]);
      expect(useImportWizardStore.getState().fieldMappings.length).toBe(1);
    });

    it('adds a mapping', () => {
      const store = useImportWizardStore.getState();

      store.addMapping(mockMapping);
      expect(useImportWizardStore.getState().fieldMappings.length).toBe(1);
      expect(useImportWizardStore.getState().mappingsModified).toBe(true);
    });

    it('updates a mapping', () => {
      const store = useImportWizardStore.getState();

      store.setFieldMappings([mockMapping]);
      store.updateMapping(0, { targetField: 'newTarget' });

      const state = useImportWizardStore.getState();
      expect(state.fieldMappings[0].targetField).toBe('newTarget');
      expect(state.mappingsModified).toBe(true);
    });

    it('removes a mapping', () => {
      const store = useImportWizardStore.getState();

      store.setFieldMappings([mockMapping, { ...mockMapping, sourceField: 'price' }]);
      store.removeMapping(0);

      const state = useImportWizardStore.getState();
      expect(state.fieldMappings.length).toBe(1);
      expect(state.fieldMappings[0].sourceField).toBe('price');
    });

    it('sets saved mapping profile ID', () => {
      const store = useImportWizardStore.getState();

      store.setSavedMappingProfileId('profile-123');
      expect(useImportWizardStore.getState().savedMappingProfileId).toBe('profile-123');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // IMPORT OPTIONS TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Import Options', () => {
    it('has correct default options', () => {
      const state = useImportWizardStore.getState();

      expect(state.importOptions.importImages).toBe(true);
      expect(state.importOptions.generateThumbnails).toBe(true);
      expect(state.importOptions.conflictStrategy).toBe('SKIP');
    });

    it('updates import options', () => {
      const store = useImportWizardStore.getState();

      store.setImportOptions({ importImages: false });

      const state = useImportWizardStore.getState();
      expect(state.importOptions.importImages).toBe(false);
      expect(state.importOptions.generateThumbnails).toBe(true); // unchanged
    });

    it('updates conflict strategy', () => {
      const store = useImportWizardStore.getState();

      store.setImportOptions({ conflictStrategy: 'UPDATE' });
      expect(useImportWizardStore.getState().importOptions.conflictStrategy).toBe('UPDATE');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // JOB TRACKING TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Job Tracking', () => {
    it('sets current job ID', () => {
      const store = useImportWizardStore.getState();

      store.setCurrentJobId('job-123');
      expect(useImportWizardStore.getState().currentJobId).toBe('job-123');
    });

    it('adds and clears import errors', () => {
      const store = useImportWizardStore.getState();

      const error = {
        productId: 'prod-1',
        message: 'Failed to import',
        code: 'IMPORT_ERROR',
        timestamp: new Date().toISOString(),
      };

      store.addImportError(error);
      expect(useImportWizardStore.getState().importErrors.length).toBe(1);

      store.clearImportErrors();
      expect(useImportWizardStore.getState().importErrors.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // LOADING/ERROR STATE TESTS
  // ═══════════════════════════════════════════════════════════════

  describe('Loading and Error States', () => {
    it('sets loading state', () => {
      const store = useImportWizardStore.getState();

      store.setLoading(true);
      expect(useImportWizardStore.getState().isLoading).toBe(true);

      store.setLoading(false);
      expect(useImportWizardStore.getState().isLoading).toBe(false);
    });

    it('sets error state', () => {
      const store = useImportWizardStore.getState();

      store.setError('Something went wrong');
      expect(useImportWizardStore.getState().error).toBe('Something went wrong');

      store.setError(null);
      expect(useImportWizardStore.getState().error).toBeNull();
    });

    it('clears error when navigating', () => {
      const store = useImportWizardStore.getState();

      store.setError('Some error');
      store.nextStep();

      expect(useImportWizardStore.getState().error).toBeNull();
    });
  });
});
