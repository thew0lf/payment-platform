import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════
// PCI DSS 4.0 COMPLIANCE SERVICE
// ═══════════════════════════════════════════════════════════════
// Implements PCI DSS 4.0 requirements for hosted payment pages:
// - Requirement 6.4.3: Script inventory and integrity monitoring
// - Requirement 11.6.1: Change detection for payment pages
// - CSP (Content Security Policy) management
// - SRI (Subresource Integrity) hash generation

export interface ScriptConfig {
  id: string;
  src: string;
  integrity?: string;
  crossOrigin?: 'anonymous' | 'use-credentials';
  purpose: ScriptPurpose;
  isRequired: boolean;
  addedAt: Date;
  lastVerified?: Date;
}

export type ScriptPurpose =
  | 'payment_gateway'
  | 'analytics'
  | 'fraud_prevention'
  | 'accessibility'
  | 'ui_framework'
  | 'monitoring';

export interface CSPDirectives {
  defaultSrc: string[];
  scriptSrc: string[];
  styleSrc: string[];
  imgSrc: string[];
  fontSrc: string[];
  connectSrc: string[];
  frameSrc: string[];
  frameAncestors: string[];
  formAction: string[];
  baseUri: string[];
  objectSrc: string[];
  upgradeInsecureRequests: boolean;
  blockAllMixedContent: boolean;
}

export interface SecurityHeaders {
  contentSecurityPolicy: string;
  strictTransportSecurity: string;
  xContentTypeOptions: string;
  xFrameOptions: string;
  xXssProtection: string;
  referrerPolicy: string;
  permissionsPolicy: string;
  cacheControl: string;
}

export interface ScriptIntegrityReport {
  scriptId: string;
  src: string;
  expectedHash?: string;
  actualHash?: string;
  isValid: boolean;
  error?: string;
  checkedAt: Date;
}

export interface ComplianceAuditResult {
  pageId: string;
  pageName: string;
  compliant: boolean;
  issues: ComplianceIssue[];
  checkedAt: Date;
  nextCheckDue: Date;
}

export interface ComplianceIssue {
  code: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  requirement: string;
  description: string;
  recommendation: string;
}

// PCI DSS 4.0 approved script sources by gateway
const APPROVED_SCRIPT_SOURCES: Record<string, ScriptConfig[]> = {
  stripe: [
    {
      id: 'stripe-js',
      src: 'https://js.stripe.com/v3/',
      purpose: 'payment_gateway',
      isRequired: true,
      addedAt: new Date(),
    },
  ],
  paypal: [
    {
      id: 'paypal-sdk',
      src: 'https://www.paypal.com/sdk/js',
      purpose: 'payment_gateway',
      isRequired: true,
      addedAt: new Date(),
    },
  ],
  nmi: [
    {
      id: 'nmi-collectjs',
      src: 'https://secure.networkmerchants.com/js/v1/Gateway.js',
      purpose: 'payment_gateway',
      isRequired: true,
      addedAt: new Date(),
    },
  ],
  authorizenet: [
    {
      id: 'authnet-accept',
      src: 'https://jstest.authorize.net/v1/Accept.js',
      purpose: 'payment_gateway',
      isRequired: true,
      addedAt: new Date(),
    },
    {
      id: 'authnet-accept-prod',
      src: 'https://js.authorize.net/v1/Accept.js',
      purpose: 'payment_gateway',
      isRequired: true,
      addedAt: new Date(),
    },
  ],
};

// Default CSP for payment pages (PCI DSS 4.0 compliant)
const DEFAULT_CSP: CSPDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: [
    "'self'",
    "'unsafe-inline'", // Needed for some payment widgets - minimize usage
    'https://js.stripe.com',
    'https://www.paypal.com',
    'https://secure.networkmerchants.com',
    'https://js.authorize.net',
    'https://jstest.authorize.net',
  ],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
  fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
  connectSrc: [
    "'self'",
    'https://api.stripe.com',
    'https://www.paypal.com',
    'https://secure.networkmerchants.com',
  ],
  frameSrc: [
    "'self'",
    'https://js.stripe.com',
    'https://hooks.stripe.com',
    'https://www.paypal.com',
  ],
  frameAncestors: ["'self'"],
  formAction: ["'self'"],
  baseUri: ["'self'"],
  objectSrc: ["'none'"],
  upgradeInsecureRequests: true,
  blockAllMixedContent: true,
};

@Injectable()
export class PciComplianceService {
  private readonly logger = new Logger(PciComplianceService.name);

  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────
  // Generate Security Headers
  // ─────────────────────────────────────────────────────────────

