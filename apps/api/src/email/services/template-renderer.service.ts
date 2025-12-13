// Template Renderer Service - Handlebars-based email template rendering
import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { RenderedEmail, EmailTemplateWithContent } from '../types/email.types';

@Injectable()
export class TemplateRendererService {
  private readonly logger = new Logger(TemplateRendererService.name);

  constructor() {
    this.registerHelpers();
  }

  private registerHelpers(): void {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: Date | string, format?: string) => {
      if (!date) return '';
      const d = new Date(date);
      const formatStr = format || 'MMM dd, yyyy';
      return this.formatDateString(d, formatStr);
    });

    // Currency formatting helper
    Handlebars.registerHelper('formatCurrency', (amount: number, currency?: string) => {
      if (amount === undefined || amount === null) return '';
      const curr = currency || 'USD';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: curr,
      }).format(amount);
    });

    // URL encoding helper
    Handlebars.registerHelper('encodeUrl', (str: string) => {
      if (!str) return '';
      return encodeURIComponent(str);
    });

    // Equality check helper
    Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);

    // Conditional helper
    Handlebars.registerHelper('ifCond', function (this: unknown, v1: unknown, operator: string, v2: unknown, options: Handlebars.HelperOptions) {
      switch (operator) {
        case '==': return v1 == v2 ? options.fn(this) : options.inverse(this);
        case '===': return v1 === v2 ? options.fn(this) : options.inverse(this);
        case '!=': return v1 != v2 ? options.fn(this) : options.inverse(this);
        case '!==': return v1 !== v2 ? options.fn(this) : options.inverse(this);
        case '<': return (v1 as number) < (v2 as number) ? options.fn(this) : options.inverse(this);
        case '<=': return (v1 as number) <= (v2 as number) ? options.fn(this) : options.inverse(this);
        case '>': return (v1 as number) > (v2 as number) ? options.fn(this) : options.inverse(this);
        case '>=': return (v1 as number) >= (v2 as number) ? options.fn(this) : options.inverse(this);
        default: return options.inverse(this);
      }
    });

    // Year helper for copyright notices
    Handlebars.registerHelper('currentYear', () => new Date().getFullYear());

    // Truncate text helper
    Handlebars.registerHelper('truncate', (str: string, len: number) => {
      if (!str) return '';
      if (str.length <= len) return str;
      return str.slice(0, len) + '...';
    });
  }

  private formatDateString(date: Date, format: string): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return format
      .replace('MMM', month)
      .replace('dd', day)
      .replace('yyyy', year.toString())
      .replace('HH', hours)
      .replace('mm', minutes);
  }

  render(template: EmailTemplateWithContent, variables: Record<string, unknown>): RenderedEmail {
    try {
      // Compile subject
      const subjectTemplate = Handlebars.compile(template.subject);
      const subject = subjectTemplate(variables);

      // Compile HTML body
      const htmlTemplate = Handlebars.compile(template.htmlBody);
      const htmlBody = htmlTemplate(variables);

      // Compile text body if available
      let textBody: string | undefined;
      if (template.textBody) {
        const textTemplate = Handlebars.compile(template.textBody);
        textBody = textTemplate(variables);
      }

      return {
        subject,
        htmlBody,
        textBody,
      };
    } catch (error) {
      this.logger.error(`Template rendering error for ${template.code}: ${error}`);
      throw new Error(`Failed to render email template: ${template.code}`);
    }
  }

  renderString(templateString: string, variables: Record<string, unknown>): string {
    try {
      const compiled = Handlebars.compile(templateString);
      return compiled(variables);
    } catch (error) {
      this.logger.error(`String template rendering error: ${error}`);
      throw new Error('Failed to render template string');
    }
  }

  validateTemplate(templateString: string): { valid: boolean; error?: string } {
    try {
      Handlebars.compile(templateString);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown template error',
      };
    }
  }
}
