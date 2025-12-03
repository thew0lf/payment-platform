import { LandingPageDetail, SectionDetail } from '@/lib/api/landing-pages';

// Default color scheme
const defaultColors = {
  primary: '#3B82F6',
  secondary: '#1E40AF',
  accent: '#60A5FA',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  text: '#1F2937',
  textMuted: '#6B7280',
  muted: '#6B7280',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

// Default typography
const defaultFonts = {
  headingFont: 'Inter',
  bodyFont: 'Inter',
  baseFontSize: 16,
  headingSizes: {
    h1: '3.5rem',
    h2: '2.5rem',
    h3: '1.75rem',
    h4: '1.25rem',
  },
};

export function generatePreviewHtml(page: LandingPageDetail): string {
  // Merge with defaults to ensure all properties exist
  const colors = {
    ...defaultColors,
    ...page.colorScheme,
    // Map 'muted' to 'textMuted' if textMuted is missing
    textMuted: page.colorScheme?.textMuted || (page.colorScheme as any)?.muted || defaultColors.textMuted,
    surface: page.colorScheme?.surface || (page.colorScheme?.background ? adjustBrightness(page.colorScheme.background, -5) : defaultColors.surface),
    border: page.colorScheme?.border || (page.colorScheme?.text ? adjustBrightness(page.colorScheme.text, 70) : defaultColors.border),
  };

  const fonts = {
    ...defaultFonts,
    ...page.typography,
    headingSizes: page.typography?.headingSizes || defaultFonts.headingSizes,
  };

  const sectionsHtml = page.sections
    .filter((s) => s.enabled)
    .map((section) => renderSection(section, colors, page))
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.metaTitle || page.name}</title>
  ${page.metaDescription ? `<meta name="description" content="${page.metaDescription}">` : ''}
  <link href="https://fonts.googleapis.com/css2?family=${fonts.headingFont.replace(/ /g, '+')}:wght@400;500;600;700&family=${fonts.bodyFont.replace(/ /g, '+')}:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --color-primary: ${colors.primary};
      --color-secondary: ${colors.secondary};
      --color-accent: ${colors.accent};
      --color-background: ${colors.background};
      --color-surface: ${colors.surface};
      --color-text: ${colors.text};
      --color-text-muted: ${colors.textMuted};
      --color-border: ${colors.border};
      --color-success: ${colors.success};
      --color-warning: ${colors.warning};
      --color-error: ${colors.error};
      --font-heading: '${fonts.headingFont}', sans-serif;
      --font-body: '${fonts.bodyFont}', sans-serif;
    }

    body {
      font-family: var(--font-body);
      font-size: ${fonts.baseFontSize}px;
      background: var(--color-background);
      color: var(--color-text);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: var(--font-heading);
      font-weight: 700;
      line-height: 1.2;
    }
    h1 { font-size: ${fonts.headingSizes.h1}; }
    h2 { font-size: ${fonts.headingSizes.h2}; }
    h3 { font-size: ${fonts.headingSizes.h3}; }
    h4 { font-size: ${fonts.headingSizes.h4}; }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }

    .container-sm { max-width: 800px; }
    .container-lg { max-width: 1400px; }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 28px;
      background: var(--color-primary);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: transparent;
      color: var(--color-text);
      border: 2px solid var(--color-border);
    }
    .btn-secondary:hover {
      background: var(--color-surface);
      border-color: var(--color-text-muted);
    }

    .btn-white {
      background: white;
      color: var(--color-primary);
    }

    .text-muted { color: var(--color-text-muted); }
    .text-center { text-align: center; }

    .grid { display: grid; gap: 24px; }
    .grid-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-4 { grid-template-columns: repeat(4, 1fr); }

    @media (max-width: 1024px) {
      .grid-4 { grid-template-columns: repeat(2, 1fr); }
      .grid-3 { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 640px) {
      .grid-4, .grid-3, .grid-2 { grid-template-columns: 1fr; }
      .container { padding: 0 16px; }
      h1 { font-size: 2rem; }
      h2 { font-size: 1.75rem; }
    }

    .card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 24px;
      transition: all 0.2s ease;
    }
    .card:hover {
      border-color: var(--color-text-muted);
      transform: translateY(-2px);
    }

    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: var(--color-primary);
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 20px;
    }

    input, textarea {
      width: 100%;
      padding: 12px 16px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      font-size: 1rem;
      color: var(--color-text);
      transition: border-color 0.2s ease;
    }
    input:focus, textarea:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    ${page.customCss || ''}
  </style>
</head>
<body>
  ${sectionsHtml}
  ${page.googleAnalyticsId ? getGoogleAnalyticsScript(page.googleAnalyticsId) : ''}
  ${page.facebookPixelId ? getFacebookPixelScript(page.facebookPixelId) : ''}
  ${page.customJs ? `<script>${page.customJs}</script>` : ''}
