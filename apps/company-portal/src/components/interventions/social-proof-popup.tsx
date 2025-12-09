'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface SocialProofNotification {
  id: string;
  name: string;
  location: string;
  product: string;
  timeAgo: string;
  avatarUrl?: string;
}

interface SocialProofConfig {
  enabled: boolean;
  type: 'recent_purchase' | 'active_viewers' | 'total_purchases' | 'rating';
  displayInterval: number;
  displayDuration: number;
  minDelay: number;
  maxDelay: number;
  position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  showOnStages: string[];
}

interface SocialProofPopupProps {
  config: SocialProofConfig;
  notifications: SocialProofNotification[];
  currentStage: string;
  onShown?: (notification: SocialProofNotification) => void;
  onClicked?: (notification: SocialProofNotification) => void;
  onDismissed?: (notification: SocialProofNotification) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SocialProofPopup({
  config,
  notifications,
  currentStage,
  onShown,
  onClicked,
  onDismissed,
}: SocialProofPopupProps) {
  const [currentNotification, setCurrentNotification] = useState<SocialProofNotification | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [notificationIndex, setNotificationIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Check if should show on current stage
  const shouldShowOnStage = config.showOnStages.includes(currentStage);

  // Show next notification
  const showNextNotification = useCallback(() => {
    if (!shouldShowOnStage || notifications.length === 0) return;

    const notification = notifications[notificationIndex % notifications.length];
    setCurrentNotification(notification);
    setIsVisible(true);
    onShown?.(notification);

    // Hide after display duration
    setTimeout(() => {
      setIsVisible(false);
    }, config.displayDuration * 1000);

    // Update index for next notification
    setNotificationIndex((prev) => (prev + 1) % notifications.length);
  }, [notifications, notificationIndex, config.displayDuration, shouldShowOnStage, onShown]);

  // Schedule notifications
  useEffect(() => {
    if (!config.enabled || !shouldShowOnStage || notifications.length === 0) return;

    // Initial delay
    const initialDelay = Math.random() * (config.maxDelay - config.minDelay) + config.minDelay;
    const initialTimer = setTimeout(showNextNotification, initialDelay * 1000);

    // Recurring interval
    const intervalTimer = setInterval(showNextNotification, config.displayInterval * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, [config, shouldShowOnStage, notifications.length, showNextNotification]);

  const handleClick = () => {
    if (currentNotification) {
      onClicked?.(currentNotification);
    }
  };

  const handleDismiss = () => {
    if (currentNotification) {
      onDismissed?.(currentNotification);
    }
    setIsVisible(false);
  };

  // Position classes
  const positionClasses = {
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
  };

  if (!mounted || !currentNotification || !isVisible) return null;

  const popup = (
    <div
      className={`fixed ${positionClasses[config.position]} z-50 max-w-sm animate-slide-in`}
      style={{
        animation: isVisible ? 'slideIn 0.3s ease-out' : 'slideOut 0.3s ease-in',
      }}
    >
      <div
        onClick={handleClick}
        className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          {currentNotification.avatarUrl ? (
            <img
              src={currentNotification.avatarUrl}
              alt={currentNotification.name}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
              {currentNotification.name.charAt(0)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900">
            <span className="font-semibold">{currentNotification.name}</span>
            {' from '}
            <span className="text-gray-600">{currentNotification.location}</span>
            {' just purchased '}
            <span className="font-medium text-indigo-600">{currentNotification.product}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">{currentNotification.timeAgo}</p>
        </div>

        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Verified badge */}
      <div className="flex items-center justify-end mt-1 pr-2">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Verified purchase</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideOut {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(20px);
          }
        }
      `}</style>
    </div>
  );

  return createPortal(popup, document.body);
}

export default SocialProofPopup;
