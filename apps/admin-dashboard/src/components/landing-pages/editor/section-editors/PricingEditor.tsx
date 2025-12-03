'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { SectionEditorProps, PricingContent, PricingTier, generateId } from '../types';

export function PricingEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as PricingContent;
  const [expandedTier, setExpandedTier] = useState<string | null>(null);

  const handleChange = (key: keyof PricingContent, value: any) => {
    onUpdate({ [key]: value });
  };

  const handleTierChange = (tierId: string, key: keyof PricingTier, value: any) => {
    const tiers = (content.tiers || []).map((tier) =>
      tier.id === tierId ? { ...tier, [key]: value } : tier
    );
    handleChange('tiers', tiers);
  };

  const handleFeatureChange = (tierId: string, featureIndex: number, value: string) => {
    const tiers = (content.tiers || []).map((tier) => {
      if (tier.id !== tierId) return tier;
      const features = [...tier.features];
      features[featureIndex] = value;
      return { ...tier, features };
    });
    handleChange('tiers', tiers);
  };

  const addFeature = (tierId: string) => {
    const tiers = (content.tiers || []).map((tier) => {
      if (tier.id !== tierId) return tier;
      return { ...tier, features: [...tier.features, 'New feature'] };
    });
    handleChange('tiers', tiers);
  };

  const removeFeature = (tierId: string, featureIndex: number) => {
    const tiers = (content.tiers || []).map((tier) => {
      if (tier.id !== tierId) return tier;
      const features = tier.features.filter((_, i) => i !== featureIndex);
      return { ...tier, features };
    });
    handleChange('tiers', tiers);
  };

  const addTier = () => {
    const newTier: PricingTier = {
      id: generateId(),
      name: 'New Plan',
      price: '$0',
      period: '/month',
      description: 'Plan description',
      features: ['Feature 1', 'Feature 2'],
      ctaText: 'Get Started',
      ctaUrl: '#signup',
    };
    handleChange('tiers', [...(content.tiers || []), newTier]);
    setExpandedTier(newTier.id);
  };

  const removeTier = (tierId: string) => {
    handleChange('tiers', (content.tiers || []).filter((tier) => tier.id !== tierId));
  };

  const moveTier = (tierId: string, direction: 'up' | 'down') => {
    const tiers = [...(content.tiers || [])];
    const index = tiers.findIndex((tier) => tier.id === tierId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= tiers.length) return;

    [tiers[index], tiers[newIndex]] = [tiers[newIndex], tiers[index]];
    handleChange('tiers', tiers);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">Section Headline</label>
        <input
          type="text"
          value={content.headline || ''}
          onChange={(e) => handleChange('headline', e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
          placeholder="Simple, Transparent Pricing"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">Subheadline</label>
        <input
          type="text"
          value={content.subheadline || ''}
          onChange={(e) => handleChange('subheadline', e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
          placeholder="Choose the plan that works for you"
        />
      </div>

      <hr className="border-zinc-800" />

      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-zinc-300">Pricing Tiers ({(content.tiers || []).length})</h4>
        <button
          onClick={addTier}
          className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      <div className="space-y-2">
        {(content.tiers || []).map((tier, index) => (
          <div
            key={tier.id}
            className="border border-zinc-700 rounded-lg bg-zinc-800/50 overflow-hidden"
          >
            <div
              className="flex items-center gap-2 p-3 cursor-pointer hover:bg-zinc-800"
              onClick={() => setExpandedTier(expandedTier === tier.id ? null : tier.id)}
            >
              <GripVertical className="h-4 w-4 text-zinc-600" />
              <span className="flex-1 text-sm text-white">{tier.name}</span>
              <span className="text-sm text-zinc-400">{tier.price}{tier.period}</span>
              {tier.highlighted && <Star className="h-4 w-4 text-amber-400 fill-current" />}
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); moveTier(tier.id, 'up'); }}
                  disabled={index === 0}
                  className="p-1 rounded hover:bg-zinc-700 disabled:opacity-30"
                >
                  <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); moveTier(tier.id, 'down'); }}
                  disabled={index === (content.tiers || []).length - 1}
                  className="p-1 rounded hover:bg-zinc-700 disabled:opacity-30"
                >
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeTier(tier.id); }}
                  className="p-1 rounded hover:bg-red-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            </div>

            {expandedTier === tier.id && (
              <div className="p-3 pt-0 space-y-3 border-t border-zinc-700">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Plan Name</label>
                    <input
                      type="text"
                      value={tier.name}
                      onChange={(e) => handleTierChange(tier.id, 'name', e.target.value)}
                      className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Description</label>
                    <input
                      type="text"
                      value={tier.description || ''}
                      onChange={(e) => handleTierChange(tier.id, 'description', e.target.value)}
                      className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Price</label>
                    <input
                      type="text"
                      value={tier.price}
                      onChange={(e) => handleTierChange(tier.id, 'price', e.target.value)}
                      className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="$29"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Period</label>
                    <input
                      type="text"
                      value={tier.period || ''}
                      onChange={(e) => handleTierChange(tier.id, 'period', e.target.value)}
                      className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="/month"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Button Text</label>
                    <input
                      type="text"
                      value={tier.ctaText || ''}
                      onChange={(e) => handleTierChange(tier.id, 'ctaText', e.target.value)}
                      className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Button URL</label>
                    <input
                      type="text"
                      value={tier.ctaUrl || ''}
                      onChange={(e) => handleTierChange(tier.id, 'ctaUrl', e.target.value)}
                      className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tier.highlighted || false}
                    onChange={(e) => handleTierChange(tier.id, 'highlighted', e.target.checked)}
                    className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-xs text-zinc-300">Highlight as popular</span>
                </label>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs text-zinc-400">Features</label>
                    <button
                      onClick={() => addFeature(tier.id)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      + Add feature
                    </button>
                  </div>
                  <div className="space-y-1">
                    {tier.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex gap-1">
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) => handleFeatureChange(tier.id, featureIndex, e.target.value)}
                          className="flex-1 px-2 py-1 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                        />
                        <button
                          onClick={() => removeFeature(tier.id, featureIndex)}
                          className="p-1 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