</body>
</html>
`;
}

function renderSection(section: SectionDetail, colors: LandingPageDetail['colorScheme'], page: LandingPageDetail): string {
  const content = section.content;
  const styles = section.styles || {};

  // Build background styles
  let backgroundStyles = '';
  if (styles.backgroundImage) {
    backgroundStyles = `background-image: url(${styles.backgroundImage}); background-size: cover; background-position: center;`;
  } else if (styles.backgroundColor) {
    backgroundStyles = `background-color: ${styles.backgroundColor};`;
  }

  // Build overlay (only for image backgrounds)
  const overlayHtml = styles.backgroundImage && styles.backgroundOverlay
    ? `<div style="position: absolute; inset: 0; background: ${styles.backgroundOverlay};"></div>`
    : '';

  // Text color - if using image background with overlay, default to white
  const textColor = styles.textColor || (styles.backgroundImage ? 'white' : '');

  const sectionStyle = {
    padding: `${styles.paddingTop || '80px'} 0 ${styles.paddingBottom || '80px'}`,
    background: backgroundStyles,
    textColor: textColor,
    textAlign: styles.textAlign || '',
    hasOverlay: !!overlayHtml,
    overlayHtml: overlayHtml,
  };

  switch (section.type) {
    // Navigation
    case 'HEADER':
      return renderHeader(content, colors);
    case 'FOOTER':
      return renderFooter(content, colors);

    // Hero variants (Prisma: HERO_CENTERED, HERO_SPLIT, HERO_VIDEO, HERO_CAROUSEL)
    case 'HERO_CENTERED':
    case 'HERO_SPLIT':
    case 'HERO_VIDEO':
    case 'HERO_CAROUSEL':
      return renderHero(content, colors, sectionStyle);

    // Features variants (Prisma: FEATURES_GRID, FEATURES_LIST, FEATURES_ICONS)
    case 'FEATURES_GRID':
    case 'FEATURES_LIST':
    case 'FEATURES_ICONS':
      return renderFeatures(content, colors, sectionStyle);

    // About variants (Prisma: ABOUT_STORY, ABOUT_TEAM, ABOUT_TIMELINE)
    case 'ABOUT_STORY':
    case 'ABOUT_TEAM':
    case 'ABOUT_TIMELINE':
      return renderAbout(content, colors, sectionStyle);

    // Testimonials variants (Prisma: TESTIMONIALS_CARDS, TESTIMONIALS_CAROUSEL, TESTIMONIALS_WALL)
    case 'TESTIMONIALS_CARDS':
    case 'TESTIMONIALS_CAROUSEL':
    case 'TESTIMONIALS_WALL':
      return renderTestimonials(content, colors, sectionStyle);

    // Logos / Social Proof (Prisma: LOGOS_STRIP)
    case 'LOGOS_STRIP':
      return renderLogos(content, colors, sectionStyle);

    // Stats (Prisma: STATS_COUNTER)
    case 'STATS_COUNTER':
      return renderStats(content, colors, sectionStyle);

    // Pricing variants (Prisma: PRICING_TABLE, PRICING_COMPARISON)
    case 'PRICING_TABLE':
    case 'PRICING_COMPARISON':
      return renderPricing(content, colors, sectionStyle);

    // Products variants (Prisma: PRODUCTS_GRID, PRODUCTS_CAROUSEL)
    case 'PRODUCTS_GRID':
    case 'PRODUCTS_CAROUSEL':
      return renderProducts(content, colors, sectionStyle);

    // CTA variants (Prisma: CTA_BANNER, CTA_SPLIT)
    case 'CTA_BANNER':
    case 'CTA_SPLIT':
      return renderCTA(content, colors, sectionStyle);

    // Engagement (Prisma: NEWSLETTER, CONTACT_FORM)
    case 'NEWSLETTER':
      return renderNewsletter(content, colors, sectionStyle);
    case 'CONTACT_FORM':
      return renderContactForm(content, colors, sectionStyle);

    // FAQ variants (Prisma: FAQ_ACCORDION, FAQ_GRID)
    case 'FAQ_ACCORDION':
    case 'FAQ_GRID':
      return renderFAQ(content, colors, sectionStyle);

    // Media (Prisma: GALLERY_GRID, GALLERY_MASONRY, VIDEO_EMBED)
    case 'GALLERY_GRID':
    case 'GALLERY_MASONRY':
      return renderGallery(content, colors, sectionStyle);
    case 'VIDEO_EMBED':
      return renderVideo(content, colors, sectionStyle);

    // Layout & Custom (Prisma: SPACER, DIVIDER, HTML_BLOCK)
    case 'SPACER':
      return `<div style="height: ${content.height || 80}px;"></div>`;
    case 'DIVIDER':
      return `
