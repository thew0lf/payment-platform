import { WaitlistStatus } from '@prisma/client';

export interface WaitlistEntry {
  id: string;
  organizationId: string;
  email: string;
  phone?: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  founderNumber: string;
  basePosition: number;
  currentPosition: number;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  status: WaitlistStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  invitedAt?: Date;
  inviteExpiresAt?: Date;
  registeredAt?: Date;
  clientId?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  variant?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWaitlistDto {
  email: string;
  phone?: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
  referralCode?: string;
  source?: string;
  medium?: string;
  campaign?: string;
  variant?: string;
}

export interface UpdateWaitlistDto {
  companyName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: WaitlistStatus;
}

export interface WaitlistStats {
  total: number;
  pending: number;
  verified: number;
  invited: number;
  registered: number;
  declined: number;
  todaySignups: number;
  weekSignups: number;
}

export interface WaitlistFilter {
  status?: WaitlistStatus;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  hasReferrals?: boolean;
}

export interface SendInviteResult {
  success: boolean;
  message: string;
  inviteToken?: string;
  inviteUrl?: string;
}

export interface CompleteRegistrationDto {
  token: string;
  password: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
}

export interface RegistrationResult {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  client?: {
    id: string;
    name: string;
    code?: string;
  };
}

export { WaitlistStatus };
