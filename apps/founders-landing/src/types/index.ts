export interface Founder {
  id: number;
  founderNumber: string;
  email: string;
  phone?: string;
  basePosition: number;
  currentPosition: number;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  status: 'active' | 'verified' | 'converted';
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface Referral {
  id: number;
  referrerId: number;
  referredId: number;
  positionBoost: number;
  createdAt: Date;
}

export interface SignupRequest {
  email: string;
  phone?: string;
  referralCode?: string;
  metadata?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    variant?: string;
  };
}

export interface SignupResponse {
  success: boolean;
  founder: {
    founderNumber: string;
    referralCode: string;
    position: number;
    totalFounders: number;
  };
  referralLink: string;
  message?: string;
}

export interface PositionResponse {
  founderNumber: string;
  currentPosition: number;
  totalFounders: number;
  referralCount: number;
  referralCode: string;
}

export interface StatsResponse {
  totalFounders: number;
  lastSignupAt?: Date;
}