<div class="container">
  <hr style="border: none; border-top: ${content.thickness || 1}px ${content.style || 'solid'} ${content.color || colors.border}; margin: 0;">
</div>`;
    case 'HTML_BLOCK':
      return content.html || '';

    default:
      return `
<section style="padding: 64px 0; background: ${colors.surface};">
  <div class="container text-center">
    <p class="text-muted">[${section.type} section - configure in editor]</p>
  </div>
</section>`;
  }
}

// Type for section style object
interface SectionStyleObject {
  padding: string;
  background: string;
  textColor: string;
  textAlign: string;
  hasOverlay: boolean;
  overlayHtml: string;
}

// Helper to build section wrapper with background
function wrapSection(content: string, sectionStyle: SectionStyleObject, defaultBg: string = ''): string {
  const bgStyle = sectionStyle.background || (defaultBg ? `background: ${defaultBg};` : '');
  const textColorStyle = sectionStyle.textColor ? `color: ${sectionStyle.textColor};` : '';
  const textAlignStyle = sectionStyle.textAlign ? `text-align: ${sectionStyle.textAlign};` : '';

  return `
<section style="padding: ${sectionStyle.padding}; ${bgStyle} ${textColorStyle} ${textAlignStyle} position: relative;">
  ${sectionStyle.overlayHtml}
  <div class="container" style="position: relative; z-index: 1;">
    ${content}
  </div>
</section>`;
}

function renderHeader(content: any, colors: any): string {
  const menuItems = (content.menuItems || [])
    .map((item: any) => `<a href="${item.url}" style="color: var(--color-text); text-decoration: none; font-weight: 500;">${item.label}</a>`)
    .join('');

  return `
<header style="padding: 16px 0; background: var(--color-background); border-bottom: 1px solid var(--color-border); ${content.sticky ? 'position: sticky; top: 0; z-index: 100;' : ''}">
  <div class="container" style="display: flex; align-items: center; justify-content: space-between;">
    <div style="font-size: 1.5rem; font-weight: 700; font-family: var(--font-heading);">
      ${content.logo ? `<img src="${content.logo}" alt="${content.logoText || 'Logo'}" style="height: 40px;">` : content.logoText || 'Brand'}
    </div>
    <nav style="display: flex; gap: 32px; align-items: center;">
      ${menuItems}
      ${content.ctaText ? `<a href="${content.ctaUrl || '#'}" class="btn" style="padding: 8px 20px; font-size: 0.875rem;">${content.ctaText}</a>` : ''}
    </nav>
  </div>
</header>`;
}

function renderHero(content: any, colors: any, sectionStyle: SectionStyleObject): string {
  // Check if section has custom background set, otherwise use content.backgroundImage for hero
  const hasCustomBg = sectionStyle.background !== '';
  const contentBgImage = content.backgroundImage;

  let bgStyle = '';
  let overlayHtml = '';
  let textColor = '';

  if (hasCustomBg) {
    // Use section style background
    bgStyle = sectionStyle.background;
    overlayHtml = sectionStyle.overlayHtml;
    textColor = sectionStyle.textColor || (sectionStyle.hasOverlay ? 'white' : '');
  } else if (contentBgImage) {
    // Fallback to content background image (legacy support)
    bgStyle = `background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${contentBgImage}) center/cover;`;
    textColor = 'white';
  } else {
    bgStyle = 'background: var(--color-surface);';
  }

  const alignment = sectionStyle.textAlign || content.alignment || 'center';
  const textColorStyle = textColor ? `color: ${textColor};` : '';

  return `
<section style="padding: 120px 0; ${bgStyle} ${textColorStyle} text-align: ${alignment}; position: relative;">
  ${overlayHtml}
  <div class="container" style="max-width: 900px; position: relative; z-index: 1;">
    <h1 style="margin-bottom: 24px; ${textColor ? `color: ${textColor};` : ''}">${content.headline || ''}</h1>
    ${content.subheadline ? `<p style="font-size: 1.25rem; margin-bottom: 40px; opacity: 0.9; max-width: 700px; ${alignment === 'center' ? 'margin-left: auto; margin-right: auto;' : ''}">${content.subheadline}</p>` : ''}
    <div style="display: flex; gap: 16px; ${alignment === 'center' ? 'justify-content: center;' : ''}">
      ${content.ctaText ? `<a href="${content.ctaUrl || '#'}" class="btn">${content.ctaText}</a>` : ''}
      ${content.secondaryCtaText ? `<a href="${content.secondaryCtaUrl || '#'}" class="btn btn-secondary" ${textColor ? 'style="border-color: rgba(255,255,255,0.3); color: white;"' : ''}>${content.secondaryCtaText}</a>` : ''}
    </div>
  </div>
