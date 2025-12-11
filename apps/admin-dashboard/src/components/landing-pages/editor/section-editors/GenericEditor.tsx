'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import {
  SectionEditorProps,
  CTAContent,
  NewsletterContent,
  VideoContent,
  SpacerContent,
  DividerContent,
  LogosContent,
  LogoItem,
  StatsContent,
  StatItem,
  ProductsContent,
  ProductItem,
  ContactFormContent,
  ContactFormField,
  HeaderContent,
  FooterContent,
  GalleryContent,
  GalleryItem,
  generateId,
} from '../types';

// CTA Editor
export function CTAEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as CTAContent;

  const handleChange = (key: keyof CTAContent, value: any) => {
    onUpdate({ [key]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Headline</label>
        <input
          type="text"
          value={content.headline || ''}
          onChange={(e) => handleChange('headline', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Ready to Get Started?"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Subheadline</label>
        <input
          type="text"
          value={content.subheadline || ''}
          onChange={(e) => handleChange('subheadline', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Join thousands of satisfied customers"
        />
      </div>

      <hr className="border-border" />

      <h4 className="text-sm font-medium text-foreground">Primary Button</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Text</label>
          <input
            type="text"
            value={content.ctaText || ''}
            onChange={(e) => handleChange('ctaText', e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1">URL</label>
          <input
            type="text"
            value={content.ctaUrl || ''}
            onChange={(e) => handleChange('ctaUrl', e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <h4 className="text-sm font-medium text-foreground">Secondary Button</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Text</label>
          <input
            type="text"
            value={content.secondaryCtaText || ''}
            onChange={(e) => handleChange('secondaryCtaText', e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1">URL</label>
          <input
            type="text"
            value={content.secondaryCtaUrl || ''}
            onChange={(e) => handleChange('secondaryCtaUrl', e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

// Newsletter Editor
export function NewsletterEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as NewsletterContent;

  const handleChange = (key: keyof NewsletterContent, value: any) => {
    onUpdate({ [key]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Headline</label>
        <input
          type="text"
          value={content.headline || ''}
          onChange={(e) => handleChange('headline', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Stay Updated"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Subheadline</label>
        <input
          type="text"
          value={content.subheadline || ''}
          onChange={(e) => handleChange('subheadline', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Get the latest news delivered to your inbox"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Placeholder Text</label>
        <input
          type="text"
          value={content.placeholder || ''}
          onChange={(e) => handleChange('placeholder', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Enter your email"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Button Text</label>
        <input
          type="text"
          value={content.buttonText || ''}
          onChange={(e) => handleChange('buttonText', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Subscribe"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Success Message</label>
        <input
          type="text"
          value={content.successMessage || ''}
          onChange={(e) => handleChange('successMessage', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Thanks for subscribing!"
        />
      </div>
    </div>
  );
}

// Video Editor
export function VideoEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as VideoContent;

  const handleChange = (key: keyof VideoContent, value: any) => {
    onUpdate({ [key]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Headline</label>
        <input
          type="text"
          value={content.headline || ''}
          onChange={(e) => handleChange('headline', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="See It in Action"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Subheadline</label>
        <input
          type="text"
          value={content.subheadline || ''}
          onChange={(e) => handleChange('subheadline', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Watch how our product works"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Video URL</label>
        <input
          type="text"
          value={content.videoUrl || ''}
          onChange={(e) => handleChange('videoUrl', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="https://youtube.com/watch?v=..."
        />
        <p className="text-xs text-muted-foreground mt-1">Supports YouTube and Vimeo URLs</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Or Embed Code</label>
        <textarea
          value={content.embedCode || ''}
          onChange={(e) => handleChange('embedCode', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none resize-none font-mono text-sm"
          rows={3}
          placeholder="<iframe src=..."
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={content.autoplay || false}
          onChange={(e) => handleChange('autoplay', e.target.checked)}
          className="rounded border-border bg-muted text-blue-500 focus:ring-blue-500"
        />
        <span className="text-sm text-foreground">Autoplay video</span>
      </label>
    </div>
  );
}

// Spacer Editor
export function SpacerEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as SpacerContent;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Height (px)</label>
        <input
          type="number"
          value={content.height || 80}
          onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 80 })}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          min={20}
          max={400}
          step={10}
        />
      </div>

      <div className="flex gap-2">
        {[40, 80, 120, 160].map((h) => (
          <button
            key={h}
            onClick={() => onUpdate({ height: h })}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              content.height === h
                ? 'bg-blue-600 text-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted'
            }`}
          >
            {h}px
          </button>
        ))}
      </div>
    </div>
  );
}

// Divider Editor
export function DividerEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as DividerContent;

  const handleChange = (key: keyof DividerContent, value: any) => {
    onUpdate({ [key]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Style</label>
        <div className="flex gap-2">
          {(['solid', 'dashed', 'dotted'] as const).map((style) => (
            <button
              key={style}
              onClick={() => handleChange('style', style)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                (content.style || 'solid') === style
                  ? 'bg-blue-600 text-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Thickness (px)</label>
        <input
          type="number"
          value={content.thickness || 1}
          onChange={(e) => handleChange('thickness', parseInt(e.target.value) || 1)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          min={1}
          max={10}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Color (optional)</label>
        <input
          type="text"
          value={content.color || ''}
          onChange={(e) => handleChange('color', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Leave empty for theme default"
        />
      </div>
    </div>
  );
}

// About Editor
export function AboutEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as any;

  const handleChange = (key: string, value: any) => {
    onUpdate({ [key]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Headline</label>
        <input
          type="text"
          value={content.headline || ''}
          onChange={(e) => handleChange('headline', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="About Us"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Subheadline</label>
        <input
          type="text"
          value={content.subheadline || ''}
          onChange={(e) => handleChange('subheadline', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Our Story"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Content</label>
        <textarea
          value={content.content || ''}
          onChange={(e) => handleChange('content', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none resize-none"
          rows={5}
          placeholder="Tell your story..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Image URL</label>
        <input
          type="text"
          value={content.image || ''}
          onChange={(e) => handleChange('image', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="https://..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Image Position</label>
        <div className="flex gap-2">
          {(['left', 'right'] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => handleChange('imagePosition', pos)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                (content.imagePosition || 'right') === pos
                  ? 'bg-blue-600 text-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Logos Editor
export function LogosEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as LogosContent;
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const handleChange = (key: keyof LogosContent, value: any) => {
    onUpdate({ [key]: value });
  };

  const handleItemChange = (itemId: string, key: keyof LogoItem, value: string) => {
    const items = (content.items || []).map((item) =>
      item.id === itemId ? { ...item, [key]: value } : item
    );
    handleChange('items', items);
  };

  const addItem = () => {
    const newItem: LogoItem = {
      id: generateId(),
      name: 'Company Name',
      imageUrl: '',
    };
    handleChange('items', [...(content.items || []), newItem]);
    setExpandedItem(newItem.id);
  };

  const removeItem = (itemId: string) => {
    handleChange('items', (content.items || []).filter((item) => item.id !== itemId));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Headline</label>
        <input
          type="text"
          value={content.headline || ''}
          onChange={(e) => handleChange('headline', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Trusted by Industry Leaders"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={content.grayscale || false}
          onChange={(e) => handleChange('grayscale', e.target.checked)}
          className="rounded border-border bg-muted text-blue-500 focus:ring-blue-500"
        />
        <span className="text-sm text-foreground">Grayscale logos</span>
      </label>

      <hr className="border-border" />

      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Logos ({(content.items || []).length})</h4>
        <button
          onClick={addItem}
          className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-foreground text-xs rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      <div className="space-y-2">
        {(content.items || []).map((item) => (
          <div key={item.id} className="border border-border rounded-lg bg-muted/50 overflow-hidden">
            <div
              className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted"
              onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm text-foreground truncate">{item.name || 'Untitled'}</span>
              <button
                onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                className="p-1 rounded hover:bg-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
              </button>
            </div>

            {expandedItem === item.id && (
              <div className="p-3 pt-0 space-y-3 border-t border-border">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Name</label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                    className="w-full px-2 py-1.5 bg-muted border border-border rounded text-foreground text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Image URL</label>
                  <input
                    type="text"
                    value={item.imageUrl}
                    onChange={(e) => handleItemChange(item.id, 'imageUrl', e.target.value)}
                    className="w-full px-2 py-1.5 bg-muted border border-border rounded text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Stats Editor
export function StatsEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as StatsContent;
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const handleChange = (key: keyof StatsContent, value: any) => {
    onUpdate({ [key]: value });
  };

  const handleItemChange = (itemId: string, key: keyof StatItem, value: string) => {
    const items = (content.items || []).map((item) =>
      item.id === itemId ? { ...item, [key]: value } : item
    );
    handleChange('items', items);
  };

  const addItem = () => {
    const newItem: StatItem = {
      id: generateId(),
      value: '100',
      label: 'New Stat',
      suffix: '+',
    };
    handleChange('items', [...(content.items || []), newItem]);
    setExpandedItem(newItem.id);
  };

  const removeItem = (itemId: string) => {
    handleChange('items', (content.items || []).filter((item) => item.id !== itemId));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Headline</label>
        <input
          type="text"
          value={content.headline || ''}
          onChange={(e) => handleChange('headline', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Our Impact"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Subheadline</label>
        <input
          type="text"
          value={content.subheadline || ''}
          onChange={(e) => handleChange('subheadline', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Numbers that speak for themselves"
        />
      </div>

      <hr className="border-border" />

      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Stats ({(content.items || []).length})</h4>
        <button
          onClick={addItem}
          className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-foreground text-xs rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      <div className="space-y-2">
        {(content.items || []).map((item) => (
          <div key={item.id} className="border border-border rounded-lg bg-muted/50 overflow-hidden">
            <div
              className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted"
              onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
            >
              <span className="flex-1 text-sm text-foreground">
                {item.prefix}{item.value}{item.suffix} - {item.label}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                className="p-1 rounded hover:bg-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
              </button>
            </div>

            {expandedItem === item.id && (
              <div className="p-3 pt-0 space-y-3 border-t border-border">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Prefix</label>
                    <input
                      type="text"
                      value={item.prefix || ''}
                      onChange={(e) => handleItemChange(item.id, 'prefix', e.target.value)}
                      className="w-full px-2 py-1.5 bg-muted border border-border rounded text-foreground text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="$"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Value</label>
                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) => handleItemChange(item.id, 'value', e.target.value)}
                      className="w-full px-2 py-1.5 bg-muted border border-border rounded text-foreground text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="10K"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Suffix</label>
                    <input
                      type="text"
                      value={item.suffix || ''}
                      onChange={(e) => handleItemChange(item.id, 'suffix', e.target.value)}
                      className="w-full px-2 py-1.5 bg-muted border border-border rounded text-foreground text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="+"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Label</label>
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => handleItemChange(item.id, 'label', e.target.value)}
                    className="w-full px-2 py-1.5 bg-muted border border-border rounded text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Happy Customers"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Products Editor
export function ProductsEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as ProductsContent;
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const handleChange = (key: keyof ProductsContent, value: any) => {
    onUpdate({ [key]: value });
  };

  const handleItemChange = (itemId: string, key: keyof ProductItem, value: string) => {
    const items = (content.items || []).map((item) =>
      item.id === itemId ? { ...item, [key]: value } : item
    );
    handleChange('items', items);
  };

  const addItem = () => {
    const newItem: ProductItem = {
      id: generateId(),
      name: 'New Product',
      price: '$99',
      ctaText: 'Buy Now',
      ctaUrl: '#',
    };
    handleChange('items', [...(content.items || []), newItem]);
    setExpandedItem(newItem.id);
  };

  const removeItem = (itemId: string) => {
    handleChange('items', (content.items || []).filter((item) => item.id !== itemId));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Headline</label>
        <input
          type="text"
          value={content.headline || ''}
          onChange={(e) => handleChange('headline', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Featured Products"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Subheadline</label>
        <input
          type="text"
          value={content.subheadline || ''}
          onChange={(e) => handleChange('subheadline', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Check out our best sellers"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Columns</label>
        <div className="flex gap-2">
          {([2, 3, 4] as const).map((cols) => (
            <button
              key={cols}
              onClick={() => handleChange('columns', cols)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                (content.columns || 3) === cols
                  ? 'bg-blue-600 text-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted'
              }`}
            >
              {cols}
            </button>
          ))}
        </div>
      </div>

      <hr className="border-border" />

      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Products ({(content.items || []).length})</h4>
        <button
          onClick={addItem}
          className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-foreground text-xs rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      <div className="space-y-2">
        {(content.items || []).map((item) => (
          <div key={item.id} className="border border-border rounded-lg bg-muted/50 overflow-hidden">
            <div
              className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted"
              onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm text-foreground truncate">{item.name}</span>
              <span className="text-sm text-muted-foreground">{item.price}</span>
              <button
                onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                className="p-1 rounded hover:bg-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
              </button>
            </div>

            {expandedItem === item.id && (
              <div className="p-3 pt-0 space-y-3 border-t border-border">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Name</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                      className="w-full px-2 py-1.5 bg-muted border border-border rounded text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Price</label>
                    <input
                      type="text"
                      value={item.price}
                      onChange={(e) => handleItemChange(item.id, 'price', e.target.value)}
                      className="w-full px-2 py-1.5 bg-muted border border-border rounded text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Description</label>
                  <textarea
                    value={item.description || ''}
                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                    className="w-full px-2 py-1.5 bg-muted border border-border rounded text-foreground text-sm resize-none focus:border-blue-500 focus:outline-none"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Image URL</label>
                  <input
                    type="text"
                    value={item.image || ''}
                    onChange={(e) => handleItemChange(item.id, 'image', e.target.value)}
                    className="w-full px-2 py-1.5 bg-muted border border-border rounded text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="https://..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Button Text</label>
                    <input
                      type="text"
                      value={item.ctaText || ''}
                      onChange={(e) => handleItemChange(item.id, 'ctaText', e.target.value)}
                      className="w-full px-2 py-1.5 bg-muted border border-border rounded text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Button URL</label>
                    <input
                      type="text"
                      value={item.ctaUrl || ''}
                      onChange={(e) => handleItemChange(item.id, 'ctaUrl', e.target.value)}
                      className="w-full px-2 py-1.5 bg-muted border border-border rounded text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Badge (optional)</label>
                  <input
                    type="text"
                    value={item.badge || ''}
                    onChange={(e) => handleItemChange(item.id, 'badge', e.target.value)}
                    className="w-full px-2 py-1.5 bg-muted border border-border rounded text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="Popular, New, Sale..."
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Gallery Editor
export function GalleryEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as GalleryContent;
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const handleChange = (key: keyof GalleryContent, value: any) => {
    onUpdate({ [key]: value });
  };

  const handleItemChange = (itemId: string, key: keyof GalleryItem, value: string) => {
    const items = (content.items || []).map((item) =>
      item.id === itemId ? { ...item, [key]: value } : item
    );
    handleChange('items', items);
  };

  const addItem = () => {
    const newItem: GalleryItem = {
      id: generateId(),
      imageUrl: '',
      alt: 'Gallery image',
    };
    handleChange('items', [...(content.items || []), newItem]);
    setExpandedItem(newItem.id);
  };

  const removeItem = (itemId: string) => {
    handleChange('items', (content.items || []).filter((item) => item.id !== itemId));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Headline</label>
        <input
          type="text"
          value={content.headline || ''}
          onChange={(e) => handleChange('headline', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Gallery"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Columns</label>
        <div className="flex gap-2">
          {([2, 3, 4] as const).map((cols) => (
            <button
              key={cols}
              onClick={() => handleChange('columns', cols)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                (content.columns || 3) === cols
                  ? 'bg-blue-600 text-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted'
              }`}
            >
              {cols}
            </button>
          ))}
        </div>
      </div>

      <hr className="border-border" />

      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Images ({(content.items || []).length})</h4>
        <button
          onClick={addItem}
          className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-foreground text-xs rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      <div className="space-y-2">
        {(content.items || []).map((item) => (
          <div key={item.id} className="border border-border rounded-lg bg-muted/50 overflow-hidden">
            <div
              className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted"
              onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
            >
              <span className="flex-1 text-sm text-foreground truncate">{item.caption || item.alt || 'Image'}</span>
              <button
                onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                className="p-1 rounded hover:bg-red-500/20"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
              </button>
            </div>

            {expandedItem === item.id && (
              <div className="p-3 pt-0 space-y-3 border-t border-border">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Image URL</label>
                  <input
                    type="text"
                    value={item.imageUrl}
                    onChange={(e) => handleItemChange(item.id, 'imageUrl', e.target.value)}
                    className="w-full px-2 py-1.5 bg-muted border border-border rounded text-foreground text-sm focus:border-blue-500 focus:outline-none"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Caption</label>
                  <input
                    type="text"
                    value={item.caption || ''}
                    onChange={(e) => handleItemChange(item.id, 'caption', e.target.value)}
                    className="w-full px-2 py-1.5 bg-muted border border-border rounded text-foreground text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Alt Text</label>
                  <input
                    type="text"
                    value={item.alt || ''}
                    onChange={(e) => handleItemChange(item.id, 'alt', e.target.value)}
                    className="w-full px-2 py-1.5 bg-muted border border-border rounded text-foreground text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Contact Form Editor
export function ContactFormEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as ContactFormContent;
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>(null);

  const handleChange = (key: keyof ContactFormContent, value: any) => {
    onUpdate({ [key]: value });
  };

  const fields = content.fields || [];

  const addField = () => {
    const newField: ContactFormField = {
      id: generateId(),
      type: 'text',
      label: 'New Field',
      placeholder: '',
      required: false,
    };
    handleChange('fields', [...fields, newField]);
    setExpandedFieldId(newField.id);
  };

  const updateField = (fieldId: string, updates: Partial<ContactFormField>) => {
    const updated = fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f));
    handleChange('fields', updated);
  };

  const removeField = (fieldId: string) => {
    handleChange('fields', fields.filter((f) => f.id !== fieldId));
    if (expandedFieldId === fieldId) setExpandedFieldId(null);
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const updated = [...fields];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    handleChange('fields', updated);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Headline</label>
        <input
          type="text"
          value={content.headline || ''}
          onChange={(e) => handleChange('headline', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Get in Touch"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Subheadline</label>
        <input
          type="text"
          value={content.subheadline || ''}
          onChange={(e) => handleChange('subheadline', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="We would love to hear from you"
        />
      </div>

      <hr className="border-border" />

      {/* Form Fields */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-foreground">Form Fields</h4>
          <button
            onClick={addField}
            className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-400"
          >
            <Plus className="w-4 h-4" />
            Add Field
          </button>
        </div>

        <div className="space-y-2">
          {fields.length === 0 ? (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg text-center">
              No fields defined. Click "Add Field" to create one.
            </div>
          ) : (
            fields.map((field, index) => (
              <div
                key={field.id}
                className="border border-border rounded-lg overflow-hidden bg-card"
              >
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => setExpandedFieldId(expandedFieldId === field.id ? null : field.id)}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{field.label}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {field.type}
                    </span>
                    {field.required && (
                      <span className="text-xs text-red-400">*</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveField(index, 'up'); }}
                      disabled={index === 0}
                      className="p-1 hover:bg-muted rounded disabled:opacity-30"
                    >
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveField(index, 'down'); }}
                      disabled={index === fields.length - 1}
                      className="p-1 hover:bg-muted rounded disabled:opacity-30"
                    >
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
                      className="p-1 hover:bg-red-500/10 rounded text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {expandedFieldId === field.id && (
                  <div className="p-3 border-t border-border space-y-3 bg-muted/30">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Label</label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm bg-muted border border-border rounded text-foreground focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Type</label>
                        <select
                          value={field.type}
                          onChange={(e) => updateField(field.id, { type: e.target.value as ContactFormField['type'] })}
                          className="w-full px-2 py-1.5 text-sm bg-muted border border-border rounded text-foreground focus:border-blue-500 focus:outline-none"
                        >
                          <option value="text">Text</option>
                          <option value="email">Email</option>
                          <option value="phone">Phone</option>
                          <option value="textarea">Text Area</option>
                          <option value="select">Select (Dropdown)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Placeholder</label>
                      <input
                        type="text"
                        value={field.placeholder || ''}
                        onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm bg-muted border border-border rounded text-foreground focus:border-blue-500 focus:outline-none"
                        placeholder="Enter placeholder text..."
                      />
                    </div>

                    {field.type === 'select' && (
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Options (one per line)
                        </label>
                        <textarea
                          value={(field.options || []).join('\n')}
                          onChange={(e) => updateField(field.id, { options: e.target.value.split('\n').filter(Boolean) })}
                          className="w-full px-2 py-1.5 text-sm bg-muted border border-border rounded text-foreground focus:border-blue-500 focus:outline-none resize-none"
                          rows={3}
                          placeholder="Option 1&#10;Option 2&#10;Option 3"
                        />
                      </div>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={field.required || false}
                        onChange={(e) => updateField(field.id, { required: e.target.checked })}
                        className="rounded border-border bg-muted text-blue-500 focus:ring-blue-500"
                      />
                      <span className="text-sm text-foreground">Required field</span>
                    </label>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <hr className="border-border" />

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Submit Button Text</label>
        <input
          type="text"
          value={content.submitText || ''}
          onChange={(e) => handleChange('submitText', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Send Message"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Success Message</label>
        <input
          type="text"
          value={content.successMessage || ''}
          onChange={(e) => handleChange('successMessage', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Message sent! We will be in touch soon."
        />
      </div>
    </div>
  );
}

// Header Editor
export function HeaderEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as HeaderContent;

  const handleChange = (key: keyof HeaderContent, value: any) => {
    onUpdate({ [key]: value });
  };

  const menuItems = content.menuItems || [];

  const addMenuItem = () => {
    handleChange('menuItems', [...menuItems, { label: 'Link', url: '#' }]);
  };

  const updateMenuItem = (index: number, updates: Partial<{ label: string; url: string }>) => {
    const updated = menuItems.map((item, i) => (i === index ? { ...item, ...updates } : item));
    handleChange('menuItems', updated);
  };

  const removeMenuItem = (index: number) => {
    handleChange('menuItems', menuItems.filter((_, i) => i !== index));
  };

  const moveMenuItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= menuItems.length) return;
    const updated = [...menuItems];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    handleChange('menuItems', updated);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Logo Text</label>
        <input
          type="text"
          value={content.logoText || ''}
          onChange={(e) => handleChange('logoText', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Your Brand"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Logo URL (optional)</label>
        <input
          type="text"
          value={content.logo || ''}
          onChange={(e) => handleChange('logo', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="https://..."
        />
      </div>

      <hr className="border-border" />

      {/* Menu Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-foreground">Menu Items</h4>
          <button
            onClick={addMenuItem}
            className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-400"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>

        <div className="space-y-2">
          {menuItems.length === 0 ? (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg text-center">
              No menu items. Click "Add Item" to create navigation links.
            </div>
          ) : (
            menuItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 border border-border rounded-lg bg-card"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => updateMenuItem(index, { label: e.target.value })}
                  className="flex-1 px-2 py-1 text-sm bg-muted border border-border rounded text-foreground focus:border-blue-500 focus:outline-none"
                  placeholder="Label"
                />
                <input
                  type="text"
                  value={item.url}
                  onChange={(e) => updateMenuItem(index, { url: e.target.value })}
                  className="flex-1 px-2 py-1 text-sm bg-muted border border-border rounded text-foreground focus:border-blue-500 focus:outline-none"
                  placeholder="URL (#section or https://...)"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => moveMenuItem(index, 'up')}
                    disabled={index === 0}
                    className="p-1 hover:bg-muted rounded disabled:opacity-30"
                  >
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => moveMenuItem(index, 'down')}
                    disabled={index === menuItems.length - 1}
                    className="p-1 hover:bg-muted rounded disabled:opacity-30"
                  >
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => removeMenuItem(index)}
                    className="p-1 hover:bg-red-500/10 rounded text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <hr className="border-border" />

      <h4 className="text-sm font-medium text-foreground">CTA Button</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Text</label>
          <input
            type="text"
            value={content.ctaText || ''}
            onChange={(e) => handleChange('ctaText', e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Get Started"
          />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1">URL</label>
          <input
            type="text"
            value={content.ctaUrl || ''}
            onChange={(e) => handleChange('ctaUrl', e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
            placeholder="#signup"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={content.sticky || false}
          onChange={(e) => handleChange('sticky', e.target.checked)}
          className="rounded border-border bg-muted text-blue-500 focus:ring-blue-500"
        />
        <span className="text-sm text-foreground">Sticky header</span>
      </label>
    </div>
  );
}

// Footer Editor
export function FooterEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as FooterContent;
  const [expandedColumnId, setExpandedColumnId] = useState<number | null>(null);

  const handleChange = (key: keyof FooterContent, value: any) => {
    onUpdate({ [key]: value });
  };

  const columns = content.columns || [];
  const socialLinks = content.socialLinks || [];

  // Column management
  const addColumn = () => {
    const newColumn = { title: 'Links', links: [] };
    handleChange('columns', [...columns, newColumn]);
    setExpandedColumnId(columns.length);
  };

  const updateColumn = (index: number, updates: Partial<{ title: string; links: { label: string; url: string }[] }>) => {
    const updated = columns.map((col, i) => (i === index ? { ...col, ...updates } : col));
    handleChange('columns', updated);
  };

  const removeColumn = (index: number) => {
    handleChange('columns', columns.filter((_, i) => i !== index));
    if (expandedColumnId === index) setExpandedColumnId(null);
  };

  const addLinkToColumn = (columnIndex: number) => {
    const updated = columns.map((col, i) =>
      i === columnIndex
        ? { ...col, links: [...col.links, { label: 'Link', url: '#' }] }
        : col
    );
    handleChange('columns', updated);
  };

  const updateLinkInColumn = (columnIndex: number, linkIndex: number, updates: Partial<{ label: string; url: string }>) => {
    const updated = columns.map((col, i) =>
      i === columnIndex
        ? {
            ...col,
            links: col.links.map((link, j) => (j === linkIndex ? { ...link, ...updates } : link)),
          }
        : col
    );
    handleChange('columns', updated);
  };

  const removeLinkFromColumn = (columnIndex: number, linkIndex: number) => {
    const updated = columns.map((col, i) =>
      i === columnIndex
        ? { ...col, links: col.links.filter((_, j) => j !== linkIndex) }
        : col
    );
    handleChange('columns', updated);
  };

  // Social links management
  const socialPlatforms = ['twitter', 'facebook', 'instagram', 'linkedin', 'youtube', 'tiktok', 'github'];

  const addSocialLink = () => {
    const usedPlatforms = socialLinks.map((s) => s.platform);
    const nextPlatform = socialPlatforms.find((p) => !usedPlatforms.includes(p)) || 'twitter';
    handleChange('socialLinks', [...socialLinks, { platform: nextPlatform, url: '' }]);
  };

  const updateSocialLink = (index: number, updates: Partial<{ platform: string; url: string }>) => {
    const updated = socialLinks.map((link, i) => (i === index ? { ...link, ...updates } : link));
    handleChange('socialLinks', updated);
  };

  const removeSocialLink = (index: number) => {
    handleChange('socialLinks', socialLinks.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Logo Text</label>
        <input
          type="text"
          value={content.logoText || ''}
          onChange={(e) => handleChange('logoText', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Your Brand"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Logo URL (optional)</label>
        <input
          type="text"
          value={content.logo || ''}
          onChange={(e) => handleChange('logo', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="https://..."
        />
      </div>

      <hr className="border-border" />

      {/* Link Columns */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-foreground">Link Columns</h4>
          <button
            onClick={addColumn}
            className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-400"
          >
            <Plus className="w-4 h-4" />
            Add Column
          </button>
        </div>

        <div className="space-y-2">
          {columns.length === 0 ? (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg text-center">
              No link columns. Click "Add Column" to create one.
            </div>
          ) : (
            columns.map((column, columnIndex) => (
              <div
                key={columnIndex}
                className="border border-border rounded-lg overflow-hidden bg-card"
              >
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => setExpandedColumnId(expandedColumnId === columnIndex ? null : columnIndex)}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{column.title}</span>
                    <span className="text-xs text-muted-foreground">
                      ({column.links.length} link{column.links.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {expandedColumnId === columnIndex ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeColumn(columnIndex); }}
                      className="p-1 hover:bg-red-500/10 rounded text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {expandedColumnId === columnIndex && (
                  <div className="p-3 border-t border-border space-y-3 bg-muted/30">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Column Title</label>
                      <input
                        type="text"
                        value={column.title}
                        onChange={(e) => updateColumn(columnIndex, { title: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm bg-muted border border-border rounded text-foreground focus:border-blue-500 focus:outline-none"
                        placeholder="Links"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">Links</label>
                        <button
                          onClick={() => addLinkToColumn(columnIndex)}
                          className="text-xs text-blue-500 hover:text-blue-400"
                        >
                          + Add Link
                        </button>
                      </div>
                      {column.links.map((link, linkIndex) => (
                        <div key={linkIndex} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={link.label}
                            onChange={(e) => updateLinkInColumn(columnIndex, linkIndex, { label: e.target.value })}
                            className="flex-1 px-2 py-1 text-sm bg-muted border border-border rounded text-foreground focus:border-blue-500 focus:outline-none"
                            placeholder="Label"
                          />
                          <input
                            type="text"
                            value={link.url}
                            onChange={(e) => updateLinkInColumn(columnIndex, linkIndex, { url: e.target.value })}
                            className="flex-1 px-2 py-1 text-sm bg-muted border border-border rounded text-foreground focus:border-blue-500 focus:outline-none"
                            placeholder="URL"
                          />
                          <button
                            onClick={() => removeLinkFromColumn(columnIndex, linkIndex)}
                            className="p-1 hover:bg-red-500/10 rounded text-red-400 shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <hr className="border-border" />

      {/* Social Links */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-foreground">Social Links</h4>
          <button
            onClick={addSocialLink}
            className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-400"
          >
            <Plus className="w-4 h-4" />
            Add Social
          </button>
        </div>

        <div className="space-y-2">
          {socialLinks.length === 0 ? (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg text-center">
              No social links. Click "Add Social" to add one.
            </div>
          ) : (
            socialLinks.map((social, index) => (
              <div key={index} className="flex items-center gap-2 p-2 border border-border rounded-lg bg-card">
                <select
                  value={social.platform}
                  onChange={(e) => updateSocialLink(index, { platform: e.target.value })}
                  className="px-2 py-1.5 text-sm bg-muted border border-border rounded text-foreground focus:border-blue-500 focus:outline-none capitalize"
                >
                  {socialPlatforms.map((platform) => (
                    <option key={platform} value={platform} className="capitalize">
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={social.url}
                  onChange={(e) => updateSocialLink(index, { url: e.target.value })}
                  className="flex-1 px-2 py-1.5 text-sm bg-muted border border-border rounded text-foreground focus:border-blue-500 focus:outline-none"
                  placeholder="https://..."
                />
                <button
                  onClick={() => removeSocialLink(index)}
                  className="p-1 hover:bg-red-500/10 rounded text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <hr className="border-border" />

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Copyright Text</label>
        <input
          type="text"
          value={content.copyright || ''}
          onChange={(e) => handleChange('copyright', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="2024 Your Brand. All rights reserved."
        />
      </div>
    </div>
  );
}

// HTML Block Editor
interface HTMLBlockContent {
  html?: string;
}

export function HTMLBlockEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as HTMLBlockContent;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Custom HTML</label>
        <textarea
          value={content.html || ''}
          onChange={(e) => onUpdate({ html: e.target.value })}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none resize-none font-mono text-sm"
          rows={12}
          placeholder="<div>Your custom HTML here...</div>"
        />
      </div>

      <div className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
        <p className="font-medium mb-1">Security Note</p>
        <p className="text-xs text-amber-300/80">
          HTML content is sanitized before rendering. JavaScript and potentially harmful elements will be removed.
        </p>
      </div>
    </div>
  );
}
