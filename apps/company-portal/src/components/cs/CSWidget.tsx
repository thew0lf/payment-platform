'use client';

import { useState } from 'react';
import { MessageCircle, Phone, Mail, X, ChevronLeft, Loader2 } from 'lucide-react';
import { CSProvider, useCS, CSChannel } from '@/contexts/cs-context';
import { ChatPanel } from './ChatPanel';
import { CallbackForm } from './CallbackForm';
import { TicketForm } from './TicketForm';

// =============================================================================
// MAIN WIDGET (with Provider wrapper)
// =============================================================================

interface CSWidgetProps {
  companyId: string;
  sessionToken?: string;
  funnelId?: string;
}

export function CSWidget({ companyId, sessionToken, funnelId }: CSWidgetProps) {
  return (
    <CSProvider companyId={companyId} sessionToken={sessionToken} funnelId={funnelId}>
      <CSWidgetContent />
    </CSProvider>
  );
}

// =============================================================================
// WIDGET CONTENT
// =============================================================================

function CSWidgetContent() {
  const {
    isOpen,
    activeChannel,
    openWidget,
    closeWidget,
    setChannel,
    error,
  } = useCS();

  // Render floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={openWidget}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3
          bg-[var(--primary-color,#4F46E5)] text-white rounded-full shadow-lg
          hover:shadow-xl transition-all duration-200 hover:scale-105
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-color,#4F46E5)]"
        aria-label="Open customer support"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="font-medium">Need Help?</span>
      </button>
    );
  }

  // Render widget panel when open
  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)]
        bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden
        flex flex-col max-h-[600px] border border-gray-200 dark:border-gray-700"
      role="dialog"
      aria-label="Customer support widget"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3
          bg-[var(--primary-color,#4F46E5)] text-white"
      >
        <div className="flex items-center gap-2">
          {activeChannel && (
            <button
              onClick={() => setChannel(null)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Back to channel selection"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="font-semibold">
            {activeChannel ? getChannelTitle(activeChannel) : 'How can we help?'}
          </h2>
        </div>
        <button
          onClick={closeWidget}
          className="p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Close support widget"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {!activeChannel ? (
          <ChannelSelector onSelect={setChannel} />
        ) : activeChannel === 'chat' ? (
          <ChatPanel />
        ) : activeChannel === 'callback' ? (
          <CallbackForm />
        ) : (
          <TicketForm />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// CHANNEL SELECTOR
// =============================================================================

interface ChannelSelectorProps {
  onSelect: (channel: CSChannel) => void;
}

function ChannelSelector({ onSelect }: ChannelSelectorProps) {
  const { isLoading } = useCS();
  const [selectedChannel, setSelectedChannel] = useState<CSChannel | null>(null);

  const handleSelect = (channel: CSChannel) => {
    setSelectedChannel(channel);
    onSelect(channel);
  };

  return (
    <div className="p-4 space-y-3">
      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
        Choose how you&apos;d like to connect with us:
      </p>

      <ChannelOption
        icon={<MessageCircle className="w-5 h-5" />}
        title="Live Chat"
        description="Chat with our AI assistant now"
        onClick={() => handleSelect('chat')}
        isLoading={isLoading && selectedChannel === 'chat'}
        disabled={isLoading}
      />

      <ChannelOption
        icon={<Phone className="w-5 h-5" />}
        title="Request Callback"
        description="We'll call you at your preferred time"
        onClick={() => handleSelect('callback')}
        isLoading={isLoading && selectedChannel === 'callback'}
        disabled={isLoading}
      />

      <ChannelOption
        icon={<Mail className="w-5 h-5" />}
        title="Submit Ticket"
        description="Send us a message, we'll respond soon"
        onClick={() => handleSelect('ticket')}
        isLoading={isLoading && selectedChannel === 'ticket'}
        disabled={isLoading}
      />
    </div>
  );
}

// =============================================================================
// CHANNEL OPTION BUTTON
// =============================================================================

interface ChannelOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

function ChannelOption({ icon, title, description, onClick, isLoading, disabled }: ChannelOptionProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200
        dark:border-gray-700 hover:border-[var(--primary-color,#4F46E5)]
        hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all text-left
        focus:outline-none focus:ring-2 focus:ring-[var(--primary-color,#4F46E5)]
        disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div
        className="flex-shrink-0 w-10 h-10 flex items-center justify-center
          rounded-full bg-[var(--primary-color,#4F46E5)]/10
          text-[var(--primary-color,#4F46E5)]"
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : icon}
      </div>
      <div>
        <div className="font-medium text-gray-900 dark:text-white">{title}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{description}</div>
      </div>
    </button>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function getChannelTitle(channel: CSChannel): string {
  switch (channel) {
    case 'chat':
      return 'Live Chat';
    case 'callback':
      return 'Request Callback';
    case 'ticket':
      return 'Submit Ticket';
    default:
      return 'Support';
  }
}
