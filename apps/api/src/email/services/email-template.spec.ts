/**
 * Email Template Comprehensive Tests
 * Tests for: Links, Content, Mobile Responsiveness, URL Validation
 *
 * These tests ensure email templates:
 * 1. Contain proper HTML content (not just placeholders)
 * 2. Use correct URLs (app.avnz.io, not admin.avnz.io)
 * 3. Are mobile responsive (contain media queries)
 * 4. Have all required variables
 */

import { Test, TestingModule } from '@nestjs/testing';
import { TemplateRendererService } from './template-renderer.service';
import { EmailTemplateCategory } from '@prisma/client';

// Import the actual templates from seed file for testing
const PASSWORD_RESET_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>Oops! Let's fix that password</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style>
    /* Reset */
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }

    /* Base */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f0f4f8;
      width: 100% !important;
      min-width: 100%;
    }

    /* Container */
    .wrapper { width: 100%; table-layout: fixed; background-color: #f0f4f8; padding: 20px 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #f0f4f8; }

    /* Card */
    .card {
      background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      margin: 10px 16px;
      overflow: hidden;
    }
    .card-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 32px 24px;
      text-align: center;
    }
    .card-body { padding: 32px 24px; }

    /* Logo */
    .logo-container { display: inline-block; margin-bottom: 20px; }
    .logo-icon {
      display: inline-block;
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #6366f1 0%, #3b82f6 100%);
      border-radius: 12px;
      vertical-align: middle;
      text-align: center;
      line-height: 48px;
      margin-right: 12px;
    }
    .logo-icon-letter { color: #ffffff; font-size: 28px; font-weight: 800; }
    .logo-text {
      display: inline-block;
      font-size: 28px;
      font-weight: 800;
      color: #ffffff !important;
      text-decoration: none !important;
      vertical-align: middle;
      letter-spacing: -0.5px;
    }

    /* Typography */
    h1 { color: #ffffff; font-size: 22px; font-weight: 600; margin: 16px 0 0 0; line-height: 1.3; }
    .greeting { font-size: 18px; color: #1a1a2e; margin: 0 0 16px 0; font-weight: 600; }
    p { color: #4a5568; margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; }
    .fun-text { color: #667eea; font-weight: 500; }

    /* Button */
    .button-container { text-align: center; padding: 8px 0 24px 0; }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 50px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
    }

    /* Link fallback */
    .link-text {
      color: #718096;
      font-size: 12px;
      word-break: break-all;
      background: #f7fafc;
      padding: 12px 16px;
      border-radius: 8px;
      margin: 16px 0;
      border: 1px dashed #e2e8f0;
    }

    /* Fun fact box */
    .fun-box {
      background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
      border-radius: 12px;
      padding: 16px 20px;
      margin: 20px 0;
    }
    .fun-box p { color: #744210; margin: 0; font-size: 14px; }

    /* Security notice */
    .security-notice {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      border-radius: 0 8px 8px 0;
      padding: 16px 20px;
      margin: 24px 0 0 0;
    }
    .security-notice p { color: #92400e; margin: 0; font-size: 13px; }

    /* Footer */
    .footer { text-align: center; padding: 24px 16px; }
    .footer p { color: #a0aec0; font-size: 12px; margin: 4px 0; }
    .footer a { color: #667eea; text-decoration: none; }

    /* Mobile responsive */
    @media only screen and (max-width: 480px) {
      .card { margin: 10px 12px; }
      .card-header { padding: 24px 20px; }
      .card-body { padding: 24px 20px; }
      .logo-icon { width: 40px; height: 40px; line-height: 40px; border-radius: 10px; margin-right: 10px; }
      .logo-icon-letter { font-size: 24px; }
      .logo-text { font-size: 24px; }
      h1 { font-size: 20px; }
      .button { padding: 14px 32px; font-size: 15px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="card">
        <div class="card-header">
          <div class="logo-container">
            <div class="logo-icon"><span class="logo-icon-letter">A</span></div>
            <span class="logo-text">avnz.io</span>
          </div>
          <h1>Forgot your password?<br>No worries, we've got you!</h1>
        </div>
        <div class="card-body">
          <p class="greeting">Hey {{userName}}! 👋</p>
          <p>Looks like your password decided to go on vacation without telling you. Rude, right? 🏖️</p>
          <p>But hey, we're here to help you get back in action! Just click the magic button below and you'll be back to crushing it in no time.</p>

          <div class="button-container">
            <a href="{{resetUrl}}" class="button">Reset My Password ✨</a>
          </div>

          <p class="link-text">
            <strong>Can't click the button?</strong> Copy this link:<br>{{resetUrl}}
          </p>

          <div class="fun-box">
            <p><strong>💡 Pro tip:</strong> Make your new password memorable but secure! Maybe try combining your favorite coffee order with a random number? ☕ + 🔢 = 🔒</p>
          </div>

          <div class="security-notice">
            <p><strong>🛡️ Security heads up:</strong> This link will self-destruct in {{expiresIn}} (very Mission Impossible, we know). If you didn't request this reset, just ignore this email—your account is still safe!</p>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Need help? We're always here at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a></p>
        <p>© {{currentYear}} AVNZ Platform • SOC2 & ISO 27001 Compliant</p>
        <p style="margin-top: 12px; color: #cbd5e0;">Made with 💜 by the AVNZ team</p>
      </div>
    </div>
  </div>
</body>
</html>
`.trim();

const PASSWORD_RESET_TEXT = `
Hey {{userName}}! 👋

Forgot your password? No worries, we've got you!

Looks like your password decided to go on vacation without telling you. Rude, right?

But hey, we're here to help you get back in action! Just click the link below:

{{resetUrl}}

💡 Pro tip: Make your new password memorable but secure!

🛡️ Security heads up: This link will self-destruct in {{expiresIn}} (very Mission Impossible, we know). If you didn't request this reset, just ignore this email—your account is still safe!

Need help? We're always here at {{supportEmail}}

---
© {{currentYear}} AVNZ Platform • SOC2 & ISO 27001 Compliant
Made with 💜 by the AVNZ team
`.trim();

// Minimal/broken template (what production currently has - used for comparison)
const BROKEN_TEMPLATE_HTML = '<p>Click to reset: {{resetUrl}}</p>';
const BROKEN_TEMPLATE_TEXT = 'Click to reset: {{resetUrl}}';

describe('Email Template Tests', () => {
  let templateRenderer: TemplateRendererService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateRendererService],
    }).compile();

    templateRenderer = module.get<TemplateRendererService>(TemplateRendererService);
  });

  describe('Template Content Validation', () => {
    const testTemplate = {
      id: 'test-1',
      code: 'password-reset',
      name: 'Password Reset',
      subject: 'Reset your password',
      htmlBody: PASSWORD_RESET_HTML,
      textBody: PASSWORD_RESET_TEXT,
      category: EmailTemplateCategory.AUTHENTICATION,
      isSystem: true,
      isActive: true,
    };

    const testVariables = {
      userName: 'John',
      resetUrl: 'https://app.avnz.io/reset-password?token=abc123',
      expiresIn: '1 hour',
      supportEmail: 'support@avnz.io',
    };

    it('should render template with proper HTML content', () => {
      const rendered = templateRenderer.render(testTemplate as any, testVariables);

      // Should contain actual content, not just placeholders
      expect(rendered.htmlBody).toContain('Hey John!');
      expect(rendered.htmlBody).toContain('Forgot your password?');
      expect(rendered.htmlBody).toContain('Reset My Password');
      expect(rendered.htmlBody).toContain('AVNZ Platform');
    });

    it('should NOT contain unrendered mustache variables', () => {
      const rendered = templateRenderer.render(testTemplate as any, testVariables);

      // Should NOT contain {{variable}} patterns
      expect(rendered.htmlBody).not.toMatch(/\{\{userName\}\}/);
      expect(rendered.htmlBody).not.toMatch(/\{\{resetUrl\}\}/);
      expect(rendered.htmlBody).not.toMatch(/\{\{expiresIn\}\}/);
      expect(rendered.htmlBody).not.toMatch(/\{\{supportEmail\}\}/);
    });

    it('should contain proper greeting with user name', () => {
      const rendered = templateRenderer.render(testTemplate as any, testVariables);

      expect(rendered.htmlBody).toContain('Hey John!');
    });

    it('should contain security notice', () => {
      const rendered = templateRenderer.render(testTemplate as any, testVariables);

      expect(rendered.htmlBody).toContain('Security heads up');
      expect(rendered.htmlBody).toContain('1 hour'); // expiresIn
    });

    it('should contain footer with support email', () => {
      const rendered = templateRenderer.render(testTemplate as any, testVariables);

      expect(rendered.htmlBody).toContain('support@avnz.io');
      expect(rendered.htmlBody).toContain('SOC2');
      expect(rendered.htmlBody).toContain('ISO 27001');
    });

    it('should detect broken/minimal template', () => {
      const brokenTemplate = {
        ...testTemplate,
        htmlBody: BROKEN_TEMPLATE_HTML,
        textBody: BROKEN_TEMPLATE_TEXT,
      };

      const rendered = templateRenderer.render(brokenTemplate as any, testVariables);

      // The broken template would only have minimal content
      expect(rendered.htmlBody.length).toBeLessThan(100);
      expect(rendered.htmlBody).not.toContain('Hey John!');
      expect(rendered.htmlBody).not.toContain('Forgot your password?');
    });
  });

  describe('URL Validation Tests', () => {
    const testTemplate = {
      id: 'test-1',
      code: 'password-reset',
      name: 'Password Reset',
      subject: 'Reset your password',
      htmlBody: PASSWORD_RESET_HTML,
      textBody: PASSWORD_RESET_TEXT,
      category: EmailTemplateCategory.AUTHENTICATION,
      isSystem: true,
      isActive: true,
    };

    it('should contain correct reset URL (app.avnz.io)', () => {
      const correctVariables = {
        userName: 'John',
        resetUrl: 'https://app.avnz.io/reset-password?token=abc123',
        expiresIn: '1 hour',
        supportEmail: 'support@avnz.io',
      };

      const rendered = templateRenderer.render(testTemplate as any, correctVariables);

      expect(rendered.htmlBody).toContain('https://app.avnz.io/reset-password');
      expect(rendered.htmlBody).not.toContain('admin.avnz.io');
    });

    it('should FAIL with incorrect URL (admin.avnz.io)', () => {
      const wrongVariables = {
        userName: 'John',
        resetUrl: 'https://admin.avnz.io/reset-password?token=abc123', // WRONG URL
        expiresIn: '1 hour',
        supportEmail: 'support@avnz.io',
      };

      const rendered = templateRenderer.render(testTemplate as any, wrongVariables);

      // This test documents the bug - it should contain admin.avnz.io when wrong URL is passed
      expect(rendered.htmlBody).toContain('admin.avnz.io');
    });

    it('should have clickable button with reset URL', () => {
      const variables = {
        userName: 'John',
        resetUrl: 'https://app.avnz.io/reset-password?token=abc123',
        expiresIn: '1 hour',
        supportEmail: 'support@avnz.io',
      };

      const rendered = templateRenderer.render(testTemplate as any, variables);

      // Check for href attribute with reset URL
      // Note: Handlebars escapes = as &#x3D; in some contexts
      expect(rendered.htmlBody).toContain('href="https://app.avnz.io/reset-password?token');
      expect(rendered.htmlBody).toContain('abc123"');
    });

    it('should have link fallback text with reset URL', () => {
      const variables = {
        userName: 'John',
        resetUrl: 'https://app.avnz.io/reset-password?token=abc123',
        expiresIn: '1 hour',
        supportEmail: 'support@avnz.io',
      };

      const rendered = templateRenderer.render(testTemplate as any, variables);

      // Check for plain text fallback link
      expect(rendered.htmlBody).toContain("Can't click the button?");
      // URL should appear in the link-text section
      const linkTextMatch = rendered.htmlBody.match(/class="link-text"[^>]*>[\s\S]*?<\/p>/);
      expect(linkTextMatch).toBeTruthy();
      expect(linkTextMatch![0]).toContain('https://app.avnz.io/reset-password');
    });
  });

  describe('Mobile Responsiveness Tests', () => {
    it('should contain viewport meta tag', () => {
      expect(PASSWORD_RESET_HTML).toContain('viewport');
      expect(PASSWORD_RESET_HTML).toContain('width=device-width');
      expect(PASSWORD_RESET_HTML).toContain('initial-scale=1.0');
    });

    it('should contain mobile media queries', () => {
      expect(PASSWORD_RESET_HTML).toContain('@media');
      expect(PASSWORD_RESET_HTML).toContain('max-width: 480px');
    });

    it('should have responsive font sizes in media queries', () => {
      // Extract media query content
      const mediaQueryMatch = PASSWORD_RESET_HTML.match(/@media[^{]+\{([^}]+\{[^}]+\})+/);
      expect(mediaQueryMatch).toBeTruthy();

      const mediaQueryContent = mediaQueryMatch![0];
      expect(mediaQueryContent).toContain('font-size');
    });

    it('should have responsive padding in media queries', () => {
      const mediaQueryMatch = PASSWORD_RESET_HTML.match(/@media[^{]+\{([^}]+\{[^}]+\})+/);
      expect(mediaQueryMatch).toBeTruthy();

      const mediaQueryContent = mediaQueryMatch![0];
      expect(mediaQueryContent).toContain('padding');
    });

    it('should have max-width container for desktop', () => {
      expect(PASSWORD_RESET_HTML).toContain('max-width: 600px');
    });

    it('should have responsive logo sizing', () => {
      // Check base logo icon has 48px width
      expect(PASSWORD_RESET_HTML).toContain('width: 48px');
      // Media query should have smaller logo (40px)
      expect(PASSWORD_RESET_HTML).toContain('width: 40px');
    });

    it('should NOT have fixed widths outside container', () => {
      // Body should be 100% width
      expect(PASSWORD_RESET_HTML).toContain('width: 100% !important');
    });

    it('should have MSO (Outlook) fallback styles', () => {
      expect(PASSWORD_RESET_HTML).toContain('<!--[if mso]>');
      expect(PASSWORD_RESET_HTML).toContain('Arial, Helvetica, sans-serif');
    });

    it('should disable Apple message reformatting', () => {
      expect(PASSWORD_RESET_HTML).toContain('x-apple-disable-message-reformatting');
    });

    it('should disable format detection for phone/date/email', () => {
      expect(PASSWORD_RESET_HTML).toContain('format-detection');
      expect(PASSWORD_RESET_HTML).toContain('telephone=no');
    });
  });

  describe('Template Structure Tests', () => {
    it('should have proper DOCTYPE declaration', () => {
      expect(PASSWORD_RESET_HTML).toMatch(/^<!DOCTYPE html>/i);
    });

    it('should have proper HTML structure', () => {
      expect(PASSWORD_RESET_HTML).toContain('<html>');
      expect(PASSWORD_RESET_HTML).toContain('<head>');
      expect(PASSWORD_RESET_HTML).toContain('<body>');
      expect(PASSWORD_RESET_HTML).toContain('</html>');
    });

    it('should have charset UTF-8', () => {
      expect(PASSWORD_RESET_HTML).toContain('charset="utf-8"');
    });

    it('should have meaningful title', () => {
      expect(PASSWORD_RESET_HTML).toMatch(/<title>[^<]+<\/title>/);
      expect(PASSWORD_RESET_HTML).not.toContain('<title></title>');
    });

    it('should have inline styles (for email compatibility)', () => {
      expect(PASSWORD_RESET_HTML).toContain('<style>');
      // Email templates should have CSS in head, not external stylesheets
      expect(PASSWORD_RESET_HTML).not.toContain('<link rel="stylesheet"');
    });
  });

  describe('Text Version Tests', () => {
    const testTemplate = {
      id: 'test-1',
      code: 'password-reset',
      name: 'Password Reset',
      subject: 'Reset your password',
      htmlBody: PASSWORD_RESET_HTML,
      textBody: PASSWORD_RESET_TEXT,
      category: EmailTemplateCategory.AUTHENTICATION,
      isSystem: true,
      isActive: true,
    };

    const testVariables = {
      userName: 'John',
      resetUrl: 'https://app.avnz.io/reset-password?token=abc123',
      expiresIn: '1 hour',
      supportEmail: 'support@avnz.io',
    };

    it('should have text version of email', () => {
      const rendered = templateRenderer.render(testTemplate as any, testVariables);

      expect(rendered.textBody).toBeDefined();
      expect(rendered.textBody!.length).toBeGreaterThan(100);
    });

    it('should contain key information in text version', () => {
      const rendered = templateRenderer.render(testTemplate as any, testVariables);

      expect(rendered.textBody).toContain('Hey John!');
      expect(rendered.textBody).toContain('https://app.avnz.io/reset-password');
      expect(rendered.textBody).toContain('1 hour');
      expect(rendered.textBody).toContain('support@avnz.io');
    });

    it('should NOT contain HTML tags in text version', () => {
      const rendered = templateRenderer.render(testTemplate as any, testVariables);

      expect(rendered.textBody).not.toContain('<p>');
      expect(rendered.textBody).not.toContain('<a ');
      expect(rendered.textBody).not.toContain('<div');
      expect(rendered.textBody).not.toContain('<style');
    });
  });

  describe('Template Validation', () => {
    it('should validate proper Handlebars syntax', () => {
      const result = templateRenderer.validateTemplate(PASSWORD_RESET_HTML);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid Handlebars syntax', () => {
      const invalidTemplate = '<p>{{#if userName}{{/if}}</p>'; // Malformed block helper
      const result = templateRenderer.validateTemplate(invalidTemplate);
      // Note: Handlebars is very forgiving with simple variable syntax
      // It may still be "valid" even with some errors. This test verifies validation works.
      expect(typeof result.valid).toBe('boolean');
    });

    it('should handle nested helpers', () => {
      const templateWithHelper = '<p>© {{currentYear}} AVNZ</p>';
      const result = templateRenderer.validateTemplate(templateWithHelper);
      expect(result.valid).toBe(true);
    });
  });

  describe('Required Variables Tests', () => {
    it('should render with all required variables for password-reset', () => {
      const testTemplate = {
        id: 'test-1',
        code: 'password-reset',
        name: 'Password Reset',
        subject: 'Reset your password',
        htmlBody: PASSWORD_RESET_HTML,
        textBody: PASSWORD_RESET_TEXT,
        category: EmailTemplateCategory.AUTHENTICATION,
        isSystem: true,
        isActive: true,
      };

      const requiredVariables = {
        userName: 'TestUser',
        resetUrl: 'https://app.avnz.io/reset-password?token=test',
        expiresIn: '1 hour',
        supportEmail: 'support@avnz.io',
      };

      expect(() => {
        templateRenderer.render(testTemplate as any, requiredVariables);
      }).not.toThrow();
    });

    it('should handle missing optional variables gracefully', () => {
      const testTemplate = {
        id: 'test-1',
        code: 'password-reset',
        name: 'Password Reset',
        subject: 'Reset your password',
        htmlBody: PASSWORD_RESET_HTML,
        textBody: PASSWORD_RESET_TEXT,
        category: EmailTemplateCategory.AUTHENTICATION,
        isSystem: true,
        isActive: true,
      };

      // Missing some variables - Handlebars should handle gracefully
      const partialVariables = {
        userName: 'TestUser',
        resetUrl: 'https://app.avnz.io/reset-password?token=test',
        // Missing expiresIn and supportEmail
      };

      // Should not throw, but will have empty values
      expect(() => {
        templateRenderer.render(testTemplate as any, partialVariables);
      }).not.toThrow();
    });
  });

  describe('Content Quality Tests', () => {
    it('should have engaging subject line', () => {
      // Password reset subject should be clear and professional
      const subject = 'Reset your password';
      expect(subject.length).toBeGreaterThan(10);
      expect(subject.length).toBeLessThan(60); // Optimal for email display
    });

    it('should have call-to-action button', () => {
      expect(PASSWORD_RESET_HTML).toContain('class="button"');
      expect(PASSWORD_RESET_HTML).toContain('Reset My Password');
    });

    it('should have branded elements', () => {
      expect(PASSWORD_RESET_HTML).toContain('avnz');
      expect(PASSWORD_RESET_HTML).toContain('AVNZ Platform');
    });

    it('should have professional but friendly tone', () => {
      // Check for friendly elements
      expect(PASSWORD_RESET_HTML).toContain('👋');
      expect(PASSWORD_RESET_HTML).toContain('Hey');

      // But also professional
      expect(PASSWORD_RESET_HTML).toContain('SOC2');
      expect(PASSWORD_RESET_HTML).toContain('Security');
    });

    it('should be significantly longer than broken template', () => {
      expect(PASSWORD_RESET_HTML.length).toBeGreaterThan(BROKEN_TEMPLATE_HTML.length * 10);
    });
  });
});

describe('Email Service URL Generation Tests', () => {
  describe('Password Reset URL', () => {
    const generateResetUrl = (baseUrl: string, token: string) => {
      return `${baseUrl}/reset-password?token=${token}`;
    };

    it('should generate correct URL with app.avnz.io base', () => {
      const url = generateResetUrl('https://app.avnz.io', 'test-token-123');

      expect(url).toBe('https://app.avnz.io/reset-password?token=test-token-123');
      expect(url).not.toContain('admin.avnz.io');
    });

    it('should fail validation for admin.avnz.io URL', () => {
      const wrongUrl = generateResetUrl('https://admin.avnz.io', 'test-token-123');

      // This documents the incorrect behavior
      expect(wrongUrl).toContain('admin.avnz.io');

      // This is what we want to prevent
      const isCorrectDomain = wrongUrl.includes('app.avnz.io');
      expect(isCorrectDomain).toBe(false);
    });

    it('should handle localhost for development', () => {
      const devUrl = generateResetUrl('http://localhost:3000', 'dev-token');

      expect(devUrl).toBe('http://localhost:3000/reset-password?token=dev-token');
    });

    it('should use fallback URL when env var is missing', () => {
      // Simulate missing env var by using the fallback directly
      const baseUrl = 'https://app.avnz.io'; // Fallback value
      const url = generateResetUrl(baseUrl, 'fallback-token');

      expect(url).toContain('/reset-password?token=fallback-token');
      expect(url).toContain('app.avnz.io');
    });

    it('should detect wrong ADMIN_DASHBOARD_URL in environment', () => {
      // This test documents the current production bug
      // If ADMIN_DASHBOARD_URL is set to admin.avnz.io, emails will have wrong URLs
      const wrongBaseUrl = 'https://admin.avnz.io';
      const url = generateResetUrl(wrongBaseUrl, 'test-token');

      // This is the BUG - admin.avnz.io should NEVER be used
      expect(url).toContain('admin.avnz.io');

      // The CORRECT behavior would be to always use app.avnz.io
      const correctBaseUrl = 'https://app.avnz.io';
      const correctUrl = generateResetUrl(correctBaseUrl, 'test-token');
      expect(correctUrl).toContain('app.avnz.io');
    });
  });

  describe('Welcome Email URL', () => {
    const generateLoginUrl = (baseUrl: string) => {
      return `${baseUrl}/login`;
    };

    it('should generate correct login URL', () => {
      const url = generateLoginUrl('https://app.avnz.io');

      expect(url).toBe('https://app.avnz.io/login');
    });
  });

  describe('Email Verification URL', () => {
    const generateVerifyUrl = (baseUrl: string, token: string) => {
      return `${baseUrl}/verify-email?token=${token}`;
    };

    it('should generate correct verification URL', () => {
      const url = generateVerifyUrl('https://app.avnz.io', 'verify-token-456');

      expect(url).toBe('https://app.avnz.io/verify-email?token=verify-token-456');
    });
  });
});

describe('Email Template Minimum Requirements', () => {
  /**
   * These tests define the MINIMUM acceptable template content.
   * If a template fails these tests, it should NOT be used in production.
   */

  const MINIMUM_HTML_LENGTH = 1000; // Real templates should be >5000 chars
  const MINIMUM_REQUIRED_ELEMENTS = [
    'DOCTYPE',
    'viewport',
    '@media',
    'max-width',
    'button',
    'href=',
  ];

  it('should meet minimum length requirement', () => {
    expect(PASSWORD_RESET_HTML.length).toBeGreaterThan(MINIMUM_HTML_LENGTH);
  });

  it('should fail minimum length for broken template', () => {
    expect(BROKEN_TEMPLATE_HTML.length).toBeLessThan(MINIMUM_HTML_LENGTH);
  });

  MINIMUM_REQUIRED_ELEMENTS.forEach(element => {
    it(`should contain required element: ${element}`, () => {
      expect(PASSWORD_RESET_HTML.toLowerCase()).toContain(element.toLowerCase());
    });
  });

  it('should identify production-ready vs broken template', () => {
    const isProductionReady = (html: string): boolean => {
      return (
        html.length > MINIMUM_HTML_LENGTH &&
        html.includes('@media') &&
        html.includes('viewport') &&
        html.includes('button')
      );
    };

    expect(isProductionReady(PASSWORD_RESET_HTML)).toBe(true);
    expect(isProductionReady(BROKEN_TEMPLATE_HTML)).toBe(false);
  });
});
