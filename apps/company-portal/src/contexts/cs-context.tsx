'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// =============================================================================
// API BASE URL
// =============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// =============================================================================
// TYPES
// =============================================================================

export type CSChannel = 'chat' | 'callback' | 'ticket';

export interface CSMessage {
  id: string;
  role: 'customer' | 'ai_rep' | 'ai_manager' | 'human_agent' | 'system';
  content: string;
  timestamp: Date;
}

export interface CSSession {
  id: string;
  channel: CSChannel;
  status: 'active' | 'waiting' | 'resolved' | 'escalated';
  messages: CSMessage[];
  createdAt: Date;
}

interface CSContextValue {
  // State
  isOpen: boolean;
  activeChannel: CSChannel | null;
  session: CSSession | null;
  messages: CSMessage[];
  isLoading: boolean;
  error: string | null;

  // Actions
  openWidget: () => void;
  closeWidget: () => void;
  setChannel: (channel: CSChannel | null) => void;
  startSession: (channel: CSChannel, initialMessage?: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  requestCallback: (phone: string, preferredTime?: string, message?: string) => Promise<boolean>;
  submitTicket: (subject: string, message: string, email?: string) => Promise<boolean>;
  endSession: () => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const CSContext = createContext<CSContextValue | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface CSProviderProps {
  children: ReactNode;
  companyId: string;
  sessionToken?: string;
  funnelId?: string;
}

export function CSProvider({
  children,
  companyId,
  sessionToken,
  funnelId,
}: CSProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState<CSChannel | null>(null);
  const [session, setSession] = useState<CSSession | null>(null);
  const [messages, setMessages] = useState<CSMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openWidget = useCallback(() => {
    setIsOpen(true);
    setError(null);
  }, []);

  const closeWidget = useCallback(() => {
    setIsOpen(false);
    // Don't clear session on close - user might want to continue
  }, []);

  const setChannel = useCallback((channel: CSChannel | null) => {
    setActiveChannel(channel);
    setError(null);
  }, []);

  const startSession = useCallback(async (channel: CSChannel, initialMessage?: string) => {
    if (!companyId) {
      setError('Company information is missing');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/cs/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          sessionToken,
          funnelId,
          channel,
          initialMessage,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to start session');
      }

      const newSession = await response.json();
      setSession(newSession);
      setMessages(newSession.messages || []);
      setActiveChannel(channel);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, [companyId, sessionToken, funnelId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!session?.id) {
      setError('No active session');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Optimistically add customer message
    const customerMessage: CSMessage = {
      id: `temp-${Date.now()}`,
      role: 'customer',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, customerMessage]);

    try {
      const response = await fetch(`${API_BASE}/api/cs/sessions/${session.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          content,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to send message');
      }

      const result = await response.json();

      // Replace optimistic message with actual and add AI response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== customerMessage.id);
        return [...filtered, result.customerMessage, result.response];
      });

      // Update session if included
      if (result.session) {
        setSession(result.session);
      }
    } catch (err) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== customerMessage.id));
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [session?.id, sessionToken]);

  const requestCallback = useCallback(async (
    phone: string,
    preferredTime?: string,
    message?: string
  ): Promise<boolean> => {
    if (!companyId) {
      setError('Company information is missing');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/cs/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          sessionToken,
          funnelId,
          phone,
          preferredTime,
          message,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to submit callback request');
      }

      // Success - don't change channel here, let form handle success state
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit callback request');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [companyId, sessionToken, funnelId]);

  const submitTicket = useCallback(async (
    subject: string,
    message: string,
    email?: string
  ): Promise<boolean> => {
    if (!companyId) {
      setError('Company information is missing');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/cs/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          sessionToken,
          funnelId,
          subject,
          message,
          email,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to submit ticket');
      }

      // Success - don't change channel here, let form handle success state
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit ticket');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [companyId, sessionToken, funnelId]);

  const endSession = useCallback(() => {
    setSession(null);
    setMessages([]);
    setActiveChannel(null);
    setError(null);
  }, []);

  const value: CSContextValue = {
    isOpen,
    activeChannel,
    session,
    messages,
    isLoading,
    error,
    openWidget,
    closeWidget,
    setChannel,
    startSession,
    sendMessage,
    requestCallback,
    submitTicket,
    endSession,
  };

  return (
    <CSContext.Provider value={value}>
      {children}
    </CSContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useCS() {
  const context = useContext(CSContext);
  if (context === undefined) {
    throw new Error('useCS must be used within a CSProvider');
  }
  return context;
}
