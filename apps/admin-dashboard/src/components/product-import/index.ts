/**
 * Product Import Components
 *
 * This module provides a complete UI for importing products from external providers
 * like Roastify, Shopify, WooCommerce, and Magento.
 *
 * Components are organized into:
 * - Wizard steps (provider selection, connection, preview, mapping, progress)
 * - Job management (history, detail, retry)
 * - Field mapping (profiles, transforms)
 * - Utility components (badges, progress indicators)
 */

// ═══════════════════════════════════════════════════════════════
// WIZARD COMPONENTS (Phase 2 - Complete)
// ═══════════════════════════════════════════════════════════════

export { ImportWizard } from './wizard/import-wizard';
export { WizardProgress } from './wizard/wizard-progress';

// Step components (stub implementations, full in Phases 3-7)
export { ProviderStep } from './steps/provider-step';
export { ConnectionStep } from './steps/connection-step';
export { PreviewStep } from './steps/preview-step';
export { MappingStep } from './steps/mapping-step';
export { ImportingStep } from './steps/importing-step';

// ═══════════════════════════════════════════════════════════════
// JOB MANAGEMENT COMPONENTS
// ═══════════════════════════════════════════════════════════════

// Job History - to be implemented in Phase 8
// export { JobList } from './job-list';
// export { JobDetail } from './job-detail';

// Field Mapping Profiles - to be implemented in Phase 9
// export { MappingProfileList } from './mapping-profile-list';
// export { MappingProfileModal } from './mapping-profile-modal';

// ═══════════════════════════════════════════════════════════════
// UTILITY COMPONENTS
// ═══════════════════════════════════════════════════════════════

// These will be exported as they're implemented
// export { ImportStatusBadge } from './import-status-badge';
// export { PhaseBadge } from './phase-badge';
// export { ProviderIcon } from './provider-icon';

// ═══════════════════════════════════════════════════════════════
// STATE MANAGEMENT (Phase 2 - Complete)
// ═══════════════════════════════════════════════════════════════

export {
  useImportWizardStore,
  useCurrentStep,
  useWizardNavigation,
  useSelectedProductCount,
  useCanStartImport,
  WIZARD_STEPS,
  getStepIndex,
  getStepById,
  type WizardStep,
  type WizardState,
  type WizardActions,
  type ImportOptions,
} from '../../stores/import-wizard.store';

// ═══════════════════════════════════════════════════════════════
// RE-EXPORTS FROM API
// ═══════════════════════════════════════════════════════════════

// Re-export types and utilities for convenience
export {
  type ImportJob,
  type ImportJobStatus,
  type ImportJobPhase,
  type ImportEvent,
  type ImportProvider,
  type FieldMapping,
  type FieldMappingProfile,
  type PreviewProduct,
  type PreviewImportResponse,
  type StorageUsageStats,
  type ImportHistoryStats,
  type ImportCostEstimate,
  productImportApi,
  IMPORT_PROVIDERS,
  formatBytes,
  formatDuration,
  getStatusVariant,
  getPhaseDisplayName,
  getProvider,
  getAvailableProviders,
} from '../../lib/api/product-import';