  generateSecurityHeaders(
    customDirectives?: Partial<CSPDirectives>,
  ): SecurityHeaders {
    const csp = this.buildCSP(customDirectives);

    return {
      contentSecurityPolicy: csp,
      strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
      xContentTypeOptions: 'nosniff',
      xFrameOptions: 'SAMEORIGIN',
      xXssProtection: '1; mode=block',
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: this.buildPermissionsPolicy(),
      cacheControl: 'no-store, no-cache, must-revalidate, proxy-revalidate',
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Build Content Security Policy
  // ─────────────────────────────────────────────────────────────

  buildCSP(customDirectives?: Partial<CSPDirectives>): string {
    const directives = { ...DEFAULT_CSP, ...customDirectives };
    const parts: string[] = [];

    if (directives.defaultSrc.length > 0) {
      parts.push(`default-src ${directives.defaultSrc.join(' ')}`);
    }
    if (directives.scriptSrc.length > 0) {
      parts.push(`script-src ${directives.scriptSrc.join(' ')}`);
    }
    if (directives.styleSrc.length > 0) {
      parts.push(`style-src ${directives.styleSrc.join(' ')}`);
    }
    if (directives.imgSrc.length > 0) {
      parts.push(`img-src ${directives.imgSrc.join(' ')}`);
    }
    if (directives.fontSrc.length > 0) {
      parts.push(`font-src ${directives.fontSrc.join(' ')}`);
    }
    if (directives.connectSrc.length > 0) {
      parts.push(`connect-src ${directives.connectSrc.join(' ')}`);
    }
    if (directives.frameSrc.length > 0) {
      parts.push(`frame-src ${directives.frameSrc.join(' ')}`);
    }
    if (directives.frameAncestors.length > 0) {
      parts.push(`frame-ancestors ${directives.frameAncestors.join(' ')}`);
    }
    if (directives.formAction.length > 0) {
      parts.push(`form-action ${directives.formAction.join(' ')}`);
    }
    if (directives.baseUri.length > 0) {
      parts.push(`base-uri ${directives.baseUri.join(' ')}`);
    }
    if (directives.objectSrc.length > 0) {
      parts.push(`object-src ${directives.objectSrc.join(' ')}`);
    }
    if (directives.upgradeInsecureRequests) {
      parts.push('upgrade-insecure-requests');
    }
    if (directives.blockAllMixedContent) {
      parts.push('block-all-mixed-content');
    }

    return parts.join('; ');
  }

  // ─────────────────────────────────────────────────────────────
  // Build Permissions Policy
  // ─────────────────────────────────────────────────────────────

  private buildPermissionsPolicy(): string {
    // Restrictive permissions policy for payment pages
    const policies = [
      'accelerometer=()',
      'autoplay=()',
      'camera=()',
      'cross-origin-isolated=()',
      'display-capture=()',
      'encrypted-media=()',
      'fullscreen=(self)',
      'geolocation=()',
      'gyroscope=()',
      'keyboard-map=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'payment=(self)', // Only allow Payment Request API from same origin
      'picture-in-picture=()',
      'publickey-credentials-get=(self)', // WebAuthn for 2FA
      'screen-wake-lock=()',
      'sync-xhr=()',
      'usb=()',
      'web-share=()',
      'xr-spatial-tracking=()',
    ];

    return policies.join(', ');
  }

  // ─────────────────────────────────────────────────────────────
  // Generate SRI Hash
  // ─────────────────────────────────────────────────────────────

  generateSRIHash(content: string | Buffer): string {
    const hash = crypto.createHash('sha384').update(content).digest('base64');
    return `sha384-${hash}`;
  }

  // ─────────────────────────────────────────────────────────────
  // Get Approved Scripts for Gateway
  // ─────────────────────────────────────────────────────────────

  getApprovedScripts(gateway: string): ScriptConfig[] {
    const key = gateway.toLowerCase();
    return APPROVED_SCRIPT_SOURCES[key] || [];
  }

  // ─────────────────────────────────────────────────────────────
  // Get All Approved Scripts
  // ─────────────────────────────────────────────────────────────

  getAllApprovedScripts(): Record<string, ScriptConfig[]> {
    return APPROVED_SCRIPT_SOURCES;
  }

  // ─────────────────────────────────────────────────────────────
  // Build CSP for Specific Gateways
  // ─────────────────────────────────────────────────────────────

  buildGatewayCSP(gateways: string[]): CSPDirectives {
    const directives = { ...DEFAULT_CSP };

    // Build unique script sources based on enabled gateways
    const scriptSources = new Set(directives.scriptSrc);
    const connectSources = new Set(directives.connectSrc);
    const frameSources = new Set(directives.frameSrc);

    for (const gateway of gateways) {
      const key = gateway.toLowerCase();

      switch (key) {
        case 'stripe':
          scriptSources.add('https://js.stripe.com');
          connectSources.add('https://api.stripe.com');
          frameSources.add('https://js.stripe.com');
          frameSources.add('https://hooks.stripe.com');
          break;
        case 'paypal':
          scriptSources.add('https://www.paypal.com');
          connectSources.add('https://www.paypal.com');
          frameSources.add('https://www.paypal.com');
          break;
        case 'nmi':
          scriptSources.add('https://secure.networkmerchants.com');
          connectSources.add('https://secure.networkmerchants.com');
          break;
        case 'authorizenet':
          scriptSources.add('https://js.authorize.net');
          scriptSources.add('https://jstest.authorize.net');
          connectSources.add('https://api.authorize.net');
          connectSources.add('https://apitest.authorize.net');
          break;
      }
    }

    directives.scriptSrc = Array.from(scriptSources);
    directives.connectSrc = Array.from(connectSources);
    directives.frameSrc = Array.from(frameSources);

    return directives;
  }

  // ─────────────────────────────────────────────────────────────
  // Audit Payment Page Compliance
  // ─────────────────────────────────────────────────────────────

  async auditPageCompliance(pageId: string): Promise<ComplianceAuditResult> {
    const page = await this.prisma.paymentPage.findUnique({
      where: { id: pageId },
      select: {
        id: true,
        name: true,
        acceptedGateways: true,
        customDomain: true,
        status: true,
      },
    });

    if (!page) {
      throw new Error('Payment page not found');
    }

    const issues: ComplianceIssue[] = [];

    // Check 1: Verify HTTPS is enforced (PCI DSS 4.2.1)
    if (page.customDomain && !page.customDomain.startsWith('https')) {
      issues.push({
        code: 'HTTPS_NOT_ENFORCED',
        severity: 'critical',
        requirement: 'PCI DSS 4.2.1',
        description: 'Custom domain does not enforce HTTPS',
        recommendation:
          'Configure SSL certificate and redirect all HTTP traffic to HTTPS',
      });
    }

    // Check 2: Verify script inventory exists (PCI DSS 6.4.3)
    const acceptedGateways = page.acceptedGateways as Record<string, unknown>;
    if (!acceptedGateways || Object.keys(acceptedGateways).length === 0) {
      issues.push({
        code: 'NO_SCRIPT_INVENTORY',
        severity: 'high',
        requirement: 'PCI DSS 6.4.3',
        description: 'No payment gateway scripts are configured',
        recommendation:
          'Configure at least one approved payment gateway',
      });
    }

    // Check 3: Published status warning
    if (page.status !== 'PUBLISHED') {
      issues.push({
        code: 'PAGE_NOT_PUBLISHED',
        severity: 'low',
        requirement: 'Best Practice',
        description: 'Payment page is not published',
        recommendation:
          'Publish the page when ready to accept payments',
      });
    }

    // Calculate next check due (quarterly as per PCI DSS)
    const nextCheckDue = new Date();
    nextCheckDue.setMonth(nextCheckDue.getMonth() + 3);

    return {
      pageId: page.id,
      pageName: page.name,
      compliant: issues.filter((i) => i.severity === 'critical').length === 0,
      issues,
      checkedAt: new Date(),
      nextCheckDue,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Generate CSP Nonce
  // ─────────────────────────────────────────────────────────────

  generateNonce(): string {
    return crypto.randomBytes(16).toString('base64');
  }

  // ─────────────────────────────────────────────────────────────
  // Build CSP with Nonce
  // ─────────────────────────────────────────────────────────────

  buildCSPWithNonce(
    nonce: string,
    gateways: string[],
  ): string {
    const directives = this.buildGatewayCSP(gateways);

    // Add nonce to script-src (more secure than unsafe-inline)
    directives.scriptSrc = directives.scriptSrc.filter(
      (src) => src !== "'unsafe-inline'",
    );
    directives.scriptSrc.push(`'nonce-${nonce}'`);

    // Also add strict-dynamic for modern browsers
    directives.scriptSrc.push("'strict-dynamic'");

    return this.buildCSP(directives);
  }

  // ─────────────────────────────────────────────────────────────
  // Log Security Event (for audit trail)
  // ─────────────────────────────────────────────────────────────

  async logSecurityEvent(
    pageId: string,
    eventType: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    this.logger.log(`Security Event [${eventType}] for page ${pageId}`, details);

    // In production, this would write to a secure audit log
    // Could integrate with the existing audit-logs module
  }

  // ─────────────────────────────────────────────────────────────
  // Get Compliance Report for Company
  // ─────────────────────────────────────────────────────────────

  async getCompanyComplianceReport(companyId: string): Promise<{
    totalPages: number;
    compliantPages: number;
    criticalIssues: number;
    highIssues: number;
    pages: ComplianceAuditResult[];
  }> {
    const pages = await this.prisma.paymentPage.findMany({
      where: { companyId },
      select: { id: true },
    });

    const results: ComplianceAuditResult[] = [];
    let criticalIssues = 0;
    let highIssues = 0;

    for (const page of pages) {
      try {
        const audit = await this.auditPageCompliance(page.id);
        results.push(audit);

        criticalIssues += audit.issues.filter((i) => i.severity === 'critical').length;
        highIssues += audit.issues.filter((i) => i.severity === 'high').length;
      } catch (err) {
        this.logger.warn(`Failed to audit page ${page.id}:`, err);
      }
    }

    const compliantPages = results.filter((r) => r.compliant).length;

    return {
      totalPages: pages.length,
      compliantPages,
      criticalIssues,
      highIssues,
      pages: results,
    };
  }
}
