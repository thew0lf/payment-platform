import { Test, TestingModule } from '@nestjs/testing';
import { StockImageService } from './stock-image.service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('StockImageService', () => {
  let service: StockImageService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [StockImageService],
    }).compile();

    service = module.get<StockImageService>(StockImageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFallbackImages', () => {
    it('should return winter images for winter-related keywords', () => {
      const images = service.getFallbackImages(['winter', 'snow']);
      expect(images).toBeDefined();
      expect(images.length).toBeGreaterThan(0);
      expect(images[0].url).toContain('unsplash.com');
    });

    it('should return coffee images for coffee-related keywords', () => {
      const images = service.getFallbackImages(['coffee', 'brew']);
      expect(images).toBeDefined();
      expect(images.length).toBeGreaterThan(0);
      expect(images[0].alt).toContain('coffee');
    });

    it('should return ecommerce images for shopping-related keywords', () => {
      const images = service.getFallbackImages(['shop', 'store', 'buy']);
      expect(images).toBeDefined();
      expect(images.length).toBeGreaterThan(0);
    });

    it('should return technology images for tech-related keywords', () => {
      const images = service.getFallbackImages(['tech', 'software', 'saas']);
      expect(images).toBeDefined();
      expect(images.length).toBeGreaterThan(0);
    });

    it('should return sale images for sale-related keywords', () => {
      const images = service.getFallbackImages(['sale', 'discount', 'deal']);
      expect(images).toBeDefined();
      expect(images.length).toBeGreaterThan(0);
    });

    it('should return default images for unknown keywords', () => {
      const images = service.getFallbackImages(['xyz123', 'unknownCategory']);
      expect(images).toBeDefined();
      expect(images.length).toBeGreaterThan(0);
    });

    it('should return default images for empty keywords', () => {
      const images = service.getFallbackImages([]);
      expect(images).toBeDefined();
      expect(images.length).toBeGreaterThan(0);
    });
  });

  describe('getHeroImage', () => {
    it('should return a single image for hero section', () => {
      const image = service.getHeroImage(['winter', 'sale']);
      expect(image).toBeDefined();
      expect(image.url).toBeDefined();
      expect(image.alt).toBeDefined();
      expect(image.source).toBe('unsplash');
    });

    it('should return image with proper structure', () => {
      const image = service.getHeroImage(['coffee']);
      expect(image).toHaveProperty('id');
      expect(image).toHaveProperty('url');
      expect(image).toHaveProperty('thumbnailUrl');
      expect(image).toHaveProperty('width');
      expect(image).toHaveProperty('height');
      expect(image).toHaveProperty('alt');
      expect(image).toHaveProperty('photographer');
      expect(image).toHaveProperty('photographerUrl');
      expect(image).toHaveProperty('source');
    });
  });

  describe('getSectionImages', () => {
    it('should return multiple images for sections', () => {
      const images = service.getSectionImages(['coffee'], 3);
      expect(images).toBeDefined();
      expect(images.length).toBeLessThanOrEqual(3);
    });

    it('should limit images to requested count', () => {
      const images = service.getSectionImages(['winter'], 2);
      expect(images.length).toBeLessThanOrEqual(2);
    });

    it('should default to 3 images when count not specified', () => {
      const images = service.getSectionImages(['business']);
      expect(images.length).toBeLessThanOrEqual(3);
    });
  });

  describe('testUnsplashConnection', () => {
    it('should fail with invalid credentials', async () => {
      // Mock axios.create to return a client that rejects with 401
      const mockClient = {
        get: jest.fn().mockRejectedValue({
          response: { status: 401 },
          message: 'Unauthorized',
        }),
      };
      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await service.testUnsplashConnection({
        accessKey: 'invalid-key',
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid');
    });

    it('should succeed with valid credentials', async () => {
      const mockClient = {
        get: jest.fn().mockResolvedValue({
          headers: { 'x-ratelimit-remaining': '4999' },
        }),
      };
      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await service.testUnsplashConnection({
        accessKey: 'valid-key',
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('Connected');
    });
  });

  describe('testPexelsConnection', () => {
    it('should fail with invalid credentials', async () => {
      // Mock axios.create to return a client that rejects with 401
      const mockClient = {
        get: jest.fn().mockRejectedValue({
          response: { status: 401 },
          message: 'Unauthorized',
        }),
      };
      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await service.testPexelsConnection({
        apiKey: 'invalid-key',
      });
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid');
    });

    it('should succeed with valid credentials', async () => {
      const mockClient = {
        get: jest.fn().mockResolvedValue({
          data: { photos: [] },
        }),
      };
      mockedAxios.create.mockReturnValue(mockClient as any);

      const result = await service.testPexelsConnection({
        apiKey: 'valid-key',
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('Connected');
    });
  });
});
