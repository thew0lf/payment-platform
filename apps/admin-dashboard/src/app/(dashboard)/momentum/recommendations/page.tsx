'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Sparkles,
  ShoppingBag,
  Eye,
  Package,
  Settings,
  Save,
  RefreshCw,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Info,
  TrendingUp,
  Users,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  recommendationsAdminApi,
  RecommendationConfig,
  UpdateRecommendationConfigInput,
  AlsoBoughtConfig,
  YouMightLikeConfig,
  FrequentlyViewedConfig,
  GlobalConfig,
  DISPLAY_STYLES,
  DEFAULT_CONFIG,
} from '@/lib/api/recommendations';

// ═══════════════════════════════════════════════════════════════
// SECTION CONFIG CARD
// ═══════════════════════════════════════════════════════════════

interface SectionCardProps {
  title: string;
  description: string;
  icon: typeof Sparkles;
  iconColor: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: React.ReactNode;
}

function SectionCard({ title, description, icon: Icon, iconColor, enabled, onToggle, children }: SectionCardProps) {
  return (
    <Card className={cn('transition-colors', !enabled && 'opacity-60')}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn('p-2 rounded-lg', iconColor)}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{enabled ? 'Enabled' : 'Disabled'}</span>
            <Switch checked={enabled} onCheckedChange={onToggle} />
          </div>
        </div>
      </CardHeader>
      {enabled && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// TOOLTIP LABEL
// ═══════════════════════════════════════════════════════════════

function TooltipLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div className="flex items-center gap-1">
      <Label>{label}</Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════

export default function RecommendationsConfigPage() {
  const [config, setConfig] = useState<RecommendationConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Draft state for editing
  const [alsoBought, setAlsoBought] = useState<AlsoBoughtConfig>(DEFAULT_CONFIG.alsoBought);
  const [youMightLike, setYouMightLike] = useState<YouMightLikeConfig>(DEFAULT_CONFIG.youMightLike);
  const [frequentlyViewed, setFrequentlyViewed] = useState<FrequentlyViewedConfig>(DEFAULT_CONFIG.frequentlyViewed);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>(DEFAULT_CONFIG.global);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await recommendationsAdminApi.getConfig();
      setConfig(data);
      setAlsoBought(data.alsoBought || DEFAULT_CONFIG.alsoBought);
      setYouMightLike(data.youMightLike || DEFAULT_CONFIG.youMightLike);
      setFrequentlyViewed(data.frequentlyViewed || DEFAULT_CONFIG.frequentlyViewed);
      setGlobalConfig(data.global || DEFAULT_CONFIG.global);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to load config:', error);
      // Use defaults if no config exists
      setAlsoBought(DEFAULT_CONFIG.alsoBought);
      setYouMightLike(DEFAULT_CONFIG.youMightLike);
      setFrequentlyViewed(DEFAULT_CONFIG.frequentlyViewed);
      setGlobalConfig(DEFAULT_CONFIG.global);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data: UpdateRecommendationConfigInput = {
        alsoBought,
        youMightLike,
        frequentlyViewed,
        global: globalConfig,
      };
      const updated = await recommendationsAdminApi.updateConfig(data);
      setConfig(updated);
      setHasChanges(false);
      toast.success('Recommendation settings saved');
    } catch (error) {
      console.error('Failed to save config:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateAlsoBought = (updates: Partial<AlsoBoughtConfig>) => {
    setAlsoBought((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const updateYouMightLike = (updates: Partial<YouMightLikeConfig>) => {
    setYouMightLike((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const updateFrequentlyViewed = (updates: Partial<FrequentlyViewedConfig>) => {
    setFrequentlyViewed((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const updateGlobal = (updates: Partial<GlobalConfig>) => {
    setGlobalConfig((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Product Recommendations</h1>
          <p className="text-muted-foreground">
            Configure AI-powered product recommendations for your store
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadConfig} disabled={isLoading} className="min-h-[44px] touch-manipulation">
            <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving} className="min-h-[44px] touch-manipulation">
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <ShoppingBag className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sections Enabled</p>
                <p className="text-2xl font-bold">
                  {[alsoBought.enabled, youMightLike.enabled, frequentlyViewed.enabled].filter(Boolean).length}/3
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AI Ranking</p>
                <p className="text-2xl font-bold">{alsoBought.useAIRanking ? 'On' : 'Off'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Personalization</p>
                <p className="text-2xl font-bold">{youMightLike.showPersonalizationBadge ? 'On' : 'Off'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Package className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bundle Discount</p>
                <p className="text-2xl font-bold">{frequentlyViewed.bundleDiscountPercent || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Tabs */}
      <Tabs defaultValue="also-bought" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="also-bought">Also Bought</TabsTrigger>
          <TabsTrigger value="you-might-like">You Might Like</TabsTrigger>
          <TabsTrigger value="frequently-viewed">Viewed Together</TabsTrigger>
          <TabsTrigger value="global">Global</TabsTrigger>
        </TabsList>

        {/* Also Bought Tab */}
        <TabsContent value="also-bought">
          <SectionCard
            title="Customers Also Bought"
            description="Show products frequently purchased together using collaborative filtering"
            icon={ShoppingBag}
            iconColor="bg-blue-500/10 text-blue-500"
            enabled={alsoBought.enabled || false}
            onToggle={(enabled) => updateAlsoBought({ enabled })}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <TooltipLabel label="Section Title" tooltip="The heading displayed above the recommendations" />
                  <Input
                    value={alsoBought.title || ''}
                    onChange={(e) => updateAlsoBought({ title: e.target.value })}
                    placeholder="Customers Who Bought This Also Bought"
                  />
                </div>
                <div className="space-y-2">
                  <TooltipLabel label="Display Style" tooltip="How recommendations are displayed on the page" />
                  <Select
                    value={alsoBought.displayStyle || 'CAROUSEL'}
                    onValueChange={(value: 'CAROUSEL' | 'GRID') => updateAlsoBought({ displayStyle: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CAROUSEL">Carousel</SelectItem>
                      <SelectItem value="GRID">Grid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <TooltipLabel label="Max Results" tooltip="Maximum number of products to show" />
                  <Input
                    type="number"
                    value={alsoBought.maxResults || 10}
                    onChange={(e) => updateAlsoBought({ maxResults: parseInt(e.target.value) || 10 })}
                    min={1}
                    max={20}
                  />
                </div>
                <div className="space-y-2">
                  <TooltipLabel label="Min Co-occurrences" tooltip="Minimum times products must be bought together" />
                  <Input
                    type="number"
                    value={alsoBought.minCoOccurrences || 5}
                    onChange={(e) => updateAlsoBought({ minCoOccurrences: parseInt(e.target.value) || 5 })}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <TooltipLabel label="Lookback Days" tooltip="How far back to analyze purchase data" />
                  <Input
                    type="number"
                    value={alsoBought.lookbackDays || 90}
                    onChange={(e) => updateAlsoBought({ lookbackDays: parseInt(e.target.value) || 90 })}
                    min={7}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={alsoBought.useAIRanking || false}
                    onCheckedChange={(checked) => updateAlsoBought({ useAIRanking: checked })}
                  />
                  <Label className="text-sm">AI Ranking</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={alsoBought.boostHighMargin || false}
                    onCheckedChange={(checked) => updateAlsoBought({ boostHighMargin: checked })}
                  />
                  <Label className="text-sm">Boost High Margin</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={alsoBought.boostInStock || false}
                    onCheckedChange={(checked) => updateAlsoBought({ boostInStock: checked })}
                  />
                  <Label className="text-sm">Boost In Stock</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={alsoBought.showRatings || false}
                    onCheckedChange={(checked) => updateAlsoBought({ showRatings: checked })}
                  />
                  <Label className="text-sm">Show Ratings</Label>
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* You Might Like Tab */}
        <TabsContent value="you-might-like">
          <SectionCard
            title="You Might Like"
            description="Personalized recommendations based on browsing and purchase history"
            icon={Sparkles}
            iconColor="bg-purple-500/10 text-purple-500"
            enabled={youMightLike.enabled || false}
            onToggle={(enabled) => updateYouMightLike({ enabled })}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <TooltipLabel label="Title (Logged In)" tooltip="Title shown to logged-in customers" />
                  <Input
                    value={youMightLike.title || ''}
                    onChange={(e) => updateYouMightLike({ title: e.target.value })}
                    placeholder="Recommended For You"
                  />
                </div>
                <div className="space-y-2">
                  <TooltipLabel label="Title (Guests)" tooltip="Title shown to guest visitors" />
                  <Input
                    value={youMightLike.titleForGuests || ''}
                    onChange={(e) => updateYouMightLike({ titleForGuests: e.target.value })}
                    placeholder="You Might Also Like"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Algorithm Weights</Label>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Browsing History</span>
                      <span>{Math.round((youMightLike.browsingWeight || 0.3) * 100)}%</span>
                    </div>
                    <Slider
                      value={[(youMightLike.browsingWeight || 0.3) * 100]}
                      onValueChange={([value]) => updateYouMightLike({ browsingWeight: value / 100 })}
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Purchase History</span>
                      <span>{Math.round((youMightLike.purchaseWeight || 0.4) * 100)}%</span>
                    </div>
                    <Slider
                      value={[(youMightLike.purchaseWeight || 0.4) * 100]}
                      onValueChange={([value]) => updateYouMightLike({ purchaseWeight: value / 100 })}
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Content Similarity</span>
                      <span>{Math.round((youMightLike.contentWeight || 0.3) * 100)}%</span>
                    </div>
                    <Slider
                      value={[(youMightLike.contentWeight || 0.3) * 100]}
                      onValueChange={([value]) => updateYouMightLike({ contentWeight: value / 100 })}
                      max={100}
                      step={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Diversity Factor</span>
                      <span>{Math.round((youMightLike.diversityFactor || 0.5) * 100)}%</span>
                    </div>
                    <Slider
                      value={[(youMightLike.diversityFactor || 0.5) * 100]}
                      onValueChange={([value]) => updateYouMightLike({ diversityFactor: value / 100 })}
                      max={100}
                      step={5}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={youMightLike.excludeRecentlyViewed || false}
                    onCheckedChange={(checked) => updateYouMightLike({ excludeRecentlyViewed: checked })}
                  />
                  <Label className="text-sm">Exclude Recently Viewed</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={youMightLike.excludePurchased || false}
                    onCheckedChange={(checked) => updateYouMightLike({ excludePurchased: checked })}
                  />
                  <Label className="text-sm">Exclude Purchased</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={youMightLike.showPersonalizationBadge || false}
                    onCheckedChange={(checked) => updateYouMightLike({ showPersonalizationBadge: checked })}
                  />
                  <Label className="text-sm">Show Personalization Badge</Label>
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Frequently Viewed Tab */}
        <TabsContent value="frequently-viewed">
          <SectionCard
            title="Frequently Viewed Together"
            description="Show products often viewed in the same session for bundle opportunities"
            icon={Eye}
            iconColor="bg-green-500/10 text-green-500"
            enabled={frequentlyViewed.enabled || false}
            onToggle={(enabled) => updateFrequentlyViewed({ enabled })}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <TooltipLabel label="Section Title" tooltip="The heading displayed above the recommendations" />
                  <Input
                    value={frequentlyViewed.title || ''}
                    onChange={(e) => updateFrequentlyViewed({ title: e.target.value })}
                    placeholder="Frequently Viewed Together"
                  />
                </div>
                <div className="space-y-2">
                  <TooltipLabel label="Display Style" tooltip="How recommendations are displayed" />
                  <Select
                    value={frequentlyViewed.displayStyle || 'BUNDLE_CARDS'}
                    onValueChange={(value: 'BUNDLE_CARDS' | 'COMPACT') => updateFrequentlyViewed({ displayStyle: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUNDLE_CARDS">Bundle Cards</SelectItem>
                      <SelectItem value="COMPACT">Compact</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <TooltipLabel label="Max Bundle Size" tooltip="Maximum products in a bundle" />
                  <Input
                    type="number"
                    value={frequentlyViewed.maxBundleSize || 3}
                    onChange={(e) => updateFrequentlyViewed({ maxBundleSize: parseInt(e.target.value) || 3 })}
                    min={2}
                    max={5}
                  />
                </div>
                <div className="space-y-2">
                  <TooltipLabel label="Bundle Discount %" tooltip="Discount for buying the bundle" />
                  <Input
                    type="number"
                    value={frequentlyViewed.bundleDiscountPercent || 10}
                    onChange={(e) => updateFrequentlyViewed({ bundleDiscountPercent: parseInt(e.target.value) || 10 })}
                    min={0}
                    max={50}
                  />
                </div>
                <div className="space-y-2">
                  <TooltipLabel label="Min Session Co-views" tooltip="Minimum times products viewed together" />
                  <Input
                    type="number"
                    value={frequentlyViewed.minSessionCoViews || 10}
                    onChange={(e) => updateFrequentlyViewed({ minSessionCoViews: parseInt(e.target.value) || 10 })}
                    min={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={frequentlyViewed.showBundleSavings || false}
                    onCheckedChange={(checked) => updateFrequentlyViewed({ showBundleSavings: checked })}
                  />
                  <Label className="text-sm">Show Bundle Savings</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={frequentlyViewed.showAddAllButton || false}
                    onCheckedChange={(checked) => updateFrequentlyViewed({ showAddAllButton: checked })}
                  />
                  <Label className="text-sm">Show &quot;Add All&quot; Button</Label>
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Global Tab */}
        <TabsContent value="global">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-gray-500/10">
                  <Settings className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Global Settings</CardTitle>
                  <CardDescription>Settings that apply to all recommendation sections</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <TooltipLabel
                    label="Max Sections Per Page"
                    tooltip="Maximum recommendation sections to show on a product page"
                  />
                  <Input
                    type="number"
                    value={globalConfig.maxSectionsPerPage || 3}
                    onChange={(e) => updateGlobal({ maxSectionsPerPage: parseInt(e.target.value) || 3 })}
                    min={1}
                    max={5}
                  />
                </div>
                <div className="space-y-2">
                  <TooltipLabel label="Min Rating to Show" tooltip="Only show products with this rating or higher" />
                  <Input
                    type="number"
                    value={globalConfig.minRatingToShow || 0}
                    onChange={(e) => updateGlobal({ minRatingToShow: parseFloat(e.target.value) || 0 })}
                    min={0}
                    max={5}
                    step={0.5}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={globalConfig.respectInventory || false}
                    onCheckedChange={(checked) => updateGlobal({ respectInventory: checked })}
                  />
                  <Label className="text-sm">Respect Inventory</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={globalConfig.trackImpressions || false}
                    onCheckedChange={(checked) => updateGlobal({ trackImpressions: checked })}
                  />
                  <Label className="text-sm">Track Impressions</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={globalConfig.trackClicks || false}
                    onCheckedChange={(checked) => updateGlobal({ trackClicks: checked })}
                  />
                  <Label className="text-sm">Track Clicks</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sticky Save Bar */}
      {hasChanges && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <Card className="shadow-lg border-primary">
            <CardContent className="p-4 flex items-center gap-4">
              <p className="text-sm font-medium">You have unsaved changes</p>
              <Button onClick={handleSave} disabled={isSaving} className="min-h-[44px] touch-manipulation">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
