/**
 * Core: Gateway Risk Management Seed
 * Creates default MCC risk classifications and gateway terms templates
 *
 * MCC (Merchant Category Codes) Risk Categories:
 * - HIGH_RISK: Industries with elevated fraud/chargeback risk
 * - STANDARD: Normal risk industries
 * - LOW_RISK: Traditionally low-risk industries
 */

import { PrismaClient, GatewayTermsVersion, MerchantRiskLevel } from '@prisma/client';

// High-risk MCC codes with descriptions
const HIGH_RISK_MCC_CODES = [
  // Gambling & Adult Entertainment
  { code: '7995', description: 'Gambling Transactions', category: 'GAMBLING' },
  { code: '7841', description: 'Video Tape Rental Stores', category: 'ADULT' },
  { code: '5967', description: 'Direct Marketing Outbound Telemarketing', category: 'TELEMARKETING' },

  // Travel & High-Ticket
  { code: '4722', description: 'Travel Agencies and Tour Operators', category: 'TRAVEL' },
  { code: '4511', description: 'Airlines, Air Carriers', category: 'TRAVEL' },
  { code: '3000', description: 'Airlines (various 3000-3350 codes)', category: 'TRAVEL' },

  // Financial Services
  { code: '6012', description: 'Financial Institutions', category: 'FINANCIAL' },
  { code: '6051', description: 'Non-Financial Institutions', category: 'FINANCIAL' },
  { code: '6211', description: 'Securities—Brokers/Dealers', category: 'FINANCIAL' },
  { code: '6540', description: 'Stored Value Card Purchase', category: 'FINANCIAL' },

  // Digital Goods & Subscriptions
  { code: '5816', description: 'Digital Goods: Games', category: 'DIGITAL' },
  { code: '5817', description: 'Digital Goods: Apps and Games', category: 'DIGITAL' },
  { code: '5818', description: 'Digital Goods: Large Digital Goods Merchant', category: 'DIGITAL' },

  // Health & Pharma
  { code: '5912', description: 'Drug Stores and Pharmacies', category: 'PHARMA' },
  { code: '5122', description: 'Drugs, Drug Proprietors', category: 'PHARMA' },
  { code: '8099', description: 'Health Practitioners, Medical Services', category: 'HEALTH' },

  // CBD/Cannabis (where legal)
  { code: '5499', description: 'Miscellaneous Food Stores (often CBD)', category: 'CBD' },

  // Timeshares & Vacation
  { code: '7012', description: 'Timeshares', category: 'TIMESHARE' },

  // Nutraceuticals & Supplements
  { code: '5499', description: 'Nutraceuticals & Supplements', category: 'NUTRA' },
];

// Standard risk MCC codes (sample)
const STANDARD_MCC_CODES = [
  { code: '5411', description: 'Grocery Stores, Supermarkets', category: 'RETAIL' },
  { code: '5812', description: 'Eating Places, Restaurants', category: 'FOOD_SERVICE' },
  { code: '5814', description: 'Fast Food Restaurants', category: 'FOOD_SERVICE' },
  { code: '5541', description: 'Service Stations', category: 'AUTOMOTIVE' },
  { code: '5542', description: 'Fuel Dispenser, Automated', category: 'AUTOMOTIVE' },
  { code: '5311', description: 'Department Stores', category: 'RETAIL' },
  { code: '5651', description: 'Family Clothing Stores', category: 'RETAIL' },
  { code: '5691', description: 'Men\'s and Women\'s Clothing Stores', category: 'RETAIL' },
  { code: '5732', description: 'Electronics Stores', category: 'ELECTRONICS' },
  { code: '5942', description: 'Book Stores', category: 'RETAIL' },
  { code: '5999', description: 'Miscellaneous Specialty Retail', category: 'RETAIL' },
];

