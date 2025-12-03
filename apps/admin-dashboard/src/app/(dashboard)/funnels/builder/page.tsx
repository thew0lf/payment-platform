'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useHierarchy } from '@/contexts/hierarchy-context';
import {
  funnelsApi,
  Funnel,
  FunnelStage,
  FunnelType,
  FunnelStatus,
  StageType,
  CreateFunnelDto,
  getStageTypeLabel,
} from '@/lib/api/funnels';
import {
  ArrowLeft,
  Save,
  Play,
  Eye,
  Settings,
  Plus,
  Layout,
  ShoppingBag,
  CreditCard,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  FileText,
  Sliders,
  Trash2,
  GripVertical,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react';

// Dynamically import React Flow to avoid SSR issues
const FlowCanvas = dynamic(
  () => import('@/components/funnels/flow-canvas').then((mod) => mod.FlowCanvas),
  { ssr: false, loading: () => <div className="w-full h-full bg-gray-50 animate-pulse rounded-xl" /> }
);

// ═══════════════════════════════════════════════════════════════
// STAGE TOOLBOX
// ═══════════════════════════════════════════════════════════════

const stageTypes = [
  { type: StageType.LANDING, icon: Layout, label: 'Landing', color: 'bg-blue-500' },
  { type: StageType.PRODUCT_SELECTION, icon: ShoppingBag, label: 'Products', color: 'bg-purple-500' },
  { type: StageType.CHECKOUT, icon: CreditCard, label: 'Checkout', color: 'bg-green-500' },
  { type: StageType.UPSELL, icon: TrendingUp, label: 'Upsell', color: 'bg-orange-500' },
  { type: StageType.DOWNSELL, icon: TrendingDown, label: 'Downsell', color: 'bg-yellow-500' },
  { type: StageType.THANK_YOU, icon: CheckCircle, label: 'Thank You', color: 'bg-emerald-500' },
  { type: StageType.FORM, icon: FileText, label: 'Form', color: 'bg-indigo-500' },
  { type: StageType.CUSTOM, icon: Sliders, label: 'Custom', color: 'bg-gray-500' },
];

interface StageToolboxProps {
  onAddStage: (type: StageType) => void;
}

function StageToolbox({ onAddStage }: StageToolboxProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
        Add Stage
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {stageTypes.map(({ type, icon: Icon, label, color }) => (
          <button
            key={type}
            onClick={() => onAddStage(type)}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
          >
            <div className={`w-8 h-8 rounded-lg ${color} bg-opacity-10 flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600">
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STAGE LIST
// ═══════════════════════════════════════════════════════════════

interface StageListProps {
  stages: FunnelStage[];
  selectedStage: FunnelStage | null;
  onSelect: (stage: FunnelStage) => void;
  onDelete: (stage: FunnelStage) => void;
  onReorder: (stages: FunnelStage[]) => void;
}

function StageList({ stages, selectedStage, onSelect, onDelete, onReorder }: StageListProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
        Funnel Stages ({stages.length})
      </h3>
      <div className="space-y-1.5">
        {stages.map((stage, index) => {
          const StageIcon = stageTypes.find(s => s.type === stage.type)?.icon || Layout;
          const isSelected = selectedStage?.id === stage.id;
          return (
            <div
              key={stage.id}
              onClick={() => onSelect(stage)}
              className={`
                flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all
                ${isSelected
                  ? 'bg-indigo-50 border-2 border-indigo-300'
                  : 'bg-white border border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                }
              `}
            >
              <div className="cursor-grab active:cursor-grabbing">
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center`}>
                <StageIcon className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{stage.name}</p>
                <p className="text-xs text-gray-500">{getStageTypeLabel(stage.type as StageType)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(stage);
                }}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STAGE CONFIG PANEL
// ═══════════════════════════════════════════════════════════════

interface StageConfigPanelProps {
  stage: FunnelStage;
  onUpdate: (stage: FunnelStage) => void;
  onClose: () => void;
}

function StageConfigPanel({ stage, onUpdate, onClose }: StageConfigPanelProps) {
  const [name, setName] = useState(stage.name);
  const StageIcon = stageTypes.find(s => s.type === stage.type)?.icon || Layout;

  const handleSave = () => {
    onUpdate({ ...stage, name });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
            <StageIcon className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Configure Stage</h3>
            <p className="text-sm text-gray-500">{getStageTypeLabel(stage.type as StageType)}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900">Basic Settings</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Stage Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Stage-specific config */}
        {stage.type === 'CHECKOUT' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">Checkout Settings</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700">Show order summary</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700">Allow coupon codes</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700">Show shipping estimate</span>
              </label>
            </div>
          </div>
        )}

        {stage.type === 'PRODUCT_SELECTION' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">Product Settings</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Layout
              </label>
              <select
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <option value="grid">Grid</option>
                <option value="carousel">Carousel</option>
                <option value="comparison">Comparison</option>
              </select>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700">Show prices</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-gray-700">Show descriptions</span>
              </label>
            </div>
          </div>
        )}

        {stage.type === 'LANDING' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900">Landing Page Settings</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Layout
              </label>
              <select
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <option value="hero-cta">Hero with CTA</option>
                <option value="video-hero">Video Hero</option>
                <option value="feature-grid">Feature Grid</option>
              </select>
            </div>
          </div>
        )}

        {/* AI Insights Section */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            AI Insights
          </h4>
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
            <p className="text-sm text-gray-600">
              AI-powered optimization suggestions will appear here once you start collecting traffic data.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <button
          onClick={handleSave}
          className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CREATE FUNNEL MODAL
// ═══════════════════════════════════════════════════════════════

interface CreateFunnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateFunnelDto) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

function CreateFunnelModal({ isOpen, onClose, onCreate, isSubmitting, error }: CreateFunnelModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<FunnelType>(FunnelType.FULL_FUNNEL);
  const [mounted, setMounted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ name?: string }>({});
  const [touched, setTouched] = useState<{ name?: boolean }>({});

  // Ensure we only render portal on client side
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setType(FunnelType.FULL_FUNNEL);
      setValidationErrors({});
      setTouched({});
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const validateName = (value: string): string | undefined => {
    if (!value.trim()) {
      return 'Funnel name is required';
    }
    if (value.trim().length < 3) {
      return 'Funnel name must be at least 3 characters';
    }
    if (value.trim().length > 100) {
      return 'Funnel name must be less than 100 characters';
    }
    // Check for valid characters (alphanumeric, spaces, and common punctuation)
    if (!/^[a-zA-Z0-9\s\-_.,!?']+$/.test(value.trim())) {
      return 'Funnel name contains invalid characters';
    }
    return undefined;
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (touched.name) {
      const error = validateName(value);
      setValidationErrors(prev => ({ ...prev, name: error }));
    }
  };

  const handleNameBlur = () => {
    setTouched(prev => ({ ...prev, name: true }));
    const error = validateName(name);
    setValidationErrors(prev => ({ ...prev, name: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const nameError = validateName(name);
    setValidationErrors({ name: nameError });
    setTouched({ name: true });

    if (nameError) {
      toast.error(nameError);
      return;
    }

    await onCreate({ name: name.trim(), type });
  };

  const funnelTypes = [
    { type: FunnelType.DIRECT_CHECKOUT, label: 'Direct Checkout', description: 'Skip straight to checkout' },
    { type: FunnelType.PRODUCT_CHECKOUT, label: 'Product + Checkout', description: 'Product selection then checkout' },
    { type: FunnelType.LANDING_CHECKOUT, label: 'Landing + Checkout', description: 'Landing page then checkout' },
    { type: FunnelType.FULL_FUNNEL, label: 'Full Funnel', description: 'Complete multi-stage funnel' },
  ];

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Create New Funnel</h2>
          <p className="text-sm text-gray-500 mt-1">Choose a type and give your funnel a name</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Funnel Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onBlur={handleNameBlur}
              placeholder="e.g., Summer Sale Funnel"
              className={`w-full px-4 py-3 bg-white text-gray-900 placeholder-gray-400 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                validationErrors.name && touched.name
                  ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                  : 'border-gray-200 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
              autoFocus
            />
            {validationErrors.name && touched.name && (
              <p className="mt-1.5 text-sm text-red-600">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Funnel Type
            </label>
            <div className="space-y-2">
              {funnelTypes.map((ft) => (
                <label
                  key={ft.type}
                  className={`
                    flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                    ${type === ft.type ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200 bg-white'}
                  `}
                >
                  <input
                    type="radio"
                    name="funnelType"
                    value={ft.type}
                    checked={type === ft.type}
                    onChange={() => setType(ft.type)}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{ft.label}</p>
                    <p className="text-sm text-gray-600">{ft.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Funnel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Use portal to render outside React Flow's DOM tree
  return createPortal(modalContent, document.body);
}

// ═══════════════════════════════════════════════════════════════
// MAIN BUILDER PAGE
// ═══════════════════════════════════════════════════════════════

function BuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedCompanyId } = useHierarchy();

  const funnelId = searchParams?.get('id') ?? null;
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [selectedStage, setSelectedStage] = useState<FunnelStage | null>(null);
  const [loading, setLoading] = useState(!!funnelId);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(!funnelId);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (funnelId) {
      loadFunnel();
    }
  }, [funnelId]);

  const loadFunnel = async () => {
    if (!funnelId) return;
    try {
      setLoading(true);
      const data = await funnelsApi.get(funnelId, selectedCompanyId || undefined);
      setFunnel(data);
      setStages(data.stages);
    } catch (error) {
      console.error('Failed to load funnel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFunnel = async (data: CreateFunnelDto) => {
    setCreateError(null);

    if (!selectedCompanyId) {
      toast.error('Please select a company from the header dropdown before creating a funnel.');
      setCreateError('Please select a company from the header dropdown before creating a funnel.');
      return;
    }

    try {
      setSaving(true);
      const newFunnel = await funnelsApi.create(data, selectedCompanyId);
      setFunnel(newFunnel);
      setStages(newFunnel.stages);
      setShowCreateModal(false);
      toast.success(`Funnel "${newFunnel.name}" created successfully!`);
      router.replace(`/funnels/builder?id=${newFunnel.id}`);
    } catch (error) {
      console.error('Failed to create funnel:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create funnel. Please try again.';
      toast.error(errorMessage);
      setCreateError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleAddStage = async (type: StageType) => {
    if (!funnel) return;
    try {
      const newStage = await funnelsApi.createStage(
        funnel.id,
        {
          name: getStageTypeLabel(type),
          type,
          order: stages.length,
        },
        selectedCompanyId || undefined
      );
      setStages([...stages, newStage]);
      toast.success(`${getStageTypeLabel(type)} stage added`);
    } catch (error) {
      console.error('Failed to add stage:', error);
      toast.error('Failed to add stage. Please try again.');
    }
  };

  const [stageToDelete, setStageToDelete] = useState<FunnelStage | null>(null);

  const handleDeleteStage = async (stage: FunnelStage) => {
    if (!funnel) return;
    setStageToDelete(stage);
  };

  const confirmDeleteStage = async () => {
    if (!funnel || !stageToDelete) return;
    try {
      await funnelsApi.deleteStage(funnel.id, stageToDelete.id, selectedCompanyId || undefined);
      setStages(stages.filter((s) => s.id !== stageToDelete.id));
      if (selectedStage?.id === stageToDelete.id) {
        setSelectedStage(null);
        setShowConfigPanel(false);
      }
      toast.success(`"${stageToDelete.name}" deleted`);
    } catch (error) {
      console.error('Failed to delete stage:', error);
      toast.error('Failed to delete stage. Please try again.');
    } finally {
      setStageToDelete(null);
    }
  };

  const handleUpdateStage = async (updatedStage: FunnelStage) => {
    if (!funnel) return;
    try {
      await funnelsApi.updateStage(
        funnel.id,
        updatedStage.id,
        { name: updatedStage.name, config: updatedStage.config },
        selectedCompanyId || undefined
      );
      setStages(stages.map((s) => (s.id === updatedStage.id ? updatedStage : s)));
      toast.success('Stage updated');
    } catch (error) {
      console.error('Failed to update stage:', error);
      toast.error('Failed to update stage. Please try again.');
    }
  };

  const handleStageSelect = (stage: FunnelStage | null) => {
    setSelectedStage(stage);
    setShowConfigPanel(!!stage);
  };

  const handlePublish = async () => {
    if (!funnel) return;
    try {
      setSaving(true);
      await funnelsApi.publish(funnel.id, true, selectedCompanyId || undefined);
      setFunnel({ ...funnel, status: FunnelStatus.PUBLISHED });
    } catch (error) {
      console.error('Failed to publish funnel:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Layout className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-gray-500">Loading funnel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Bar */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/funnels')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="font-semibold text-gray-900">{funnel?.name || 'New Funnel'}</h1>
            <p className="text-xs text-gray-500">
              {funnel?.status === 'PUBLISHED' ? 'Published' : 'Draft'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
            <Eye className="w-4 h-4" />
            <span>Preview</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          <button
            onClick={handlePublish}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            <span>{saving ? 'Publishing...' : 'Publish'}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Toolbox */}
        <div className="w-72 bg-white border-r border-gray-200 p-4 overflow-y-auto shrink-0">
          <div className="space-y-6">
            <StageToolbox onAddStage={handleAddStage} />
            <div className="h-px bg-gray-200" />
            <StageList
              stages={stages}
              selectedStage={selectedStage}
              onSelect={handleStageSelect}
              onDelete={handleDeleteStage}
              onReorder={setStages}
            />
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 p-4">
          <FlowCanvas
            stages={stages}
            selectedStage={selectedStage}
            onStageSelect={handleStageSelect}
          />
        </div>

        {/* Right Sidebar - Config Panel */}
        {showConfigPanel && selectedStage && (
          <div className="w-80 bg-white border-l border-gray-200 shrink-0">
            <StageConfigPanel
              stage={selectedStage}
              onUpdate={handleUpdateStage}
              onClose={() => {
                setSelectedStage(null);
                setShowConfigPanel(false);
              }}
            />
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateFunnelModal
        isOpen={showCreateModal}
        onClose={() => router.push('/funnels')}
        onCreate={handleCreateFunnel}
        isSubmitting={saving}
        error={createError}
      />

      {/* Delete Confirmation Modal */}
      {stageToDelete && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setStageToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Stage</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-medium">"{stageToDelete.name}"</span>?
              All configuration for this stage will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setStageToDelete(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteStage}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FunnelBuilderPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-gray-50">Loading...</div>}>
      <BuilderContent />
    </Suspense>
  );
}
