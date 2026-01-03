/**
 * Stock Image Service
 * Provides free stock images from Unsplash and Pexels for landing pages.
 * Used as fallback for Free tier clients without Cloudinary integration.
 */

import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface StockImageResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  alt: string;
  photographer: string;
  photographerUrl: string;
  source: 'unsplash' | 'pexels';
  color?: string;
}

export interface StockImageSearchOptions {
  query: string;
  orientation?: 'landscape' | 'portrait' | 'squarish';
  color?: string;
  perPage?: number;
  page?: number;
}

export interface UnsplashCredentials {
  accessKey: string;
  secretKey?: string;
}

export interface PexelsCredentials {
  apiKey: string;
}

// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

@Injectable()
export class StockImageService {
  private readonly logger = new Logger(StockImageService.name);
  private readonly unsplashBaseUrl = 'https://api.unsplash.com';
  private readonly pexelsBaseUrl = 'https://api.pexels.com/v1';

  // Curated fallback images for common categories (no API needed)
  private readonly fallbackImages: Record<string, StockImageResult[]> = {
    'winter-sale': [
      {
        id: 'winter-1',
        url: 'https://images.unsplash.com/photo-1517299321609-52687d1bc55a?w=1920&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1517299321609-52687d1bc55a?w=400&q=80',
        width: 1920,
        height: 1080,
        alt: 'Winter mountain landscape with snow',
        photographer: 'Unsplash',
        photographerUrl: 'https://unsplash.com',
        source: 'unsplash',
        color: '#4a90d9',
      },
      {
        id: 'winter-2',
        url: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=1920&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=400&q=80',
        width: 1920,
        height: 1080,
        alt: 'Cozy winter scene with warm lighting',
        photographer: 'Unsplash',
        photographerUrl: 'https://unsplash.com',
        source: 'unsplash',
        color: '#d4a574',
      },
    ],
    'coffee': [
      {
        id: 'coffee-1',
        url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1920&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80',
        width: 1920,
        height: 1080,
        alt: 'Artisan coffee being poured',
        photographer: 'Unsplash',
        photographerUrl: 'https://unsplash.com',
        source: 'unsplash',
        color: '#6b4423',
      },
      {
        id: 'coffee-2',
        url: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=1920&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&q=80',
        width: 1920,
        height: 1080,
        alt: 'Coffee beans and cup on rustic table',
        photographer: 'Unsplash',
        photographerUrl: 'https://unsplash.com',
        source: 'unsplash',
        color: '#3d2314',
      },
    ],
    'ecommerce': [
      {
        id: 'ecommerce-1',
        url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80',
        width: 1920,
        height: 1080,
        alt: 'Shopping cart with colorful products',
        photographer: 'Unsplash',
        photographerUrl: 'https://unsplash.com',
        source: 'unsplash',
        color: '#f5a623',
      },
    ],
    'technology': [
      {
        id: 'tech-1',
        url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80',
        width: 1920,
        height: 1080,
        alt: 'Modern technology abstract',
        photographer: 'Unsplash',
        photographerUrl: 'https://unsplash.com',
        source: 'unsplash',
        color: '#2d3748',
      },
    ],
    'business': [
      {
        id: 'business-1',
        url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1920&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80',
        width: 1920,
        height: 1080,
        alt: 'Professional business workspace',
        photographer: 'Unsplash',
        photographerUrl: 'https://unsplash.com',
        source: 'unsplash',
        color: '#4a5568',
      },
    ],
    'fitness': [
      {
        id: 'fitness-1',
        url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
        width: 1920,
        height: 1080,
        alt: 'Modern gym with equipment',
        photographer: 'Unsplash',
        photographerUrl: 'https://unsplash.com',
        source: 'unsplash',
        color: '#1a202c',
      },
    ],
    'food': [
      {
        id: 'food-1',
        url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
        width: 1920,
        height: 1080,
        alt: 'Delicious gourmet food spread',
        photographer: 'Unsplash',
        photographerUrl: 'https://unsplash.com',
        source: 'unsplash',
        color: '#c05621',
      },
    ],
    'nature': [
      {
        id: 'nature-1',
        url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80',
        width: 1920,
        height: 1080,
        alt: 'Beautiful forest with sunlight',
        photographer: 'Unsplash',
        photographerUrl: 'https://unsplash.com',
        source: 'unsplash',
        color: '#276749',
      },
    ],
    'default': [
      {
        id: 'default-1',
        url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=1920&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400&q=80',
        width: 1920,
        height: 1080,
        alt: 'Abstract gradient background',
        photographer: 'Unsplash',
        photographerUrl: 'https://unsplash.com',
        source: 'unsplash',
        color: '#667eea',
      },
      {
        id: 'default-2',
        url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&q=80',
        width: 1920,
        height: 1080,
        alt: 'Colorful abstract gradient',
        photographer: 'Unsplash',
        photographerUrl: 'https://unsplash.com',
        source: 'unsplash',
        color: '#48bb78',
      },
    ],
  };