</section>`;
}

function renderFeatures(content: any, colors: any, sectionStyle: SectionStyleObject): string {
  const columns = content.columns || 3;
  const items = (content.items || []).map((item: any) => `
<div class="card">
  ${item.icon ? `<div style="width: 48px; height: 48px; background: var(--color-primary); opacity: 0.1; border-radius: 12px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center;"><span style="font-size: 24px;">&#9733;</span></div>` : ''}
  ${item.image ? `<img src="${item.image}" alt="${item.title}" style="width: 100%; height: 180px; object-fit: cover; border-radius: 8px; margin-bottom: 16px;">` : ''}
  <h3 style="margin-bottom: 12px; font-size: 1.25rem;">${item.title}</h3>
  <p class="text-muted">${item.description}</p>
</div>`).join('');

  const bgStyle = sectionStyle.background || '';
  const textColorStyle = sectionStyle.textColor ? `color: ${sectionStyle.textColor};` : '';

  return `
<section style="padding: ${sectionStyle.padding}; ${bgStyle} ${textColorStyle} position: relative;">
  ${sectionStyle.overlayHtml}
  <div class="container" style="position: relative; z-index: 1;">
    ${content.headline ? `<h2 class="text-center" style="margin-bottom: 16px;">${content.headline}</h2>` : ''}
    ${content.subheadline ? `<p class="text-center text-muted" style="margin-bottom: 48px; max-width: 600px; margin-left: auto; margin-right: auto;">${content.subheadline}</p>` : ''}
    <div class="grid grid-${columns}">
      ${items}
    </div>
  </div>
</section>`;
}

function renderAbout(content: any, colors: any, sectionStyle: SectionStyleObject): string {
  const imageFirst = content.imagePosition === 'left';
  const bgStyle = sectionStyle.background || '';
  const textColorStyle = sectionStyle.textColor ? `color: ${sectionStyle.textColor};` : '';

  return `
<section style="padding: ${sectionStyle.padding}; ${bgStyle} ${textColorStyle} position: relative;">
  ${sectionStyle.overlayHtml}
  <div class="container" style="position: relative; z-index: 1;">
    <div style="display: grid; grid-template-columns: ${content.image ? '1fr 1fr' : '1fr'}; gap: 64px; align-items: center;">
      ${imageFirst && content.image ? `<img src="${content.image}" alt="About" style="width: 100%; border-radius: 16px;">` : ''}
      <div>
        ${content.headline ? `<h2 style="margin-bottom: 16px;">${content.headline}</h2>` : ''}
        ${content.subheadline ? `<p style="font-size: 1.25rem; ${sectionStyle.textColor ? '' : 'color: var(--color-text-muted);'} margin-bottom: 24px;">${content.subheadline}</p>` : ''}
        ${content.content ? `<p style="line-height: 1.8;">${content.content}</p>` : ''}
      </div>
      ${!imageFirst && content.image ? `<img src="${content.image}" alt="About" style="width: 100%; border-radius: 16px;">` : ''}
    </div>
  </div>
</section>`;
}

function renderTestimonials(content: any, colors: any, sectionStyle: SectionStyleObject): string {
  const items = (content.items || []).map((item: any) => `
<div class="card" style="text-align: left;">
  ${item.rating ? `<div style="margin-bottom: 16px; color: #FBBF24;">${'★'.repeat(item.rating)}${'☆'.repeat(5 - item.rating)}</div>` : ''}
  <p style="font-size: 1.125rem; font-style: italic; margin-bottom: 24px; line-height: 1.7;">"${item.quote}"</p>
  <div style="display: flex; align-items: center; gap: 12px;">
    ${item.avatar ? `<img src="${item.avatar}" alt="${item.author}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">` : `<div style="width: 48px; height: 48px; border-radius: 50%; background: var(--color-primary); opacity: 0.1;"></div>`}
    <div>
      <div style="font-weight: 600;">${item.author}</div>
      <div class="text-muted" style="font-size: 0.875rem;">${item.role || ''}${item.role && item.company ? ' at ' : ''}${item.company || ''}</div>
    </div>
  </div>
</div>`).join('');

  const bgStyle = sectionStyle.background || 'background: var(--color-surface);';
  const textColorStyle = sectionStyle.textColor ? `color: ${sectionStyle.textColor};` : '';

  return `
<section style="padding: ${sectionStyle.padding}; ${bgStyle} ${textColorStyle} position: relative;">
  ${sectionStyle.overlayHtml}
  <div class="container" style="position: relative; z-index: 1;">
    ${content.headline ? `<h2 class="text-center" style="margin-bottom: 16px;">${content.headline}</h2>` : ''}
    ${content.subheadline ? `<p class="text-center text-muted" style="margin-bottom: 48px;">${content.subheadline}</p>` : ''}
    <div class="grid grid-3">
      ${items}
    </div>
  </div>
