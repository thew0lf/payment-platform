'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Globe,
  Monitor,
  Clock,
  Calendar,
  DollarSign,
  Target,
  TrendingUp,
  ShoppingCart,
  RefreshCw,
  UserPlus,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  Plus,
  User,
  Check,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDate, cn } from '@/lib/utils';
import {
  leadsApi,
  Lead,
  leadStatusConfig,
  leadSourceConfig,
  formatLeadName,
  getLeadLocation,
} from '@/lib/api/leads';
import { customersApi, Customer, CreateCustomerInput } from '@/lib/api/customers';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { toast } from 'sonner';

// ═══════════════════════════════════════════════════════════════
// CONVERT TO CUSTOMER MODAL
// ═══════════════════════════════════════════════════════════════

interface ConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onConverted: (updatedLead: Lead) => void;
}

function ConvertToCustomerModal({ isOpen, onClose, lead, onConverted }: ConvertModalProps) {
  const { selectedCompanyId } = useHierarchy();
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [converting, setConverting] = useState(false);

  // Create customer form
  const [newEmail, setNewEmail] = useState(lead.email || '');
  const [newFirstName, setNewFirstName] = useState(lead.firstName || '');
  const [newLastName, setNewLastName] = useState(lead.lastName || '');
  const [newPhone, setNewPhone] = useState(lead.phone || '');
  const [creating, setCreating] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode('select');
      setSearchQuery(lead.email || '');
      setSelectedCustomer(null);
      setNewEmail(lead.email || '');
      setNewFirstName(lead.firstName || '');
      setNewLastName(lead.lastName || '');
      setNewPhone(lead.phone || '');
    }
  }, [isOpen, lead]);

  // Search customers
  useEffect(() => {
    if (!isOpen || mode !== 'select' || !searchQuery.trim()) {
      setCustomers([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const result = await customersApi.list({ search: searchQuery, limit: 10 });
        setCustomers(result.items);
      } catch (error) {
        console.error('Failed to search customers:', error);
        setCustomers([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, mode]);

  const handleLinkExisting = async () => {
    if (!selectedCustomer) return;

    setConverting(true);
    try {
      const updated = await leadsApi.convert(lead.id, { customerId: selectedCustomer.id });
      toast.success('Lead converted to customer');
      onConverted(updated);
      onClose();
    } catch (error) {
      console.error('Failed to convert lead:', error);
      toast.error('Failed to convert lead');
    } finally {
      setConverting(false);
    }
  };

  const handleCreateAndLink = async () => {
    if (!newEmail.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!selectedCompanyId) {
      toast.error('Please select a company first');
      return;
    }

    setCreating(true);
    try {
      // Create the customer
      const customerData: CreateCustomerInput = {
        email: newEmail.trim(),
        firstName: newFirstName.trim() || undefined,
        lastName: newLastName.trim() || undefined,
        phone: newPhone.trim() || undefined,
        companyId: selectedCompanyId,
      };

      const newCustomer = await customersApi.create(customerData);

      // Link to lead
      const updated = await leadsApi.convert(lead.id, { customerId: newCustomer.id });

      toast.success('Customer created and lead converted');
      onConverted(updated);
      onClose();
    } catch (error) {
      console.error('Failed to create customer:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create customer');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Convert to Customer</h2>
            <p className="text-sm text-muted-foreground">
              Link this lead to an existing customer or create a new one
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setMode('select')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              mode === 'select'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Search className="w-4 h-4 inline-block mr-2" />
            Link Existing
          </button>
          <button
            onClick={() => setMode('create')}
            className={cn(
              'flex-1 px-4 py-3 text-sm font-medium transition-colors',
              mode === 'create'
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Plus className="w-4 h-4 inline-block mr-2" />
            Create New
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {mode === 'select' ? (
            <div className="space-y-4">
              <Input
                placeholder="Search customers by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {searching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : customers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? 'No customers found' : 'Search for a customer'}
                  </div>
                ) : (
                  customers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => setSelectedCustomer(customer)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                        selectedCustomer?.id === customer.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {customer.firstName} {customer.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{customer.email}</p>
                      </div>
                      {selectedCustomer?.id === customer.id && (
                        <Check className="w-5 h-5 text-primary shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create a new customer with data from this lead.
              </p>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Email *
                </label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="customer@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    First Name
                  </label>
                  <Input
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Last Name
                  </label>
                  <Input
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Phone
                </label>
                <Input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {mode === 'select' ? (
            <Button onClick={handleLinkExisting} disabled={!selectedCustomer || converting}>
              {converting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Link to Customer
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleCreateAndLink} disabled={!newEmail.trim() || creating}>
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create & Link
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recalculating, setRecalculating] = useState(false);

  // Expandable sections
  const [showCapturedFields, setShowCapturedFields] = useState(false);
  const [showFieldLog, setShowFieldLog] = useState(false);
  const [showAttribution, setShowAttribution] = useState(false);

  // Convert to Customer modal
  const [showConvertModal, setShowConvertModal] = useState(false);

  useEffect(() => {
    async function fetchLead() {
      setLoading(true);
      setError(null);
      try {
        const data = await leadsApi.getById(id);
        setLead(data);
      } catch (err) {
        console.error('Failed to fetch lead:', err);
        setError('Failed to load lead');
      } finally {
        setLoading(false);
      }
    }
    fetchLead();
  }, [id]);

  const handleRecalculateScores = async () => {
    if (!lead) return;
    setRecalculating(true);
    try {
      const updated = await leadsApi.recalculateScores(lead.id);
      setLead(updated);
      toast.success('Scores recalculated');
    } catch (err) {
      console.error('Failed to recalculate:', err);
      toast.error('Failed to recalculate scores');
    } finally {
      setRecalculating(false);
    }
  };

  const handleConvertToCustomer = () => {
    if (!lead) return;
    setShowConvertModal(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header title="Lead Details" />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </main>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header title="Lead Details" />
        <main className="flex-1 flex flex-col items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error || 'Lead not found'}</p>
          <Button onClick={() => router.push('/leads')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leads
          </Button>
        </main>
      </div>
    );
  }

  const statusConf = leadStatusConfig[lead.status];
  const sourceConf = leadSourceConfig[lead.source];
  const location = getLeadLocation(lead);

  // Score display component
  const ScoreCard = ({
    title,
    score,
    icon: Icon,
    description,
  }: {
    title: string;
    score: number;
    icon: React.ElementType;
    description: string;
  }) => (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-gray-900 dark:text-foreground">
          {Math.round(score * 100)}%
        </span>
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-1">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              score >= 0.7 ? 'bg-green-500' : score >= 0.4 ? 'bg-amber-500' : 'bg-gray-400'
            )}
            style={{ width: `${score * 100}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{description}</p>
    </div>
  );

  // Info row component
  const InfoRow = ({
    icon: Icon,
    label,
    value,
    link,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | null | undefined;
    link?: string;
  }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2">
        <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-500">{label}</p>
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              {value}
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <p className="text-sm text-gray-900 dark:text-foreground truncate">{value}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header title="Lead Details" />

      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Top Actions */}
          <div className="flex items-center justify-between">
            <Link href="/leads">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Leads
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecalculateScores}
                disabled={recalculating}
              >
                {recalculating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Recalculate Scores
              </Button>
              {lead.status !== 'CONVERTED' && lead.email && (
                <Button size="sm" onClick={handleConvertToCustomer}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Convert to Customer
                </Button>
              )}
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Left Column - Lead Info */}
            <div className="md:col-span-2 space-y-6">
              {/* Status & Basic Info */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-foreground">
                      {formatLeadName(lead)}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={cn(statusConf.bgColor, statusConf.color, 'border-0')}>
                        {statusConf.label}
                      </Badge>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        via {sourceConf.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <InfoRow icon={Mail} label="Email" value={lead.email} link={lead.email ? `mailto:${lead.email}` : undefined} />
                  <InfoRow icon={Phone} label="Phone" value={lead.phone} link={lead.phone ? `tel:${lead.phone}` : undefined} />
                  <InfoRow icon={MapPin} label="Location" value={location} />
                  <InfoRow icon={Globe} label="IP Address" value={lead.ipAddress} />
                  <InfoRow icon={Monitor} label="Device" value={[lead.deviceType, lead.browser, lead.os].filter(Boolean).join(' / ')} />
                  <InfoRow icon={Clock} label="First Seen" value={formatDate(lead.firstSeenAt)} />
                  <InfoRow icon={Clock} label="Last Seen" value={formatDate(lead.lastSeenAt)} />
                </div>
              </div>

              {/* Scores */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4">
                  Lead Scores
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <ScoreCard
                    title="Engagement Score"
                    score={lead.engagementScore}
                    icon={Target}
                    description="Based on sessions, page views, and time on site"
                  />
                  <ScoreCard
                    title="Intent Score"
                    score={lead.intentScore}
                    icon={TrendingUp}
                    description="Likelihood of conversion based on behavior"
                  />
                </div>
              </div>

              {/* Funnel Progress */}
              {lead.funnelId && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4">
                    Funnel Progress
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Highest Stage</span>
                      <span className="font-medium text-gray-900 dark:text-foreground">
                        Stage {lead.highestStage}
                        {lead.lastStageName && ` - ${lead.lastStageName}`}
                      </span>
                    </div>
                    {lead.abandonStage !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Abandon Stage</span>
                        <span className="font-medium text-amber-600 dark:text-amber-400">
                          Stage {lead.abandonStage}
                          {lead.abandonReason && ` (${lead.abandonReason})`}
                        </span>
                      </div>
                    )}
                    {lead.sourceName && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Funnel</span>
                        <Link
                          href={`/funnels/${lead.funnelId}`}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {lead.sourceName}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Captured Fields (Expandable) */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button
                  onClick={() => setShowCapturedFields(!showCapturedFields)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground">
                    Captured Fields
                  </h3>
                  {showCapturedFields ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {showCapturedFields && (
                  <div className="px-4 pb-4">
                    {Object.keys(lead.capturedFields).length > 0 ? (
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                        <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
                          {JSON.stringify(lead.capturedFields, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No fields captured yet</p>
                    )}
                  </div>
                )}
              </div>

              {/* Field Capture Log (Expandable) */}
              {lead.fieldCaptureLog.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <button
                    onClick={() => setShowFieldLog(!showFieldLog)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground">
                      Field Capture Timeline ({lead.fieldCaptureLog.length})
                    </h3>
                    {showFieldLog ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  {showFieldLog && (
                    <div className="px-4 pb-4 space-y-2">
                      {lead.fieldCaptureLog.map((entry, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                        >
                          <div>
                            <span className="font-medium text-gray-900 dark:text-foreground">
                              {entry.field}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400 mx-2">=</span>
                            <span className="text-gray-600 dark:text-gray-300 truncate max-w-[200px] inline-block align-bottom">
                              {entry.value}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            Stage {entry.stage} &middot; {formatDate(entry.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Attribution (Expandable) */}
              {(lead.utmSource || lead.referrer || lead.landingPage) && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <button
                    onClick={() => setShowAttribution(!showAttribution)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground">
                      Attribution & UTM
                    </h3>
                    {showAttribution ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  {showAttribution && (
                    <div className="px-4 pb-4">
                      <div className="grid sm:grid-cols-2 gap-2">
                        <InfoRow icon={Globe} label="Referrer" value={lead.referrer} />
                        <InfoRow icon={Globe} label="Landing Page" value={lead.landingPage} />
                        <InfoRow icon={Globe} label="UTM Source" value={lead.utmSource} />
                        <InfoRow icon={Globe} label="UTM Medium" value={lead.utmMedium} />
                        <InfoRow icon={Globe} label="UTM Campaign" value={lead.utmCampaign} />
                        <InfoRow icon={Globe} label="UTM Term" value={lead.utmTerm} />
                        <InfoRow icon={Globe} label="UTM Content" value={lead.utmContent} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Value & Activity */}
            <div className="space-y-6">
              {/* Value Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4">Value</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 uppercase">
                      Estimated Value
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-foreground">
                      ${Number(lead.estimatedValue).toLocaleString()}
                    </p>
                  </div>
                  {lead.cartValue > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-500 uppercase">Cart Value</p>
                      <p className="text-xl font-semibold text-gray-900 dark:text-foreground flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-gray-400" />
                        ${Number(lead.cartValue).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Activity Stats */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4">
                  Activity
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Sessions</span>
                    <span className="font-medium text-gray-900 dark:text-foreground">
                      {lead.totalSessions}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Page Views</span>
                    <span className="font-medium text-gray-900 dark:text-foreground">
                      {lead.totalPageViews}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Time on Site</span>
                    <span className="font-medium text-gray-900 dark:text-foreground">
                      {Math.round(lead.totalTimeOnSite / 60)}m
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Contact Count</span>
                    <span className="font-medium text-gray-900 dark:text-foreground">
                      {lead.contactCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-foreground mb-4">
                  Timeline
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Created</span>
                    <span className="text-gray-900 dark:text-foreground">{formatDate(lead.createdAt)}</span>
                  </div>
                  {lead.qualifiedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Qualified</span>
                      <span className="text-green-600 dark:text-green-400">
                        {formatDate(lead.qualifiedAt)}
                      </span>
                    </div>
                  )}
                  {lead.convertedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Converted</span>
                      <span className="text-purple-600 dark:text-purple-400">
                        {formatDate(lead.convertedAt)}
                      </span>
                    </div>
                  )}
                  {lead.lastContactedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Last Contacted</span>
                      <span className="text-gray-900 dark:text-foreground">
                        {formatDate(lead.lastContactedAt)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Conversion Info */}
              {lead.customerId && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-6">
                  <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
                    Converted Customer
                  </h3>
                  <Link
                    href={`/customers/${lead.customerId}`}
                    className="text-purple-600 dark:text-purple-400 hover:underline text-sm flex items-center gap-1"
                  >
                    View Customer Profile
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Convert to Customer Modal */}
      <ConvertToCustomerModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        lead={lead}
        onConverted={setLead}
      />
    </div>
  );
}
