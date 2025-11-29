import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface LanguageToolCredentials {
  apiKey?: string;
  username?: string;
  baseUrl?: string;
}

export interface LanguageToolSettings {
  defaultLanguage?: string;
  enabledCategories?: string;
  disabledRules?: string;
}

export interface GrammarCheckRequest {
  text: string;
  language?: string;
  enabledCategories?: string[];
  disabledCategories?: string[];
  enabledRules?: string[];
  disabledRules?: string[];
}

export interface GrammarIssue {
  message: string;
  shortMessage?: string;
  offset: number;
  length: number;
  replacements: string[];
  ruleId: string;
  ruleDescription: string;
  ruleCategory: {
    id: string;
    name: string;
  };
  type: 'grammar' | 'spelling' | 'punctuation' | 'style' | 'typographical';
  contextText: string;
  contextOffset: number;
}

export interface GrammarCheckResult {
  language: {
    code: string;
    name: string;
    detectedLanguage?: {
      code: string;
      name: string;
      confidence: number;
    };
  };
  issues: GrammarIssue[];
  correctedText?: string;
}

export interface GrammarCheckResponse {
  original: string;
  corrected: string;
  issues: GrammarIssue[];
  issueCount: number;
  language: string;
}

@Injectable()
export class LanguageToolService {
  private readonly logger = new Logger(LanguageToolService.name);
  private readonly defaultBaseUrl = 'https://api.languagetool.org/v2';

  /**
   * Create axios client for LanguageTool API
   */
  private getClient(credentials?: LanguageToolCredentials): AxiosInstance {
    const baseUrl = credentials?.baseUrl || this.defaultBaseUrl;

    return axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(credentials?.apiKey && { 'Authorization': `Bearer ${credentials.apiKey}` }),
      },
    });
  }

  /**
   * Check text for grammar, spelling, and style issues
   */
  async checkGrammar(
    text: string,
    credentials?: LanguageToolCredentials,
    settings?: LanguageToolSettings,
    options?: Partial<GrammarCheckRequest>,
  ): Promise<GrammarCheckResult> {
    const client = this.getClient(credentials);

    const params = new URLSearchParams();
    params.append('text', text);
    params.append('language', options?.language || settings?.defaultLanguage || 'en-US');

    // Add enabled categories
    if (options?.enabledCategories?.length) {
      params.append('enabledCategories', options.enabledCategories.join(','));
    } else if (settings?.enabledCategories) {
      params.append('enabledCategories', settings.enabledCategories);
    }

    // Add disabled rules
    if (options?.disabledRules?.length) {
      params.append('disabledRules', options.disabledRules.join(','));
    } else if (settings?.disabledRules) {
      params.append('disabledRules', settings.disabledRules);
    }

    // Add API credentials if premium
    if (credentials?.apiKey) {
      params.append('apiKey', credentials.apiKey);
    }
    if (credentials?.username) {
      params.append('username', credentials.username);
    }

    try {
      const response = await client.post('/check', params.toString());
      const data = response.data;

      const issues: GrammarIssue[] = data.matches.map((match: any) => ({
        message: match.message,
        shortMessage: match.shortMessage,
        offset: match.offset,
        length: match.length,
        replacements: match.replacements?.map((r: any) => r.value).slice(0, 5) || [],
        ruleId: match.rule?.id,
        ruleDescription: match.rule?.description,
        ruleCategory: {
          id: match.rule?.category?.id,
          name: match.rule?.category?.name,
        },
        type: this.categorizeIssue(match.rule?.category?.id),
        contextText: match.context?.text,
        contextOffset: match.context?.offset,
      }));

      return {
        language: {
          code: data.language?.code,
          name: data.language?.name,
          detectedLanguage: data.language?.detectedLanguage && {
            code: data.language.detectedLanguage.code,
            name: data.language.detectedLanguage.name,
            confidence: data.language.detectedLanguage.confidence,
          },
        },
        issues,
      };
    } catch (error: any) {
      this.logger.error(`LanguageTool API error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check and auto-correct text
   */
  async checkAndCorrect(
    text: string,
    credentials?: LanguageToolCredentials,
    settings?: LanguageToolSettings,
  ): Promise<GrammarCheckResponse> {
    const result = await this.checkGrammar(text, credentials, settings);

    // Apply corrections in reverse order to maintain offsets
    let correctedText = text;
    const sortedIssues = [...result.issues].sort((a, b) => b.offset - a.offset);

    for (const issue of sortedIssues) {
      if (issue.replacements.length > 0) {
        const before = correctedText.substring(0, issue.offset);
        const after = correctedText.substring(issue.offset + issue.length);
        correctedText = before + issue.replacements[0] + after;
      }
    }

    return {
      original: text,
      corrected: correctedText,
      issues: result.issues,
      issueCount: result.issues.length,
      language: result.language.code,
    };
  }

  /**
   * Check multiple text fields at once
   */
  async checkMultipleFields(
    fields: Record<string, string>,
    credentials?: LanguageToolCredentials,
    settings?: LanguageToolSettings,
  ): Promise<Record<string, GrammarCheckResponse>> {
    const results: Record<string, GrammarCheckResponse> = {};

    // Process fields in parallel
    const entries = Object.entries(fields);
    const checks = await Promise.all(
      entries.map(([key, text]) =>
        this.checkAndCorrect(text, credentials, settings)
          .then(result => ({ key, result }))
          .catch(error => ({ key, error }))
      )
    );

    for (const check of checks) {
      if ('error' in check) {
        this.logger.warn(`Failed to check field ${check.key}: ${(check as any).error}`);
        results[check.key] = {
          original: fields[check.key],
          corrected: fields[check.key],
          issues: [],
          issueCount: 0,
          language: settings?.defaultLanguage || 'en-US',
        };
      } else {
        results[check.key] = (check as any).result;
      }
    }

    return results;
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(
    credentials?: LanguageToolCredentials,
  ): Promise<{ code: string; name: string; longCode: string }[]> {
    const client = this.getClient(credentials);

    try {
      const response = await client.get('/languages');
      return response.data.map((lang: any) => ({
        code: lang.code,
        name: lang.name,
        longCode: lang.longCode,
      }));
    } catch (error: any) {
      this.logger.error(`Failed to get supported languages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Categorize issue type based on rule category
   */
  private categorizeIssue(categoryId?: string): GrammarIssue['type'] {
    if (!categoryId) return 'grammar';

    const categoryMap: Record<string, GrammarIssue['type']> = {
      GRAMMAR: 'grammar',
      TYPOS: 'spelling',
      PUNCTUATION: 'punctuation',
      STYLE: 'style',
      TYPOGRAPHY: 'typographical',
      CASING: 'typographical',
      REDUNDANCY: 'style',
      CONFUSED_WORDS: 'grammar',
      MISC: 'grammar',
    };

    return categoryMap[categoryId] || 'grammar';
  }

  /**
   * Test connection to LanguageTool
   */
  async testConnection(credentials?: LanguageToolCredentials): Promise<{
    success: boolean;
    message: string;
    latencyMs?: number;
    isPremium?: boolean;
  }> {
    const startTime = Date.now();

    try {
      const result = await this.checkGrammar('This is an test.', credentials);
      const hasIssue = result.issues.some(i => i.ruleId === 'EN_A_VS_AN');

      return {
        success: true,
        message: hasIssue
          ? 'Successfully connected to LanguageTool API (grammar check working)'
          : 'Connected but grammar detection may not be working properly',
        latencyMs: Date.now() - startTime,
        isPremium: !!credentials?.apiKey,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }
}