</section>`;
}

function renderLogos(content: any, colors: any, sectionStyle: SectionStyleObject): string {
  const items = (content.items || [])
    .filter((item: any) => item.imageUrl)
    .map((item: any) => `
<div style="display: flex; align-items: center; justify-content: center;">
  <img src="${item.imageUrl}" alt="${item.name}" style="max-height: 48px; ${content.grayscale ? 'filter: grayscale(100%); opacity: 0.6;' : ''} transition: all 0.2s;" onmouseover="this.style.filter='none'; this.style.opacity='1';" onmouseout="this.style.filter='${content.grayscale ? 'grayscale(100%)' : 'none'}'; this.style.opacity='${content.grayscale ? '0.6' : '1'}';">
</div>`).join('');

  const bgStyle = sectionStyle.background || 'background: var(--color-surface);';
  const textColorStyle = sectionStyle.textColor ? `color: ${sectionStyle.textColor};` : '';

  if (!items) {
    return `
<section style="padding: 48px 0; ${bgStyle} ${textColorStyle} position: relative;">
  ${sectionStyle.overlayHtml}
  <div class="container" style="position: relative; z-index: 1;">
    ${content.headline ? `<p class="text-center text-muted" style="margin-bottom: 32px; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.1em;">${content.headline}</p>` : ''}
    <p class="text-center text-muted">Add logo images to display partner logos</p>
  </div>
</section>`;
  }

  return `
<section style="padding: 48px 0; ${bgStyle} ${textColorStyle} position: relative;">
  ${sectionStyle.overlayHtml}
  <div class="container" style="position: relative; z-index: 1;">
    ${content.headline ? `<p class="text-center text-muted" style="margin-bottom: 32px; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.1em;">${content.headline}</p>` : ''}
    <div style="display: flex; gap: 48px; justify-content: center; align-items: center; flex-wrap: wrap;">
      ${items}
    </div>
  </div>
</section>`;
}

function renderStats(content: any, colors: any, sectionStyle: SectionStyleObject): string {
  const items = (content.items || []).map((item: any) => `
<div style="text-align: center;">
  <div style="font-size: 3rem; font-weight: 700; font-family: var(--font-heading); color: var(--color-primary);">
    ${item.prefix || ''}${item.value}${item.suffix || ''}
  </div>
  <div class="text-muted">${item.label}</div>
</div>`).join('');

  const bgStyle = sectionStyle.background || '';
  const textColorStyle = sectionStyle.textColor ? `color: ${sectionStyle.textColor};` : '';

  return `
<section style="padding: ${sectionStyle.padding}; ${bgStyle} ${textColorStyle} position: relative;">
  ${sectionStyle.overlayHtml}
  <div class="container" style="position: relative; z-index: 1;">
    ${content.headline ? `<h2 class="text-center" style="margin-bottom: 16px;">${content.headline}</h2>` : ''}
    ${content.subheadline ? `<p class="text-center text-muted" style="margin-bottom: 48px;">${content.subheadline}</p>` : ''}
    <div class="grid grid-4">
      ${items}
    </div>
  </div>
</section>`;
}

function renderPricing(content: any, colors: any, sectionStyle: SectionStyleObject): string {
  const tiers = (content.tiers || []).map((tier: any) => `
<div class="card" style="${tier.highlighted ? `border-color: var(--color-primary); position: relative;` : ''}">
  ${tier.highlighted ? `<div class="badge" style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%);">Most Popular</div>` : ''}
  <h3 style="margin-bottom: 8px;">${tier.name}</h3>
  ${tier.description ? `<p class="text-muted" style="margin-bottom: 16px; font-size: 0.875rem;">${tier.description}</p>` : ''}
  <div style="margin-bottom: 24px;">
    <span style="font-size: 3rem; font-weight: 700; font-family: var(--font-heading);">${tier.price}</span>
    ${tier.period ? `<span class="text-muted">${tier.period}</span>` : ''}
  </div>
  <ul style="list-style: none; margin-bottom: 24px;">
    ${(tier.features || []).map((f: string) => `<li style="padding: 8px 0; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; gap: 8px;"><span style="color: var(--color-success);">&#10003;</span> ${f}</li>`).join('')}
  </ul>
  ${tier.ctaText ? `<a href="${tier.ctaUrl || '#'}" class="btn" style="width: 100%; ${!tier.highlighted ? 'background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border);' : ''}">${tier.ctaText}</a>` : ''}
</div>`).join('');

  const bgStyle = sectionStyle.background || '';
  const textColorStyle = sectionStyle.textColor ? `color: ${sectionStyle.textColor};` : '';

  return `
