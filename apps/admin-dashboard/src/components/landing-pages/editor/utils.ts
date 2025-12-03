import { SectionType } from '@/lib/api/landing-pages';
import { generateId } from './types';

export function getDefaultContent(type: SectionType): Record<string, any> {
  switch (type) {
    case 'HEADER':
      return {
        logoText: 'Your Brand',
        menuItems: [
          { label: 'Features', url: '#features' },
          { label: 'Pricing', url: '#pricing' },
          { label: 'About', url: '#about' },
        ],
        ctaText: 'Get Started',
        ctaUrl: '#signup',
        sticky: true,
      };

    // Hero variants
    case 'HERO_CENTERED':
      return {
        headline: 'Welcome to Our Site',
        subheadline: 'The best solution for your needs. Start today and see the difference.',
        ctaText: 'Get Started',
        ctaUrl: '#signup',
        secondaryCtaText: 'Learn More',
        secondaryCtaUrl: '#features',
        alignment: 'center',
      };

    case 'HERO_SPLIT':
      return {
        headline: 'Transform Your Business',
        subheadline: 'Powerful tools to help you grow faster and smarter.',
        ctaText: 'Get Started',
        ctaUrl: '#signup',
        secondaryCtaText: 'Learn More',
        secondaryCtaUrl: '#features',
        alignment: 'left',
        imagePosition: 'right',
      };

    case 'HERO_VIDEO':
      return {
        headline: 'See the Difference',
        subheadline: 'Watch how we can transform your workflow.',
        ctaText: 'Start Free Trial',
        ctaUrl: '#signup',
        alignment: 'center',
        videoUrl: '',
      };

    case 'HERO_CAROUSEL':
      return {
        slides: [
          { headline: 'Slide 1', subheadline: 'First slide content', ctaText: 'Learn More', ctaUrl: '#' },
          { headline: 'Slide 2', subheadline: 'Second slide content', ctaText: 'Get Started', ctaUrl: '#' },
        ],
        autoplay: true,
        interval: 5000,
      };

    // Features variants
    case 'FEATURES_GRID':
      return {
        headline: 'Why Choose Us',
        subheadline: 'Everything you need to succeed',
        columns: 3,
        items: [
          { id: generateId(), icon: 'zap', title: 'Lightning Fast', description: 'Built for speed and performance from the ground up.' },
          { id: generateId(), icon: 'shield', title: 'Secure by Design', description: 'Enterprise-grade security for your peace of mind.' },
          { id: generateId(), icon: 'users', title: '24/7 Support', description: 'Our team is always here to help you succeed.' },
        ],
      };

    case 'FEATURES_LIST':
      return {
        headline: 'Key Features',
        subheadline: 'What makes us different',
        items: [
          { id: generateId(), title: 'Feature One', description: 'Detailed description of the first feature.' },
          { id: generateId(), title: 'Feature Two', description: 'Detailed description of the second feature.' },
          { id: generateId(), title: 'Feature Three', description: 'Detailed description of the third feature.' },
        ],
      };

    case 'FEATURES_ICONS':
      return {
        headline: 'Our Capabilities',
        subheadline: 'Powerful features at your fingertips',
        columns: 4,
        items: [
          { id: generateId(), icon: 'zap', title: 'Fast', description: 'Lightning quick performance.' },
          { id: generateId(), icon: 'shield', title: 'Secure', description: 'Bank-level security.' },
          { id: generateId(), icon: 'globe', title: 'Global', description: 'Worldwide availability.' },
          { id: generateId(), icon: 'heart', title: 'Reliable', description: '99.9% uptime.' },
        ],
      };

    // About variants
    case 'ABOUT_STORY':
      return {
        headline: 'About Us',
        subheadline: 'Our Story',
        content: 'We are a team of passionate individuals dedicated to helping businesses grow. With years of experience and a commitment to excellence, we deliver solutions that make a difference.',
        imagePosition: 'right',
      };

    case 'ABOUT_TEAM':
      return {
        headline: 'Meet Our Team',
        subheadline: 'The people behind the product',
        members: [
          { id: generateId(), name: 'John Doe', role: 'CEO', bio: 'Visionary leader with 15+ years of experience.' },
          { id: generateId(), name: 'Jane Smith', role: 'CTO', bio: 'Tech expert driving innovation.' },
          { id: generateId(), name: 'Mike Johnson', role: 'Designer', bio: 'Creating beautiful experiences.' },
        ],
      };

    case 'ABOUT_TIMELINE':
      return {
        headline: 'Our Journey',
        subheadline: 'Key milestones in our history',
        events: [
          { id: generateId(), year: '2020', title: 'Founded', description: 'Started with a vision to transform the industry.' },
          { id: generateId(), year: '2021', title: 'First Product', description: 'Launched our flagship solution.' },
          { id: generateId(), year: '2023', title: '10K Customers', description: 'Reached a major milestone.' },
        ],
      };

    // Testimonials variants
    case 'TESTIMONIALS_CARDS':
      return {
        headline: 'What Our Customers Say',
        subheadline: 'Join thousands of satisfied customers',
        items: [
          { id: generateId(), quote: 'This product has completely transformed how we work. Highly recommended!', author: 'Sarah Johnson', role: 'CEO', company: 'TechCorp', rating: 5 },
          { id: generateId(), quote: 'The best investment we have made for our business. Outstanding support!', author: 'Mike Chen', role: 'Founder', company: 'StartupXYZ', rating: 5 },
          { id: generateId(), quote: 'Incredible value for money. The features are exactly what we needed.', author: 'Emily Davis', role: 'Marketing Director', company: 'GrowthCo', rating: 5 },
        ],
      };

    case 'TESTIMONIALS_CAROUSEL':
      return {
        headline: 'Customer Stories',
        subheadline: 'Hear from our community',
        items: [
          { id: generateId(), quote: 'Amazing experience from start to finish!', author: 'Alex Turner', role: 'Product Manager', company: 'InnovateCo', rating: 5 },
          { id: generateId(), quote: 'Changed the way we do business.', author: 'Lisa Wang', role: 'VP Operations', company: 'ScaleFast', rating: 5 },
        ],
        autoplay: true,
      };

    case 'TESTIMONIALS_WALL':
      return {
        headline: 'Wall of Love',
        subheadline: 'What people are saying',
        items: [
          { id: generateId(), quote: 'Simply the best!', author: 'User 1' },
          { id: generateId(), quote: 'Game changer for our team.', author: 'User 2' },
          { id: generateId(), quote: 'Exceeded all expectations.', author: 'User 3' },
          { id: generateId(), quote: 'Highly recommended!', author: 'User 4' },
        ],
      };

    // Social proof
    case 'LOGOS_STRIP':
      return {
        headline: 'Trusted by Industry Leaders',
        grayscale: true,
        items: [
          { id: generateId(), name: 'Company 1', imageUrl: '' },
          { id: generateId(), name: 'Company 2', imageUrl: '' },
          { id: generateId(), name: 'Company 3', imageUrl: '' },
          { id: generateId(), name: 'Company 4', imageUrl: '' },
          { id: generateId(), name: 'Company 5', imageUrl: '' },
        ],
      };

    case 'STATS_COUNTER':
      return {
        headline: 'Our Impact',
        subheadline: 'Numbers that speak for themselves',
        items: [
          { id: generateId(), value: '10K', label: 'Happy Customers', suffix: '+' },
          { id: generateId(), value: '99.9', label: 'Uptime', suffix: '%' },
          { id: generateId(), value: '24', label: 'Support', suffix: '/7' },
          { id: generateId(), value: '50', label: 'Countries', suffix: '+' },
        ],
      };

    // Pricing variants
    case 'PRICING_TABLE':
      return {
        headline: 'Simple, Transparent Pricing',
        subheadline: 'Choose the plan that works for you',
        tiers: [
          {
            id: generateId(),
            name: 'Starter',
            price: '$9',
            period: '/month',
            description: 'Perfect for individuals',
            features: ['Up to 5 projects', 'Basic analytics', 'Email support'],
            ctaText: 'Get Started',
            ctaUrl: '#signup',
          },
          {
            id: generateId(),
            name: 'Professional',
            price: '$29',
            period: '/month',
            description: 'For growing teams',
            features: ['Unlimited projects', 'Advanced analytics', 'Priority support', 'API access'],
            ctaText: 'Get Started',
            ctaUrl: '#signup',
            highlighted: true,
          },
          {
            id: generateId(),
            name: 'Enterprise',
            price: '$99',
            period: '/month',
            description: 'For large organizations',
            features: ['Everything in Pro', 'Custom integrations', 'Dedicated account manager', 'SLA guarantee'],
            ctaText: 'Contact Sales',
            ctaUrl: '#contact',
          },
        ],
      };

    case 'PRICING_COMPARISON':
      return {
        headline: 'Compare Plans',
        subheadline: 'Find the right fit for your needs',
        tiers: [
          { id: generateId(), name: 'Basic', price: '$19', period: '/month' },
          { id: generateId(), name: 'Pro', price: '$49', period: '/month', highlighted: true },
          { id: generateId(), name: 'Enterprise', price: 'Custom' },
        ],
        features: [
          { name: 'Users', basic: '1', pro: '10', enterprise: 'Unlimited' },
          { name: 'Storage', basic: '5 GB', pro: '50 GB', enterprise: 'Unlimited' },
          { name: 'Support', basic: 'Email', pro: 'Priority', enterprise: 'Dedicated' },
        ],
      };

    // Products variants
    case 'PRODUCTS_GRID':
      return {
        headline: 'Featured Products',
        subheadline: 'Check out our best sellers',
        columns: 3,
        items: [
          { id: generateId(), name: 'Product 1', description: 'A great product for your needs', price: '$49.99', ctaText: 'Buy Now', ctaUrl: '#' },
          { id: generateId(), name: 'Product 2', description: 'Another amazing option', price: '$79.99', ctaText: 'Buy Now', ctaUrl: '#', badge: 'Popular' },
          { id: generateId(), name: 'Product 3', description: 'Premium quality guaranteed', price: '$99.99', ctaText: 'Buy Now', ctaUrl: '#' },
        ],
      };

    case 'PRODUCTS_CAROUSEL':
      return {
        headline: 'Our Products',
        subheadline: 'Browse our collection',
        items: [
          { id: generateId(), name: 'Product A', description: 'Quality product', price: '$29.99', ctaText: 'View', ctaUrl: '#' },
          { id: generateId(), name: 'Product B', description: 'Premium item', price: '$59.99', ctaText: 'View', ctaUrl: '#' },
        ],
        autoplay: true,
      };

    // CTA variants
    case 'CTA_BANNER':
      return {
        headline: 'Ready to Get Started?',
        subheadline: 'Join thousands of satisfied customers today',
        ctaText: 'Start Free Trial',
        ctaUrl: '#signup',
        secondaryCtaText: 'Learn More',
        secondaryCtaUrl: '#features',
      };

    case 'CTA_SPLIT':
      return {
        headline: 'Take the Next Step',
        subheadline: 'Transform your business today',
        ctaText: 'Get Started',
        ctaUrl: '#signup',
        imagePosition: 'right',
      };

    // Engagement
    case 'NEWSLETTER':
      return {
        headline: 'Stay Updated',
        subheadline: 'Get the latest news and updates delivered to your inbox',
        placeholder: 'Enter your email',
        buttonText: 'Subscribe',
        successMessage: 'Thanks for subscribing!',
      };

    case 'CONTACT_FORM':
      return {
        headline: 'Get in Touch',
        subheadline: 'We would love to hear from you',
        fields: [
          { id: generateId(), type: 'text', label: 'Name', placeholder: 'Your name', required: true },
          { id: generateId(), type: 'email', label: 'Email', placeholder: 'your@email.com', required: true },
          { id: generateId(), type: 'textarea', label: 'Message', placeholder: 'How can we help?', required: true },
        ],
        submitText: 'Send Message',
        successMessage: 'Message sent! We will be in touch soon.',
      };

    // FAQ variants
    case 'FAQ_ACCORDION':
      return {
        headline: 'Frequently Asked Questions',
        subheadline: 'Find answers to common questions',
        items: [
          { id: generateId(), question: 'What is this product?', answer: 'This is a comprehensive solution designed to help businesses grow and succeed. It includes all the tools you need in one platform.' },
          { id: generateId(), question: 'How does pricing work?', answer: 'We offer simple, transparent pricing with no hidden fees. Choose a plan that fits your needs and scale as you grow.' },
          { id: generateId(), question: 'Is there a free trial?', answer: 'Yes! We offer a 14-day free trial with full access to all features. No credit card required.' },
          { id: generateId(), question: 'What kind of support do you offer?', answer: 'We provide 24/7 email support for all plans, with priority phone support for Professional and Enterprise customers.' },
        ],
      };

    case 'FAQ_GRID':
      return {
        headline: 'Common Questions',
        subheadline: 'Quick answers to frequently asked questions',
        columns: 2,
        items: [
          { id: generateId(), question: 'How do I get started?', answer: 'Sign up for a free account and follow our quick start guide.' },
          { id: generateId(), question: 'Can I cancel anytime?', answer: 'Yes, you can cancel your subscription at any time with no penalties.' },
          { id: generateId(), question: 'Is my data secure?', answer: 'Absolutely. We use bank-level encryption to protect your data.' },
          { id: generateId(), question: 'Do you offer refunds?', answer: 'Yes, we offer a 30-day money-back guarantee.' },
        ],
      };

    // Media
    case 'GALLERY_GRID':
      return {
        headline: 'Gallery',
        columns: 3,
        items: [
          { id: generateId(), imageUrl: '', caption: 'Image 1', alt: 'Gallery image 1' },
          { id: generateId(), imageUrl: '', caption: 'Image 2', alt: 'Gallery image 2' },
          { id: generateId(), imageUrl: '', caption: 'Image 3', alt: 'Gallery image 3' },
        ],
      };

    case 'GALLERY_MASONRY':
      return {
        headline: 'Photo Gallery',
        columns: 3,
        items: [
          { id: generateId(), imageUrl: '', caption: 'Photo 1', alt: 'Gallery photo 1' },
          { id: generateId(), imageUrl: '', caption: 'Photo 2', alt: 'Gallery photo 2' },
          { id: generateId(), imageUrl: '', caption: 'Photo 3', alt: 'Gallery photo 3' },
          { id: generateId(), imageUrl: '', caption: 'Photo 4', alt: 'Gallery photo 4' },
        ],
      };

    case 'VIDEO_EMBED':
      return {
        headline: 'See It in Action',
        subheadline: 'Watch how our product works',
        autoplay: false,
      };

    // Layout
    case 'SPACER':
      return { height: 80 };

    case 'DIVIDER':
      return { style: 'solid', thickness: 1 };

    case 'FOOTER':
      return {
        logoText: 'Your Brand',
        columns: [
          {
            title: 'Product',
            links: [
              { label: 'Features', url: '#features' },
              { label: 'Pricing', url: '#pricing' },
              { label: 'FAQ', url: '#faq' },
            ],
          },
          {
            title: 'Company',
            links: [
              { label: 'About', url: '#about' },
              { label: 'Blog', url: '#blog' },
              { label: 'Careers', url: '#careers' },
            ],
          },
          {
            title: 'Legal',
            links: [
              { label: 'Privacy', url: '/privacy' },
              { label: 'Terms', url: '/terms' },
            ],
          },
        ],
        socialLinks: [
          { platform: 'twitter', url: '#' },
          { platform: 'linkedin', url: '#' },
          { platform: 'github', url: '#' },
        ],
        copyright: '2024 Your Brand. All rights reserved.',
      };

    case 'HTML_BLOCK':
      return {
        html: '<div style="padding: 40px; text-align: center;"><p>Custom HTML content here</p></div>',
      };

    default:
      return {};
  }
}

