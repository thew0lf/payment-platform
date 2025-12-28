import {
  MerchantRiskLevel,
  MerchantAccountStatus,
  GatewayTermsVersion,
  ReserveTransactionType,
  ChargebackStatus,
  ChargebackReason,
  RiskAssessmentType,
} from '@prisma/client';

// Re-export Prisma enums
export {
  MerchantRiskLevel,
  MerchantAccountStatus,
  GatewayTermsVersion,
  ReserveTransactionType,
  ChargebackStatus,
  ChargebackReason,
  RiskAssessmentType,
};

// Risk tier configuration
export interface RiskTierConfig {
  riskLevel: MerchantRiskLevel;
  tierName: string;
  transactionPercentage: number;
  transactionFlat: number;
  chargebackFee: number;
  reservePercentage: number;
  reserveHoldDays: number;
  securityDepositMin?: number;
  securityDepositMax?: number;
  chargebackThreshold: number;
}

// Default pricing tiers
export const DEFAULT_PRICING_TIERS: RiskTierConfig[] = [
  {
    riskLevel: MerchantRiskLevel.LOW,
    tierName: 'Low Risk',
    transactionPercentage: 0.029, // 2.9%
    transactionFlat: 30, // $0.30
    chargebackFee: 1500, // $15
    reservePercentage: 0,
    reserveHoldDays: 0,
    chargebackThreshold: 0.01, // 1%
  },
  {
    riskLevel: MerchantRiskLevel.STANDARD,
    tierName: 'Standard',
    transactionPercentage: 0.029,
    transactionFlat: 30,
    chargebackFee: 1500,
    reservePercentage: 0.05, // 5%
    reserveHoldDays: 90,
    chargebackThreshold: 0.01,
  },
  {
    riskLevel: MerchantRiskLevel.ELEVATED,
    tierName: 'Elevated Risk',
    transactionPercentage: 0.035, // 3.5%
    transactionFlat: 35,
    chargebackFee: 2000, // $20
    reservePercentage: 0.075, // 7.5%
    reserveHoldDays: 120,
    securityDepositMin: 50000, // $500
    chargebackThreshold: 0.008, // 0.8%
  },
  {
    riskLevel: MerchantRiskLevel.HIGH,
    tierName: 'High Risk',
    transactionPercentage: 0.045, // 4.5%
    transactionFlat: 40,
    chargebackFee: 2500, // $25
    reservePercentage: 0.1, // 10%
    reserveHoldDays: 180,
    securityDepositMin: 100000, // $1,000
    securityDepositMax: 500000, // $5,000
    chargebackThreshold: 0.008,
  },
  {
    riskLevel: MerchantRiskLevel.VERY_HIGH,
    tierName: 'Very High Risk',
    transactionPercentage: 0.055, // 5.5%
    transactionFlat: 50,
    chargebackFee: 3500, // $35
    reservePercentage: 0.15, // 15%
    reserveHoldDays: 180,
    securityDepositMin: 500000, // $5,000
    securityDepositMax: 2500000, // $25,000
    chargebackThreshold: 0.005, // 0.5%
  },
];

// High-risk MCC codes
export const HIGH_RISK_MCC_CODES: { code: string; description: string; category: string }[] = [
  { code: '5962', description: 'Direct Marketing - Travel', category: 'Travel' },
  { code: '5966', description: 'Direct Marketing - Outbound Teleservices', category: 'Telemarketing' },
  { code: '5967', description: 'Direct Marketing - Inbound Teleservices', category: 'Telemarketing' },
  { code: '5912', description: 'Drug Stores and Pharmacies', category: 'Pharmacy' },
  { code: '5993', description: 'Cigar Stores and Stands', category: 'Tobacco' },
  { code: '7995', description: 'Betting/Casino Gambling', category: 'Gambling' },
  { code: '7841', description: 'Video Tape Rental Stores', category: 'Adult' },
  { code: '5816', description: 'Digital Goods - Games', category: 'Digital' },
  { code: '5817', description: 'Digital Goods - Applications', category: 'Digital' },
  { code: '5818', description: 'Digital Goods - Large Volume', category: 'Digital' },
  { code: '6051', description: 'Non-Financial Institutions - Foreign Currency', category: 'Financial' },
  { code: '6211', description: 'Security Brokers/Dealers', category: 'Financial' },
  { code: '6012', description: 'Financial Institutions', category: 'Financial' },
  { code: '4829', description: 'Wire Transfer Money Orders', category: 'Money Transfer' },
  { code: '6540', description: 'Non-Financial Institutions - Stored Value Card', category: 'Prepaid' },
  { code: '7273', description: 'Dating/Escort Services', category: 'Adult' },
  { code: '7012', description: 'Timeshares', category: 'Travel' },
  { code: '5122', description: 'Drugs, Drug Proprietaries, and Druggist Sundries', category: 'Pharmaceutical' },
];

// Risk assessment factors
export interface RiskAssessmentFactors {
  mccCode?: string;
  mccRiskLevel?: MerchantRiskLevel;
  businessAge?: number; // Years
  annualVolume?: number; // Cents
  averageTicket?: number; // Cents
  chargebackRatio?: number;
  refundRatio?: number;
  processingHistory?: {
    monthsActive: number;
    totalVolume: number;
    chargebackCount: number;
    refundCount: number;
  };
  industryRisk?: 'LOW' | 'STANDARD' | 'ELEVATED' | 'HIGH';
  countryRisk?: 'LOW' | 'STANDARD' | 'ELEVATED' | 'HIGH';
}

// Risk score calculation weights
export const RISK_SCORE_WEIGHTS = {
  MCC_RISK: 25,
  BUSINESS_AGE: 15,
  CHARGEBACK_RATIO: 30,
  REFUND_RATIO: 10,
  VOLUME: 10,
  PROCESSING_HISTORY: 10,
};

// Terms acceptance data
export interface TermsAcceptanceData {
  termsDocumentId: string;
  acceptorName: string;
  acceptorTitle?: string;
  acceptorEmail: string;
  ipAddress: string;
  userAgent?: string;
  acceptanceMethod?: 'ELECTRONIC' | 'PHYSICAL';
}

// Chargeback thresholds
export const CHARGEBACK_THRESHOLDS = {
  WARNING: 0.008, // 0.8% - Warning level
  ELEVATED: 0.01, // 1% - Elevated monitoring
  HIGH: 0.015, // 1.5% - High risk
  CRITICAL: 0.02, // 2% - Account review/suspension
};

// Reserve release schedule
export interface ReserveReleaseSchedule {
  merchantRiskProfileId: string;
  scheduledReleaseDate: Date;
  amount: number;
  status: 'PENDING' | 'RELEASED' | 'HELD';
}

// AI Risk Assessment result
export interface AIRiskAssessmentResult {
  riskLevel: MerchantRiskLevel;
  riskScore: number;
  confidence: number;
  explanation: string;
  recommendedActions: string[];
  factors: RiskAssessmentFactors;
}
