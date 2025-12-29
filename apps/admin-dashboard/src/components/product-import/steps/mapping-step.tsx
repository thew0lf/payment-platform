'use client';

/**
 * Mapping Step (Step 4)
 *
 * Configure field mappings from source to destination.
 * Features:
 * - Visual field mapping with source → target arrows
 * - Transform options (uppercase, trim, etc.)
 * - Save mapping profiles for reuse
 * - Load existing profiles
 * - Import options configuration
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Save,
  Trash2,
  Plus,
  ChevronDown,
  Sparkles,
  Image,
  AlertTriangle,
  Settings2,
  FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useImportWizardStore, useSelectedProductCount } from '@/stores/import-wizard.store';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  productImportApi,
  type FieldMapping,
  type FieldMappingProfile,
  type FieldTransform,
  type ConflictStrategy,
} from '@/lib/api/product-import';

// Available source fields (typically from external providers)
const SOURCE_FIELDS = [
  { value: 'name', label: 'Product Name' },
  { value: 'sku', label: 'SKU' },
  { value: 'description', label: 'Description' },
  { value: 'price', label: 'Price' },
  { value: 'currency', label: 'Currency' },
  { value: 'cost', label: 'Cost' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'weight', label: 'Weight' },
  { value: 'category', label: 'Category' },
  { value: 'tags', label: 'Tags' },
  { value: 'barcode', label: 'Barcode' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'images', label: 'Images' },
];

// Target fields (our product schema)
const TARGET_FIELDS = [
  { value: 'name', label: 'Name', required: true },
  { value: 'sku', label: 'SKU', required: true },
  { value: 'description', label: 'Description' },
  { value: 'price', label: 'Price', required: true },
  { value: 'currency', label: 'Currency' },
  { value: 'costPrice', label: 'Cost Price' },
  { value: 'stockQuantity', label: 'Stock Quantity' },
  { value: 'weight', label: 'Weight' },
  { value: 'categories', label: 'Categories' },
  { value: 'tags', label: 'Tags' },
  { value: 'barcode', label: 'Barcode' },
  { value: 'vendor', label: 'Vendor' },
];

// Transform options - grouped by category for clarity
const TRANSFORMS: { value: FieldTransform; label: string; group: string }[] = [
  // String transforms
  { value: 'uppercase', label: 'UPPERCASE', group: 'Text' },
  { value: 'lowercase', label: 'lowercase', group: 'Text' },
  { value: 'capitalize', label: 'Capitalize First', group: 'Text' },
  { value: 'capitalizeWords', label: 'Capitalize Words', group: 'Text' },
  { value: 'trim', label: 'Trim Whitespace', group: 'Text' },
  { value: 'trimStart', label: 'Trim Start', group: 'Text' },
  { value: 'trimEnd', label: 'Trim End', group: 'Text' },
  { value: 'slug', label: 'URL Slug', group: 'Text' },
  { value: 'stripHtml', label: 'Strip HTML', group: 'Text' },
  // Number transforms
  { value: 'centsToDecimal', label: 'Cents → Dollars', group: 'Number' },
  { value: 'decimalToCents', label: 'Dollars → Cents', group: 'Number' },
  { value: 'round', label: 'Round', group: 'Number' },
  { value: 'floor', label: 'Floor', group: 'Number' },
  { value: 'ceil', label: 'Ceiling', group: 'Number' },
  { value: 'abs', label: 'Absolute Value', group: 'Number' },
  // Type transforms
  { value: 'boolean', label: 'To Boolean', group: 'Type' },
  { value: 'number', label: 'To Number', group: 'Type' },
  { value: 'string', label: 'To String', group: 'Type' },
  { value: 'array', label: 'To Array', group: 'Type' },
  { value: 'json', label: 'Parse JSON', group: 'Type' },
  // Date transforms
  { value: 'isoDate', label: 'ISO Date', group: 'Date' },
  { value: 'timestamp', label: 'Timestamp', group: 'Date' },
];

// Helper to get readable label for a value
const getTransformLabel = (value: string | undefined): string => {
  if (!value || value === 'none') return 'Keep as-is';
  const transform = TRANSFORMS.find(t => t.value === value);
  return transform?.label || value;
};

const getSourceFieldLabel = (value: string | undefined): string => {
  if (!value) return '';
  const field = SOURCE_FIELDS.find(f => f.value === value);
  return field?.label || value;
};

const getTargetFieldLabel = (value: string | undefined): string => {
  if (!value) return '';
  const field = TARGET_FIELDS.find(f => f.value === value);
  return field?.label || value;
};

// Conflict strategy options
const CONFLICT_STRATEGIES: { value: ConflictStrategy; label: string; description: string }[] = [
  { value: 'SKIP', label: 'Skip duplicates', description: 'Leave existing products unchanged' },
  { value: 'UPDATE', label: 'Update existing', description: 'Replace all fields with new data' },
  { value: 'MERGE', label: 'Merge data', description: 'Only update non-empty fields' },
  { value: 'FORCE_CREATE', label: 'Force create', description: 'Create new with modified SKU' },
];

interface MappingRowProps {
  mapping: FieldMapping;
  index: number;
  onUpdate: (index: number, updates: Partial<FieldMapping>) => void;
  onRemove: (index: number) => void;
}

function MappingRow({ mapping, index, onUpdate, onRemove }: MappingRowProps) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-muted/30">
      {/* Source field */}
      <div className="flex-1">
        <Select
          value={mapping.sourceField || ''}
          onValueChange={(value) => onUpdate(index, { sourceField: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select source field">
              {mapping.sourceField ? getSourceFieldLabel(mapping.sourceField) : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SOURCE_FIELDS.map((field) => (
              <SelectItem key={field.value} value={field.value}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Arrow */}
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />

      {/* Target field */}
      <div className="flex-1">
        <Select
          value={mapping.targetField || ''}
          onValueChange={(value) => onUpdate(index, { targetField: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select target field">
              {mapping.targetField ? getTargetFieldLabel(mapping.targetField) : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TARGET_FIELDS.map((field) => (
              <SelectItem key={field.value} value={field.value}>
                {field.label}
                {field.required && <span className="ml-1 text-destructive">*</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transform (optional) */}
      <div className="w-44">
        <Select
          value={mapping.transform || 'none'}
          onValueChange={(value) =>
            onUpdate(index, { transform: value === 'none' ? undefined : (value as FieldTransform) })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Transform">
              {getTransformLabel(mapping.transform)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Keep as-is</SelectItem>
            <SelectGroup>
              <SelectLabel>Text</SelectLabel>
              {TRANSFORMS.filter(t => t.group === 'Text').map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Number</SelectLabel>
              {TRANSFORMS.filter(t => t.group === 'Number').map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Type</SelectLabel>
              {TRANSFORMS.filter(t => t.group === 'Type').map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Date</SelectLabel>
              {TRANSFORMS.filter(t => t.group === 'Date').map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onRemove(index)}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export function MappingStep() {
  const {
    selectedProvider,
    fieldMappings,
    savedMappingProfileId,
    mappingsModified,
    importOptions,
    setFieldMappings,
    setSavedMappingProfileId,
    setMappingsModified,
    updateMapping,
    addMapping,
    removeMapping,
    setImportOptions,
    isLoading,
    setLoading,
    prevStep,
    nextStep,
    markStepComplete,
  } = useImportWizardStore();

  const { selectedCompanyId, accessLevel } = useHierarchy();
  const selectedCount = useSelectedProductCount();

  // Check if company selection is required
  const needsCompanySelection =
    (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId;

  const [profiles, setProfiles] = useState<FieldMappingProfile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load existing mapping profiles
  const loadProfiles = useCallback(async () => {
    if (!selectedProvider) return;
    if (!selectedCompanyId) {
      setProfiles([]);
      return;
    }

    setIsLoadingProfiles(true);
    try {
      const result = await productImportApi.listMappingProfiles(
        selectedProvider.id,
        selectedCompanyId
      );
      setProfiles(result);
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setIsLoadingProfiles(false);
    }
  }, [selectedProvider, selectedCompanyId]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Load a profile
  const handleLoadProfile = (profile: FieldMappingProfile) => {
    setFieldMappings(profile.mappings);
    setSavedMappingProfileId(profile.id);
    setMappingsModified(false);
    toast.success(`Loaded mapping profile: ${profile.name}`);
  };

  // Add a new mapping row
  const handleAddMapping = () => {
    addMapping({
      sourceField: '',
      targetField: '',
    });
  };

  // Save current mappings as a profile
  const handleSaveProfile = async () => {
    if (!selectedProvider || !profileName.trim()) return;
    if (!selectedCompanyId) {
      toast.error('Please select a company first');
      return;
    }

    setIsSaving(true);
    try {
      const newProfile = await productImportApi.createMappingProfile(
        {
          provider: selectedProvider.id,
          name: profileName.trim(),
          mappings: fieldMappings,
        },
        selectedCompanyId
      );

      setSavedMappingProfileId(newProfile.id);
      setMappingsModified(false);
      setProfiles((prev) => [...prev, newProfile]);
      setShowSaveDialog(false);
      setProfileName('');
      toast.success('Mapping profile saved!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Check if required mappings are set
  const hasNameMapping = fieldMappings.some((m) => m.targetField === 'name' && m.sourceField && m.sourceField.trim() !== '');
  const hasSkuMapping = fieldMappings.some((m) => m.targetField === 'sku' && m.sourceField && m.sourceField.trim() !== '');
  const hasPriceMapping = fieldMappings.some((m) => m.targetField === 'price' && m.sourceField && m.sourceField.trim() !== '');
  const hasRequiredMappings = hasNameMapping && hasSkuMapping && hasPriceMapping;

  // Get list of missing required fields
  const missingFields: string[] = [];
  if (!hasNameMapping) missingFields.push('Name');
  if (!hasSkuMapping) missingFields.push('SKU');
  if (!hasPriceMapping) missingFields.push('Price');

  const handleContinue = () => {
    console.log('[MappingStep] handleContinue called');
    console.log('[MappingStep] fieldMappings:', JSON.stringify(fieldMappings, null, 2));
    console.log('[MappingStep] hasRequiredMappings:', hasRequiredMappings);
    console.log('[MappingStep] hasNameMapping:', hasNameMapping, 'hasSkuMapping:', hasSkuMapping, 'hasPriceMapping:', hasPriceMapping);

    if (hasRequiredMappings) {
      console.log('[MappingStep] Proceeding to next step...');
      markStepComplete('mapping');
      nextStep();
    } else {
      console.log('[MappingStep] Missing required mappings:', missingFields);
      toast.error(`Please map required fields: ${missingFields.join(', ')}`);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Settings2 className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">
          Configure Field Mappings
        </h3>
        <p className="mt-2 text-muted-foreground">
          Map fields from {selectedProvider?.name || 'source'} to your product catalog
        </p>
      </div>

      {/* Saved profiles */}
      {profiles.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Saved Mapping Profiles</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {isLoadingProfiles ? (
              <>
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-32" />
              </>
            ) : (
              profiles.map((profile) => (
                <Button
                  key={profile.id}
                  variant={savedMappingProfileId === profile.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLoadProfile(profile)}
                >
                  {profile.name}
                  {profile.isDefault && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Default
                    </Badge>
                  )}
                </Button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Field mappings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Field Mappings
            </h4>
            {!hasRequiredMappings && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Missing: {missingFields.join(', ')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {mappingsModified && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveDialog(true)}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Profile
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleAddMapping}>
              <Plus className="mr-2 h-4 w-4" />
              Add Mapping
            </Button>
          </div>
        </div>

        {/* Mapping header */}
        <div className="flex items-center gap-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          <div className="flex-1">Source Field</div>
          <div className="w-4" />
          <div className="flex-1">Target Field</div>
          <div className="w-44">Transform</div>
          <div className="w-8" />
        </div>

        {/* Mapping rows */}
        {fieldMappings.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h4 className="mt-4 font-medium text-foreground">No mappings configured</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Add mappings to define how source fields map to your products
            </p>
            <Button className="mt-4 min-h-[44px] touch-manipulation" onClick={handleAddMapping}>
              <Plus className="mr-2 h-4 w-4" />
              Add First Mapping
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {fieldMappings.map((mapping, index) => (
              <MappingRow
                key={index}
                mapping={mapping}
                index={index}
                onUpdate={updateMapping}
                onRemove={removeMapping}
              />
            ))}
          </div>
        )}

        {/* Required fields hint */}
        <p className="text-xs text-muted-foreground">
          <span className="text-destructive">*</span> Required fields: Name, SKU, Price
        </p>
      </div>

      {/* Import options */}
      <div className="rounded-lg border p-4 space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Image className="h-4 w-4" />
          Import Options
        </h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Checkbox
                id="importImages"
                checked={importOptions.importImages}
                onCheckedChange={(checked) =>
                  setImportOptions({ importImages: !!checked })
                }
              />
              <Label htmlFor="importImages" className="text-sm cursor-pointer">
                Import product images
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Checkbox
                id="generateThumbnails"
                checked={importOptions.generateThumbnails}
                onCheckedChange={(checked) =>
                  setImportOptions({ generateThumbnails: !!checked })
                }
                disabled={!importOptions.importImages}
              />
              <Label
                htmlFor="generateThumbnails"
                className={cn(
                  'text-sm cursor-pointer',
                  !importOptions.importImages && 'opacity-50'
                )}
              >
                Generate thumbnails
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Duplicate Handling</Label>
            <Select
              value={importOptions.conflictStrategy}
              onValueChange={(value) =>
                setImportOptions({ conflictStrategy: value as ConflictStrategy })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONFLICT_STRATEGIES.map((strategy) => (
                  <SelectItem key={strategy.value} value={strategy.value}>
                    <div>
                      <div>{strategy.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {strategy.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-lg bg-muted/50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span>Products to import:</span>
          <span className="font-medium">{selectedCount}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span>Field mappings:</span>
          <span className="font-medium">{fieldMappings.length}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span>Images:</span>
          <span className="font-medium">
            {importOptions.importImages ? 'Yes' : 'No'}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-6">
        <Button variant="outline" onClick={prevStep} className="min-h-[44px] touch-manipulation">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-3">
          {!hasRequiredMappings && (
            <p className="text-sm text-destructive">
              Missing required mappings: {missingFields.join(', ')}
            </p>
          )}
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!hasRequiredMappings || isLoading}
            className="min-w-[150px] min-h-[44px] touch-manipulation"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparing...
              </>
            ) : (
              <>
                Start Import
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Save Profile Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Mapping Profile</DialogTitle>
            <DialogDescription>
              Save these mappings as a reusable profile for future imports.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="profileName">Profile Name</Label>
            <Input
              id="profileName"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g., Standard Roastify Import"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={!profileName.trim() || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Profile
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