export function getSectionIcon(type: SectionType): string {
  // Map all variants to their base icons
  if (type.startsWith('HERO')) return 'layout';
  if (type.startsWith('FEATURES')) return 'star';
  if (type.startsWith('ABOUT')) return 'users';
  if (type.startsWith('TESTIMONIALS')) return 'message-square';
  if (type.startsWith('LOGOS')) return 'image';
  if (type.startsWith('STATS')) return 'zap';
  if (type.startsWith('PRICING')) return 'dollar-sign';
  if (type.startsWith('PRODUCTS')) return 'shopping-bag';
  if (type.startsWith('CTA')) return 'rocket';
  if (type.startsWith('FAQ')) return 'help-circle';
  if (type.startsWith('GALLERY')) return 'image';
  if (type.startsWith('VIDEO')) return 'film';

  const icons: Record<string, string> = {
    HEADER: 'layout',
    FOOTER: 'layout',
    NEWSLETTER: 'mail',
    CONTACT_FORM: 'phone',
    SPACER: 'minus',
    DIVIDER: 'rows',
    HTML_BLOCK: 'code',
  };
  return icons[type] || 'layout';
}

export function getSectionLabel(type: SectionType): string {
  const labels: Record<string, string> = {
    // Navigation
    HEADER: 'Header',
    FOOTER: 'Footer',
    // Hero variants
    HERO_CENTERED: 'Hero (Centered)',
    HERO_SPLIT: 'Hero (Split)',
    HERO_VIDEO: 'Hero (Video)',
    HERO_CAROUSEL: 'Hero (Carousel)',
    // Features variants
    FEATURES_GRID: 'Features (Grid)',
    FEATURES_LIST: 'Features (List)',
    FEATURES_ICONS: 'Features (Icons)',
    // About variants
    ABOUT_STORY: 'About (Story)',
    ABOUT_TEAM: 'About (Team)',
    ABOUT_TIMELINE: 'About (Timeline)',
    // Testimonials variants
    TESTIMONIALS_CARDS: 'Testimonials (Cards)',
    TESTIMONIALS_CAROUSEL: 'Testimonials (Carousel)',
    TESTIMONIALS_WALL: 'Testimonials (Wall)',
    // Social proof
    LOGOS_STRIP: 'Logo Strip',
    STATS_COUNTER: 'Stats Counter',
    // Pricing variants
    PRICING_TABLE: 'Pricing Table',
    PRICING_COMPARISON: 'Pricing Comparison',
    // Products variants
    PRODUCTS_GRID: 'Products (Grid)',
    PRODUCTS_CAROUSEL: 'Products (Carousel)',
    // CTA variants
    CTA_BANNER: 'CTA Banner',
    CTA_SPLIT: 'CTA Split',
    // Engagement
    NEWSLETTER: 'Newsletter',
    CONTACT_FORM: 'Contact Form',
    // FAQ variants
    FAQ_ACCORDION: 'FAQ (Accordion)',
    FAQ_GRID: 'FAQ (Grid)',
    // Media
    GALLERY_GRID: 'Gallery (Grid)',
    GALLERY_MASONRY: 'Gallery (Masonry)',
    VIDEO_EMBED: 'Video Embed',
    // Layout
    SPACER: 'Spacer',
    DIVIDER: 'Divider',
    HTML_BLOCK: 'HTML Block',
  };
  return labels[type] || type.replace(/_/g, ' ');
}
