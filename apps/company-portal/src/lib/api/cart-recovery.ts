/**
 * Cart Recovery API Client
 *
 * Client for interacting with the MI Cart Save API endpoints
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

// ============================================================================
// Types
// ============================================================================

export enum CartAbandonmentReason {
  TOO_EXPENSIVE = 'TOO_EXPENSIVE',
  SHIPPING_COST = 'SHIPPING_COST',
  JUST_BROWSING = 'JUST_BROWSING',
  NEED_MORE_INFO = 'NEED_MORE_INFO',
  PAYMENT_ISSUES = 'PAYMENT_ISSUES',
  COMPARING_OPTIONS = 'COMPARING_OPTIONS',
  SAVING_FOR_LATER = 'SAVING_FOR_LATER',
  OTHER = 'OTHER',
}

export enum CartSaveStage {
  BROWSE_REMINDER = 'BROWSE_REMINDER',
  PATTERN_INTERRUPT = 'PATTERN_INTERRUPT',
  DIAGNOSIS_SURVEY = 'DIAGNOSIS_SURVEY',
  BRANCHING_INTERVENTION = 'BRANCHING_INTERVENTION',
  NUCLEAR_OFFER = 'NUCLEAR_OFFER',
  LOSS_VISUALIZATION = 'LOSS_VISUALIZATION',
  WINBACK_SEQUENCE = 'WINBACK_SEQUENCE',
}

export interface CartSaveAttempt {
  id: string;
  cartId: string;
  currentStage: CartSaveStage;
  status: 'PENDING' | 'ACTIVE' | 'CONVERTED' | 'EXHAUSTED' | 'EXPIRED';
  diagnosedReason?: CartAbandonmentReason;
  offer?: {
    type: string;
    value?: number;
    code: string;
    expiresAt: string;
  };
  intervention?: {
    subject: string;
    headline: string;
    body: string;
    cta: string;
    recoveryUrl: string;
  };
}

export interface DiagnosisSurveyOption {
  reason: CartAbandonmentReason;
  label: string;
  description?: string;
}

export const DIAGNOSIS_OPTIONS: DiagnosisSurveyOption[] = [
  {
    reason: CartAbandonmentReason.TOO_EXPENSIVE,
    label: 'Too expensive',
    description: "I'm looking for a better deal",
  },
  {
    reason: CartAbandonmentReason.SHIPPING_COST,
    label: 'Shipping costs/time',
    description: "Shipping doesn't work for me",
  },
  {
    reason: CartAbandonmentReason.JUST_BROWSING,
    label: 'Just browsing',
    description: "I'm not ready to buy yet",
  },
  {
    reason: CartAbandonmentReason.COMPARING_OPTIONS,
    label: 'Comparing options',
    description: "I'm checking out competitors",
  },
  {
    reason: CartAbandonmentReason.NEED_MORE_INFO,
    label: 'Need more information',
    description: 'I have questions about the product',
  },
  {
    reason: CartAbandonmentReason.PAYMENT_ISSUES,
    label: 'Payment issues',
    description: 'Having trouble with payment',
  },
  {
    reason: CartAbandonmentReason.SAVING_FOR_LATER,
    label: 'Saving for later',
    description: "I'll come back when I'm ready",
  },
  {
    reason: CartAbandonmentReason.OTHER,
    label: 'Other reason',
    description: 'Something else',
  },
];

// ============================================================================
// API Functions
// ============================================================================

/**
 * Initiate a cart save flow
 */
export async function initiateSaveFlow(
  cartId: string,
  reason?: CartAbandonmentReason,
): Promise<{ attemptId: string; stage: CartSaveStage }> {
  const response = await fetch(`${API_URL}/api/momentum/cart-save/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cartId, reason }),
  });

  if (!response.ok) {
    throw new Error('Failed to initiate save flow');
  }

  return response.json();
}

/**
 * Get current save attempt status
 */
export async function getAttemptStatus(attemptId: string): Promise<CartSaveAttempt> {
  const response = await fetch(`${API_URL}/api/momentum/cart-save/attempts/${attemptId}/status`);

  if (!response.ok) {
    throw new Error('Failed to get attempt status');
  }

  return response.json();
}

/**
 * Progress to next stage in save flow
 */
export async function progressSaveFlow(
  attemptId: string,
  response?: { type: string; data?: Record<string, unknown> },
): Promise<CartSaveAttempt> {
  const res = await fetch(`${API_URL}/api/momentum/cart-save/attempts/${attemptId}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(response || {}),
  });

  if (!res.ok) {
    throw new Error('Failed to progress save flow');
  }

  return res.json();
}

/**
 * Record diagnosis survey answer
 */
export async function recordDiagnosis(
  attemptId: string,
  reason: CartAbandonmentReason,
): Promise<void> {
  const response = await fetch(`${API_URL}/api/momentum/cart-save/attempts/${attemptId}/diagnosis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    throw new Error('Failed to record diagnosis');
  }
}

/**
 * Execute intervention for current stage
 */
export async function executeIntervention(attemptId: string): Promise<{
  content: CartSaveAttempt['intervention'];
  offer?: CartSaveAttempt['offer'];
}> {
  const response = await fetch(`${API_URL}/api/momentum/cart-save/attempts/${attemptId}/execute`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to execute intervention');
  }

  return response.json();
}

/**
 * Track checkout behavior event
 */
export async function trackCheckoutEvent(
  sessionId: string,
  event: {
    type: string;
    field?: string;
    step?: string;
    duration?: number;
    promoCode?: string;
  },
): Promise<{ alert?: { riskScore: number; predictedReason: string } }> {
  const response = await fetch(`${API_URL}/api/momentum/cart-save/churn/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, event }),
  });

  if (!response.ok) {
    throw new Error('Failed to track checkout event');
  }

  return response.json();
}

/**
 * Apply recovery offer
 */
export async function applyRecoveryOffer(
  cartId: string,
  offerCode: string,
): Promise<{ success: boolean; discount?: number }> {
  const response = await fetch(`${API_URL}/api/carts/${cartId}/apply-promo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: offerCode }),
  });

  if (!response.ok) {
    throw new Error('Failed to apply offer');
  }

  return response.json();
}
