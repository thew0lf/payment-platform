'use client';

import { SectionEditorProps, HeroContent } from '../types';

export function HeroEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as HeroContent;

  const handleChange = (key: keyof HeroContent, value: any) => {
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
          placeholder="Your amazing headline"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Subheadline</label>
        <textarea
          value={content.subheadline || ''}
          onChange={(e) => handleChange('subheadline', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground resize-none focus:border-blue-500 focus:outline-none"
          rows={3}
          placeholder="Supporting text that explains your value proposition"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Alignment</label>
        <div className="flex gap-2">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              onClick={() => handleChange('alignment', align)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                (content.alignment || 'center') === align
                  ? 'bg-blue-600 text-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted'
              }`}
            >
              {align.charAt(0).toUpperCase() + align.slice(1)}
            </button>
          ))}
        </div>
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

      <h4 className="text-sm font-medium text-foreground">Secondary Button</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Text</label>
          <input
            type="text"
            value={content.secondaryCtaText || ''}
            onChange={(e) => handleChange('secondaryCtaText', e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Learn More"
          />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1">URL</label>
          <input
            type="text"
            value={content.secondaryCtaUrl || ''}
            onChange={(e) => handleChange('secondaryCtaUrl', e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
            placeholder="#features"
          />
        </div>
      </div>

      <hr className="border-border" />

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Background Image URL</label>
        <input
          type="text"
          value={content.backgroundImage || ''}
          onChange={(e) => handleChange('backgroundImage', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground text-sm focus:border-blue-500 focus:outline-none"
          placeholder="https://images.unsplash.com/..."
        />
        <p className="text-xs text-muted-foreground mt-1">Leave empty for a solid background color</p>
      </div>
    </div>
  );
}
