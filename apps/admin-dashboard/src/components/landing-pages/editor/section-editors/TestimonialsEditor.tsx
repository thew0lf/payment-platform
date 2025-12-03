'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Star } from 'lucide-react';
import { SectionEditorProps, TestimonialsContent, TestimonialItem, generateId } from '../types';

export function TestimonialsEditor({ section, onUpdate }: SectionEditorProps) {
  const content = section.content as TestimonialsContent;
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const handleChange = (key: keyof TestimonialsContent, value: any) => {
    onUpdate({ [key]: value });
  };

  const handleItemChange = (itemId: string, key: keyof TestimonialItem, value: any) => {
    const items = (content.items || []).map((item) =>
      item.id === itemId ? { ...item, [key]: value } : item
    );
    handleChange('items', items);
  };

  const addItem = () => {
    const newItem: TestimonialItem = {
      id: generateId(),
      quote: 'This product is amazing!',
      author: 'Customer Name',
      role: 'Position',
      company: 'Company',
      rating: 5,
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
          placeholder="What Our Customers Say"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">Subheadline</label>
        <input
          type="text"
          value={content.subheadline || ''}
          onChange={(e) => handleChange('subheadline', e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
          placeholder="Join thousands of satisfied customers"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">Layout</label>
        <div className="flex gap-2">
          {(['grid', 'carousel', 'wall'] as const).map((layout) => (
            <button
              key={layout}
              onClick={() => handleChange('layout', layout)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                (content.layout || 'grid') === layout
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {layout}
            </button>
          ))}
        </div>
      </div>

      <hr className="border-zinc-800" />

      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-zinc-300">Testimonials ({(content.items || []).length})</h4>
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
              <span className="flex-1 text-sm text-white truncate">{item.author || 'Anonymous'}</span>
              <div className="flex items-center gap-1 text-amber-400">
                {Array.from({ length: item.rating || 5 }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-current" />
                ))}
              </div>
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
                  <label className="block text-xs text-zinc-400 mb-1">Quote</label>
                  <textarea
                    value={item.quote}
                    onChange={(e) => handleItemChange(item.id, 'quote', e.target.value)}
                    className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-white text-sm resize-none focus:border-blue-500 focus:outline-none"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Author</label>
                    <input
                      type="text"
                      value={item.author}
                      onChange={(e) => handleItemChange(item.id, 'author', e.target.value)}
                      className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Role/Title</label>
                    <input
                      type="text"
                      value={item.role || ''}
                      onChange={(e) => handleItemChange(item.id, 'role', e.target.value)}
                      className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Company</label>
                    <input
                      type="text"
                      value={item.company || ''}
                      onChange={(e) => handleItemChange(item.id, 'company', e.target.value)}
                      className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Rating</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => handleItemChange(item.id, 'rating', rating)}
                          className="p-1"
                        >
                          <Star
                            className={`h-5 w-5 ${
                              rating <= (item.rating || 5)
                                ? 'text-amber-400 fill-current'
                                : 'text-zinc-600'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Avatar URL (optional)</label>
                  <input
                    type="text"
                    value={item.avatar || ''}
                    onChange={(e) => handleItemChange(item.id, 'avatar', e.target.value)}
                    className="w-full px-2 py-1.5 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
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
