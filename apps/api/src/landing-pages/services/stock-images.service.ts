import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface UnsplashPhoto {
  id: string;
  width: number;
  height: number;
  description: string | null;
  altDescription: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    username: string;
    profileUrl: string;
  };
  links: {
    download: string;
    downloadLocation: string;
  };
}

export interface UnsplashSearchResult {
  total: number;
  totalPages: number;
  photos: UnsplashPhoto[];
}

export interface StockImageCollection {
  id: string;
  title: string;
  description: string | null;
  totalPhotos: number;
  coverPhoto?: UnsplashPhoto;
}

@Injectable()
export class StockImagesService {
  private readonly logger = new Logger(StockImagesService.name);
  private readonly accessKey: string;
  private readonly baseUrl = 'https://api.unsplash.com';

  constructor(private readonly configService: ConfigService) {
    this.accessKey = this.configService.get<string>('UNSPLASH_ACCESS_KEY') || '';
    if (!this.accessKey) {
      this.logger.warn('UNSPLASH_ACCESS_KEY not configured - stock image features will be limited');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SEARCH
  // ═══════════════════════════════════════════════════════════════

  /**
   * Search for photos on Unsplash
   */
  async searchPhotos(
    query: string,
    page = 1,
    perPage = 20,
    orientation?: 'landscape' | 'portrait' | 'squarish',
    color?: string,
  ): Promise<UnsplashSearchResult> {
    if (!this.accessKey) {
      throw new BadRequestException('Unsplash integration not configured');
    }

    const params = new URLSearchParams({
      query,
      page: page.toString(),
      per_page: Math.min(perPage, 30).toString(), // Unsplash max is 30
    });

    if (orientation) params.append('orientation', orientation);
    if (color) params.append('color', color);

    try {
      const response = await fetch(`${this.baseUrl}/search/photos?${params}`, {
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
          'Accept-Version': 'v1',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Unsplash API error: ${response.status} - ${error}`);
        throw new BadRequestException('Failed to search stock images');
      }

      const data = await response.json();

      return {
        total: data.total,
        totalPages: data.total_pages,
        photos: data.results.map((photo: any) => this.mapPhoto(photo)),
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Unsplash search failed', error);
      throw new BadRequestException('Failed to search stock images');
    }
  }

  /**
   * Get curated photos (editorial picks)
   */
  async getCuratedPhotos(page = 1, perPage = 20): Promise<UnsplashPhoto[]> {
    if (!this.accessKey) {
      throw new BadRequestException('Unsplash integration not configured');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/photos?page=${page}&per_page=${Math.min(perPage, 30)}&order_by=popular`,
        {
          headers: {
            Authorization: `Client-ID ${this.accessKey}`,
            'Accept-Version': 'v1',
          },
        },
      );

      if (!response.ok) {
        throw new BadRequestException('Failed to fetch curated photos');
      }

      const data = await response.json();
      return data.map((photo: any) => this.mapPhoto(photo));
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to fetch curated photos', error);
      throw new BadRequestException('Failed to fetch curated photos');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // COLLECTIONS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get landing page-specific collections
   * These are pre-defined categories useful for landing pages
   */
  getLandingPageCategories(): { id: string; name: string; query: string; icon: string }[] {
    return [
      { id: 'business', name: 'Business & Office', query: 'business office professional', icon: 'briefcase' },
      { id: 'technology', name: 'Technology', query: 'technology computer software', icon: 'cpu' },
      { id: 'food', name: 'Food & Drink', query: 'food restaurant cuisine', icon: 'utensils' },
      { id: 'nature', name: 'Nature & Outdoors', query: 'nature outdoor landscape', icon: 'tree' },
      { id: 'fitness', name: 'Fitness & Wellness', query: 'fitness gym health wellness', icon: 'heart' },
      { id: 'fashion', name: 'Fashion & Style', query: 'fashion clothing style', icon: 'shirt' },
      { id: 'travel', name: 'Travel & Adventure', query: 'travel adventure vacation', icon: 'plane' },
      { id: 'people', name: 'People & Lifestyle', query: 'people lifestyle portrait', icon: 'users' },
      { id: 'abstract', name: 'Abstract & Patterns', query: 'abstract pattern texture', icon: 'shapes' },
      { id: 'minimal', name: 'Minimal & Clean', query: 'minimal clean simple white', icon: 'square' },
      { id: 'hero', name: 'Hero Backgrounds', query: 'background gradient hero banner', icon: 'image' },
      { id: 'team', name: 'Team & Collaboration', query: 'team collaboration meeting', icon: 'users' },
    ];
  }

  /**
   * Search photos by category
   */
  async getPhotosByCategory(
    categoryId: string,
    page = 1,
    perPage = 20,
    orientation?: 'landscape' | 'portrait' | 'squarish',
  ): Promise<UnsplashSearchResult> {
    const categories = this.getLandingPageCategories();
    const category = categories.find(c => c.id === categoryId);

    if (!category) {
      throw new BadRequestException(`Category "${categoryId}" not found`);
    }

    return this.searchPhotos(category.query, page, perPage, orientation);
  }

  /**
   * Get featured collections from Unsplash
   */
  async getFeaturedCollections(page = 1, perPage = 10): Promise<StockImageCollection[]> {
    if (!this.accessKey) {
      throw new BadRequestException('Unsplash integration not configured');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/collections?page=${page}&per_page=${Math.min(perPage, 30)}`,
        {
          headers: {
            Authorization: `Client-ID ${this.accessKey}`,
            'Accept-Version': 'v1',
          },
        },
      );

      if (!response.ok) {
        throw new BadRequestException('Failed to fetch collections');
      }

      const data = await response.json();
      return data.map((collection: any) => ({
        id: collection.id,
        title: collection.title,
        description: collection.description,
        totalPhotos: collection.total_photos,
        coverPhoto: collection.cover_photo ? this.mapPhoto(collection.cover_photo) : undefined,
      }));
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to fetch collections', error);
      throw new BadRequestException('Failed to fetch collections');
    }
  }

  /**
   * Get photos from a specific collection
   */
  async getCollectionPhotos(
    collectionId: string,
    page = 1,
    perPage = 20,
  ): Promise<UnsplashPhoto[]> {
    if (!this.accessKey) {
      throw new BadRequestException('Unsplash integration not configured');
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/collections/${collectionId}/photos?page=${page}&per_page=${Math.min(perPage, 30)}`,
        {
          headers: {
            Authorization: `Client-ID ${this.accessKey}`,
            'Accept-Version': 'v1',
          },
        },
      );

      if (!response.ok) {
        throw new BadRequestException('Failed to fetch collection photos');
      }

      const data = await response.json();
      return data.map((photo: any) => this.mapPhoto(photo));
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to fetch collection photos', error);
      throw new BadRequestException('Failed to fetch collection photos');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PHOTO DETAILS & DOWNLOAD
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get a single photo by ID
   */
  async getPhoto(photoId: string): Promise<UnsplashPhoto> {
    if (!this.accessKey) {
      throw new BadRequestException('Unsplash integration not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/photos/${photoId}`, {
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
          'Accept-Version': 'v1',
        },
      });

      if (!response.ok) {
        throw new BadRequestException('Photo not found');
      }

      const data = await response.json();
      return this.mapPhoto(data);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to fetch photo', error);
      throw new BadRequestException('Failed to fetch photo');
    }
  }

  /**
   * Track download (required by Unsplash API guidelines)
   * Must be called when user selects a photo for use
   */
  async trackDownload(photoId: string): Promise<void> {
    if (!this.accessKey) {
      return;
    }

    try {
      // First get the download location
      const photo = await this.getPhoto(photoId);

      // Trigger the download endpoint
      await fetch(photo.links.downloadLocation, {
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
          'Accept-Version': 'v1',
        },
      });

      this.logger.debug(`Tracked download for photo ${photoId}`);
    } catch (error) {
      // Don't throw - this is just tracking
      this.logger.warn(`Failed to track download for photo ${photoId}`, error);
    }
  }

  /**
   * Get optimized URL for a photo
   * Returns a URL with the specified dimensions
   */
  getOptimizedUrl(photo: UnsplashPhoto, width?: number, height?: number, quality = 80): string {
    const url = new URL(photo.urls.raw);

    // Add Unsplash image optimization parameters
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    url.searchParams.set('q', quality.toString());
    url.searchParams.set('auto', 'format');
    url.searchParams.set('fit', 'crop');

    return url.toString();
  }

  // ═══════════════════════════════════════════════════════════════
  // RANDOM PHOTOS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get a random photo (useful for placeholders)
   */
  async getRandomPhoto(query?: string): Promise<UnsplashPhoto> {
    if (!this.accessKey) {
      throw new BadRequestException('Unsplash integration not configured');
    }

    const params = new URLSearchParams();
    if (query) params.append('query', query);

    try {
      const response = await fetch(`${this.baseUrl}/photos/random?${params}`, {
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
          'Accept-Version': 'v1',
        },
      });

      if (!response.ok) {
        throw new BadRequestException('Failed to fetch random photo');
      }

      const data = await response.json();
      return this.mapPhoto(data);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to fetch random photo', error);
      throw new BadRequestException('Failed to fetch random photo');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private mapPhoto(photo: any): UnsplashPhoto {
    return {
      id: photo.id,
      width: photo.width,
      height: photo.height,
      description: photo.description,
      altDescription: photo.alt_description,
      urls: {
        raw: photo.urls.raw,
        full: photo.urls.full,
        regular: photo.urls.regular,
        small: photo.urls.small,
        thumb: photo.urls.thumb,
      },
      user: {
        name: photo.user.name,
        username: photo.user.username,
        profileUrl: `https://unsplash.com/@${photo.user.username}`,
      },
      links: {
        download: photo.links.download,
        downloadLocation: photo.links.download_location,
      },
    };
  }

  /**
   * Check if Unsplash integration is configured
   */
  isConfigured(): boolean {
    return !!this.accessKey;
  }
}
