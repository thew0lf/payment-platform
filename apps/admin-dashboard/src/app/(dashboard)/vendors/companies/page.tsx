'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Building2,
  Globe,
  MapPin,
  Package,
  MoreHorizontal,
  Edit,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  vendorCompaniesApi,
  vendorsApi,
  VendorCompany,
  Vendor,
  CreateVendorCompanyInput,
} from '@/lib/api/vendors';

const PAGE_SIZE = 20;

// ═══════════════════════════════════════════════════════════════
// STATUS HELPERS
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  INACTIVE: { label: 'Inactive', color: 'bg-muted text-muted-foreground border-border' },
  SUSPENDED: { label: 'Suspended', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.INACTIVE;
  return (
    <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border', config.color)}>
      {config.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function VendorCompaniesPage() {
  const router = useRouter();

  // Data state
  const [companies, setCompanies] = useState<VendorCompany[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<VendorCompany | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<CreateVendorCompanyInput>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load vendors for filter dropdown
  useEffect(() => {
    vendorsApi.list({ limit: 100, status: 'ACTIVE' }).then((res) => {
      setVendors(res.items);
    });
  }, []);

  // Load companies
  const loadCompanies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      };
      if (search) params.search = search;
      if (vendorFilter !== 'all') params.vendorId = vendorFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const result = await vendorCompaniesApi.list(params as any);
      setCompanies(result.items);
      setTotal(result.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load vendor companies');
    } finally {
      setIsLoading(false);
    }
  }, [search, vendorFilter, statusFilter, page]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(0);
      loadCompanies();
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Handle create
  const handleCreate = async () => {
    setFormError(null);

    if (!formData.vendorId || !formData.name) {
      setFormError('Please select a vendor and enter a company name to continue.');
      return;
    }

    setIsSubmitting(true);
    try {
      const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await vendorCompaniesApi.create({
        ...formData,
        slug,
      } as CreateVendorCompanyInput);
      toast.success('Vendor company created! Time to get things rolling.');
      setShowCreateModal(false);
      setFormData({});
      setFormError(null);
      loadCompanies();
    } catch (err: any) {
      const errorMessage = err.message || 'Something went wrong while creating the company. Please try again.';
      if (errorMessage.includes('slug') && errorMessage.includes('exists')) {
        setFormError('A company with this name already exists. Try a slightly different name.');
      } else if (errorMessage.includes('domain') && errorMessage.includes('exists')) {
        setFormError('That domain is already in use by another company.');
      } else {
        setFormError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!companyToDelete) return;
    try {
      await vendorCompaniesApi.delete(companyToDelete.id);
      toast.success('Vendor company deleted');
      setCompanyToDelete(null);
      loadCompanies();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete vendor company');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <Header
        title="Vendor Companies"
        subtitle="Manage business units within vendor organizations"
        actions={
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Company</span>
          </Button>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={vendorFilter} onValueChange={(v) => { setVendorFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
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
              <Button onClick={loadCompanies} className="mt-4">Try Again</Button>
            </CardContent>
          </Card>
        ) : companies.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No vendor companies found</h3>
              <p className="text-muted-foreground mb-4">
                {search || vendorFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first vendor company to get started'}
              </p>
              {!search && vendorFilter === 'all' && statusFilter === 'all' && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Company
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <Card key={company.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        {company.logo ? (
                          <img src={company.logo} alt="" className="w-8 h-8 rounded" />
                        ) : (
                          <Building2 className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{company.name}</h3>
                        <p className="text-xs text-muted-foreground">{company.code}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/vendors/companies/${company.id}`}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/vendors/companies/${company.id}/edit`}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setCompanyToDelete(company)}
                          className="text-red-400 focus:text-red-400"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2 text-sm">
                    {company.domain && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="w-4 h-4" />
                        <span className="truncate">{company.domain}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{company.timezone || 'UTC'} / {company.currency || 'USD'}</span>
                    </div>
                    {company.productCategories && company.productCategories.length > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Package className="w-4 h-4" />
                        <span className="truncate">
                          {company.productCategories.slice(0, 2).join(', ')}
                          {company.productCategories.length > 2 && ` +${company.productCategories.length - 2}`}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <StatusBadge status={company.status} />
                    <Link
                      href={`/vendors/${company.vendorId}`}
                      className="text-xs text-primary hover:underline"
                    >
                      View Vendor
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        setShowCreateModal(open);
        if (!open) {
          setFormError(null);
          setFormData({});
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
            <DialogHeader>
              <DialogTitle>Add vendor company</DialogTitle>
              <DialogDescription>
                Set up a new business unit within your vendor network. You can configure settings and add team members after creation.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="vendor">Parent Vendor *</Label>
                <Select
                  value={formData.vendorId || ''}
                  onValueChange={(v) => setFormData({ ...formData, vendorId: v })}
                >
                  <SelectTrigger id="vendor">
                    <SelectValue placeholder="Choose a vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.length === 0 ? (
                      <SelectItem value="" disabled>No vendors available</SelectItem>
                    ) : (
                      vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="West Coast Fulfillment"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={formData.domain || ''}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  placeholder="westcoast.vendor.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={formData.timezone || 'America/Los_Angeles'}
                    onValueChange={(v) => setFormData({ ...formData, timezone: v })}
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                      <SelectItem value="America/Denver">Mountain</SelectItem>
                      <SelectItem value="America/Chicago">Central</SelectItem>
                      <SelectItem value="America/New_York">Eastern</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency || 'USD'}
                    onValueChange={(v) => setFormData({ ...formData, currency: v })}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {formError}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !formData.vendorId || !formData.name}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create company
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!companyToDelete} onOpenChange={() => setCompanyToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete vendor company?</DialogTitle>
            <DialogDescription>
              This will permanently remove &quot;{companyToDelete?.name}&quot; and all its associated data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCompanyToDelete(null)}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Yes, delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