  /**
   * Search for stock images using Unsplash API
   */
  async searchUnsplash(
    credentials: UnsplashCredentials,
    options: StockImageSearchOptions,
  ): Promise<StockImageResult[]> {
    const client = axios.create({
      baseURL: this.unsplashBaseUrl,
      headers: {
        Authorization: `Client-ID ${credentials.accessKey}`,
      },
    });

    try {
      const response = await client.get('/search/photos', {
        params: {
          query: options.query,
          orientation: options.orientation || 'landscape',
          per_page: options.perPage || 10,
          page: options.page || 1,
        },
      });

      return response.data.results.map((photo: any) => ({
        id: photo.id,
        url: photo.urls.regular,
        thumbnailUrl: photo.urls.small,
        width: photo.width,
        height: photo.height,
        alt: photo.alt_description || photo.description || options.query,
        photographer: photo.user.name,
        photographerUrl: photo.user.links.html,
        source: 'unsplash' as const,
        color: photo.color,
      }));
    } catch (error: any) {
      this.logger.error(`Unsplash search failed: ${error.message}`);
      throw new Error(`Unsplash search failed: ${error.message}`);
    }
  }

  /**
   * Search for stock images using Pexels API
   */
  async searchPexels(
    credentials: PexelsCredentials,
    options: StockImageSearchOptions,
  ): Promise<StockImageResult[]> {
    const client = axios.create({
      baseURL: this.pexelsBaseUrl,
      headers: {
        Authorization: credentials.apiKey,
      },
    });

    try {
      const response = await client.get('/search', {
        params: {
          query: options.query,
          orientation: options.orientation || 'landscape',
          per_page: options.perPage || 10,
          page: options.page || 1,
        },
      });

      return response.data.photos.map((photo: any) => ({
        id: String(photo.id),
        url: photo.src.large2x || photo.src.large,
        thumbnailUrl: photo.src.medium,
        width: photo.width,
        height: photo.height,
        alt: photo.alt || options.query,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        source: 'pexels' as const,
        color: photo.avg_color,
      }));
    } catch (error: any) {
      this.logger.error(`Pexels search failed: ${error.message}`);
      throw new Error(`Pexels search failed: ${error.message}`);
    }
  }

  /**
   * Get curated fallback images without API (for free tier)
   * Matches keywords to pre-curated image categories
   */
  getFallbackImages(keywords: string[]): StockImageResult[] {
    const normalizedKeywords = keywords.map(k => k.toLowerCase());

    // Try to match keywords to categories
    for (const keyword of normalizedKeywords) {
      // Check for category match
      for (const [category, images] of Object.entries(this.fallbackImages)) {
        if (keyword.includes(category) || category.includes(keyword)) {
          return images;
        }
      }

      // Check for partial matches
      if (keyword.includes('winter') || keyword.includes('snow') || keyword.includes('cold')) {
        return this.fallbackImages['winter-sale'];
      }
      if (keyword.includes('coffee') || keyword.includes('cafe') || keyword.includes('brew')) {
        return this.fallbackImages['coffee'];
      }
      if (keyword.includes('shop') || keyword.includes('store') || keyword.includes('buy')) {
        return this.fallbackImages['ecommerce'];
      }
      if (keyword.includes('tech') || keyword.includes('software') || keyword.includes('digital')) {
        return this.fallbackImages['technology'];
      }
      if (keyword.includes('business') || keyword.includes('office') || keyword.includes('work')) {
        return this.fallbackImages['business'];
      }
      if (keyword.includes('fitness') || keyword.includes('gym') || keyword.includes('health')) {
        return this.fallbackImages['fitness'];
      }
      if (keyword.includes('food') || keyword.includes('restaurant') || keyword.includes('meal')) {
        return this.fallbackImages['food'];
      }
      if (keyword.includes('nature') || keyword.includes('outdoor') || keyword.includes('green')) {
        return this.fallbackImages['nature'];
      }
    }

    // Default fallback
    return this.fallbackImages['default'];
  }

  /**
   * Get a single image for landing page hero
   * First tries to match keywords to curated images, falls back to default
   */
  getHeroImage(keywords: string[]): StockImageResult {
    const images = this.getFallbackImages(keywords);
    return images[0];
  }

  /**
   * Get multiple images for sections (features, gallery, etc.)
   */
  getSectionImages(keywords: string[], count: number = 3): StockImageResult[] {
    const images = this.getFallbackImages(keywords);
    return images.slice(0, count);
  }

  /**
   * Test connection to Unsplash API
   */
  async testUnsplashConnection(credentials: UnsplashCredentials): Promise<{
    success: boolean;
    message: string;
    rateLimitRemaining?: number;
  }> {
    try {
      const client = axios.create({
        baseURL: this.unsplashBaseUrl,
        headers: {
          Authorization: `Client-ID ${credentials.accessKey}`,
        },
      });

      const response = await client.get('/me');
      const rateLimitRemaining = parseInt(response.headers['x-ratelimit-remaining'] || '0');

      return {
        success: true,
        message: `Connected to Unsplash (${rateLimitRemaining} requests remaining)`,
        rateLimitRemaining,
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        return { success: false, message: 'Invalid Unsplash API key' };
      }
      return { success: false, message: `Connection failed: ${error.message}` };
    }
  }

  /**
   * Test connection to Pexels API
   */
  async testPexelsConnection(credentials: PexelsCredentials): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const client = axios.create({
        baseURL: this.pexelsBaseUrl,
        headers: {
          Authorization: credentials.apiKey,
        },
      });

      await client.get('/curated', { params: { per_page: 1 } });

      return {
        success: true,
        message: 'Connected to Pexels API',
      };
    } catch (error: any) {
      if (error.response?.status === 401) {
        return { success: false, message: 'Invalid Pexels API key' };
      }
      return { success: false, message: `Connection failed: ${error.message}` };
    }
  }
}
