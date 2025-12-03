'use client';

import { useState, useEffect, useCallback } from 'react';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  domainsApi,
  paymentPagesApi,
  PaymentPageDomain,
  PaymentPage,
  SSL_STATUSES,
  DomainVerificationResult,
} from '@/lib/api/payment-pages';
import {
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
  Shield,
  Loader2,
  ChevronRight,
  Info,
} from 'lucide-react';
import Link from 'next/link';

// ═══════════════════════════════════════════════════════════════
// CUSTOM DOMAINS MANAGEMENT PAGE
// ═══════════════════════════════════════════════════════════════

export default function DomainsPage() {
  const { selectedCompanyId } = useHierarchy();
  const [domains, setDomains] = useState<PaymentPageDomain[]>([]);
  const [pages, setPages] = useState<PaymentPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<PaymentPageDomain | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<DomainVerificationResult | null>(null);

  // Load domains and pages
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [domainsData, pagesData] = await Promise.all([
        domainsApi.list(selectedCompanyId || undefined),
        paymentPagesApi.list(selectedCompanyId || undefined, { status: 'PUBLISHED' }, 1, 100),
      ]);
      setDomains(domainsData);
      setPages(pagesData.items);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load domains');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Verify domain
  const handleVerify = async (domainId: string) => {
    try {
      setVerifying(domainId);
      setVerificationResult(null);
      const result = await domainsApi.verify(domainId, selectedCompanyId || undefined);
      setVerificationResult(result);
      if (result.success) {
        // Refresh domains list
        loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setVerifying(null);
    }
  };

  // Delete domain
  const handleDelete = async (domainId: string) => {
    if (!confirm('Are you sure you want to remove this domain?')) return;
    try {
      await domainsApi.delete(domainId, selectedCompanyId || undefined);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete domain');
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
            <Link href="/payment-pages" className="hover:text-zinc-300">
              Payment Pages
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-zinc-300">Custom Domains</span>
          </div>
          <h1 className="text-2xl font-semibold text-white">Custom Domains</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Configure custom domains for your checkout pages
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Domain
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Error</p>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Domains List */}
      {domains.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-12 text-center">
          <Globe className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Custom Domains</h3>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto">
            Add a custom domain to use your own URL for checkout pages instead of the default avnz.io subdomain.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Your First Domain
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => (
            <DomainCard
              key={domain.id}
              domain={domain}
              pages={pages}
              onVerify={() => handleVerify(domain.id)}
              onDelete={() => handleDelete(domain.id)}
              onSelect={() => setSelectedDomain(domain)}
              verifying={verifying === domain.id}
              copyToClipboard={copyToClipboard}
            />
          ))}
        </div>
      )}

      {/* Verification Result Modal */}
      {verificationResult && (
        <VerificationResultModal
          result={verificationResult}
          onClose={() => setVerificationResult(null)}
        />
      )}

      {/* Add Domain Modal */}
      {showAddModal && (
        <AddDomainModal
          pages={pages}
          companyId={selectedCompanyId || undefined}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadData();
          }}
        />
      )}

      {/* Domain Detail Modal */}
      {selectedDomain && (
        <DomainDetailModal
          domain={selectedDomain}
          pages={pages}
          companyId={selectedCompanyId || undefined}
          onClose={() => setSelectedDomain(null)}
          onUpdate={loadData}
          copyToClipboard={copyToClipboard}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DOMAIN CARD COMPONENT
// ─────────────────────────────────────────────────────────────

interface DomainCardProps {
  domain: PaymentPageDomain;
  pages: PaymentPage[];
  onVerify: () => void;
  onDelete: () => void;
  onSelect: () => void;
  verifying: boolean;
  copyToClipboard: (text: string) => void;
}

function DomainCard({ domain, pages, onVerify, onDelete, onSelect, verifying, copyToClipboard }: DomainCardProps) {
  const sslStatus = SSL_STATUSES[domain.sslStatus] || SSL_STATUSES.PENDING;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Status Icon */}
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            domain.isVerified ? 'bg-green-500/10' : 'bg-yellow-500/10'
          }`}>
            {domain.isVerified ? (
              <CheckCircle className="h-5 w-5 text-green-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            )}
          </div>

          <div>
            {/* Domain Name */}
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium text-white">{domain.domain}</h3>
              <a
                href={`https://${domain.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-500 hover:text-zinc-300"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            {/* Status Badges */}
            <div className="flex items-center gap-2 mt-2">
              {/* Verification Status */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                domain.isVerified
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-yellow-500/10 text-yellow-400'
              }`}>
                {domain.isVerified ? 'Verified' : 'Pending Verification'}
              </span>

              {/* SSL Status */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sslStatus.color}`}>
                <Shield className="h-3 w-3" />
                SSL {sslStatus.label}
              </span>
            </div>

            {/* Default Page */}
            {domain.defaultPage && (
              <p className="text-sm text-zinc-400 mt-2">
                Default page: <span className="text-zinc-300">{domain.defaultPage.name}</span>
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!domain.isVerified && (
            <button
              onClick={onVerify}
              disabled={verifying}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {verifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Verify
            </button>
          )}
          <button
            onClick={onSelect}
            className="px-3 py-1.5 text-sm text-zinc-300 hover:text-white border border-zinc-700 rounded-lg hover:border-zinc-600"
          >
            Configure
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* DNS Instructions (if not verified) */}
      {!domain.isVerified && (
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <p className="text-sm text-zinc-400 mb-3">
            Add these DNS records to verify your domain:
          </p>
          <div className="space-y-2">
            {/* CNAME Record */}
            <DnsRecordRow
              record={domain.dnsInstructions.cname}
              copyToClipboard={copyToClipboard}
            />
            {/* TXT Record */}
            <DnsRecordRow
              record={domain.dnsInstructions.verification}
              copyToClipboard={copyToClipboard}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DNS RECORD ROW
// ─────────────────────────────────────────────────────────────

interface DnsRecordRowProps {
  record: { host: string; type: string; value: string; ttl: number };
  copyToClipboard: (text: string) => void;
}

function DnsRecordRow({ record, copyToClipboard }: DnsRecordRowProps) {
  return (
    <div className="flex items-center gap-4 bg-zinc-800/50 rounded-lg p-3 text-sm">
      <div className="w-16">
        <span className="px-2 py-0.5 bg-zinc-700 rounded text-zinc-300 font-mono text-xs">
          {record.type}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-zinc-400 text-xs mb-1">Host</div>
        <div className="text-zinc-200 font-mono truncate">{record.host}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-zinc-400 text-xs mb-1">Value</div>
        <div className="text-zinc-200 font-mono truncate">{record.value}</div>
      </div>
      <button
        onClick={() => copyToClipboard(record.value)}
        className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-700"
        title="Copy value"
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ADD DOMAIN MODAL
// ─────────────────────────────────────────────────────────────

interface AddDomainModalProps {
  pages: PaymentPage[];
  companyId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AddDomainModal({ pages, companyId, onClose, onSuccess }: AddDomainModalProps) {
  const [domain, setDomain] = useState('');
  const [defaultPageId, setDefaultPageId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      await domainsApi.create(
        { domain: domain.trim(), defaultPageId: defaultPageId || undefined },
        companyId,
      );
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to add domain');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-white">Add Custom Domain</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Use your own domain for checkout pages
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Domain Name
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="checkout.example.com"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-zinc-500 mt-1">
                Enter your subdomain (e.g., checkout.yoursite.com)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Default Payment Page
              </label>
              <select
                value={defaultPageId}
                onChange={(e) => setDefaultPageId(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select a page (optional)</option>
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500 mt-1">
                Page shown when visitors go to your domain root
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">After adding your domain:</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-200/80">
                    <li>Add the CNAME record to point to our servers</li>
                    <li>Add the TXT record for domain verification</li>
                    <li>Click &quot;Verify&quot; to complete setup</li>
                    <li>SSL certificate will be automatically provisioned</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!domain.trim() || submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Domain
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// VERIFICATION RESULT MODAL
// ─────────────────────────────────────────────────────────────

interface VerificationResultModalProps {
  result: DomainVerificationResult;
  onClose: () => void;
}

function VerificationResultModal({ result, onClose }: VerificationResultModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md">
        <div className="p-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            result.success ? 'bg-green-500/10' : 'bg-yellow-500/10'
          }`}>
            {result.success ? (
              <CheckCircle className="h-8 w-8 text-green-400" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
            )}
          </div>

          <h2 className={`text-xl font-semibold text-center mb-2 ${
            result.success ? 'text-green-400' : 'text-yellow-400'
          }`}>
            {result.success ? 'Domain Verified!' : 'Verification Incomplete'}
          </h2>

          <p className="text-zinc-400 text-center text-sm mb-6">
            {result.success
              ? 'Your domain has been verified successfully. SSL certificate is being provisioned.'
              : 'Some DNS records are missing or incorrect.'}
          </p>

          {/* Status Checklist */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
              {result.cnameVerified ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              <span className="text-sm text-zinc-300">CNAME Record</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
              {result.txtVerified ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              <span className="text-sm text-zinc-300">TXT Verification Record</span>
            </div>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6">
              <p className="text-sm font-medium text-red-400 mb-2">Issues found:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-300">
                {result.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DOMAIN DETAIL MODAL
// ─────────────────────────────────────────────────────────────

interface DomainDetailModalProps {
  domain: PaymentPageDomain;
  pages: PaymentPage[];
  companyId?: string;
  onClose: () => void;
  onUpdate: () => void;
  copyToClipboard: (text: string) => void;
}

function DomainDetailModal({ domain, pages, companyId, onClose, onUpdate, copyToClipboard }: DomainDetailModalProps) {
  const [defaultPageId, setDefaultPageId] = useState(domain.defaultPageId || '');
  const [saving, setSaving] = useState(false);
  const sslStatus = SSL_STATUSES[domain.sslStatus] || SSL_STATUSES.PENDING;

  const handleSave = async () => {
    try {
      setSaving(true);
      await domainsApi.update(domain.id, { defaultPageId: defaultPageId || null }, companyId);
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Failed to update domain:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-semibold text-white">{domain.domain}</h2>
          <p className="text-sm text-zinc-400 mt-1">Configure domain settings</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Section */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-800/50 rounded-lg p-4">
              <p className="text-sm text-zinc-400 mb-2">Verification Status</p>
              <div className="flex items-center gap-2">
                {domain.isVerified ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                )}
                <span className={`font-medium ${domain.isVerified ? 'text-green-400' : 'text-yellow-400'}`}>
                  {domain.isVerified ? 'Verified' : 'Pending'}
                </span>
              </div>
              {domain.verifiedAt && (
                <p className="text-xs text-zinc-500 mt-1">
                  Verified on {new Date(domain.verifiedAt).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="bg-zinc-800/50 rounded-lg p-4">
              <p className="text-sm text-zinc-400 mb-2">SSL Certificate</p>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-400" />
                <span className={`font-medium ${sslStatus.color.replace('bg-', 'text-').replace('/10', '')}`}>
                  {sslStatus.label}
                </span>
              </div>
              {domain.sslExpiresAt && (
                <p className="text-xs text-zinc-500 mt-1">
                  Expires {new Date(domain.sslExpiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* DNS Records */}
          <div>
            <h3 className="text-sm font-medium text-zinc-300 mb-3">DNS Configuration</h3>
            <div className="space-y-2">
              <DnsRecordRow
                record={domain.dnsInstructions.cname}
                copyToClipboard={copyToClipboard}
              />
              <DnsRecordRow
                record={domain.dnsInstructions.verification}
                copyToClipboard={copyToClipboard}
              />
            </div>
          </div>

          {/* Default Page */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Default Payment Page
            </label>
            <select
              value={defaultPageId}
              onChange={(e) => setDefaultPageId(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">No default page</option>
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500 mt-1">
              Visitors to {domain.domain} will see this page
            </p>
          </div>

          {/* Usage URLs */}
          {domain.isVerified && (
            <div>
              <h3 className="text-sm font-medium text-zinc-300 mb-3">Usage</h3>
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <p className="text-sm text-zinc-400 mb-2">Your checkout URL:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-zinc-900 rounded text-sm text-zinc-200 font-mono">
                    https://{domain.domain}
                  </code>
                  <button
                    onClick={() => copyToClipboard(`https://${domain.domain}`)}
                    className="p-2 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-700"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-zinc-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
