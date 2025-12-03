'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { SectionEditorProps, FAQContent, FAQItem, generateId } from '../types';

export function FAQEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as FAQContent;
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const handleChange = (key: keyof FAQContent, value: any) => {
    onUpdate({ [key]: value });
  };

  const handleItemChange = (itemId: string, key: keyof FAQItem, value: string) => {
    const items = (content.items || []).map((item) =>
      item.id === itemId ? { ...item, [key]: value } : item
    );
    handleChange('items', items);
  };

  const addItem = () => {
    const newItem: FAQItem = {
      id: generateId(),
      question: 'New question?',
      answer: 'Answer here...',
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
        <label className="block text-sm font-medium text-zinc-400 mb-2">Section Headline</label>
        <input
          type="text"
          value={content.headline || ''}
          onChange={(e) => handleChange('headline', e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
          placeholder="Frequently Asked Questions"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">Subheadline</label>
        <input
          type="text"
          value={content.subheadline || ''}
          onChange={(e) => handleChange('subheadline', e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
          placeholder="Find answers to common questions"
        />
      </div>

      <hr className="border-zinc-800" />

      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-zinc-300">Questions ({(content.items || []).length})</h4>
        <button
          onClick={addItem}
          className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      <div className="space-y-2">
        {(content.items || []).map((item, index) => (
          <div
            key={item.id}
            className="border border-zinc-700 rounded-lg bg-zinc-800/50 overflow-hidden"
          >
            <div
              className="flex items-center gap-2 p-3 cursor-pointer hover:bg-zinc-800"
              onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
            >
              <GripVertical className="h-4 w-4 text-zinc-600" />
              <span className="flex-1 text-sm text-white truncate">{item.question || 'Untitled'}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); moveItem(item.id, 'up'); }}
                  disabled={index === 0}
                  className="p-1 rounded hover:bg-zinc-700 disabled:opacity-30"
                >
                  <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); moveItem(item.id, 'down'); }}
                  disabled={index === (content.items || []).length - 1}
                  className="p-1 rounded hover:bg-zinc-700 disabled:opacity-30"
                >
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
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
              <div className="p-3 pt-0 space-y-3 border-t border-zinc-700">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Question</label>
                  <input
                    type="text"
                    value={item.question}
                    onChange={(e) => handleItemChange(item.id, 'question', e.target.value)}
                    className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Answer</label>
                  <textarea
                    value={item.answer}
                    onChange={(e) => handleItemChange(item.id, 'answer', e.target.value)}
                    className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-white text-sm resize-none focus:border-blue-500 focus:outline-none"
                    rows={4}
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
