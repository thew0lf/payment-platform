const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface FunnelStage {
  id: string;
  name: string;
  type: string;
  order: number;
  config: Record<string, unknown>;
  themeId?: string;
  customStyles?: Record<string, unknown>;
}

export interface FunnelVariant {
  id: string;
  name: string;
  isControl: boolean;
  trafficWeight: number;
  stageOverrides?: Record<string, unknown>;
}

export interface FunnelCompany {
  id: string;
  name: string;
  code: string;
}

export interface FunnelSettings {
  branding?: {
    primaryColor?: string;
    logoUrl?: string;
    faviconUrl?: string;
  };
  seo?: {
    title?: string;
    description?: string;
    ogImage?: string;
  };
  behavior?: {
    allowBackNavigation?: boolean;
    showProgressBar?: boolean;
  };
}

export interface Funnel {
  id: string;
  name: string;
  slug: string;
  shortId: string;
  seoUrl: string;
  description?: string;
  type: string;
  status: string;
  settings: FunnelSettings;
  company: FunnelCompany;
  stages: FunnelStage[];
  variants: FunnelVariant[];
}

export interface FunnelSession {
  id: string;
  sessionToken: string;
  currentStageOrder: number;
  variantId: string;
  data: Record<string, unknown>;
  status: string;
}

/**
 * Fetch funnel by SEO slug (public, no auth required)
 * URL format: {slug}-{shortId} e.g., "summer-sale-x7Kq3m"
 */
export async function getFunnel(seoSlug: string): Promise<Funnel> {
  const response = await fetch(`${API_URL}/api/f/${seoSlug}`, {
    next: { revalidate: 60 }, // Cache for 60 seconds, revalidate in background
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Funnel not found');
    }
    throw new Error('Failed to fetch funnel');
  }

  return response.json();
}

/**
 * Start a new funnel session
 */
export async function startSession(
  funnelId: string,
  data?: { variantId?: string; referrer?: string; utmParams?: Record<string, string> }
): Promise<FunnelSession> {
  const response = await fetch(`${API_URL}/api/f/${funnelId}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data || {}),
  });

  if (!response.ok) {
    throw new Error('Failed to start session');
  }

  return response.json();
}

/**
 * Get existing session by token
 */
export async function getSession(sessionToken: string): Promise<FunnelSession> {
  const response = await fetch(`${API_URL}/api/f/sessions/${sessionToken}`);

  if (!response.ok) {
    throw new Error('Session not found');
  }

  return response.json();
}

/**
 * Update session data
 */
export async function updateSession(
  sessionToken: string,
  data: { stageData?: Record<string, unknown>; email?: string }
): Promise<FunnelSession> {
  const response = await fetch(`${API_URL}/api/f/sessions/${sessionToken}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to update session');
  }

  return response.json();
}

/**
 * Advance to next stage
 */
export async function advanceStage(
  sessionToken: string,
  toStageOrder: number
): Promise<FunnelSession> {
  const response = await fetch(`${API_URL}/api/f/sessions/${sessionToken}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toStageOrder }),
  });

  if (!response.ok) {
    throw new Error('Failed to advance stage');
  }

  return response.json();
}

/**
 * Complete session (order placed)
 */
export async function completeSession(
  sessionToken: string,
  orderId: string,
  totalAmount: number,
  currency: string
): Promise<FunnelSession> {
  const response = await fetch(`${API_URL}/api/f/sessions/${sessionToken}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, totalAmount, currency }),
  });

  if (!response.ok) {
    throw new Error('Failed to complete session');
  }

  return response.json();
}

/**
 * Track an event
 */
export async function trackEvent(
  sessionToken: string,
  eventType: string,
  eventData?: Record<string, unknown>
): Promise<void> {
  await fetch(`${API_URL}/api/f/sessions/${sessionToken}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventType, eventData }),
  });
}
