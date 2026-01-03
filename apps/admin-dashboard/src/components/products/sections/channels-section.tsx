'use client';

import * as React from 'react';
import { Share2, Globe, Store, Users, ShoppingBag, Check, X } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Badge } from '@/components/ui/badge';
import type { SalesChannel, ProductSalesChannel, SalesChannelType } from '@/lib/api/sales-channels';

interface ChannelsSectionProps {
  channels: SalesChannel[];
  productChannels: ProductSalesChannel[];
  onChannelToggle: (channelId: string, isPublished: boolean) => void;
  onChannelPriceChange?: (channelId: string, price: number | undefined) => void;
  defaultOpen?: boolean;
  isLoading?: boolean;
}

const channelIcons: Record<SalesChannelType, React.ReactNode> = {
  ONLINE_STORE: <Globe className="h-4 w-4" />,
  POS: <Store className="h-4 w-4" />,
  WHOLESALE: <Users className="h-4 w-4" />,
  MARKETPLACE: <ShoppingBag className="h-4 w-4" />,
  SOCIAL: <Share2 className="h-4 w-4" />,
  CUSTOM: <Share2 className="h-4 w-4" />,
};

/**
 * ChannelsSection - Sales channel publishing toggles
 */
export function ChannelsSection({
  channels,
  productChannels,
  onChannelToggle,
  onChannelPriceChange,
  defaultOpen = false,
  isLoading = false,
}: ChannelsSectionProps) {
  // Create a map of channel ID to product channel
  const channelMap = React.useMemo(() => {
    const map = new Map<string, ProductSalesChannel>();
    productChannels.forEach((pc) => map.set(pc.channelId, pc));
    return map;
  }, [productChannels]);

  const publishedCount = productChannels.filter((pc) => pc.isPublished).length;
  const activeChannels = channels.filter((c) => c.isActive);

  const getChannelStatus = (channelId: string) => {
    const productChannel = channelMap.get(channelId);
    return productChannel?.isPublished ?? false;
  };

  const getChannelPrice = (channelId: string) => {
    const productChannel = channelMap.get(channelId);
    return productChannel?.channelPrice;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (channels.length === 0) {
    return (
      <CollapsibleCard
        title="Sales Channels"
        subtitle="No sales channels configured"
        icon={<Share2 className="h-5 w-5" />}
        defaultOpen={defaultOpen}
        storageKey="product-channels"
      >
        <p className="text-sm text-muted-foreground">
          Configure sales channels in your company settings to publish products
          to different platforms and stores.
        </p>
      </CollapsibleCard>
    );
  }

  return (
    <CollapsibleCard
      title="Sales Channels"
      subtitle="Choose where to sell this product"
      icon={<Share2 className="h-5 w-5" />}
      badge={
        <Badge variant={publishedCount > 0 ? 'default' : 'secondary'}>
          {publishedCount}/{activeChannels.length} published
        </Badge>
      }
      defaultOpen={defaultOpen}
      storageKey="product-channels"
    >
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-muted rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {activeChannels
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((channel) => {
              const isPublished = getChannelStatus(channel.id);
              const channelPrice = getChannelPrice(channel.id);
              const productChannel = channelMap.get(channel.id);

              return (
                <div
                  key={channel.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    isPublished
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isPublished
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {channelIcons[channel.type]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{channel.name}</span>
                        {channel.isDefault && (
                          <Badge variant="outline" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      {channel.description && (
                        <p className="text-sm text-muted-foreground">
                          {channel.description}
                        </p>
                      )}
                      {isPublished && productChannel?.publishedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Published {formatDate(productChannel.publishedAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Channel-specific price (optional) */}
                    {onChannelPriceChange && isPublished && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={channelPrice || ''}
                          onChange={(e) =>
                            onChannelPriceChange(
                              channel.id,
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          placeholder="Default"
                          className="w-24 h-8 text-sm rounded border border-border bg-background px-2"
                        />
                      </div>
                    )}

                    {/* Toggle button */}
                    <button
                      type="button"
                      onClick={() => onChannelToggle(channel.id, !isPublished)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isPublished
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {isPublished ? (
                        <>
                          <Check className="h-4 w-4" />
                          Published
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4" />
                          Unpublished
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

          {/* Inactive channels notice */}
          {channels.filter((c) => !c.isActive).length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              {channels.filter((c) => !c.isActive).length} inactive channel(s)
              hidden. Enable them in Settings to publish products.
            </p>
          )}
        </div>
      )}
    </CollapsibleCard>
  );
}

export default ChannelsSection;
