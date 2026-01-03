'use client';

import { useState } from 'react';

// ============================================================================
// Types
// ============================================================================

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQContent {
  title?: string;
  subtitle?: string;
  items: FAQItem[];
  layout?: 'accordion' | 'two-column' | 'cards';
  allowMultipleOpen?: boolean;
}

interface FAQStyles {
  backgroundColor?: string;
  textColor?: string;
  cardBackgroundColor?: string;
  paddingTop?: string;
  paddingBottom?: string;
}

interface FAQSectionProps {
  content: FAQContent | Record<string, unknown>;
  styles?: FAQStyles;
}

// ============================================================================
// Accordion Item Component
// ============================================================================

interface AccordionItemProps {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
  cardBackgroundColor?: string;
}

function AccordionItem({
  item,
  isOpen,
  onToggle,
  cardBackgroundColor,
}: AccordionItemProps) {
  return (
    <div
      className="border border-gray-200 rounded-lg overflow-hidden"
      style={{ backgroundColor: cardBackgroundColor || '#ffffff' }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-gray-50 transition-colors min-h-[44px] touch-manipulation"
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-gray-900 pr-4">{item.question}</span>
        <span
          className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          <svg
            className="w-4 h-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-96' : 'max-h-0'
        }`}
      >
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 text-gray-600">
          <p className="whitespace-pre-wrap">{item.answer}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FAQ Card Component
// ============================================================================

interface FAQCardProps {
  item: FAQItem;
  cardBackgroundColor?: string;
}

function FAQCard({ item, cardBackgroundColor }: FAQCardProps) {
  return (
    <div
      className="p-6 rounded-xl border border-gray-200"
      style={{ backgroundColor: cardBackgroundColor || '#ffffff' }}
    >
      <h3 className="font-semibold text-gray-900 mb-2">{item.question}</h3>
      <p className="text-gray-600 whitespace-pre-wrap">{item.answer}</p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * FAQSection - Display frequently asked questions in accordion or card layout
 *
 * Supports:
 * - Accordion layout (single or multiple open)
 * - Two-column layout
 * - Card grid layout
 */
export function FAQSection({ content, styles }: FAQSectionProps) {
  const faqContent = content as FAQContent;
  const {
    title,
    subtitle,
    items = [],
    layout = 'accordion',
    allowMultipleOpen = false,
  } = faqContent;

  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        if (!allowMultipleOpen) {
          newSet.clear();
        }
        newSet.add(id);
      }
      return newSet;
    });
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="py-16 sm:py-24"
      style={{
        backgroundColor: styles?.backgroundColor || 'transparent',
        color: styles?.textColor || 'inherit',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        {(title || subtitle) && (
          <div className="text-center mb-12">
            {title && (
              <h2
                className="text-3xl sm:text-4xl font-bold mb-4"
                style={{ fontFamily: 'var(--lp-heading-font), system-ui, sans-serif' }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Accordion layout */}
        {layout === 'accordion' && (
          <div className="space-y-3">
            {items.map((item) => (
              <AccordionItem
                key={item.id}
                item={item}
                isOpen={openItems.has(item.id)}
                onToggle={() => toggleItem(item.id)}
                cardBackgroundColor={styles?.cardBackgroundColor}
              />
            ))}
          </div>
        )}

        {/* Two-column layout */}
        {layout === 'two-column' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map((item) => (
              <FAQCard
                key={item.id}
                item={item}
                cardBackgroundColor={styles?.cardBackgroundColor}
              />
            ))}
          </div>
        )}

        {/* Cards layout */}
        {layout === 'cards' && (
          <div className="space-y-4">
            {items.map((item) => (
              <FAQCard
                key={item.id}
                item={item}
                cardBackgroundColor={styles?.cardBackgroundColor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FAQSection;