<section style="padding: ${sectionStyle.padding}; ${bgStyle} ${textColorStyle} position: relative;" id="pricing">
  ${sectionStyle.overlayHtml}
  <div class="container" style="position: relative; z-index: 1;">
    ${content.headline ? `<h2 class="text-center" style="margin-bottom: 16px;">${content.headline}</h2>` : ''}
    ${content.subheadline ? `<p class="text-center text-muted" style="margin-bottom: 48px;">${content.subheadline}</p>` : ''}
    <div class="grid grid-3" style="align-items: start;">
      ${tiers}
    </div>
  </div>
</section>`;
}

function renderProducts(content: any, colors: any, sectionStyle: SectionStyleObject): string {
  const columns = content.columns || 3;
  const items = (content.items || []).map((item: any) => `
<div class="card" style="position: relative;">
  ${item.badge ? `<div class="badge" style="position: absolute; top: 16px; right: 16px;">${item.badge}</div>` : ''}
  ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 16px;">` : `<div style="width: 100%; height: 200px; background: var(--color-border); border-radius: 8px; margin-bottom: 16px;"></div>`}
  <h3 style="margin-bottom: 8px; font-size: 1.125rem;">${item.name}</h3>
  ${item.description ? `<p class="text-muted" style="margin-bottom: 16px; font-size: 0.875rem;">${item.description}</p>` : ''}
  <div style="display: flex; align-items: center; justify-content: space-between;">
    <span style="font-size: 1.25rem; font-weight: 700;">${item.price}</span>
    ${item.ctaText ? `<a href="${item.ctaUrl || '#'}" class="btn" style="padding: 8px 16px; font-size: 0.875rem;">${item.ctaText}</a>` : ''}
  </div>
</div>`).join('');

  const bgStyle = sectionStyle.background || '';
  const textColorStyle = sectionStyle.textColor ? `color: ${sectionStyle.textColor};` : '';

  return `
<section style="padding: ${sectionStyle.padding}; ${bgStyle} ${textColorStyle} position: relative;">
  ${sectionStyle.overlayHtml}
  <div class="container" style="position: relative; z-index: 1;">
    ${content.headline ? `<h2 class="text-center" style="margin-bottom: 16px;">${content.headline}</h2>` : ''}
    ${content.subheadline ? `<p class="text-center text-muted" style="margin-bottom: 48px;">${content.subheadline}</p>` : ''}
    <div class="grid grid-${columns}">
      ${items}
    </div>
  </div>
</section>`;
}

function renderCTA(content: any, colors: any, sectionStyle: SectionStyleObject): string {
  // CTA defaults to primary color background, white text
  const hasCustomBg = sectionStyle.background !== '';
  const bgStyle = hasCustomBg ? sectionStyle.background : 'background: var(--color-primary);';
  const textColor = sectionStyle.textColor || (hasCustomBg && sectionStyle.hasOverlay ? 'white' : (hasCustomBg ? '' : 'white'));
  const textColorStyle = textColor ? `color: ${textColor};` : '';

  return `
<section style="padding: ${sectionStyle.padding}; ${bgStyle} ${textColorStyle} text-align: center; position: relative;">
  ${sectionStyle.overlayHtml}
  <div class="container" style="max-width: 800px; position: relative; z-index: 1;">
    <h2 style="${textColor ? `color: ${textColor};` : ''} margin-bottom: 16px;">${content.headline || ''}</h2>
    ${content.subheadline ? `<p style="opacity: 0.9; margin-bottom: 32px; font-size: 1.125rem;">${content.subheadline}</p>` : ''}
    <div style="display: flex; gap: 16px; justify-content: center;">
      ${content.ctaText ? `<a href="${content.ctaUrl || '#'}" class="btn btn-white">${content.ctaText}</a>` : ''}
      ${content.secondaryCtaText ? `<a href="${content.secondaryCtaUrl || '#'}" class="btn" style="background: transparent; border: 2px solid rgba(255,255,255,0.3);">${content.secondaryCtaText}</a>` : ''}
    </div>
  </div>
</section>`;
}

function renderNewsletter(content: any, colors: any, sectionStyle: SectionStyleObject): string {
  const bgStyle = sectionStyle.background || 'background: var(--color-surface);';
  const textColorStyle = sectionStyle.textColor ? `color: ${sectionStyle.textColor};` : '';

  return `
<section style="padding: ${sectionStyle.padding}; ${bgStyle} ${textColorStyle} position: relative;">
  ${sectionStyle.overlayHtml}
  <div class="container" style="max-width: 600px; text-align: center; position: relative; z-index: 1;">
    ${content.headline ? `<h2 style="margin-bottom: 16px;">${content.headline}</h2>` : ''}
    ${content.subheadline ? `<p class="text-muted" style="margin-bottom: 32px;">${content.subheadline}</p>` : ''}
    <form style="display: flex; gap: 12px;" onsubmit="event.preventDefault(); alert('${content.successMessage || 'Thanks for subscribing!'}');">
      <input type="email" placeholder="${content.placeholder || 'Enter your email'}" required style="flex: 1;">
      <button type="submit" class="btn">${content.buttonText || 'Subscribe'}</button>
    </form>
  </div>