// Low risk MCC codes
const LOW_RISK_MCC_CODES = [
  { code: '8011', description: 'Doctors', category: 'MEDICAL' },
  { code: '8021', description: 'Dentists, Orthodontists', category: 'MEDICAL' },
  { code: '8031', description: 'Osteopaths', category: 'MEDICAL' },
  { code: '8041', description: 'Chiropractors', category: 'MEDICAL' },
  { code: '8062', description: 'Hospitals', category: 'MEDICAL' },
  { code: '8211', description: 'Elementary and Secondary Schools', category: 'EDUCATION' },
  { code: '8220', description: 'Colleges, Universities', category: 'EDUCATION' },
  { code: '8398', description: 'Charitable Organizations', category: 'NON_PROFIT' },
  { code: '9211', description: 'Court Costs', category: 'GOVERNMENT' },
  { code: '9222', description: 'Fines', category: 'GOVERNMENT' },
  { code: '9311', description: 'Tax Payments', category: 'GOVERNMENT' },
];

// Default gateway terms template
const DEFAULT_GATEWAY_TERMS = {
  version: GatewayTermsVersion.V1_0,
  title: 'AVNZ Payment Gateway Terms and Conditions',
  content: `
## Payment Gateway Terms and Conditions

### 1. Acceptance of Terms
By using the AVNZ payment gateway services, you agree to be bound by these Terms and Conditions.

### 2. Service Description
AVNZ provides payment processing services including:
- Credit and debit card processing
- ACH/bank transfer processing
- Transaction monitoring and fraud prevention
- Chargeback management
- Reserve management

### 3. Merchant Responsibilities
You agree to:
- Provide accurate business information
- Maintain compliance with PCI-DSS requirements
- Respond to chargebacks within specified timeframes
- Maintain reserves as required by your risk profile
- Not process prohibited transactions

### 4. Prohibited Transactions
You may not process transactions involving:
- Illegal goods or services
- Counterfeit merchandise
- Pyramid schemes
- Money laundering
- Any activity violating applicable law

### 5. Fees and Pricing
Fees are determined by your Gateway Pricing Tier and include:
- Per-transaction fees
- Volume-based fees
- Monthly fees (if applicable)
- Chargeback fees
- Reserve fees

### 6. Reserves
AVNZ may hold reserves based on:
- Your risk profile
- Chargeback history
- Business type and MCC code
- Processing volume

### 7. Chargebacks
You acknowledge:
- Chargebacks affect your processing capability
- High chargeback ratios may result in account suspension
- You are responsible for chargeback fees
- Representment must follow card network rules

### 8. Termination
AVNZ may suspend or terminate services for:
- Violation of these terms
- Excessive chargebacks (>1% ratio)
- Fraudulent activity
- Risk threshold breach

### 9. Liability Limitation
AVNZ's liability is limited to the fees paid in the preceding 12 months.

### 10. Governing Law
These terms are governed by the laws of the State of Delaware, USA.

Last Updated: December 2024
`,
  applicableRiskLevels: [
    MerchantRiskLevel.LOW,
    MerchantRiskLevel.STANDARD,
    MerchantRiskLevel.ELEVATED,
    MerchantRiskLevel.HIGH,
    MerchantRiskLevel.VERY_HIGH,
  ],
  effectiveDate: new Date(),
};

// Risk score thresholds for automated decisions
const RISK_SCORE_THRESHOLDS = {
  LOW: { min: 0, max: 30 },
  STANDARD: { min: 31, max: 50 },
  ELEVATED: { min: 51, max: 70 },
  HIGH: { min: 71, max: 85 },
  VERY_HIGH: { min: 86, max: 100 },
};

// Reserve percentages by risk level
const RESERVE_PERCENTAGES = {
  LOW: 0,
  STANDARD: 0,
  ELEVATED: 5,
  HIGH: 10,
  VERY_HIGH: 15,
};

