'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useHierarchy } from '@/contexts/hierarchy-context';
import { apiRequest } from '@/lib/api';
import {
  Truck,
  Plus,
  Trash2,
  Save,
  MapPin,
  DollarSign,
  Package,
  Clock,
  ChevronDown,
  ChevronRight,
  Edit2,
  X,
  Check,
  Globe,
  AlertCircle,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ShippingMethod {
  id: string;
  name: string;
  carrier: string;
  estimatedDays: { min: number; max: number };
  baseCost: number;
  perItemCost: number;
  freeShippingThreshold: number | null;
  isActive: boolean;
}

interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  states: string[];
  postalCodes: string[];
  methods: ShippingMethod[];
}

interface ShippingSettings {
  defaultCurrency: string;
  weightUnit: 'oz' | 'lb' | 'g' | 'kg';
  dimensionUnit: 'in' | 'cm';
  handlingFee: number;
  zones: ShippingZone[];
}

const defaultSettings: ShippingSettings = {
  defaultCurrency: 'USD',
  weightUnit: 'oz',
  dimensionUnit: 'in',
  handlingFee: 0,
  zones: [
    {
      id: 'domestic',
      name: 'Domestic (US)',
      countries: ['US'],
      states: [],
      postalCodes: [],
      methods: [
        {
          id: 'standard',
          name: 'Standard Shipping',
          carrier: 'USPS',
          estimatedDays: { min: 5, max: 7 },
          baseCost: 5.99,
          perItemCost: 0,
          freeShippingThreshold: 50,
          isActive: true,
        },
        {
          id: 'express',
          name: 'Express Shipping',
          carrier: 'UPS',
          estimatedDays: { min: 2, max: 3 },
          baseCost: 12.99,
          perItemCost: 0,
          freeShippingThreshold: null,
          isActive: true,
        },
        {
          id: 'overnight',
          name: 'Overnight',
          carrier: 'FedEx',
          estimatedDays: { min: 1, max: 1 },
          baseCost: 24.99,
          perItemCost: 0,
          freeShippingThreshold: null,
          isActive: false,
        },
      ],
    },
  ],
};

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

// ═══════════════════════════════════════════════════════════════
// SHIPPING METHOD CARD
// ═══════════════════════════════════════════════════════════════

interface MethodCardProps {
  method: ShippingMethod;
  onUpdate: (method: ShippingMethod) => void;
  onDelete: () => void;
}

