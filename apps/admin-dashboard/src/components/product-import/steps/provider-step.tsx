'use client';

/**
 * Provider Selection Step (Step 1)
 *
 * Allows users to select which import provider/source to use.
 * Displays available providers as interactive cards with visual feedback.
 * Coming soon providers are shown but disabled.
 */

import { Package, Check, Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useImportWizardStore } from '@/stores/import-wizard.store';
import {
  IMPORT_PROVIDERS,
  getAvailableProviders,
  type ImportProvider,
} from '@/lib/api/product-import';

// Provider card background gradients by category
const categoryGradients: Record<ImportProvider['category'], string> = {
  fulfillment: 'from-amber-500/10 via-orange-500/5 to-transparent',
  ecommerce: 'from-green-500/10 via-emerald-500/5 to-transparent',
  erp: 'from-blue-500/10 via-indigo-500/5 to-transparent',
  marketplace: 'from-purple-500/10 via-pink-500/5 to-transparent',
};

// Provider card accent colors by category
const categoryAccents: Record<ImportProvider['category'], string> = {
  fulfillment: 'border-amber-500/30 hover:border-amber-500/50',
  ecommerce: 'border-green-500/30 hover:border-green-500/50',
  erp: 'border-blue-500/30 hover:border-blue-500/50',
  marketplace: 'border-purple-500/30 hover:border-purple-500/50',
};

interface ProviderCardProps {
  provider: ImportProvider;
  isSelected: boolean;
  onSelect: () => void;
}

function ProviderCard({ provider, isSelected, onSelect }: ProviderCardProps) {
  const isAvailable = provider.isAvailable;

  return (
    <button
      onClick={onSelect}
      disabled={!isAvailable}
      aria-pressed={isSelected}
      aria-label={
        isAvailable
          ? `Select ${provider.name} as import source`
          : `${provider.name} is coming soon`
      }
      className={cn(
        'group relative w-full rounded-xl border-2 p-5 text-left transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isAvailable
          ? cn(
              'cursor-pointer hover:shadow-md',
              categoryAccents[provider.category],
              isSelected
                ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                : 'border-border bg-card hover:bg-muted/50'
            )
          : 'cursor-not-allowed border-dashed border-muted-foreground/20 bg-muted/30 opacity-60'
      )}
    >
      {/* Background gradient */}
      {isAvailable && (
        <div
          className={cn(
            'absolute inset-0 rounded-xl bg-gradient-to-br opacity-0 transition-opacity duration-200',
            categoryGradients[provider.category],
            isSelected ? 'opacity-100' : 'group-hover:opacity-100'
          )}
        />
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </div>
      )}

      {/* Coming soon badge */}
      {!isAvailable && (
        <Badge
          variant="secondary"
          className="absolute right-3 top-3 gap-1 bg-muted text-muted-foreground"
        >
          <Sparkles className="h-3 w-3" />
          Coming Soon
        </Badge>
      )}

      <div className="relative flex items-start gap-4">
        {/* Provider icon */}
        <div
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-transform duration-200',
            isAvailable
              ? 'bg-background shadow-sm group-hover:scale-105'
              : 'bg-muted/50'
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={provider.icon}
            alt=""
            className={cn('h-8 w-8', !isAvailable && 'grayscale')}
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                // Show fallback icon
                const fallback = document.createElement('div');
                fallback.innerHTML = `<svg class="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>`;
                parent.appendChild(fallback.firstChild as Node);
              }
            }}
          />
        </div>

        {/* Provider info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{provider.name}</h3>
            <Badge
              variant="outline"
              className="shrink-0 text-xs capitalize text-muted-foreground"
            >
              {provider.category}
            </Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {provider.description}
          </p>
        </div>
      </div>

      {/* Hover arrow indicator */}
      {isAvailable && !isSelected && (
        <ArrowRight
          className={cn(
            'absolute bottom-4 right-4 h-5 w-5 text-muted-foreground/0 transition-all duration-200',
            'group-hover:text-muted-foreground group-hover:translate-x-1'
          )}
        />
      )}
    </button>
  );
}

export function ProviderStep() {
  const {
    selectedProvider,
    setProvider,
    nextStep,
    markStepComplete,
  } = useImportWizardStore();

  const availableProviders = getAvailableProviders();
  const comingSoonProviders = IMPORT_PROVIDERS.filter((p) => !p.isAvailable);

  const handleSelect = (provider: ImportProvider) => {
    setProvider(provider);
  };

  const handleContinue = () => {
    if (selectedProvider) {
      markStepComplete('provider');
      nextStep();
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Package className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">
          Where are your products coming from?
        </h3>
        <p className="mt-2 text-muted-foreground">
          Pick your platform and we'll handle the rest. Your catalog will be synced in minutes.
        </p>
      </div>

      {/* Available Providers */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Ready to connect
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          {availableProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              isSelected={selectedProvider?.id === provider.id}
              onSelect={() => handleSelect(provider)}
            />
          ))}
        </div>
      </div>

      {/* Coming Soon Providers */}
      {comingSoonProviders.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Coming soon
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            {comingSoonProviders.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                isSelected={false}
                onSelect={() => {}}
              />
            ))}
          </div>
        </div>
      )}

      {/* Selection Summary & Continue */}
      <div className="flex flex-col items-center gap-4 border-t pt-6">
        {selectedProvider ? (
          <p className="text-sm text-muted-foreground">
            Importing from <span className="font-medium text-foreground">{selectedProvider.name}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Select a source to continue
          </p>
        )}
        <Button
          size="lg"
          onClick={handleContinue}
          disabled={!selectedProvider}
          className="min-w-[200px]"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
