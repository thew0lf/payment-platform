'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  DocumentTextIcon,
  CubeIcon,
  EnvelopeIcon,
  UserGroupIcon,
  CreditCardIcon,
  GiftIcon,
  PencilIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import * as aiFunnelApi from '@/lib/api/ai-funnel';
import type { GeneratedFunnelContent } from '@/lib/api/ai-funnel';

interface ReviewEditStepProps {
  content: GeneratedFunnelContent;
  generationId: string;
  companyId?: string;
  onSave: (name: string, content: GeneratedFunnelContent) => void;
  isLoading: boolean;
}

type Section = 'landing' | 'products' | 'emails' | 'leadCapture' | 'checkout' | 'success';

const SECTION_CONFIG: Record<
  Section,
  { icon: typeof DocumentTextIcon; label: string; description: string }
> = {
  landing: {
    icon: DocumentTextIcon,
    label: 'Landing Page',
    description: 'Headlines, benefits, social proof, and CTA',
  },
  products: {
    icon: CubeIcon,
    label: 'Product Content',
    description: 'Enhanced descriptions and bullet points',
  },
  emails: {
    icon: EnvelopeIcon,
    label: 'Email Sequence',
    description: '5 automated follow-up emails',
  },
  leadCapture: {
    icon: UserGroupIcon,
    label: 'Lead Capture',
    description: 'Form copy and lead magnet',
  },
  checkout: {
    icon: CreditCardIcon,
    label: 'Checkout',
    description: 'Trust badges and guarantees',
  },
  success: {
    icon: GiftIcon,
    label: 'Success Page',
    description: 'Thank you message and next steps',
  },
};