function MethodCard({ method, onUpdate, onDelete }: MethodCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(method);

  const handleSave = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="bg-white border-2 border-indigo-200 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Edit Shipping Method</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={handleSave}
              className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Carrier</label>
            <select
              value={editData.carrier}
              onChange={(e) => setEditData({ ...editData, carrier: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="USPS">USPS</option>
              <option value="UPS">UPS</option>
              <option value="FedEx">FedEx</option>
              <option value="DHL">DHL</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Cost ($)</label>
            <input
              type="number"
              step="0.01"
              value={editData.baseCost}
              onChange={(e) => setEditData({ ...editData, baseCost: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Per Item Cost ($)</label>
            <input
              type="number"
              step="0.01"
              value={editData.perItemCost}
              onChange={(e) => setEditData({ ...editData, perItemCost: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Days</label>
            <input
              type="number"
              value={editData.estimatedDays.min}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  estimatedDays: { ...editData.estimatedDays, min: parseInt(e.target.value) || 1 },
                })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Days</label>
            <input
              type="number"
              value={editData.estimatedDays.max}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  estimatedDays: { ...editData.estimatedDays, max: parseInt(e.target.value) || 1 },
                })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Free Over ($)</label>
            <input
              type="number"
              step="0.01"
              value={editData.freeShippingThreshold || ''}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  freeShippingThreshold: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              placeholder="None"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white border rounded-xl p-4 transition-all ${
        method.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              method.isActive ? 'bg-indigo-100' : 'bg-gray-100'
            }`}
          >
            <Truck className={`w-5 h-5 ${method.isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900">{method.name}</h4>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {method.carrier}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                ${method.baseCost.toFixed(2)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {method.estimatedDays.min === method.estimatedDays.max
                  ? `${method.estimatedDays.min} day`
                  : `${method.estimatedDays.min}-${method.estimatedDays.max} days`}
              </span>
              {method.freeShippingThreshold && (
                <span className="text-green-600">Free over ${method.freeShippingThreshold}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={method.isActive}
              onChange={(e) => onUpdate({ ...method, isActive: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHIPPING ZONE SECTION
// ═══════════════════════════════════════════════════════════════

interface ZoneSectionProps {
  zone: ShippingZone;
  onUpdate: (zone: ShippingZone) => void;
  onDelete: () => void;
}

function ZoneSection({ zone, onUpdate, onDelete }: ZoneSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleAddMethod = () => {
    const newMethod: ShippingMethod = {
      id: `method-${Date.now()}`,
      name: 'New Method',
      carrier: 'USPS',
      estimatedDays: { min: 3, max: 5 },
      baseCost: 5.99,
      perItemCost: 0,
      freeShippingThreshold: null,
      isActive: true,
    };
    onUpdate({ ...zone, methods: [...zone.methods, newMethod] });
  };

  const handleUpdateMethod = (index: number, method: ShippingMethod) => {
    const newMethods = [...zone.methods];
    newMethods[index] = method;
    onUpdate({ ...zone, methods: newMethods });
  };

  const handleDeleteMethod = (index: number) => {
    onUpdate({ ...zone, methods: zone.methods.filter((_, i) => i !== index) });
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Zone Header */}
      <div
        className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            {zone.countries.includes('US') ? (
              <MapPin className="w-5 h-5 text-indigo-600" />
            ) : (
              <Globe className="w-5 h-5 text-indigo-600" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{zone.name}</h3>
            <p className="text-sm text-gray-500">
              {zone.methods.length} method{zone.methods.length !== 1 ? 's' : ''} •{' '}
              {zone.methods.filter((m) => m.isActive).length} active
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 rounded-lg hover:bg-red-50 text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Zone Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Zone Config */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zone Name</label>
              <input
                type="text"
                value={zone.name}
                onChange={(e) => onUpdate({ ...zone, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Countries</label>
              <select
                multiple
                value={zone.countries}
                onChange={(e) =>
                  onUpdate({
                    ...zone,
                    countries: Array.from(e.target.selectedOptions, (o) => o.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="MX">Mexico</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
              </select>
            </div>
          </div>

          {/* Methods */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700">Shipping Methods</h4>
              <button
                onClick={handleAddMethod}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Method
              </button>
            </div>
            {zone.methods.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                <Truck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No shipping methods</p>
                <button
                  onClick={handleAddMethod}
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Add your first method
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {zone.methods.map((method, index) => (
                  <MethodCard
                    key={method.id}
                    method={method}
                    onUpdate={(m) => handleUpdateMethod(index, m)}
                    onDelete={() => handleDeleteMethod(index)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function ShippingSettingsPage() {
  const { selectedCompanyId } = useHierarchy();
  const [settings, setSettings] = useState<ShippingSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      // Try to load saved settings
      const response = await apiRequest.get<{ settings: ShippingSettings }>(
        `/api/settings/shipping?companyId=${selectedCompanyId}`
      ).catch(() => null);

      if (response?.settings) {
        setSettings(response.settings);
      }
    } catch (error) {
      console.error('Failed to load shipping settings:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiRequest.post(`/api/settings/shipping?companyId=${selectedCompanyId}`, {
        settings,
      });
      setHasChanges(false);
      toast.success('Shipping settings saved');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save shipping settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = <K extends keyof ShippingSettings>(key: K, value: ShippingSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleAddZone = () => {
    const newZone: ShippingZone = {
      id: `zone-${Date.now()}`,
      name: 'New Zone',
      countries: [],
      states: [],
      postalCodes: [],
      methods: [],
    };
    updateSettings('zones', [...settings.zones, newZone]);
  };

  const handleUpdateZone = (index: number, zone: ShippingZone) => {
    const newZones = [...settings.zones];
    newZones[index] = zone;
    updateSettings('zones', newZones);
  };

  const handleDeleteZone = (index: number) => {
    updateSettings(
      'zones',
      settings.zones.filter((_, i) => i !== index)
    );
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipping Settings</h1>
          <p className="text-gray-600 mt-1">Configure shipping zones and rates for your store</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
            hasChanges
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={settings.defaultCurrency}
              onChange={(e) => updateSettings('defaultCurrency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD ($)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weight Unit</label>
            <select
              value={settings.weightUnit}
              onChange={(e) => updateSettings('weightUnit', e.target.value as 'oz' | 'lb' | 'g' | 'kg')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="oz">Ounces (oz)</option>
              <option value="lb">Pounds (lb)</option>
              <option value="g">Grams (g)</option>
              <option value="kg">Kilograms (kg)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dimension Unit</label>
            <select
              value={settings.dimensionUnit}
              onChange={(e) => updateSettings('dimensionUnit', e.target.value as 'in' | 'cm')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="in">Inches (in)</option>
              <option value="cm">Centimeters (cm)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Handling Fee ($)</label>
            <input
              type="number"
              step="0.01"
              value={settings.handlingFee}
              onChange={(e) => updateSettings('handlingFee', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Shipping Zones */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Shipping Zones</h2>
          <button
            onClick={handleAddZone}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Zone
          </button>
        </div>

        {settings.zones.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No shipping zones</h3>
            <p className="text-gray-500 mb-4">Create zones to define where you ship and at what rates</p>
            <button
              onClick={handleAddZone}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create First Zone
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {settings.zones.map((zone, index) => (
              <ZoneSection
                key={zone.id}
                zone={zone}
                onUpdate={(z) => handleUpdateZone(index, z)}
                onDelete={() => handleDeleteZone(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">How shipping zones work</p>
          <p>
            Shipping zones determine which shipping methods are available for orders based on the
            customer's location. Create zones for different regions and add methods with specific
            rates and delivery times.
          </p>
        </div>
      </div>
    </div>
  );
}
