import { Injectable, Logger } from '@nestjs/common';
import {
  FunnelPromptContext,
  MethodologyDefinition,
  ProductContext,
  GeneratedFunnelContent,
} from '../types/funnel-generator.types';

/**
 * Service responsible for building AI prompts based on
 * methodology and user inputs.
 */
@Injectable()
export class PromptBuilderService {
  private readonly logger = new Logger(PromptBuilderService.name);

  /**
   * Build the complete system prompt for funnel generation
   */
  buildSystemPrompt(methodology: MethodologyDefinition): string {
    return methodology.systemPrompt;
  }

  /**
   * Build prompt for landing page generation
   */
  buildLandingPagePrompt(context: FunnelPromptContext): string {
    const { products, methodology, discoveryAnswers, companyContext } = context;
    const primaryProduct = products.find(p => p.isPrimary) || products[0];

    return `Generate landing page content for a sales funnel using the ${methodology.name} methodology.

PRODUCT INFORMATION:
Primary Product: ${primaryProduct.name}
${primaryProduct.description ? `Description: ${primaryProduct.description}` : ''}
Price: ${primaryProduct.currency} ${primaryProduct.price}
${primaryProduct.compareAtPrice ? `Compare At: ${primaryProduct.currency} ${primaryProduct.compareAtPrice}` : ''}

${products.length > 1 ? `Additional Products: ${products.filter(p => !p.isPrimary).map(p => p.name).join(', ')}` : ''}

${companyContext ? `
COMPANY CONTEXT:
Company: ${companyContext.name}
${companyContext.industry ? `Industry: ${companyContext.industry}` : ''}
${companyContext.brandVoice ? `Brand Voice: ${companyContext.brandVoice}` : ''}
` : ''}

DISCOVERY ANSWERS:
${Object.entries(discoveryAnswers).map(([key, value]) => {
  const question = methodology.discoveryQuestions.find(q => q.id === key);
  return `${question?.question || key}: ${value}`;
}).join('\n')}

METHODOLOGY TONE: ${methodology.toneGuidelines}

REQUIRED OUTPUT FORMAT (JSON only, no markdown):
{
  "hero": {
    "headline": "Main headline (6-12 words, compelling)",
    "subheadline": "Supporting text (1-2 sentences)",
    "ctaText": "Button text (2-4 words, action-oriented)",
    "backgroundType": "image|video|gradient",
    "suggestedImageKeywords": ["keyword1", "keyword2", "keyword3"]
  },
  "benefits": {
    "sectionTitle": "Section title",
    "benefits": [
      {
        "title": "Benefit title",
        "description": "Benefit description (1-2 sentences)",
        "iconSuggestion": "icon name suggestion"
      }
    ]
  },
  "socialProof": {
    "sectionTitle": "Section title",
    "testimonialPrompts": ["Prompt for testimonial 1", "Prompt for testimonial 2"],
    "statsToHighlight": ["Stat 1 to highlight", "Stat 2 to highlight"]
  },
  "cta": {
    "headline": "CTA section headline",
    "subheadline": "Optional supporting text",
    "buttonText": "Button text",
    "urgencyText": "Optional urgency message"
  },
  "faqItems": [
    {
      "question": "FAQ question",
      "answer": "FAQ answer"
    }
  ]
}

Generate 3-4 benefits and 3-5 FAQ items. Ensure all copy follows the ${methodology.name} methodology principles.`;
  }

  /**
   * Build prompt for product content generation
   */
  buildProductPrompt(context: FunnelPromptContext, product: ProductContext): string {
    const { methodology, discoveryAnswers } = context;

    return `Generate product content for ${methodology.name} methodology.

PRODUCT: ${product.name}
${product.description ? `Description: ${product.description.substring(0, 200)}` : ''}
Price: ${product.currency} ${product.price}

TONE: ${methodology.toneGuidelines}

RESPOND WITH VALID JSON ONLY. Keep descriptions concise (max 150 words).

{
  "productId": "${product.id}",
  "enhancedDescription": "1-2 paragraph description (max 150 words)",
  "bulletPoints": ["Benefit 1", "Benefit 2", "Benefit 3", "Benefit 4"],
  "socialProofLine": "One credibility line",
  "valueProposition": "One sentence value prop"
}`;
  }

  /**
   * Build prompt for email sequence generation
   */
  buildEmailSequencePrompt(context: FunnelPromptContext): string {
    const { products, methodology, discoveryAnswers, companyContext } = context;
    const primaryProduct = products.find(p => p.isPrimary) || products[0];

    return `Generate an email sequence for a sales funnel using the ${methodology.name} methodology.

PRODUCT: ${primaryProduct.name}
PRICE: ${primaryProduct.currency} ${primaryProduct.price}
${companyContext ? `COMPANY: ${companyContext.name}` : ''}

KEY METHODOLOGY ANSWERS:
${Object.entries(discoveryAnswers).map(([key, value]) => {
  const question = methodology.discoveryQuestions.find(q => q.id === key);
  return `${question?.question || key}: ${value}`;
}).join('\n')}

TONE: ${methodology.toneGuidelines}

Generate 5 emails in this sequence:
1. Welcome (immediately after signup)
2. Value (24 hours later)
3. Social Proof (48 hours later)
4. Urgency (72 hours later)
5. Final (96 hours later)

REQUIRED OUTPUT FORMAT (JSON only):
{
  "emails": [
    {
      "type": "welcome|value|social_proof|urgency|final",
      "subject": "Email subject line (max 50 chars)",
      "previewText": "Preview text (max 90 chars)",
      "body": "Email body (2-4 paragraphs, use \\n for line breaks)",
      "ctaText": "CTA button text",
      "sendDelayHours": 0
    }
  ]
}

Make each email follow the ${methodology.name} principles. Each email should build on the previous one.`;
  }

