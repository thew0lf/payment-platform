import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LandingPageTheme, SectionType } from '@prisma/client';
import {
  ColorScheme,
  Typography,
  SectionContent,
  SectionStyles,
  HeroContent,
  FeaturesContent,
  CtaContent,
  FaqContent,
  TestimonialsContent,
  StatsContent,
  PricingContent,
  NewsletterContent,
  SpacerContent,
  DividerContent,
  HeaderContent,
  FooterContent,
  THEME_DEFAULTS,
} from '../types/landing-page.types';

interface RenderOptions {
  minify?: boolean;
  includeAnalytics?: boolean;
}

interface SectionData {
  id: string;
  type: SectionType;
  content: SectionContent;
  styles?: SectionStyles;
  enabled: boolean;
  hideOnMobile: boolean;
  hideOnDesktop: boolean;
}

@Injectable()
export class RendererService {
  private readonly logger = new Logger(RendererService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Render a complete landing page to HTML
   */
  async renderPage(pageId: string, options: RenderOptions = {}): Promise<string> {
    const page = await this.prisma.landingPage.findUnique({
      where: { id: pageId },
      include: { sections: { orderBy: { order: 'asc' } } },
    });

    if (!page) {
      throw new Error('Landing page not found');
    }

    // Get theme defaults if colors/typography not customized
    const themeDefaults = THEME_DEFAULTS[page.theme as LandingPageTheme] || THEME_DEFAULTS.STARTER;
    const colors = (page.colorScheme as unknown as ColorScheme) || themeDefaults.colorScheme;
    const typography = (page.typography as unknown as Typography) || themeDefaults.typography;

    // Filter enabled sections
    const sections = page.sections.filter((s) => s.enabled);

    // Generate HTML
    const html = this.generateHtml({
      title: page.metaTitle || page.name,
      description: page.metaDescription || '',
      ogImage: page.ogImage || '',
      favicon: page.favicon || '',
      colors,
      typography,
      sections: sections.map((s) => ({
        id: s.id,
        type: s.type,
        content: s.content as SectionContent,
        styles: s.styles as SectionStyles | undefined,
        enabled: s.enabled,
        hideOnMobile: s.hideOnMobile,
        hideOnDesktop: s.hideOnDesktop,
      })),
      customCss: page.customCss || '',
      customJs: page.customJs || '',
      googleAnalyticsId: options.includeAnalytics ? page.googleAnalyticsId || undefined : undefined,
      facebookPixelId: options.includeAnalytics ? page.facebookPixelId || undefined : undefined,
    });

    return options.minify ? this.minifyHtml(html) : html;
  }

  /**
   * Generate HTML document
   */
  private generateHtml(config: {
    title: string;
    description: string;
    ogImage: string;
    favicon: string;
    colors: ColorScheme;
    typography: Typography;
    sections: SectionData[];
    customCss: string;
    customJs: string;
    googleAnalyticsId?: string;
    facebookPixelId?: string;
  }): string {
    const {
      title,
      description,
      ogImage,
      favicon,
      colors,
      typography,
      sections,
      customCss,
      customJs,
      googleAnalyticsId,
      facebookPixelId,
    } = config;

    const sectionsHtml = sections.map((s) => this.renderSection(s, colors)).join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  ${description ? `<meta name="description" content="${this.escapeHtml(description)}">` : ''}
  ${ogImage ? `<meta property="og:image" content="${this.escapeHtml(ogImage)}">` : ''}
  ${favicon ? `<link rel="icon" href="${this.escapeHtml(favicon)}">` : ''}

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${typography.headingFont.replace(/ /g, '+')}:wght@400;600;700&family=${typography.bodyFont.replace(/ /g, '+')}:wght@400;500;600&display=swap" rel="stylesheet">

  <style>
    ${this.generateBaseStyles(colors, typography)}
    ${customCss}
  </style>

  ${googleAnalyticsId ? this.generateGoogleAnalytics(googleAnalyticsId) : ''}
  ${facebookPixelId ? this.generateFacebookPixel(facebookPixelId) : ''}
</head>
<body>
  ${sectionsHtml}
  ${customJs ? `<script>${customJs}</script>` : ''}
</body>
</html>`;
  }

  /**
   * Generate base CSS styles
   */
  private generateBaseStyles(colors: ColorScheme, typography: Typography): string {
    return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      font-family: '${typography.bodyFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: ${typography.baseFontSize}px;
      line-height: 1.6;
      background-color: ${colors.background};
      color: ${colors.text};
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: '${typography.headingFont}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-weight: 700;
      line-height: 1.2;
      color: ${colors.text};
    }

    h1 { font-size: ${typography.headingSizes.h1}; }
    h2 { font-size: ${typography.headingSizes.h2}; }
    h3 { font-size: ${typography.headingSizes.h3}; }
    h4 { font-size: ${typography.headingSizes.h4}; }

    p {
      color: ${colors.textMuted};
    }

    a {
      color: ${colors.primary};
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }

    .container-sm {
      max-width: 800px;
      margin: 0 auto;
      padding: 0 24px;
    }

    .btn {
      display: inline-block;
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1rem;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
      border: none;
    }

    .btn-primary {
      background-color: ${colors.primary};
      color: white;
    }

    .btn-primary:hover {
      opacity: 0.9;
      text-decoration: none;
    }

    .btn-secondary {
      background-color: ${colors.surface};
      color: ${colors.text};
      border: 1px solid ${colors.border};
    }

    .btn-secondary:hover {
      background-color: ${colors.border};
      text-decoration: none;
    }

    .btn-outline {
      background-color: transparent;
      color: ${colors.primary};
      border: 2px solid ${colors.primary};
    }

    .btn-outline:hover {
      background-color: ${colors.primary};
      color: white;
      text-decoration: none;
    }

    .text-center { text-align: center; }
    .text-muted { color: ${colors.textMuted}; }

    @media (max-width: 768px) {
      h1 { font-size: calc(${typography.headingSizes.h1} * 0.7); }
      h2 { font-size: calc(${typography.headingSizes.h2} * 0.75); }
      h3 { font-size: calc(${typography.headingSizes.h3} * 0.8); }
      .container { padding: 0 16px; }
      .hide-mobile { display: none !important; }
    }

    @media (min-width: 769px) {
      .hide-desktop { display: none !important; }
    }
    `;
  }

  /**
   * Render a single section
   */
  private renderSection(section: SectionData, colors: ColorScheme): string {
    const { type, content, styles, hideOnMobile, hideOnDesktop } = section;

    let classes = '';
    if (hideOnMobile) classes += ' hide-mobile';
    if (hideOnDesktop) classes += ' hide-desktop';

    const sectionStyle = this.generateSectionStyles(styles, colors);

    let innerHtml = '';

    switch (type) {
      // Hero variants
      case SectionType.HERO_CENTERED:
      case SectionType.HERO_SPLIT:
      case SectionType.HERO_VIDEO:
      case SectionType.HERO_CAROUSEL:
        innerHtml = this.renderHero(content as HeroContent, colors);
        break;

      // Feature variants
      case SectionType.FEATURES_GRID:
      case SectionType.FEATURES_LIST:
      case SectionType.FEATURES_ICONS:
        innerHtml = this.renderFeatures(content as FeaturesContent, colors);
        break;

      // CTA variants
      case SectionType.CTA_BANNER:
      case SectionType.CTA_SPLIT:
        innerHtml = this.renderCta(content as CtaContent, colors);
        break;

      // FAQ variants
      case SectionType.FAQ_ACCORDION:
      case SectionType.FAQ_GRID:
        innerHtml = this.renderFaq(content as FaqContent, colors);
        break;

      // Testimonial variants
      case SectionType.TESTIMONIALS_CARDS:
      case SectionType.TESTIMONIALS_CAROUSEL:
      case SectionType.TESTIMONIALS_WALL:
        innerHtml = this.renderTestimonials(content as TestimonialsContent, colors);
        break;

      // Stats
      case SectionType.STATS_COUNTER:
        innerHtml = this.renderStats(content as StatsContent, colors);
        break;

      // Pricing variants
      case SectionType.PRICING_TABLE:
      case SectionType.PRICING_COMPARISON:
        innerHtml = this.renderPricing(content as PricingContent, colors);
        break;

      // Newsletter
      case SectionType.NEWSLETTER:
        innerHtml = this.renderNewsletter(content as NewsletterContent, colors);
        break;

      // Spacing elements
      case SectionType.SPACER:
        return `<div style="height: ${(content as SpacerContent).height || 80}px;"${classes ? ` class="${classes.trim()}"` : ''}></div>`;
      case SectionType.DIVIDER:
        const divider = content as DividerContent;
        return `<div class="container${classes}"><hr style="border: none; border-top: ${divider.thickness || 1}px ${divider.style || 'solid'} ${colors.border}; margin: 32px 0;"></div>`;

      // Navigation
      case SectionType.HEADER:
        innerHtml = this.renderHeader(content as HeaderContent, colors);
        break;
      case SectionType.FOOTER:
        innerHtml = this.renderFooter(content as FooterContent, colors);
        break;

      // Other section types (about, logos, products, gallery, video, contact, html)
      case SectionType.ABOUT_STORY:
      case SectionType.ABOUT_TEAM:
      case SectionType.ABOUT_TIMELINE:
      case SectionType.LOGOS_STRIP:
      case SectionType.PRODUCTS_GRID:
      case SectionType.PRODUCTS_CAROUSEL:
      case SectionType.GALLERY_GRID:
      case SectionType.GALLERY_MASONRY:
      case SectionType.VIDEO_EMBED:
      case SectionType.CONTACT_FORM:
      case SectionType.HTML_BLOCK:
      default:
        innerHtml = `<div class="container"><p class="text-muted text-center">[${type} section]</p></div>`;
    }

    return `<section style="${sectionStyle}"${classes ? ` class="${classes.trim()}"` : ''}>${innerHtml}</section>`;
  }

  /**
   * Generate inline styles for a section
   */
  private generateSectionStyles(styles: SectionStyles | undefined, colors: ColorScheme): string {
    if (!styles) {
      return 'padding: 80px 0;';
    }

    const parts: string[] = [];

    if (styles.backgroundColor) {
      parts.push(`background-color: ${styles.backgroundColor}`);
    }

    if (styles.backgroundImage) {
      parts.push(`background-image: url(${styles.backgroundImage})`);
      parts.push('background-size: cover');
      parts.push('background-position: center');
    }

    if (styles.backgroundOverlay) {
      parts.push(`position: relative`);
    }

    parts.push(`padding-top: ${styles.paddingTop || '80px'}`);
    parts.push(`padding-bottom: ${styles.paddingBottom || '80px'}`);

    if (styles.textColor) {
      parts.push(`color: ${styles.textColor}`);
    }

    if (styles.textAlign) {
      parts.push(`text-align: ${styles.textAlign}`);
    }

    return parts.join('; ') + ';';
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTION RENDERERS
  // ═══════════════════════════════════════════════════════════════

  private renderHero(content: HeroContent, colors: ColorScheme): string {
    const bgStyle = content.backgroundImage
      ? `background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${content.backgroundImage}) center/cover; color: white;`
      : `background: ${colors.surface};`;

    return `
    <div style="${bgStyle} padding: 100px 0; text-align: center;">
      <div class="container">
        <h1 style="margin-bottom: 24px;${content.backgroundImage ? ' color: white;' : ''}">${this.escapeHtml(content.headline || '')}</h1>
        ${content.subheadline ? `<p style="font-size: 1.25rem; max-width: 600px; margin: 0 auto 32px;${content.backgroundImage ? ' color: rgba(255,255,255,0.9);' : ''}">${this.escapeHtml(content.subheadline)}</p>` : ''}
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          ${content.ctaText ? `<a href="${this.escapeHtml(content.ctaUrl || '#')}" class="btn btn-primary">${this.escapeHtml(content.ctaText)}</a>` : ''}
          ${content.secondaryCtaText ? `<a href="${this.escapeHtml(content.secondaryCtaUrl || '#')}" class="btn btn-outline"${content.backgroundImage ? ' style="border-color: white; color: white;"' : ''}>${this.escapeHtml(content.secondaryCtaText)}</a>` : ''}
        </div>
      </div>
    </div>`;
  }

  private renderFeatures(content: FeaturesContent, colors: ColorScheme): string {
    const items = (content.items || [])
      .map(
        (item) => `
      <div style="flex: 1; min-width: 280px; padding: 32px; background: ${colors.surface}; border-radius: 12px; border: 1px solid ${colors.border};">
        ${item.icon ? `<div style="font-size: 2rem; margin-bottom: 16px;">${item.icon}</div>` : ''}
        <h3 style="margin-bottom: 12px;">${this.escapeHtml(item.title)}</h3>
        <p>${this.escapeHtml(item.description)}</p>
      </div>`
      )
      .join('');

    return `
    <div class="container">
      ${content.headline ? `<h2 style="text-align: center; margin-bottom: 16px;">${this.escapeHtml(content.headline)}</h2>` : ''}
      ${content.subheadline ? `<p style="text-align: center; max-width: 600px; margin: 0 auto 48px;">${this.escapeHtml(content.subheadline)}</p>` : ''}
      <div style="display: flex; gap: 24px; flex-wrap: wrap;">
        ${items}
      </div>
    </div>`;
  }

  private renderCta(content: CtaContent, colors: ColorScheme): string {
    const bgStyle = content.backgroundImage
      ? `background: linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${content.backgroundImage}) center/cover;`
      : `background: ${colors.primary};`;

    return `
    <div style="${bgStyle} padding: 80px 0; text-align: center;">
      <div class="container">
        <h2 style="color: white; margin-bottom: 16px;">${this.escapeHtml(content.headline)}</h2>
        ${content.subheadline ? `<p style="color: rgba(255,255,255,0.9); margin-bottom: 32px; max-width: 600px; margin-left: auto; margin-right: auto;">${this.escapeHtml(content.subheadline)}</p>` : ''}
        <a href="${this.escapeHtml(content.ctaUrl || '#')}" class="btn" style="background: white; color: ${colors.primary};">${this.escapeHtml(content.ctaText)}</a>
      </div>
    </div>`;
  }

  private renderFaq(content: FaqContent, colors: ColorScheme): string {
    const items = (content.items || [])
      .map(
        (item) => `
      <div style="padding: 24px 0; border-bottom: 1px solid ${colors.border};">
        <h4 style="margin-bottom: 12px;">${this.escapeHtml(item.question)}</h4>
        <p>${this.escapeHtml(item.answer)}</p>
      </div>`
      )
      .join('');

    return `
    <div class="container-sm">
      ${content.headline ? `<h2 style="text-align: center; margin-bottom: 48px;">${this.escapeHtml(content.headline)}</h2>` : ''}
      ${items}
    </div>`;
  }

  private renderTestimonials(content: TestimonialsContent, colors: ColorScheme): string {
    const items = (content.items || [])
      .map(
        (item) => `
      <div style="flex: 1; min-width: 300px; padding: 32px; background: ${colors.surface}; border-radius: 12px; border: 1px solid ${colors.border};">
        ${item.rating ? `<div style="color: #f59e0b; margin-bottom: 16px;">${'★'.repeat(item.rating)}${'☆'.repeat(5 - item.rating)}</div>` : ''}
        <p style="font-style: italic; margin-bottom: 24px;">"${this.escapeHtml(item.quote)}"</p>
        <div style="display: flex; align-items: center; gap: 12px;">
          ${item.image ? `<img src="${item.image}" alt="${item.author}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">` : ''}
          <div>
            <div style="font-weight: 600; color: ${colors.text};">${this.escapeHtml(item.author)}</div>
            ${item.role || item.company ? `<div style="font-size: 0.875rem;">${this.escapeHtml(item.role || '')}${item.role && item.company ? ', ' : ''}${this.escapeHtml(item.company || '')}</div>` : ''}
          </div>
        </div>
      </div>`
      )
      .join('');

    return `
    <div class="container">
      ${content.headline ? `<h2 style="text-align: center; margin-bottom: 48px;">${this.escapeHtml(content.headline)}</h2>` : ''}
      <div style="display: flex; gap: 24px; flex-wrap: wrap;">
        ${items}
      </div>
    </div>`;
  }

  private renderStats(content: StatsContent, colors: ColorScheme): string {
    const items = (content.items || [])
      .map(
        (item) => `
      <div style="text-align: center; flex: 1; min-width: 150px;">
        <div style="font-size: 3rem; font-weight: 700; color: ${colors.primary};">${item.prefix || ''}${item.value}${item.suffix || ''}</div>
        <div style="margin-top: 8px;">${this.escapeHtml(item.label)}</div>
      </div>`
      )
      .join('');

    return `
    <div class="container">
      ${content.headline ? `<h2 style="text-align: center; margin-bottom: 48px;">${this.escapeHtml(content.headline)}</h2>` : ''}
      <div style="display: flex; gap: 48px; flex-wrap: wrap; justify-content: center;">
        ${items}
      </div>
    </div>`;
  }

  private renderPricing(content: PricingContent, colors: ColorScheme): string {
    const tiers = (content.tiers || [])
      .map(
        (tier) => `
      <div style="flex: 1; min-width: 280px; max-width: 350px; padding: 32px; background: ${tier.highlighted ? colors.primary : colors.surface}; border-radius: 16px; border: 2px solid ${tier.highlighted ? colors.primary : colors.border}; ${tier.highlighted ? 'color: white; transform: scale(1.05);' : ''}">
        <h3 style="margin-bottom: 8px;${tier.highlighted ? ' color: white;' : ''}">${this.escapeHtml(tier.name)}</h3>
        ${tier.description ? `<p style="margin-bottom: 24px;${tier.highlighted ? ' color: rgba(255,255,255,0.9);' : ''}">${this.escapeHtml(tier.description)}</p>` : ''}
        <div style="font-size: 2.5rem; font-weight: 700; margin-bottom: 24px;${tier.highlighted ? ' color: white;' : ''}">${this.escapeHtml(tier.price)}${tier.period ? `<span style="font-size: 1rem; font-weight: 400;">/${tier.period}</span>` : ''}</div>
        <ul style="list-style: none; margin-bottom: 32px;">
          ${tier.features.map((f) => `<li style="padding: 8px 0; border-bottom: 1px solid ${tier.highlighted ? 'rgba(255,255,255,0.2)' : colors.border};">${this.escapeHtml(f)}</li>`).join('')}
        </ul>
        <a href="${this.escapeHtml(tier.ctaUrl)}" class="btn" style="width: 100%; text-align: center; ${tier.highlighted ? `background: white; color: ${colors.primary};` : `background: ${colors.primary}; color: white;`}">${this.escapeHtml(tier.ctaText)}</a>
      </div>`
      )
      .join('');

    return `
    <div class="container">
      ${content.headline ? `<h2 style="text-align: center; margin-bottom: 16px;">${this.escapeHtml(content.headline)}</h2>` : ''}
      ${content.subheadline ? `<p style="text-align: center; max-width: 600px; margin: 0 auto 48px;">${this.escapeHtml(content.subheadline)}</p>` : ''}
      <div style="display: flex; gap: 24px; flex-wrap: wrap; justify-content: center; align-items: center;">
        ${tiers}
      </div>
    </div>`;
  }

  private renderNewsletter(content: NewsletterContent, colors: ColorScheme): string {
    return `
    <div style="background: ${colors.surface}; padding: 64px 0;">
      <div class="container" style="max-width: 500px; text-align: center;">
        ${content.headline ? `<h2 style="margin-bottom: 16px;">${this.escapeHtml(content.headline)}</h2>` : ''}
        ${content.subheadline ? `<p style="margin-bottom: 32px;">${this.escapeHtml(content.subheadline)}</p>` : ''}
        <form style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
          <input type="email" placeholder="${this.escapeHtml(content.placeholderText || 'Enter your email')}" style="flex: 1; min-width: 200px; padding: 14px 20px; border: 1px solid ${colors.border}; border-radius: 8px; font-size: 1rem;" required>
          <button type="submit" class="btn btn-primary">${this.escapeHtml(content.buttonText || 'Subscribe')}</button>
        </form>
      </div>
    </div>`;
  }

  private renderHeader(content: HeaderContent, colors: ColorScheme): string {
    const navLinks = (content.navLinks || [])
      .map((link) => `<a href="${this.escapeHtml(link.url)}" style="color: ${colors.text}; text-decoration: none; font-weight: 500;">${this.escapeHtml(link.text)}</a>`)
      .join('');

    return `
    <header style="padding: 16px 0; background: ${colors.background}; border-bottom: 1px solid ${colors.border};${content.sticky ? ' position: sticky; top: 0; z-index: 100;' : ''}">
      <div class="container" style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 12px;">
          ${content.logo ? `<img src="${content.logo}" alt="Logo" style="height: 40px;">` : ''}
          ${content.logoText ? `<span style="font-size: 1.5rem; font-weight: 700; color: ${colors.text};">${this.escapeHtml(content.logoText)}</span>` : ''}
        </div>
        <nav style="display: flex; align-items: center; gap: 32px;">
          ${navLinks}
          ${content.ctaText ? `<a href="${this.escapeHtml(content.ctaUrl || '#')}" class="btn btn-primary" style="padding: 10px 20px;">${this.escapeHtml(content.ctaText)}</a>` : ''}
        </nav>
      </div>
    </header>`;
  }

  private renderFooter(content: FooterContent, colors: ColorScheme): string {
    const columns = (content.columns || [])
      .map(
        (col) => `
      <div style="min-width: 150px;">
        <h4 style="margin-bottom: 16px; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em;">${this.escapeHtml(col.title)}</h4>
        <ul style="list-style: none;">
          ${col.links.map((link) => `<li style="margin-bottom: 8px;"><a href="${this.escapeHtml(link.url)}" style="color: ${colors.textMuted};">${this.escapeHtml(link.text)}</a></li>`).join('')}
        </ul>
      </div>`
      )
      .join('');

    const social = (content.social || [])
      .map((s) => `<a href="${this.escapeHtml(s.url)}" style="color: ${colors.textMuted};">${s.platform}</a>`)
      .join(' ');

    return `
    <footer style="padding: 64px 0 32px; background: ${colors.surface}; border-top: 1px solid ${colors.border};">
      <div class="container">
        <div style="display: flex; gap: 64px; flex-wrap: wrap; margin-bottom: 48px;">
          <div style="flex: 1; min-width: 200px;">
            ${content.logo ? `<img src="${content.logo}" alt="Logo" style="height: 40px; margin-bottom: 16px;">` : ''}
            ${content.logoText ? `<div style="font-size: 1.5rem; font-weight: 700; margin-bottom: 16px;">${this.escapeHtml(content.logoText)}</div>` : ''}
            ${social ? `<div style="display: flex; gap: 16px;">${social}</div>` : ''}
          </div>
          ${columns}
        </div>
        <div style="padding-top: 24px; border-top: 1px solid ${colors.border}; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          ${content.copyright ? `<p style="font-size: 0.875rem;">${this.escapeHtml(content.copyright)}</p>` : ''}
          ${content.legal ? `<div style="display: flex; gap: 24px;">${content.legal.map((l) => `<a href="${this.escapeHtml(l.url)}" style="font-size: 0.875rem; color: ${colors.textMuted};">${this.escapeHtml(l.text)}</a>`).join('')}</div>` : ''}
        </div>
      </div>
    </footer>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  private generateGoogleAnalytics(id: string): string {
    return `
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${this.escapeHtml(id)}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${this.escapeHtml(id)}');
    </script>`;
  }

  private generateFacebookPixel(id: string): string {
    return `
    <!-- Facebook Pixel -->
    <script>
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${this.escapeHtml(id)}');
      fbq('track', 'PageView');
    </script>
    <noscript><img height="1" width="1" style="display:none"
      src="https://www.facebook.com/tr?id=${this.escapeHtml(id)}&ev=PageView&noscript=1"/></noscript>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  private minifyHtml(html: string): string {
    return html
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .replace(/\s+>/g, '>')
      .replace(/<\s+/g, '<')
      .trim();
  }
}
