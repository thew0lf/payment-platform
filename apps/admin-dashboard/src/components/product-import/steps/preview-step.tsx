'use client';

/**
 * Preview Step (Step 3)
 *
 * Shows products fetched from the provider for user selection.
 * Features:
 * - Product table with checkboxes
 * - Search/filter functionality
 * - Select all / deselect all
 * - Product count summary
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package,
  Loader2,
  Search,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  ImageIcon,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useImportWizardStore, useSelectedProductCount } from '@/stores/import-wizard.store';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { productImportApi, type PreviewProduct } from '@/lib/api/product-import';

// Format currency for display
function formatPrice(price: number, currency?: string): string {
  // Default to USD if no currency provided
  const currencyCode = currency || 'USD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(price);
}

interface ProductRowProps {
  product: PreviewProduct;
  isSelected: boolean;
  onToggle: () => void;
}

function ProductRow({ product, isSelected, onToggle }: ProductRowProps) {
  return (
    <TableRow
      className={cn(
        'cursor-pointer transition-colors',
        isSelected && 'bg-primary/5',
        !product.willImport && 'opacity-60'
      )}
      onClick={onToggle}
    >
      <TableCell className="w-12">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          disabled={!product.willImport}
          onClick={(e) => e.stopPropagation()}
        />
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{product.name}</span>
          <span className="text-xs text-muted-foreground">{product.sku}</span>
        </div>
      </TableCell>
      <TableCell className="text-right">
        {formatPrice(product.price, product.currency)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <ImageIcon className="h-3.5 w-3.5" />
            {product.imageCount}
          </span>
          <span className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            {product.variantCount}
          </span>
        </div>
      </TableCell>
      <TableCell>
        {product.willImport ? (
          <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="h-3 w-3" />
            Ready
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <XCircle className="h-3 w-3" />
            {product.skipReason || 'Skip'}
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

export function PreviewStep() {
  const {
    selectedProvider,
    selectedIntegrationId,
    previewProducts,
    selectedProductIds,
    selectAll,
    setPreviewProducts,
    toggleProductSelection,
    toggleSelectAll,
    setFieldMappings,
    setAvailableSourceFields,
    isLoading,
    setLoading,
    setError,
    prevStep,
    nextStep,
    markStepComplete,
  } = useImportWizardStore();

  const { selectedCompanyId, accessLevel } = useHierarchy();
  const selectedCount = useSelectedProductCount();

  // Check if company selection is required
  const needsCompanySelection =
    (accessLevel === 'ORGANIZATION' || accessLevel === 'CLIENT') && !selectedCompanyId;

  const [searchQuery, setSearchQuery] = useState('');
  const [hasLoadedProducts, setHasLoadedProducts] = useState(false);

  // Fetch products from the provider
  const loadProducts = useCallback(async () => {
    if (!selectedIntegrationId) {
      toast.error('No integration selected');
      return;
    }

    if (!selectedCompanyId) {
      setError('Please select a company from the header dropdown first');
      toast.error('Please select a company first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await productImportApi.previewImport(
        { integrationId: selectedIntegrationId },
        selectedCompanyId
      );

      setPreviewProducts(response.products);

      // Set available source fields for mapping step validation
      if (response.availableSourceFields) {
        setAvailableSourceFields(response.availableSourceFields);
      }

      // Also set suggested mappings if provided
      if (response.suggestedMappings && response.suggestedMappings.length > 0) {
        console.log('[PreviewStep] Setting field mappings:', JSON.stringify(response.suggestedMappings, null, 2));
        console.log('[PreviewStep] Available source fields:', response.availableSourceFields);
        setFieldMappings(response.suggestedMappings);
      } else {
        console.log('[PreviewStep] No suggested mappings in response');
      }

      setHasLoadedProducts(true);

      // Show summary toast
      const importableCount = response.products.filter(p => p.willImport).length;
      toast.success(
        `Found ${response.totalProducts} products (${importableCount} ready to import)`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch products';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [selectedIntegrationId, selectedCompanyId, setPreviewProducts, setAvailableSourceFields, setFieldMappings, setLoading, setError]);

  // Load products when step is first shown (only if company is selected)
  useEffect(() => {
    if (!hasLoadedProducts && selectedIntegrationId && selectedCompanyId) {
      loadProducts();
    }
  }, [hasLoadedProducts, selectedIntegrationId, selectedCompanyId, loadProducts]);

  // Filter products by search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return previewProducts;

    const query = searchQuery.toLowerCase();
    return previewProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query)
    );
  }, [previewProducts, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const importable = previewProducts.filter(p => p.willImport);
    const skipped = previewProducts.filter(p => !p.willImport);
    const totalImages = previewProducts.reduce((sum, p) => sum + p.imageCount, 0);

    return {
      total: previewProducts.length,
      importable: importable.length,
      skipped: skipped.length,
      totalImages,
    };
  }, [previewProducts]);

  const handleContinue = () => {
    if (selectedCount > 0) {
      markStepComplete('preview');
      nextStep();
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Package className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">
          Select Products to Import
        </h3>
        <p className="mt-2 text-muted-foreground">
          Review products from {selectedProvider?.name || 'your source'} and select which ones to import
        </p>
      </div>

      {/* Company selection required message */}
      {needsCompanySelection && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-800 dark:bg-amber-900/20">
          <AlertCircle className="mx-auto h-8 w-8 text-amber-600" />
          <h4 className="mt-2 font-medium text-amber-800 dark:text-amber-200">Company Selection Required</h4>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            Please select a company from the header dropdown to continue importing products.
          </p>
        </div>
      )}

      {/* Stats bar */}
      {!isLoading && previewProducts.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-4 rounded-lg bg-muted/50 p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Products</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.importable}</div>
            <div className="text-xs text-muted-foreground">Ready to Import</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.skipped}</div>
            <div className="text-xs text-muted-foreground">Will Skip</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalImages}</div>
            <div className="text-xs text-muted-foreground">Total Images</div>
          </div>
        </div>
      )}

      {/* Search and controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadProducts}
            disabled={isLoading}
            className="min-h-[44px] touch-manipulation"
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Product table */}
      <div className="rounded-lg border">
        {isLoading ? (
          <div className="p-8">
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Fetching products...</p>
            </div>
            <div className="mt-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 flex-1" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          </div>
        ) : previewProducts.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h4 className="mt-4 font-medium text-foreground">No products found</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              We couldn't find any products to import from your source.
            </p>
            <Button variant="outline" className="mt-4 min-h-[44px] touch-manipulation" onClick={loadProducts}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center">
            <Search className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h4 className="mt-4 font-medium text-foreground">No matching products</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different search term
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectAll}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all products"
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>Assets</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <ProductRow
                  key={product.externalId}
                  product={product}
                  isSelected={selectedProductIds.has(product.externalId)}
                  onToggle={() => toggleProductSelection(product.externalId)}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Selection summary */}
      {selectedCount > 0 && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            <span className="font-medium text-primary">
              {selectedCount} product{selectedCount !== 1 ? 's' : ''} selected for import
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-6">
        <Button variant="outline" onClick={prevStep} className="min-h-[44px] touch-manipulation">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center gap-3">
          {selectedCount === 0 && !isLoading && previewProducts.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Select at least one product to continue
            </p>
          )}
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={selectedCount === 0 || isLoading}
            className="min-w-[150px] min-h-[44px] touch-manipulation"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