  /**
   * Build prompt for lead capture content
   */
  buildLeadCapturePrompt(context: FunnelPromptContext): string {
    const { products, methodology, discoveryAnswers } = context;
    const primaryProduct = products.find(p => p.isPrimary) || products[0];

    return `Generate lead capture form content using the ${methodology.name} methodology.

PRODUCT: ${primaryProduct.name}
TARGET TRANSFORMATION: ${discoveryAnswers.transformation || discoveryAnswers.after_state || 'Not specified'}

METHODOLOGY TONE: ${methodology.toneGuidelines}

REQUIRED OUTPUT FORMAT (JSON only):
{
  "headline": "Lead capture headline (compelling)",
  "description": "1-2 sentences describing what they'll get",
  "leadMagnetTitle": "Optional lead magnet title if offering one",
  "formFields": [
    {
      "name": "email",
      "label": "Email field label",
      "type": "email",
      "required": true
    },
    {
      "name": "firstName",
      "label": "First name field label",
      "type": "text",
      "required": true
    }
  ],
  "buttonText": "Submit button text (action-oriented)",
  "privacyText": "Privacy reassurance text"
}

Keep form fields minimal (2-3 max). Button text should be action-oriented, not "Submit".`;
  }

  /**
   * Build prompt for checkout content
   */
  buildCheckoutPrompt(context: FunnelPromptContext): string {
    const { products, methodology, discoveryAnswers } = context;
    const primaryProduct = products.find(p => p.isPrimary) || products[0];

    return `Generate checkout page trust and conversion content using the ${methodology.name} methodology.

PRODUCT: ${primaryProduct.name}
PRICE: ${primaryProduct.currency} ${primaryProduct.price}
MAIN OBJECTION: ${discoveryAnswers.main_objection || discoveryAnswers.objection || 'Price concerns'}

METHODOLOGY TONE: ${methodology.toneGuidelines}

REQUIRED OUTPUT FORMAT (JSON only):
{
  "trustBadgeTexts": ["Trust badge text 1", "Trust badge text 2", "Trust badge text 3"],
  "guaranteeText": "Money-back guarantee or satisfaction promise (1-2 sentences)",
  "urgencyText": "Optional urgency message for checkout",
  "orderSummaryTitle": "Order summary section title",
  "orderConfirmationHeadline": "Headline for order confirmation"
}

Trust badges should address common concerns. Guarantee should feel genuine, not gimmicky.`;
  }

  /**
   * Build prompt for success page content
   */
  buildSuccessPagePrompt(context: FunnelPromptContext): string {
    const { products, methodology, discoveryAnswers, companyContext } = context;
    const primaryProduct = products.find(p => p.isPrimary) || products[0];

    return `Generate success/thank-you page content using the ${methodology.name} methodology.

PRODUCT: ${primaryProduct.name}
TRANSFORMATION: ${discoveryAnswers.transformation || discoveryAnswers.after_state || 'Successful purchase'}
${companyContext ? `COMPANY: ${companyContext.name}` : ''}

METHODOLOGY TONE: ${methodology.toneGuidelines}

REQUIRED OUTPUT FORMAT (JSON only):
{
  "headline": "Thank you headline (celebratory)",
  "message": "Thank you message (2-3 sentences, reinforce good decision)",
  "nextSteps": ["Next step 1", "Next step 2", "Next step 3"],
  "socialShareText": "Pre-filled social share text",
  "upsellTeaser": "Optional teaser for related product/upgrade"
}

The success page should reinforce the purchase decision and get customers excited about what's coming.`;
  }

  /**
   * Parse AI response and extract JSON
   */
  parseAIResponse<T>(response: string): T {
    try {
      // Remove markdown code blocks if present
      let cleaned = response.trim();
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      // Try to extract JSON object from the response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      // Attempt to fix common JSON issues
      cleaned = this.attemptJsonRepair(cleaned);

      return JSON.parse(cleaned) as T;
    } catch (error) {
      this.logger.error(`Failed to parse AI response: ${error}`);
      this.logger.debug(`Raw response (first 1000 chars): ${response.substring(0, 1000)}`);
      this.logger.debug(`Raw response (last 500 chars): ${response.substring(Math.max(0, response.length - 500))}`);
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  /**
   * Attempt to repair common JSON issues from AI responses
   */
  private attemptJsonRepair(json: string): string {
    let repaired = json;

    // Remove trailing commas before closing braces/brackets
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

    // If JSON appears truncated (no closing brace), try to close it
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;

    if (openBraces > closeBraces) {
      this.logger.warn(`JSON appears truncated (${openBraces} open braces, ${closeBraces} close braces). Attempting repair.`);

      // Find the last complete property and truncate there
      const lastCompleteMatch = repaired.match(/^([\s\S]*"[^"]+"\s*:\s*(?:"[^"]*"|[\d.]+|true|false|null|\[[^\]]*\]|\{[^}]*\}))\s*,?\s*"[^"]*$/);
      if (lastCompleteMatch) {
        repaired = lastCompleteMatch[1];
      }

      // Close any unclosed strings
      const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        repaired += '"';
      }

      // Add missing closing braces
      for (let i = closeBraces; i < openBraces; i++) {
        repaired += '}';
      }
    }

    return repaired;
  }
}