export async function seedGatewayRisk(prisma: PrismaClient) {
  console.log('🛡️  Seeding gateway risk management data...');

  // Get the first admin user to use as createdBy
  const adminUser = await prisma.user.findFirst({
    where: {
      role: 'ADMIN',
    },
  });

  if (!adminUser) {
    console.log('  ⚠ No admin user found, skipping gateway terms seeding');
    return;
  }

  // Get a platform integration to associate terms with
  // Terms documents are linked to platform integrations (payment gateways)
  const platformIntegration = await prisma.platformIntegration.findFirst({
    where: {
      category: 'PAYMENT_GATEWAY',
    },
  });

  if (!platformIntegration) {
    console.log('  ⚠ No payment gateway platform integration found');
    console.log('  ℹ Gateway terms will be created when a payment gateway integration is added');

    // Still log the MCC classifications
    console.log('  📋 MCC Risk Classifications:');
    console.log(`     - ${HIGH_RISK_MCC_CODES.length} high-risk MCC codes`);
    console.log(`     - ${STANDARD_MCC_CODES.length} standard-risk MCC codes`);
    console.log(`     - ${LOW_RISK_MCC_CODES.length} low-risk MCC codes`);
    return;
  }

  // Create default gateway terms for the platform integration
  const existingTerms = await prisma.gatewayTermsDocument.findFirst({
    where: {
      platformIntegrationId: platformIntegration.id,
      version: DEFAULT_GATEWAY_TERMS.version,
    },
  });

  if (!existingTerms) {
    await prisma.gatewayTermsDocument.create({
      data: {
        platformIntegrationId: platformIntegration.id,
        version: DEFAULT_GATEWAY_TERMS.version,
        title: DEFAULT_GATEWAY_TERMS.title,
        content: DEFAULT_GATEWAY_TERMS.content,
        applicableRiskLevels: DEFAULT_GATEWAY_TERMS.applicableRiskLevels,
        effectiveDate: DEFAULT_GATEWAY_TERMS.effectiveDate,
        isActive: true,
        isCurrent: true,
        createdBy: adminUser.id,
      },
    });
    console.log('  ✓ Created default gateway terms v1.0');
  } else {
    console.log('  ⚠ Gateway terms already exist');
  }

  // Create MCC risk classification entries
  console.log('  📋 MCC Risk Classifications:');
  console.log(`     - ${HIGH_RISK_MCC_CODES.length} high-risk MCC codes`);
  console.log(`     - ${STANDARD_MCC_CODES.length} standard-risk MCC codes`);
  console.log(`     - ${LOW_RISK_MCC_CODES.length} low-risk MCC codes`);

  // Seed MCC Code References if the table exists
  try {
    // Check if we can create MCC references
    for (const mcc of HIGH_RISK_MCC_CODES) {
      await prisma.mCCCodeReference.upsert({
        where: { code: mcc.code },
        update: {},
        create: {
          code: mcc.code,
          description: mcc.description,
          category: mcc.category,
          defaultRiskLevel: MerchantRiskLevel.HIGH,
          requiresEnhancedReview: true,
        },
      });
    }

    for (const mcc of STANDARD_MCC_CODES) {
      await prisma.mCCCodeReference.upsert({
        where: { code: mcc.code },
        update: {},
        create: {
          code: mcc.code,
          description: mcc.description,
          category: mcc.category,
          defaultRiskLevel: MerchantRiskLevel.STANDARD,
          requiresEnhancedReview: false,
        },
      });
    }

    for (const mcc of LOW_RISK_MCC_CODES) {
      await prisma.mCCCodeReference.upsert({
        where: { code: mcc.code },
        update: {},
        create: {
          code: mcc.code,
          description: mcc.description,
          category: mcc.category,
          defaultRiskLevel: MerchantRiskLevel.LOW,
          requiresEnhancedReview: false,
        },
      });
    }
    console.log('  ✓ MCC code references seeded');
  } catch (error) {
    console.log('  ⚠ Could not seed MCC references (table may not exist)');
  }

  // Log reserve configuration
  console.log('  💰 Reserve Configuration:');
  Object.entries(RESERVE_PERCENTAGES).forEach(([level, percent]) => {
    console.log(`     - ${level}: ${percent}%`);
  });

  // Log risk score thresholds
  console.log('  📊 Risk Score Thresholds:');
  Object.entries(RISK_SCORE_THRESHOLDS).forEach(([level, range]) => {
    console.log(`     - ${level}: ${range.min}-${range.max}`);
  });

  console.log('  ✓ Gateway risk management data seeded successfully');
}

// Export MCC codes for use in services
export const MCC_CLASSIFICATIONS = {
  HIGH_RISK: HIGH_RISK_MCC_CODES,
  STANDARD: STANDARD_MCC_CODES,
  LOW_RISK: LOW_RISK_MCC_CODES,
};

export { RISK_SCORE_THRESHOLDS, RESERVE_PERCENTAGES };
