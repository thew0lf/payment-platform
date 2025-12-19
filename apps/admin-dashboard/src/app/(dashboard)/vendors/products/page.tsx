'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Package,
  DollarSign,
  Boxes,
  AlertTriangle,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  TrendingDown,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  vendorProductsApi,
  vendorCompaniesApi,
  VendorProduct,
  VendorCompany,
  CreateVendorProductInput,
} from '@/lib/api/vendors';

const PAGE_SIZE = 25;

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function VendorProductsPage() {
  // Data state
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [companies, setCompanies] = useState<VendorCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<VendorProduct | null>(null);
  const [productToDelete, setProductToDelete] = useState<VendorProduct | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateVendorProductInput>>({});
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load companies for filter
  useEffect(() => {
    vendorCompaniesApi.list({ limit: 100 }).then((res) => {
      setCompanies(res.items);
    });
  }, []);

  // Load products
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      };
      if (search) params.search = search;
      if (companyFilter !== 'all') params.vendorCompanyId = companyFilter;
      if (stockFilter === 'low') params.lowStock = true;
      if (stockFilter === 'out') params.outOfStock = true;

      const result = await vendorProductsApi.list(params as any);
      setProducts(result.items);
      setTotal(result.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  }, [search, companyFilter, stockFilter, page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(0);
      loadProducts();
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Handle create
  const handleCreate = async () => {
    if (!formData.vendorCompanyId || !formData.sku || !formData.name || !formData.wholesalePrice || !formData.retailPrice) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await vendorProductsApi.create(formData as CreateVendorProductInput);
      toast.success('Product created successfully');
      setShowCreateModal(false);
      setFormData({});
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle stock update
  const handleStockUpdate = async () => {
    if (!selectedProduct) return;
    setIsSubmitting(true);
    try {
      await vendorProductsApi.updateStock(selectedProduct.id, stockQuantity);
      toast.success('Stock updated');
      setShowStockModal(false);
      setSelectedProduct(null);
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      await vendorProductsApi.delete(productToDelete.id);
      toast.success('Product deleted');
      setProductToDelete(null);
      loadProducts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete product');
    }
  };

  const openStockModal = (product: VendorProduct) => {
    setSelectedProduct(product);
    setStockQuantity(product.stockQuantity);
    setShowStockModal(true);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const lowStockCount = products.filter(p => p.stockQuantity > 0 && p.stockQuantity <= (p.lowStockThreshold || 10)).length;
  const outOfStockCount = products.filter(p => p.stockQuantity === 0).length;

  return (
    <>
      <Header
        title="Vendor Products"
        subtitle="Manage products from vendor companies"
        actions={
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Product</span>
          </Button>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{total}</p>
                  <p className="text-xs text-muted-foreground">Total Products</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Boxes className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{products.filter(p => p.isActive).length}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{lowStockCount}</p>
                  <p className="text-xs text-muted-foreground">Low Stock</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{outOfStockCount}</p>
                  <p className="text-xs text-muted-foreground">Out of Stock</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={companyFilter} onValueChange={(v) => { setCompanyFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={stockFilter} onValueChange={(v) => { setStockFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={loadProducts} className="mt-4">Try Again</Button>
            </CardContent>
          </Card>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">
                {search || companyFilter !== 'all' || stockFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Add your first vendor product to get started'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="hidden sm:table-cell">Company</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= (product.lowStockThreshold || 10);
                  const isOutOfStock = product.stockQuantity === 0;

                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt=""
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                              <Package className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.categories?.length > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {product.categories[0]}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {product.vendorCompany?.name || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        ${product.wholesalePrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => openStockModal(product)}
                          className={cn(
                            'font-medium hover:underline',
                            isOutOfStock && 'text-red-400',
                            isLowStock && 'text-amber-400',
                          )}
                        >
                          {product.stockQuantity}
                        </button>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={product.isActive ? 'default' : 'secondary'}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openStockModal(product)}>
                              <Boxes className="w-4 h-4 mr-2" />
                              Update Stock
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setProductToDelete(product)}
                              className="text-red-400 focus:text-red-400"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Vendor Product</DialogTitle>
            <DialogDescription>
              Add a new product from a vendor company.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Vendor Company *</Label>
              <Select
                value={formData.vendorCompanyId || ''}
                onValueChange={(v) => setFormData({ ...formData, vendorCompanyId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SKU *</Label>
              <Input
                value={formData.sku || ''}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="e.g., PROD-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Premium Widget"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Wholesale Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.wholesalePrice || ''}
                  onChange={(e) => setFormData({ ...formData, wholesalePrice: parseFloat(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Retail Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.retailPrice || ''}
                  onChange={(e) => setFormData({ ...formData, retailPrice: parseFloat(e.target.value) })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Stock Qty</Label>
              <Input
                type="number"
                value={formData.stockQuantity || 0}
                onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Update Modal */}
      <Dialog open={showStockModal} onOpenChange={setShowStockModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
            <DialogDescription>
              {selectedProduct?.name} ({selectedProduct?.sku})
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Stock Quantity</Label>
            <Input
              type="number"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStockModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleStockUpdate} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Product?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{productToDelete?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
