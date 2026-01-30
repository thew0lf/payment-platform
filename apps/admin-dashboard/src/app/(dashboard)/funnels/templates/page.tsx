'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { funnelTemplatesApi, FunnelTemplate } from '@/lib/api/funnels';
import {
  Layout,
  Search,
  Filter,
  Eye,
  Star,
  ArrowRight,
  Grid,
  Layers,
  ChevronDown,
} from 'lucide-react';

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<FunnelTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'FULL_FUNNEL' | 'COMPONENT'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [templatesData, categoriesData] = await Promise.all([
        funnelTemplatesApi.list(),
        funnelTemplatesApi.getCategories(),
      ]);
      setTemplates(templatesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      !search ||
      template.name.toLowerCase().includes(search.toLowerCase()) ||
      template.description.toLowerCase().includes(search.toLowerCase()) ||
      template.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));

    const matchesType = typeFilter === 'ALL' || template.templateType === typeFilter;
    const matchesCategory = !categoryFilter || template.category === categoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  });

  const featuredTemplates = filteredTemplates.filter((t) => t.featured);
  const regularTemplates = filteredTemplates.filter((t) => !t.featured);

  const handlePreview = (slug: string) => {
    router.push(`/preview/funnel/${slug}`);
  };

  const handleUse = (template: FunnelTemplate) => {
    router.push(`/funnels/builder?templateId=${template.id}`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Funnel Templates</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Choose a template to get started quickly. Preview and customize to match your brand.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-4 py-2.5 rounded-xl font-medium transition-colors ${
              typeFilter === 'ALL'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTypeFilter('FULL_FUNNEL')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${
              typeFilter === 'FULL_FUNNEL'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            Full Funnels
          </button>
          <button
            onClick={() => setTypeFilter('COMPONENT')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${
              typeFilter === 'COMPONENT'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Grid className="w-4 h-4" />
            Components
          </button>
        </div>

        {/* Category Filter */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="appearance-none pl-4 pr-10 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Featured Templates */}
      {featuredTemplates.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Featured Templates</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={() => handlePreview(template.slug)}
                onUse={() => handleUse(template)}
                featured
              />
            ))}
          </div>
        </div>
      )}

      {/* All Templates */}
      {regularTemplates.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {featuredTemplates.length > 0 ? 'More Templates' : 'All Templates'}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={() => handlePreview(template.slug)}
                onUse={() => handleUse(template)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-16">
          <Layout className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No templates found</h3>
          <p className="text-gray-500 dark:text-gray-400">Try adjusting your filters or search terms</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATE CARD
// ═══════════════════════════════════════════════════════════════

interface TemplateCardProps {
  template: FunnelTemplate;
  onPreview: () => void;
  onUse: () => void;
  featured?: boolean;
}

function TemplateCard({ template, onPreview, onUse, featured }: TemplateCardProps) {
  const categoryColors: Record<string, string> = {
    ecommerce: 'bg-purple-100 text-purple-700',
    saas: 'bg-blue-100 text-blue-700',
    digital: 'bg-pink-100 text-pink-700',
    nonprofit: 'bg-green-100 text-green-700',
    events: 'bg-amber-100 text-amber-700',
    landing: 'bg-indigo-100 text-indigo-700',
    products: 'bg-orange-100 text-orange-700',
    checkout: 'bg-emerald-100 text-emerald-700',
  };

  const typeLabels: Record<string, string> = {
    FULL_FUNNEL: 'Full Funnel',
    COMPONENT: 'Component',
  };

  return (
    <div
      className={`bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-lg group ${
        featured ? 'border-amber-200 dark:border-amber-700 ring-1 ring-amber-100 dark:ring-amber-900' : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Preview Image */}
      <div
        onClick={onPreview}
        className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-50 relative cursor-pointer overflow-hidden"
      >
        {template.thumbnail ? (
          <img
            src={template.thumbnail}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Layout className="w-16 h-16 text-gray-200 dark:text-gray-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg font-medium text-gray-900 dark:text-gray-100 shadow-lg">
            <Eye className="w-4 h-4" />
            Preview
          </button>
        </div>
        {featured && (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 bg-amber-500 text-foreground text-xs font-medium rounded-full">
            <Star className="w-3 h-3" />
            Featured
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{template.name}</h3>
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${categoryColors[template.category] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
            {template.category}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{template.description}</p>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {typeLabels[template.templateType]}
          </span>
          <button
            onClick={onUse}
            className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            Use Template
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