</section>`;
}

function renderContactForm(content: any, colors: any, sectionStyle: SectionStyleObject): string {
  const fields = (content.fields || []).map((field: any) => {
    const baseStyle = 'margin-bottom: 16px;';
    switch (field.type) {
      case 'textarea':
        return `<div style="${baseStyle}"><label style="display: block; margin-bottom: 8px; font-weight: 500;">${field.label}${field.required ? ' *' : ''}</label><textarea placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''} rows="4"></textarea></div>`;
      default:
        return `<div style="${baseStyle}"><label style="display: block; margin-bottom: 8px; font-weight: 500;">${field.label}${field.required ? ' *' : ''}</label><input type="${field.type}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}></div>`;
    }
  }).join('');

  const bgStyle = sectionStyle.background || '';
  const textColorStyle = sectionStyle.textColor ? `color: ${sectionStyle.textColor};` : '';

  return `
<section style="padding: ${sectionStyle.padding}; ${bgStyle} ${textColorStyle} position: relative;" id="contact">
  ${sectionStyle.overlayHtml}
  <div class="container" style="max-width: 600px; position: relative; z-index: 1;">
    ${content.headline ? `<h2 class="text-center" style="margin-bottom: 16px;">${content.headline}</h2>` : ''}
    ${content.subheadline ? `<p class="text-center text-muted" style="margin-bottom: 32px;">${content.subheadline}</p>` : ''}
    <form onsubmit="event.preventDefault(); alert('${content.successMessage || 'Message sent!'}');">
      ${fields}
      <button type="submit" class="btn" style="width: 100%;">${content.submitText || 'Submit'}</button>
    </form>
  </div>
</section>`;
}

function renderFAQ(content: any, colors: any, sectionStyle: SectionStyleObject): string {
  const items = (content.items || []).map((item: any, index: number) => `
<details style="border-bottom: 1px solid var(--color-border); padding: 20px 0;" ${index === 0 ? 'open' : ''}>
  <summary style="font-weight: 600; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center;">
    ${item.question}
    <span style="font-size: 1.5rem; transition: transform 0.2s;">+</span>
  </summary>
  <p class="text-muted" style="margin-top: 16px; line-height: 1.7;">${item.answer}</p>
</details>`).join('');

  const bgStyle = sectionStyle.background || '';
  const textColorStyle = sectionStyle.textColor ? `color: ${sectionStyle.textColor};` : '';

  return `
<section style="padding: ${sectionStyle.padding}; ${bgStyle} ${textColorStyle} position: relative;" id="faq">
  ${sectionStyle.overlayHtml}
  <div class="container container-sm" style="position: relative; z-index: 1;">
    ${content.headline ? `<h2 class="text-center" style="margin-bottom: 16px;">${content.headline}</h2>` : ''}
    ${content.subheadline ? `<p class="text-center text-muted" style="margin-bottom: 48px;">${content.subheadline}</p>` : ''}
    <div>
      ${items}
    </div>
  </div>
</section>`;
}