export function ReviewEditStep({
  content: initialContent,
  generationId,
  companyId,
  onSave,
  isLoading,
}: ReviewEditStepProps) {
  const [content, setContent] = useState<GeneratedFunnelContent>(initialContent);
  const [expandedSection, setExpandedSection] = useState<Section | null>('landing');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [regenerating, setRegenerating] = useState<Section | null>(null);
  const [funnelName, setFunnelName] = useState('');

  const handleRegenerate = async (section: Section) => {
    setRegenerating(section);
    try {
      const result = await aiFunnelApi.regenerateSection(generationId, section, companyId);
      setContent(prev => ({
        ...prev,
        [section]: result.content,
      }));
      toast.success(`${SECTION_CONFIG[section].label} regenerated`);
    } catch {
      toast.error('Failed to regenerate section');
    } finally {
      setRegenerating(null);
    }
  };

  const startEditing = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const saveEdit = () => {
    if (!editingField) return;

    const parts = editingField.split('.');
    setContent(prev => {
      const newContent = { ...prev };
      let obj: any = newContent;
      for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = editValue;
      return newContent;
    });

    setEditingField(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleSave = () => {
    if (!funnelName.trim()) {
      toast.error('Please enter a funnel name');
      return;
    }
    onSave(funnelName, content);
  };

  const renderEditableField = (
    label: string,
    path: string,
    value: string,
    multiline: boolean = false
  ) => {
    const isEditing = editingField === path;

    return (
      <div className="group">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {label}
        </label>
        {isEditing ? (
          <div className="mt-1 flex items-start gap-2">
            {multiline ? (
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                rows={3}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
            ) : (
              <input
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
            )}
            <button
              onClick={saveEdit}
              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
            >
              <CheckIcon className="h-4 w-4" />
            </button>
            <button
              onClick={cancelEdit}
              className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="mt-1 flex items-start justify-between gap-2">
            <p className="text-gray-900 dark:text-white">{value}</p>
            <button
              onClick={() => startEditing(path, value)}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-purple-600 transition-opacity"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Review Your Funnel
        </h2>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Review the generated content and make any edits before saving.
        </p>
      </div>

      {/* Funnel name input */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Funnel Name
        </label>
        <input
          type="text"
          value={funnelName}
          onChange={e => setFunnelName(e.target.value)}
          placeholder="e.g., Summer Sale Funnel"
          className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Sections accordion */}
      <div className="space-y-3">
        {(Object.keys(SECTION_CONFIG) as Section[]).map(section => {
          const config = SECTION_CONFIG[section];
          const Icon = config.icon;
          const isExpanded = expandedSection === section;
          const isRegenerating = regenerating === section;

          return (
            <div
              key={section}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Section header */}
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {config.label}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {config.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleRegenerate(section);
                    }}
                    disabled={isRegenerating}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors disabled:opacity-50"
                    title="Regenerate this section"
                  >
                    <ArrowPathIcon
                      className={`h-5 w-5 ${isRegenerating ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>
              </button>

              {/* Section content */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="pt-4 space-y-4">
                    {section === 'landing' && content.landing && (
                      <>
                        {renderEditableField('Headline', 'landing.hero.headline', content.landing.hero.headline)}
                        {renderEditableField('Subheadline', 'landing.hero.subheadline', content.landing.hero.subheadline, true)}
                        {renderEditableField('CTA Button', 'landing.hero.ctaText', content.landing.hero.ctaText)}
                        {renderEditableField('Benefits Section Title', 'landing.benefits.sectionTitle', content.landing.benefits.sectionTitle)}
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Benefits
                          </label>
                          <ul className="mt-2 space-y-2">
                            {content.landing.benefits.benefits.map((benefit, i) => (
                              <li key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <span className="font-medium text-gray-900 dark:text-white">{benefit.title}</span>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{benefit.description}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}

                    {section === 'products' && content.products && (
                      <>
                        {content.products.map((product, i) => (
                          <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
                            <p className="font-medium text-gray-900 dark:text-white">{product.valueProposition}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{product.enhancedDescription}</p>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
                              {product.bulletPoints.map((point, j) => (
                                <li key={j}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </>
                    )}

                    {section === 'emails' && content.emails && (
                      <>
                        {content.emails.map((email, i) => (
                          <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                                {email.type.replace('_', ' ')}
                              </span>
                              <span className="text-xs text-gray-500">
                                +{email.sendDelayHours}h
                              </span>
                            </div>
                            <p className="font-medium text-gray-900 dark:text-white">{email.subject}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{email.previewText}</p>
                          </div>
                        ))}
                      </>
                    )}

                    {section === 'checkout' && content.checkout && (
                      <>
                        {renderEditableField('Guarantee', 'checkout.guaranteeText', content.checkout.guaranteeText, true)}
                        {renderEditableField('Urgency Text', 'checkout.urgencyText', content.checkout.urgencyText)}
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Trust Badges
                          </label>
                          <ul className="mt-2 space-y-1">
                            {content.checkout.trustBadgeTexts.map((text, i) => (
                              <li key={i} className="text-sm text-gray-600 dark:text-gray-400">• {text}</li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}

                    {section === 'success' && content.success && (
                      <>
                        {renderEditableField('Headline', 'success.headline', content.success.headline)}
                        {renderEditableField('Message', 'success.message', content.success.message, true)}
                        <div>
                          <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Next Steps
                          </label>
                          <ul className="mt-2 space-y-1">
                            {content.success.nextSteps.map((step, i) => (
                              <li key={i} className="text-sm text-gray-600 dark:text-gray-400">{i + 1}. {step}</li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}

                    {section === 'leadCapture' && content.leadCapture && (
                      <>
                        {renderEditableField('Headline', 'leadCapture.headline', content.leadCapture.headline)}
                        {renderEditableField('Description', 'leadCapture.description', content.leadCapture.description, true)}
                        {renderEditableField('Button Text', 'leadCapture.buttonText', content.leadCapture.buttonText)}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={isLoading || !funnelName.trim()}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Saving...
            </>
          ) : (
            <>
              <CheckIcon className="h-5 w-5" />
              Save Funnel
            </>
          )}
        </button>
      </div>
    </div>
  );
}
