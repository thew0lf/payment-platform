'use client';

/**
 * Saved Field Mappings Page
 *
 * Manage saved field mapping profiles for product imports.
 * Features:
 * - List all saved mapping profiles
 * - Create new profiles
 * - Edit existing profiles
 * - Delete profiles
 * - Set default profile per provider
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Settings2,
  Trash2,
  Edit2,
  Copy,
  Check,
  Star,
  StarOff,
  MoreVertical,
  RefreshCw,
  Package,
  Loader2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  productImportApi,
  type FieldMappingProfile,
  type FieldMapping,
  type FieldTransform,
  IMPORT_PROVIDERS,
  getProvider,
} from '@/lib/api/product-import';
import { cn } from '@/lib/utils';

// Source and target field options
const SOURCE_FIELDS = [
  { value: 'name', label: 'Product Name' },
  { value: 'sku', label: 'SKU' },
  { value: 'description', label: 'Description' },
  { value: 'price', label: 'Price' },
  { value: 'compareAtPrice', label: 'Compare At Price' },
  { value: 'cost', label: 'Cost' },
  { value: 'weight', label: 'Weight' },
  { value: 'barcode', label: 'Barcode' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'productType', label: 'Product Type' },
  { value: 'tags', label: 'Tags' },
  { value: 'status', label: 'Status' },
];

const TARGET_FIELDS = [
  { value: 'name', label: 'Name', required: true },
  { value: 'sku', label: 'SKU', required: true },
  { value: 'description', label: 'Description' },
  { value: 'price', label: 'Price', required: true },
  { value: 'compareAtPrice', label: 'Compare At Price' },
  { value: 'costPrice', label: 'Cost Price' },
  { value: 'weight', label: 'Weight' },
  { value: 'barcode', label: 'Barcode' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'category', label: 'Category' },
  { value: 'tags', label: 'Tags' },
  { value: 'status', label: 'Status' },
];

const TRANSFORMS: { value: FieldTransform; label: string }[] = [
  { value: 'uppercase', label: 'UPPERCASE' },
  { value: 'lowercase', label: 'lowercase' },
  { value: 'capitalize', label: 'Capitalize' },
  { value: 'capitalizeWords', label: 'Capitalize Words' },
  { value: 'trim', label: 'Trim whitespace' },
  { value: 'slug', label: 'URL slug' },
  { value: 'stripHtml', label: 'Strip HTML' },
  { value: 'centsToDecimal', label: 'Cents → Dollars' },
  { value: 'decimalToCents', label: 'Dollars → Cents' },
  { value: 'round', label: 'Round number' },
];

interface MappingRowProps {
  mapping: FieldMapping;
  index: number;
  onUpdate: (index: number, mapping: FieldMapping) => void;
  onRemove: (index: number) => void;
}

function MappingRow({ mapping, index, onUpdate, onRemove }: MappingRowProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
      <Select
        value={mapping.sourceField}
        onValueChange={(value) => onUpdate(index, { ...mapping, sourceField: value })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Source field" />
        </SelectTrigger>
        <SelectContent>
          {SOURCE_FIELDS.map((field) => (
            <SelectItem key={field.value} value={field.value}>
              {field.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

      <Select
        value={mapping.targetField}
        onValueChange={(value) => onUpdate(index, { ...mapping, targetField: value })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Target field" />
        </SelectTrigger>
        <SelectContent>
          {TARGET_FIELDS.map((field) => (
            <SelectItem key={field.value} value={field.value}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={mapping.transform || 'none'}
        onValueChange={(value) =>
          onUpdate(index, {
            ...mapping,
            transform: value === 'none' ? undefined : (value as FieldTransform),
          })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Transform" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No transform</SelectItem>
          {TRANSFORMS.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="ghost" size="icon" onClick={() => onRemove(index)} className="shrink-0">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export default function MappingsPage() {
  const router = useRouter();
  const { selectedCompanyId, accessLevel } = useHierarchy();

  // Check if company selection is required
  const needsCompanySelection =
    (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId;

  // State
  const [profiles, setProfiles] = useState<FieldMappingProfile[]>([]);
  const [isLoading, setIsLoading] = useState(!needsCompanySelection);
  const [providerFilter, setProviderFilter] = useState<string>('all');

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<FieldMappingProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState('');
  const [formMappings, setFormMappings] = useState<FieldMapping[]>([]);
  const [formIsDefault, setFormIsDefault] = useState(false);

  // Load profiles
  const loadProfiles = useCallback(async () => {
    // Skip loading if no company selected
    if (!selectedCompanyId) {
      setIsLoading(false);
      setProfiles([]);
      return;
    }

    setIsLoading(true);

    try {
      const provider = providerFilter !== 'all' ? providerFilter : undefined;
      const data = await productImportApi.listMappingProfiles(provider, selectedCompanyId);
      setProfiles(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load mapping profiles';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompanyId, providerFilter]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Open dialog to create new profile
  const handleCreate = () => {
    setEditingProfile(null);
    setFormName('');
    setFormProvider(providerFilter !== 'all' ? providerFilter : '');
    setFormMappings([
      { sourceField: 'name', targetField: 'name' },
      { sourceField: 'sku', targetField: 'sku' },
      { sourceField: 'price', targetField: 'price' },
    ]);
    setFormIsDefault(false);
    setIsDialogOpen(true);
  };

  // Open dialog to edit existing profile
  const handleEdit = (profile: FieldMappingProfile) => {
    setEditingProfile(profile);
    setFormName(profile.name);
    setFormProvider(profile.provider);
    setFormMappings([...profile.mappings]);
    setFormIsDefault(profile.isDefault);
    setIsDialogOpen(true);
  };

  // Duplicate profile
  const handleDuplicate = (profile: FieldMappingProfile) => {
    setEditingProfile(null);
    setFormName(`${profile.name} (Copy)`);
    setFormProvider(profile.provider);
    setFormMappings([...profile.mappings]);
    setFormIsDefault(false);
    setIsDialogOpen(true);
  };

  // Delete profile
  const handleDelete = async (profileId: string) => {
    setIsDeleting(profileId);

    try {
      await productImportApi.deleteMappingProfile(profileId, selectedCompanyId || undefined);
      toast.success('Mapping profile deleted');
      loadProfiles();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete profile';
      toast.error(message);
    } finally {
      setIsDeleting(null);
    }
  };

  // Toggle default status
  const handleToggleDefault = async (profile: FieldMappingProfile) => {
    try {
      await productImportApi.updateMappingProfile(
        profile.id,
        { isDefault: !profile.isDefault },
        selectedCompanyId || undefined
      );
      toast.success(profile.isDefault ? 'Removed as default' : 'Set as default');
      loadProfiles();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      toast.error(message);
    }
  };

  // Save profile (create or update)
  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Profile name is required');
      return;
    }
    if (!formProvider) {
      toast.error('Please select a provider');
      return;
    }
    if (formMappings.length === 0) {
      toast.error('Add at least one field mapping');
      return;
    }

    setIsSaving(true);

    try {
      if (editingProfile) {
        await productImportApi.updateMappingProfile(
          editingProfile.id,
          {
            name: formName,
            mappings: formMappings,
            isDefault: formIsDefault,
          },
          selectedCompanyId || undefined
        );
        toast.success('Mapping profile updated');
      } else {
        await productImportApi.createMappingProfile(
          {
            name: formName,
            provider: formProvider,
            mappings: formMappings,
            isDefault: formIsDefault,
          },
          selectedCompanyId || undefined
        );
        toast.success('Mapping profile created');
      }

      setIsDialogOpen(false);
      loadProfiles();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Add new mapping
  const handleAddMapping = () => {
    setFormMappings([...formMappings, { sourceField: '', targetField: '' }]);
  };

  // Update mapping
  const handleUpdateMapping = (index: number, mapping: FieldMapping) => {
    const updated = [...formMappings];
    updated[index] = mapping;
    setFormMappings(updated);
  };

  // Remove mapping
  const handleRemoveMapping = (index: number) => {
    setFormMappings(formMappings.filter((_, i) => i !== index));
  };

  const availableProviders = IMPORT_PROVIDERS.filter((p) => p.isAvailable);

  // Group profiles by provider
  const groupedProfiles = profiles.reduce((acc, profile) => {
    if (!acc[profile.provider]) {
      acc[profile.provider] = [];
    }
    acc[profile.provider].push(profile);
    return acc;
  }, {} as Record<string, FieldMappingProfile[]>);

  // Show company selection required message
  if (needsCompanySelection) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/products/import')}
            aria-label="Back to import"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Field Mappings</h1>
            <p className="text-muted-foreground">
              Configure how product data maps from source to your catalog
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Settings2 className="h-12 w-12 text-muted-foreground/50" />
              <h2 className="mt-4 text-xl font-semibold">Select a Company</h2>
              <p className="mt-2 text-muted-foreground max-w-md">
                Choose a company from the dropdown in the header to manage field mappings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/products/import')}
            aria-label="Back to import"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Field Mappings</h1>
            <p className="text-muted-foreground">
              Configure how product data maps from source to your catalog
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadProfiles} disabled={isLoading} className="min-h-[44px] touch-manipulation">
            <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <Button onClick={handleCreate} className="min-h-[44px] touch-manipulation">
            <Plus className="mr-2 h-4 w-4" />
            New Profile
          </Button>
        </div>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label className="text-muted-foreground">Filter by Provider:</Label>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {availableProviders.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Profiles List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Settings2 className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No mapping profiles yet</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                Create a mapping profile to customize how product data is imported from each provider
              </p>
              <Button className="mt-4 min-h-[44px] touch-manipulation" onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedProfiles).map(([provider, providerProfiles]) => {
            const providerInfo = getProvider(provider);
            return (
              <Card key={provider}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      {providerInfo?.icon ? (
                        <img
                          src={providerInfo.icon}
                          alt=""
                          className="h-6 w-6"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="capitalize">{provider}</CardTitle>
                      <CardDescription>
                        {providerProfiles.length} mapping profile{providerProfiles.length !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {providerProfiles.map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{profile.name}</span>
                              {profile.isDefault && (
                                <Badge variant="secondary" className="gap-1">
                                  <Star className="h-3 w-3 fill-current" />
                                  Default
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {profile.mappings.length} field mapping{profile.mappings.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleDefault(profile)}
                            title={profile.isDefault ? 'Remove as default' : 'Set as default'}
                          >
                            {profile.isDefault ? (
                              <StarOff className="h-4 w-4" />
                            ) : (
                              <Star className="h-4 w-4" />
                            )}
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(profile)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(profile)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(profile.id)}
                                disabled={isDeleting === profile.id}
                                className="text-destructive focus:text-destructive"
                              >
                                {isDeleting === profile.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProfile ? 'Edit Mapping Profile' : 'Create Mapping Profile'}</DialogTitle>
            <DialogDescription>
              Define how fields from the source should map to your product catalog
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Profile name */}
            <div className="space-y-2">
              <Label htmlFor="profile-name">Profile Name</Label>
              <Input
                id="profile-name"
                placeholder="e.g., Standard Coffee Import"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            {/* Provider (only for new profiles) */}
            {!editingProfile && (
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={formProvider} onValueChange={setFormProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProviders.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Field mappings */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Field Mappings</Label>
                <Button variant="outline" size="sm" onClick={handleAddMapping}>
                  <Plus className="mr-2 h-3 w-3" />
                  Add Mapping
                </Button>
              </div>

              {formMappings.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
                  No mappings configured. Click "Add Mapping" to start.
                </div>
              ) : (
                <div className="space-y-2">
                  {formMappings.map((mapping, index) => (
                    <MappingRow
                      key={index}
                      mapping={mapping}
                      index={index}
                      onUpdate={handleUpdateMapping}
                      onRemove={handleRemoveMapping}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Default toggle */}
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex-1">
                <div className="font-medium">Set as Default</div>
                <div className="text-sm text-muted-foreground">
                  Use this profile automatically for new imports from {formProvider || 'this provider'}
                </div>
              </div>
              <Button
                variant={formIsDefault ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormIsDefault(!formIsDefault)}
              >
                {formIsDefault ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Default
                  </>
                ) : (
                  'Set Default'
                )}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingProfile ? (
                'Update Profile'
              ) : (
                'Create Profile'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