function renderGallery(content: any, colors: any, sectionStyle: SectionStyleObject): string {
  const columns = content.columns || 3;
  const items = (content.items || [])
    .filter((item: any) => item.imageUrl)
    .map((item: any) => `
<div style="position: relative; overflow: hidden; border-radius: 12px;">
  <img src="${item.imageUrl}" alt="${item.alt || item.caption || 'Gallery image'}" style="width: 100%; aspect-ratio: 1; object-fit: cover; transition: transform 0.3s;">
  ${item.caption ? `<div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 16px; background: linear-gradient(transparent, rgba(0,0,0,0.7)); color: white; font-size: 0.875rem;">${item.caption}</div>` : ''}
</div>`).join('');

  const bgStyle = sectionStyle.background || '';
  const textColorStyle = sectionStyle.textColor ? `color: ${sectionStyle.textColor};` : '';

  if (!items) {
    return `
<section style="padding: ${sectionStyle.padding}; ${bgStyle} ${textColorStyle} position: relative;">
  ${sectionStyle.overlayHtml}
  <div class="container" style="position: relative; z-index: 1;">
    ${content.headline ? `<h2 class="text-center" style="margin-bottom: 48px;">${content.headline}</h2>` : ''}
    <p class="text-center text-muted">Add images to display the gallery</p>
  </div>
</section>`;
  }

  return `
<section style="padding: ${sectionStyle.padding}; ${bgStyle} ${textColorStyle} position: relative;">
  ${sectionStyle.overlayHtml}
  <div class="container" style="position: relative; z-index: 1;">
    ${content.headline ? `<h2 class="text-center" style="margin-bottom: 48px;">${content.headline}</h2>` : ''}
    <div class="grid grid-${columns}">
      ${items}
    </div>
  </div>
</section>`;
}

function renderVideo(content: any, colors: any, sectionStyle: SectionStyleObject): string {
  let videoEmbed = '';

  if (content.embedCode) {
    videoEmbed = content.embedCode;
  } else if (content.videoUrl) {
    // Handle YouTube URLs
    const youtubeMatch = content.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    if (youtubeMatch) {
      videoEmbed = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${youtubeMatch[1]}${content.autoplay ? '?autoplay=1' : ''}" frameborder="0" allowfullscreen style="position: absolute; top: 0; left: 0;"></iframe>`;
    }
    // Handle Vimeo URLs
    const vimeoMatch = content.videoUrl.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      videoEmbed = `<iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}${content.autoplay ? '?autoplay=1' : ''}" width="100%" height="100%" frameborder="0" allowfullscreen style="position: absolute; top: 0; left: 0;"></iframe>`;
    }
  }

  const bgStyle = sectionStyle.background || '';
  const textColorStyle = sectionStyle.textColor ? `color: ${sectionStyle.textColor};` : '';

  return `
<section style="padding: ${sectionStyle.padding}; ${bgStyle} ${textColorStyle} position: relative;">
  ${sectionStyle.overlayHtml}
  <div class="container" style="max-width: 900px; position: relative; z-index: 1;">
    ${content.headline ? `<h2 class="text-center" style="margin-bottom: 16px;">${content.headline}</h2>` : ''}
    ${content.subheadline ? `<p class="text-center text-muted" style="margin-bottom: 32px;">${content.subheadline}</p>` : ''}
    <div style="position: relative; padding-bottom: 56.25%; height: 0; border-radius: 16px; overflow: hidden; background: var(--color-surface);">
      ${videoEmbed || `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;"><p class="text-muted">Add a video URL to display</p></div>`}
    </div>
  </div>
</section>`;
}

function renderFooter(content: any, colors: any): string {
  const columns = (content.columns || []).map((col: any) => `
<div>
  <h4 style="margin-bottom: 16px; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.1em;">${col.title}</h4>
  <ul style="list-style: none;">
    ${(col.links || []).map((link: any) => `<li style="margin-bottom: 8px;"><a href="${link.url}" style="color: var(--color-text-muted); text-decoration: none;">${link.label}</a></li>`).join('')}
  </ul>
</div>`).join('');

  const socialIcons: Record<string, string> = {
    twitter: '𝕏',
    linkedin: 'in',
    github: '⌘',
    facebook: 'f',
    instagram: '📷',
  };

  const socialLinks = (content.socialLinks || []).map((link: any) => `
<a href="${link.url}" style="display: inline-flex; width: 36px; height: 36px; border-radius: 50%; background: var(--color-surface); color: var(--color-text-muted); align-items: center; justify-content: center; text-decoration: none; font-weight: 600;">${socialIcons[link.platform] || '•'}</a>`).join('');

  return `
<footer style="padding: 64px 0 32px; background: var(--color-background); border-top: 1px solid var(--color-border);">
  <div class="container">
    <div style="display: grid; grid-template-columns: 2fr repeat(${(content.columns || []).length}, 1fr); gap: 48px; margin-bottom: 48px;">
      <div>
        <div style="font-size: 1.5rem; font-weight: 700; font-family: var(--font-heading); margin-bottom: 16px;">
          ${content.logo ? `<img src="${content.logo}" alt="${content.logoText || 'Logo'}" style="height: 40px;">` : content.logoText || 'Brand'}
        </div>
        ${socialLinks ? `<div style="display: flex; gap: 12px;">${socialLinks}</div>` : ''}
      </div>
      ${columns}
    </div>
    ${content.copyright ? `<div style="text-align: center; padding-top: 32px; border-top: 1px solid var(--color-border); color: var(--color-text-muted); font-size: 0.875rem;">${content.copyright}</div>` : ''}
  </div>
</footer>`;
}

function getGoogleAnalyticsScript(id: string): string {
  return `
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${id}');
</script>`;
}

function getFacebookPixelScript(id: string): string {
  return `
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '${id}');
  fbq('track', 'PageView');
</script>`;
}

// Helper to adjust brightness of a hex color
function adjustBrightness(hex: string, percent: number): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Adjust brightness
  r = Math.min(255, Math.max(0, r + (percent * 255 / 100)));
  g = Math.min(255, Math.max(0, g + (percent * 255 / 100)));
  b = Math.min(255, Math.max(0, b + (percent * 255 / 100)));

  // Convert back to hex
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
}
