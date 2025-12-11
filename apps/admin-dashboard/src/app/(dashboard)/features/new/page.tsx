'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GitBranch,
  FileText,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { featuresApi } from '@/lib/api/features';

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function CreateFeaturePage() {
  const router = useRouter();
  const { accessLevel } = useHierarchy();

  // Form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [branch, setBranch] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Check if user has access (org-only)
  const hasAccess = accessLevel === 'ORGANIZATION';

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!code.trim()) {
      errors.code = 'Feature code is required';
    } else if (!/^[A-Z0-9_-]+$/.test(code.trim())) {
      errors.code = 'Code must be uppercase letters, numbers, hyphens, or underscores';
    }

    if (!name.trim()) {
      errors.name = 'Feature name is required';
    }

    if (!branch.trim()) {
      errors.branch = 'Branch name is required';
    } else if (!/^[a-zA-Z0-9/_-]+$/.test(branch.trim())) {
      errors.branch = 'Invalid branch name format';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const feature = await featuresApi.create({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
        branch: branch.trim(),
      });

      router.push(`/features/${feature.id}`);
    } catch (err: unknown) {
      console.error('Failed to create feature:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create feature. Please try again.';
      setError(errorMessage);
      setSubmitting(false);
    }
  };

  const handleCodeChange = (value: string) => {
    setCode(value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
    if (fieldErrors.code) {
      setFieldErrors((prev) => ({ ...prev, code: '' }));
    }
  };

  const handleBranchChange = (value: string) => {
    setBranch(value.replace(/[^a-zA-Z0-9/_-]/g, ''));
    if (fieldErrors.branch) {
      setFieldErrors((prev) => ({ ...prev, branch: '' }));
    }
  };

  // Access denied view
  if (!hasAccess) {
    return (
      <>
        <Header
          title="New Feature"
          backLink={{ href: '/features', label: 'Features' }}
        />
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Lock className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Access Restricted</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              The Feature Management system is only available to organization administrators.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="New Feature"
        subtitle="Create a new feature for the development pipeline"
        backLink={{ href: '/features', label: 'Features' }}
      />

      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feature Code */}
          <div className="bg-card/50 border border-border rounded-xl p-5">
            <label className="block text-sm font-medium text-foreground mb-2">
              Feature Code <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="FEAT-001"
                maxLength={32}
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 bg-muted border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50',
                  fieldErrors.code ? 'border-red-500' : 'border-border'
                )}
              />
            </div>
            {fieldErrors.code ? (
              <p className="mt-2 text-xs text-red-400">{fieldErrors.code}</p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Unique identifier for this feature (e.g., FEAT-001, AUTH-FLOW, USER-MGMT)
              </p>
            )}
          </div>

          {/* Feature Name */}
          <div className="bg-card/50 border border-border rounded-xl p-5">
            <label className="block text-sm font-medium text-foreground mb-2">
              Feature Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) {
                  setFieldErrors((prev) => ({ ...prev, name: '' }));
                }
              }}
              placeholder="User Authentication Flow"
              maxLength={128}
              className={cn(
                'w-full px-4 py-2.5 bg-muted border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50',
                fieldErrors.name ? 'border-red-500' : 'border-border'
              )}
            />
            {fieldErrors.name ? (
              <p className="mt-2 text-xs text-red-400">{fieldErrors.name}</p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                A descriptive name for the feature
              </p>
            )}
          </div>

          {/* Branch */}
          <div className="bg-card/50 border border-border rounded-xl p-5">
            <label className="block text-sm font-medium text-foreground mb-2">
              Git Branch <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={branch}
                onChange={(e) => handleBranchChange(e.target.value)}
                placeholder="feature/auth-flow"
                maxLength={128}
                className={cn(
                  'w-full pl-10 pr-4 py-2.5 bg-muted border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50',
                  fieldErrors.branch ? 'border-red-500' : 'border-border'
                )}
              />
            </div>
            {fieldErrors.branch ? (
              <p className="mt-2 text-xs text-red-400">{fieldErrors.branch}</p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                The git branch where this feature is being developed
              </p>
            )}
          </div>

          {/* Description */}
          <div className="bg-card/50 border border-border rounded-xl p-5">
            <label className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this feature does and its scope..."
              rows={4}
              maxLength={2000}
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Optional description of the feature scope and goals
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link href="/features">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <GitBranch className="w-4 h-4 mr-2" />
                  Create Feature
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
