'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Building2,
  Mail,
  Phone,
  Globe,
  Star,
  CheckCircle2,
  Clock,
  AlertCircle,
  Package,
  Link2,
  ShoppingCart,
  Edit2,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  vendorsApi,
  vendorCompaniesApi,
  Vendor,
  VendorCompany,
  VendorStatus,
  VendorTier,
  VendorType,
} from '@/lib/api/vendors';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<
  VendorStatus,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PENDING_VERIFICATION: { label: 'Pending Verification', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Clock },
  VERIFIED: { label: 'Verified', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: CheckCircle2 },
  ACTIVE: { label: 'Active', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 },
  SUSPENDED: { label: 'Suspended', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: AlertCircle },
  INACTIVE: { label: 'Inactive', color: 'bg-muted text-muted-foreground border-border', icon: AlertCircle },
};

const TIER_CONFIG: Record<VendorTier, { label: string; color: string }> = {
  BRONZE: { label: 'Bronze', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  SILVER: { label: 'Silver', color: 'bg-muted text-muted-foreground border-border' },
  GOLD: { label: 'Gold', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  PLATINUM: { label: 'Platinum', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
};

const TYPE_CONFIG: Record<VendorType, { label: string }> = {
  SUPPLIER: { label: 'Supplier' },
  DROPSHIPPER: { label: 'Dropshipper' },
  WHITE_LABEL: { label: 'White Label' },
  AFFILIATE: { label: 'Affiliate' },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: VendorStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.INACTIVE;
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border', config.color)}>
      <Icon className="w-4 h-4" />
      {config.label}
    </span>
  );
}

function TierBadge({ tier }: { tier: VendorTier }) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.BRONZE;
  return (
    <span className={cn('inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border', config.color)}>
      {config.label} Tier
    </span>
  );
}

function RatingStars({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={cn(
            'w-4 h-4',
            i < fullStars
              ? 'text-yellow-400 fill-yellow-400'
              : i === fullStars && hasHalfStar
              ? 'text-yellow-400 fill-yellow-400/50'
              : 'text-muted-foreground'
          )}
        />
      ))}
      <span className="ml-2 text-sm text-muted-foreground">{rating.toFixed(1)}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color = 'cyan',
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'cyan' | 'green' | 'purple' | 'yellow';
}) {
  const colorClasses = {
    cyan: 'bg-primary/10 text-primary',
    green: 'bg-green-500/10 text-green-400',
    purple: 'bg-purple-500/10 text-purple-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
  };

  return (
    <div className="bg-card/50 border border-border rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function VendorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params?.id as string;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [vendorCompanies, setVendorCompanies] = useState<VendorCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchVendor = async () => {
    setLoading(true);
    setError(null);

    try {
      const [vendorData, companiesData] = await Promise.all([
        vendorsApi.get(vendorId),
        vendorCompaniesApi.listByVendor(vendorId),
      ]);
      setVendor(vendorData);
      setVendorCompanies(companiesData);
    } catch (err) {
      console.error('Failed to fetch vendor:', err);
      setError('Failed to load vendor details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (vendorId) {
      fetchVendor();
    }
  }, [vendorId]);

  const handleVerify = async (isVerified: boolean) => {
    try {
      const updated = await vendorsApi.verify(vendorId, isVerified);
      setVendor(updated);
    } catch (err) {
      console.error('Failed to verify vendor:', err);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await vendorsApi.delete(vendorId);
      toast.success('Vendor deleted successfully');
      router.push('/vendors');
    } catch (err) {
      console.error('Failed to delete vendor:', err);
      toast.error('Failed to delete vendor. Please try again.');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  // Error State
  if (error || !vendor) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Failed to load vendor</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={fetchVendor}
            className="px-4 py-2 bg-muted hover:bg-muted text-foreground rounded-lg text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <Link
            href="/vendors"
            className="mt-1 p-2 rounded-lg bg-muted hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-2xl font-bold text-foreground">
              {vendor.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-foreground">{vendor.name}</h1>
                <span className="text-sm text-muted-foreground font-mono">{vendor.code}</span>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={vendor.status} />
                <TierBadge tier={vendor.tier} />
                <span className="text-sm text-muted-foreground">{TYPE_CONFIG[vendor.vendorType]?.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 rounded-lg bg-muted hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {showActions && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-muted border border-border rounded-lg shadow-xl overflow-hidden z-10">
              <Link
                href={`/vendors/${vendorId}/edit`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted"
                onClick={() => setShowActions(false)}
              >
                <Edit2 className="w-4 h-4" />
                Edit Vendor
              </Link>
              {!vendor.isVerified && (
                <button
                  onClick={() => {
                    handleVerify(true);
                    setShowActions(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-400 hover:bg-muted"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Verify Vendor
                </button>
              )}
              <button
                onClick={() => {
                  handleDelete();
                  setShowActions(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-muted"
              >
                <Trash2 className="w-4 h-4" />
                Delete Vendor
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Companies"
          value={vendor._count?.vendorCompanies || vendorCompanies.length}
          icon={Building2}
          color="cyan"
        />
        <StatCard
          label="Connections"
          value={vendor._count?.clientConnections || 0}
          icon={Link2}
          color="purple"
        />
        <StatCard
          label="Total Orders"
          value={vendor.totalOrders}
          icon={ShoppingCart}
          color="green"
        />
        <StatCard
          label="Completion Rate"
          value={`${vendor.completionRate.toFixed(0)}%`}
          icon={Package}
          color="yellow"
        />
      </div>

      {/* Rating */}
      <div className="bg-card/50 border border-border rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Average Rating</p>
            <RatingStars rating={vendor.averageRating} />
          </div>
          {vendor.isVerified && (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Verified Vendor</span>
            </div>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card/50 border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Contact Information</h2>
          <div className="space-y-4">
            {vendor.contactName && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Contact Name</p>
                <p className="text-sm text-foreground">{vendor.contactName}</p>
              </div>
            )}
            {vendor.contactEmail && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${vendor.contactEmail}`} className="text-sm text-primary hover:underline">
                  {vendor.contactEmail}
                </a>
              </div>
            )}
            {vendor.contactPhone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a href={`tel:${vendor.contactPhone}`} className="text-sm text-foreground">
                  {vendor.contactPhone}
                </a>
              </div>
            )}
            {vendor.website && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {vendor.website}
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card/50 border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Business Information</h2>
          <div className="space-y-4">
            {vendor.businessName && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Business Name</p>
                <p className="text-sm text-foreground">{vendor.businessName}</p>
              </div>
            )}
            {vendor.taxId && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tax ID</p>
                <p className="text-sm text-foreground font-mono">{vendor.taxId}</p>
              </div>
            )}
            {vendor.description && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-foreground">{vendor.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Vendor Companies */}
      <div className="bg-card/50 border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Vendor Companies ({vendorCompanies.length})
          </h2>
          <Link
            href={`/vendors/${vendorId}/companies/new`}
            className="text-sm text-primary hover:text-primary transition-colors"
          >
            + Add Company
          </Link>
        </div>

        {vendorCompanies.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No vendor companies yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {vendorCompanies.map((company) => (
              <Link
                key={company.id}
                href={`/vendors/${vendorId}/companies/${company.id}`}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-sm font-bold text-foreground">
                    {company.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{company.name}</p>
                    <p className="text-xs text-muted-foreground">{company.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{company._count?.products || 0} products</span>
                  <span>{company._count?.clientConnections || 0} connections</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground mb-2">Delete Vendor?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Are you sure you want to delete &quot;{vendor.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Delete Vendor
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
