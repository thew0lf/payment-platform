'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { SectionEditorProps, FeaturesContent, FeatureItem, generateId } from '../types';

export function FeaturesEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as FeaturesContent;
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const handleChange = (key: keyof FeaturesContent, value: any) => {
    onUpdate({ [key]: value });
  };

  const handleItemChange = (itemId: string, key: keyof FeatureItem, value: string) => {
    const items = (content.items || []).map((item) =>
      item.id === itemId ? { ...item, [key]: value } : item
    );
    handleChange('items', items);
  };

  const addItem = () => {
    const newItem: FeatureItem = {
      id: generateId(),
      title: 'New Feature',
      description: 'Describe this feature',
    };
    handleChange('items', [...(content.items || []), newItem]);
    setExpandedItem(newItem.id);
  };

  const removeItem = (itemId: string) => {
    handleChange('items', (content.items || []).filter((item) => item.id !== itemId));
  };

  const moveItem = (itemId: string, direction: 'up' | 'down') => {
    const items = [...(content.items || [])];
    const index = items.findIndex((item) => item.id === itemId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;

    [items[index], items[newIndex]] = [items[newIndex], items[index]];
    handleChange('items', items);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Section Headline</label>
        <input
          type="text"
          value={content.headline || ''}
          onChange={(e) => handleChange('headline', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Why Choose Us"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-2">Subheadline</label>
        <input
          type="text"
          value={content.subheadline || ''}
          onChange={(e) => handleChange('subheadline', e.target.value)}
          className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-foreground focus:border-blue-500 focus:outline-none"
          placeholder="Everything you need to succeed"
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
        <h4 className="text-sm font-medium text-foreground">Features ({(content.items || []).length})</h4>
        <button
          onClick={addItem}
          className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-foreground text-xs rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      <div className="space-y-2">
        {(content.items || []).map((item, index) => (
          <div
            key={item.id}
            className="border border-border rounded-lg bg-muted/50 overflow-hidden"
          >
            <div
              className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted"
              onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm text-foreground truncate">{item.title || 'Untitled'}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); moveItem(item.id, 'up'); }}
                  disabled={index === 0}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30"
                >
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); moveItem(item.id, 'down'); }}
                  disabled={index === (content.items || []).length - 1}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30"
                >
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                  className="p-1 rounded hover:bg-red-500/20"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            </div>

            {expandedItem === item.id && (
              <div className="p-3 pt-0 space-y-3 border-t border-border">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Title</label>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => handleItemChange(item.id, 'title', e.target.value)}
                    className="w-full px-2 py-1.5 bg-muted border border-border rounded text-foreground text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Description</label>
                  <textarea
                    value={item.description}
                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                    className="w-full px-2 py-1.5 bg-muted border border-border rounded text-foreground text-sm resize-none focus:border-blue-500 focus:outline-none"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Image URL (optional)</label>
                  <input
                    type="text"
                    value={item.image || ''}
                    onChange={(e) => handleItemChange(item.id, 'image', e.target.value)}
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
