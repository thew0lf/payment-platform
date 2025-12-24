'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Building2,
  Mail,
  Phone,
  Globe,
  FileText,
  User,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  vendorsApi,
  CreateVendorInput,
  VendorType,
} from '@/lib/api/vendors';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const VENDOR_TYPES: { value: VendorType; label: string; description: string }[] = [
  { value: 'SUPPLIER', label: 'Supplier', description: 'Provides products or raw materials' },
  { value: 'DROPSHIPPER', label: 'Dropshipper', description: 'Ships directly to customers' },
  { value: 'WHITE_LABEL', label: 'White Label', description: 'Provides products for rebranding' },
  { value: 'AFFILIATE', label: 'Affiliate', description: 'Promotes products for commission' },
];

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function NewVendorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateVendorInput>({
    name: '',
    slug: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    businessName: '',
    taxId: '',
    website: '',
    description: '',
    vendorType: 'SUPPLIER',
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const vendor = await vendorsApi.create(formData);
      router.push(`/vendors/${vendor.id}`);
    } catch (err: unknown) {
      console.error('Failed to create vendor:', err);
      // User-friendly error messages based on common scenarios
      let errorMessage = "We couldn't create this vendor right now. Please check your connection and try again.";
      if (err instanceof Error) {
        if (err.message.includes('slug') && err.message.includes('exists')) {
          errorMessage = `A vendor with the slug "${formData.slug}" already exists. Try a different name or customize the slug.`;
        } else if (err.message.includes('email') && err.message.includes('invalid')) {
          errorMessage = "That email address doesn't look quite right. Please check the format (e.g., name@company.com).";
        } else if (err.message.includes('url') || err.message.includes('website')) {
          errorMessage = "The website URL needs to include https:// (e.g., https://vendor.com).";
        } else if (err.message.includes('required')) {
          errorMessage = "Please fill in all required fields marked with *.";
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          errorMessage = "Connection issue—please check your internet and try again.";
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = 'w-full px-4 py-2.5 bg-card border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors';
  const labelClasses = 'block text-sm font-medium text-muted-foreground mb-1.5';

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/vendors"
          className="p-2 rounded-lg bg-muted hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add New Vendor</h1>
          <p className="text-sm text-muted-foreground mt-1">Expand your network with a new vendor partner</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-card/50 border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Basic Information
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>
                  Vendor Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Acme Fulfillment Co."
                  className={inputClasses}
                />
                <p className="text-xs text-muted-foreground mt-1">The name you'll see in your dashboard</p>
              </div>
              <div>
                <label className={labelClasses}>
                  Slug <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="acme-fulfillment"
                  className={inputClasses}
                />
                <p className="text-xs text-muted-foreground mt-1">Auto-generated from name—customize if needed</p>
              </div>
            </div>

            <div>
              <label className={labelClasses}>Business Name</label>
              <input
                type="text"
                value={formData.businessName || ''}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="Acme Fulfillment Corporation"
                className={inputClasses}
              />
              <p className="text-xs text-muted-foreground mt-1">Official registered business name (if different)</p>
            </div>

            <div>
              <label className={labelClasses}>Tax ID</label>
              <input
                type="text"
                value={formData.taxId || ''}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                placeholder="12-3456789"
                className={inputClasses}
              />
              <p className="text-xs text-muted-foreground mt-1">EIN or tax identification number for invoicing</p>
            </div>

            <div>
              <label className={labelClasses}>Website</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="url"
                  value={formData.website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://acmefulfillment.com"
                  className={cn(inputClasses, 'pl-10')}
                />
              </div>
            </div>

            <div>
              <label className={labelClasses}>Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this vendor provide? E.g., Same-day fulfillment for US orders with warehouses in CA, TX, and NY."
                rows={3}
                className={cn(inputClasses, 'resize-none')}
              />
              <p className="text-xs text-muted-foreground mt-1">Help your team understand what this vendor offers</p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-card/50 border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Contact Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className={labelClasses}>Contact Name</label>
              <input
                type="text"
                value={formData.contactName || ''}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="Jane Smith"
                className={inputClasses}
              />
              <p className="text-xs text-muted-foreground mt-1">Who should we reach out to for questions?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={formData.contactEmail || ''}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="jane@acmefulfillment.com"
                    className={cn(inputClasses, 'pl-10')}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Best email for order updates</p>
              </div>
              <div>
                <label className={labelClasses}>Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="tel"
                    value={formData.contactPhone || ''}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className={cn(inputClasses, 'pl-10')}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">For urgent fulfillment issues</p>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Type */}
        <div className="bg-card/50 border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Vendor Type
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {VENDOR_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData({ ...formData, vendorType: type.value })}
                className={cn(
                  'p-4 rounded-lg border text-left transition-colors',
                  formData.vendorType === type.value
                    ? 'bg-primary/10 border-primary/50 text-foreground'
                    : 'bg-card border-border text-muted-foreground hover:border-border hover:text-foreground'
                )}
              >
                <p className="font-medium">{type.label}</p>
                <p className="text-xs mt-1 opacity-70">{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/vendors"
            className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !formData.name || !formData.slug}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary disabled:bg-muted disabled:cursor-not-allowed text-foreground rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Setting up your vendor...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Create Vendor
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
