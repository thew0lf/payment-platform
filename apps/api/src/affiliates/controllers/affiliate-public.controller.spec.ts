/**
 * Affiliate Public Controller Unit Tests
 *
 * Tests for click redirect, tracking pixel, and rate limiting functionality.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AffiliatePublicController } from './affiliate-public.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { ClickQueueService } from '../services/click-queue.service';
import { Response, Request } from 'express';

describe('AffiliatePublicController', () => {
  let controller: AffiliatePublicController;
  let mockPrismaService: {
    affiliateLink: {
      findFirst: jest.Mock;
    };
    affiliateProgramConfig: {
      findUnique: jest.Mock;
    };
  };
  let mockClickQueueService: {
    ingestClick: jest.Mock;
    getStats: jest.Mock;
  };

  const mockLink = {
    id: 'link-123',
    partnerId: 'partner-123',
    companyId: 'company-123',
    name: 'Test Link',
    destinationUrl: 'https://example.com/product?ref=affiliate',
    trackingCode: 'ABC123DEF456',
    shortCode: 'abc123',
    isActive: true,
    expiresAt: null,
    maxClicks: null,
    totalClicks: 100,
    subId1: 'default-sub1',
    subId2: null,
    subId3: null,
    subId4: null,
    subId5: null,
    fallbackUrl: null,
    deletedAt: null,
    partner: {
      id: 'partner-123',
      status: 'ACTIVE',
      companyId: 'company-123',
      cookieDurationDays: 30,
    },
  };

  const mockResponse = () => {
    const res: Partial<Response> = {
      redirect: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };
    return res as Response;
  };

  const mockRequest = (overrides: Partial<Request> = {}): Request => {
    return {
      ip: '192.168.1.1',
      headers: {},
      socket: { remoteAddress: '192.168.1.1' },
      ...overrides,
    } as unknown as Request;
  };

  beforeEach(async () => {
    mockPrismaService = {
      affiliateLink: {
        findFirst: jest.fn(),
      },
      affiliateProgramConfig: {
        findUnique: jest.fn().mockResolvedValue(null), // Default: no company-level fallback
      },
    };

    mockClickQueueService = {
      ingestClick: jest.fn().mockResolvedValue({
        queued: true,
        isDuplicate: false,
        idempotencyKey: 'clk_abc123xyz456',
      }),
      getStats: jest.fn().mockResolvedValue({
        queueSize: 10,
        processedCount: 1000,
        duplicateCount: 50,
        fraudCount: 5,
        errorCount: 2,
        avgProcessingTimeMs: 15,
        pendingInDb: 10,
        failedInDb: 2,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AffiliatePublicController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ClickQueueService, useValue: mockClickQueueService },
      ],
    }).compile();

    controller = module.get<AffiliatePublicController>(AffiliatePublicController);
  });

  describe('redirectClick', () => {
    it('should redirect to destination URL for valid link', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', {}, req, res, 'Mozilla/5.0', 'https://google.com');

      expect(res.redirect).toHaveBeenCalledWith(302, expect.stringContaining('example.com/product'));
      expect(res.cookie).toHaveBeenCalledWith(
        '__aff_click',
        'clk_abc123xyz456',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
        }),
      );
    });

    it('should redirect to fallback URL when link not found', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(null);
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('invalid', {}, req, res);

      expect(res.redirect).toHaveBeenCalledWith(302, '/');
    });

    it('should redirect to fallback URL when link is inactive', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue({
        ...mockLink,
        isActive: false,
      });
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', {}, req, res);

      expect(res.redirect).toHaveBeenCalledWith(302, '/');
    });

    it('should redirect to fallback URL when link has expired', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      mockPrismaService.affiliateLink.findFirst.mockResolvedValue({
        ...mockLink,
        expiresAt: expiredDate,
      });
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', {}, req, res);

      expect(res.redirect).toHaveBeenCalledWith(302, '/');
    });

    it('should redirect to fallback URL when partner is inactive', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue({
        ...mockLink,
        partner: { ...mockLink.partner, status: 'SUSPENDED' },
      });
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', {}, req, res);

      expect(res.redirect).toHaveBeenCalledWith(302, '/');
    });

    it('should redirect to fallback URL when max clicks reached', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue({
        ...mockLink,
        maxClicks: 100,
        totalClicks: 100,
      });
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', {}, req, res);

      expect(res.redirect).toHaveBeenCalledWith(302, '/');
    });

    it('should use custom fallback URL when specified', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue({
        ...mockLink,
        isActive: false,
        fallbackUrl: 'https://example.com/alternative',
      });
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', {}, req, res);

      expect(res.redirect).toHaveBeenCalledWith(302, 'https://example.com/alternative');
    });

    it('should extract SubIDs from query parameters', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick(
        'abc123',
        { t1: 'value1', t2: 'value2', t3: 'value3' },
        req,
        res,
      );

      expect(mockClickQueueService.ingestClick).toHaveBeenCalledWith(
        expect.objectContaining({
          subId1: 'value1',
          subId2: 'value2',
          subId3: 'value3',
        }),
      );
    });

    it('should handle alternate SubID formats (sub1, subid1, subId1)', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick(
        'abc123',
        { sub1: 'val1', subid2: 'val2', subId3: 'val3' },
        req,
        res,
      );

      expect(mockClickQueueService.ingestClick).toHaveBeenCalledWith(
        expect.objectContaining({
          subId1: 'val1',
          subId2: 'val2',
          subId3: 'val3',
        }),
      );
    });

    it('should use default SubIDs from link when not in query', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', {}, req, res);

      expect(mockClickQueueService.ingestClick).toHaveBeenCalledWith(
        expect.objectContaining({
          subId1: 'default-sub1',
        }),
      );
    });

    it('should collect custom overflow params beyond t1-t5', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick(
        'abc123',
        { t1: 'val1', custom_param: 'custom_value', another: 'test' },
        req,
        res,
      );

      expect(mockClickQueueService.ingestClick).toHaveBeenCalledWith(
        expect.objectContaining({
          subId1: 'val1',
          customParams: { custom_param: 'custom_value', another: 'test' },
        }),
      );
    });

    it('should not include known params in customParams', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick(
        'abc123',
        { t1: 'val1', cb: 'cachebuster', session: 'sess123' },
        req,
        res,
      );

      expect(mockClickQueueService.ingestClick).toHaveBeenCalledWith(
        expect.objectContaining({
          subId1: 'val1',
        }),
      );
      // customParams should not include known keys
      const callArg = mockClickQueueService.ingestClick.mock.calls[0][0];
      expect(callArg.customParams).toBeUndefined();
    });

    it('should extract IP from X-Forwarded-For header', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      const res = mockResponse();
      const req = mockRequest({
        headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' },
      });

      await controller.redirectClick('abc123', {}, req, res);

      expect(mockClickQueueService.ingestClick).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '10.0.0.1',
        }),
      );
    });

    it('should extract IP from X-Real-IP header', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      const res = mockResponse();
      const req = mockRequest({
        headers: { 'x-real-ip': '10.0.0.5' },
      });

      await controller.redirectClick('abc123', {}, req, res);

      expect(mockClickQueueService.ingestClick).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '10.0.0.5',
        }),
      );
    });

    it('should extract IP from CF-Connecting-IP header', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      const res = mockResponse();
      const req = mockRequest({
        headers: { 'cf-connecting-ip': '10.0.0.8' },
      });

      await controller.redirectClick('abc123', {}, req, res);

      expect(mockClickQueueService.ingestClick).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '10.0.0.8',
        }),
      );
    });

    it('should include referrer in tracking data', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick(
        'abc123',
        {},
        req,
        res,
        'Mozilla/5.0',
        'https://facebook.com/post/123',
      );

      expect(mockClickQueueService.ingestClick).toHaveBeenCalledWith(
        expect.objectContaining({
          referrer: 'https://facebook.com/post/123',
        }),
      );
    });

    it('should set cookie with custom expiration from partner config', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue({
        ...mockLink,
        partner: { ...mockLink.partner, cookieDurationDays: 60 },
      });
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', {}, req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        '__aff_click',
        expect.any(String),
        expect.objectContaining({
          maxAge: 60 * 24 * 60 * 60 * 1000, // 60 days in ms
        }),
      );
    });

    it('should expand macros in destination URL', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue({
        ...mockLink,
        destinationUrl: 'https://example.com/product?clickid={CLICK_ID}&ts={TIMESTAMP}&date={DATE}',
      });
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', {}, req, res);

      expect(res.redirect).toHaveBeenCalledWith(
        302,
        expect.stringMatching(/clickid=clk_abc123xyz456/),
      );
    });

    it('should append tracking params to redirect URL', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', { t1: 'mysub' }, req, res);

      const redirectUrl = (res.redirect as jest.Mock).mock.calls[0][1];
      expect(redirectUrl).toContain('aff_click=');
      expect(redirectUrl).toContain('sub1=mysub');
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaService.affiliateLink.findFirst.mockRejectedValue(new Error('DB connection failed'));
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', {}, req, res);

      expect(res.redirect).toHaveBeenCalledWith(302, '/');
    });

    it('should use cached link on subsequent requests', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      const res1 = mockResponse();
      const res2 = mockResponse();
      const req = mockRequest();

      // First request
      await controller.redirectClick('abc123', {}, req, res1);
      // Second request (should use cache)
      await controller.redirectClick('abc123', {}, req, res2);

      // Should only query DB once due to caching
      expect(mockPrismaService.affiliateLink.findFirst).toHaveBeenCalledTimes(1);
    });
  });

  describe('trackingPixel', () => {
    it('should return 1x1 transparent GIF', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      const res = mockResponse();
      const req = mockRequest();

      await controller.trackingPixel('abc123', {}, req, res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'image/gif',
        }),
      );
      expect(res.send).toHaveBeenCalled();
    });

    it('should set no-cache headers', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      const res = mockResponse();
      const req = mockRequest();

      await controller.trackingPixel('abc123', {}, req, res);

      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Cache-Control': 'no-store, no-cache, must-revalidate, private',
          'Pragma': 'no-cache',
        }),
      );
    });

    it('should track impression for valid link', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      const res = mockResponse();
      const req = mockRequest();

      await controller.trackingPixel('abc123', { t1: 'sub1' }, req, res);

      expect(mockClickQueueService.ingestClick).toHaveBeenCalledWith(
        expect.objectContaining({
          linkId: 'link-123',
          partnerId: 'partner-123',
          subId1: 'sub1',
        }),
      );
    });

    it('should return GIF even if link not found', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(null);
      const res = mockResponse();
      const req = mockRequest();

      await controller.trackingPixel('invalid', {}, req, res);

      expect(res.send).toHaveBeenCalled();
      expect(mockClickQueueService.ingestClick).not.toHaveBeenCalled();
    });

    it('should not track if partner is inactive', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue({
        ...mockLink,
        partner: { ...mockLink.partner, status: 'SUSPENDED' },
      });
      const res = mockResponse();
      const req = mockRequest();

      await controller.trackingPixel('abc123', {}, req, res);

      expect(res.send).toHaveBeenCalled();
      expect(mockClickQueueService.ingestClick).not.toHaveBeenCalled();
    });

    it('should handle tracking errors gracefully', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      mockClickQueueService.ingestClick.mockRejectedValue(new Error('Queue error'));
      const res = mockResponse();
      const req = mockRequest();

      // Should not throw
      await expect(controller.trackingPixel('abc123', {}, req, res)).resolves.not.toThrow();
      expect(res.send).toHaveBeenCalled();
    });

    it('should ignore cache buster parameter', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      const res = mockResponse();
      const req = mockRequest();

      await controller.trackingPixel('abc123', { cb: '123456789' }, req, res);

      expect(mockClickQueueService.ingestClick).toHaveBeenCalledWith(
        expect.not.objectContaining({
          cb: '123456789',
        }),
      );
    });
  });

  describe('healthCheck', () => {
    it('should return queue statistics', async () => {
      const result = await controller.healthCheck();

      expect(result.status).toBe('ok');
      expect(result.queue).toBeDefined();
      expect(result.queue.size).toBe(10);
      expect(result.queue.processed).toBe(1000);
      expect(result.queue.duplicates).toBe(50);
      expect(result.queue.errors).toBe(2);
    });

    it('should return cache statistics', async () => {
      const result = await controller.healthCheck();

      expect(result.cache).toBeDefined();
      expect(result.cache.linksCached).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow clicks under rate limit', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      const req = mockRequest({ ip: '10.10.10.1' });

      // Make 5 requests from same IP
      for (let i = 0; i < 5; i++) {
        const resp = mockResponse();
        await controller.redirectClick('abc123', {}, req, resp);
        expect(resp.redirect).toHaveBeenCalledWith(302, expect.stringContaining('example.com'));
      }
    });

    it('should redirect to fallback when rate limited', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      const req = mockRequest({ ip: '10.10.10.99' }); // Use unique IP

      // Make 31 requests to exceed limit (30 per minute)
      for (let i = 0; i < 31; i++) {
        const res = mockResponse();
        await controller.redirectClick('abc123', {}, req, res);

        if (i < 30) {
          expect(res.redirect).toHaveBeenCalledWith(302, expect.stringContaining('example.com'));
        }
      }

      // 32nd request should be rate limited
      const res = mockResponse();
      await controller.redirectClick('abc123', {}, req, res);
      expect(res.redirect).toHaveBeenCalledWith(302, '/');
    });
  });

  describe('Macro Expansion', () => {
    it('should expand {CLICK_ID} macro', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue({
        ...mockLink,
        destinationUrl: 'https://example.com?cid={CLICK_ID}',
      });
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', {}, req, res);

      const redirectUrl = (res.redirect as jest.Mock).mock.calls[0][1];
      expect(redirectUrl).toContain('cid=clk_abc123xyz456');
    });

    it('should expand {TIMESTAMP} macro', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue({
        ...mockLink,
        destinationUrl: 'https://example.com?ts={TIMESTAMP}',
      });
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', {}, req, res);

      const redirectUrl = (res.redirect as jest.Mock).mock.calls[0][1];
      // Should contain a Unix timestamp (10+ digits)
      expect(redirectUrl).toMatch(/ts=\d{10,}/);
    });

    it('should expand {DATE} macro', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue({
        ...mockLink,
        destinationUrl: 'https://example.com?date={DATE}',
      });
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', {}, req, res);

      const redirectUrl = (res.redirect as jest.Mock).mock.calls[0][1];
      // Should contain date in YYYY-MM-DD format
      expect(redirectUrl).toMatch(/date=\d{4}-\d{2}-\d{2}/);
    });

    it('should expand {RANDOM} macro', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue({
        ...mockLink,
        destinationUrl: 'https://example.com?r={RANDOM}',
      });
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', {}, req, res);

      const redirectUrl = (res.redirect as jest.Mock).mock.calls[0][1];
      // Should contain an 8-char alphanumeric string
      expect(redirectUrl).toMatch(/r=[a-f0-9]{8}/);
    });

    it('should expand {SOURCE} macro from referer', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue({
        ...mockLink,
        destinationUrl: 'https://example.com?src={SOURCE}',
      });
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick(
        'abc123',
        {},
        req,
        res,
        'Mozilla/5.0',
        'https://www.facebook.com/post/123',
      );

      const redirectUrl = (res.redirect as jest.Mock).mock.calls[0][1];
      expect(redirectUrl).toContain('src=facebook.com');
    });

    it('should set SOURCE to "direct" when no referer', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue({
        ...mockLink,
        destinationUrl: 'https://example.com?src={SOURCE}',
      });
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', {}, req, res);

      const redirectUrl = (res.redirect as jest.Mock).mock.calls[0][1];
      expect(redirectUrl).toContain('src=direct');
    });

    it('should expand SubID macros {T1} through {T5}', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue({
        ...mockLink,
        destinationUrl: 'https://example.com?s1={T1}&s2={T2}',
      });
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', { t1: 'val1', t2: 'val2' }, req, res);

      const redirectUrl = (res.redirect as jest.Mock).mock.calls[0][1];
      expect(redirectUrl).toContain('s1=val1');
      expect(redirectUrl).toContain('s2=val2');
    });

    it('should URL-encode macro values', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue({
        ...mockLink,
        destinationUrl: 'https://example.com?s1={T1}',
      });
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', { t1: 'value with spaces' }, req, res);

      const redirectUrl = (res.redirect as jest.Mock).mock.calls[0][1];
      // URL encoding can use either %20 or + for spaces
      expect(redirectUrl).toMatch(/s1=value(%20|\+)with(%20|\+)spaces/);
    });
  });

  describe('Cookie Tracking', () => {
    it('should set httpOnly cookie', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', {}, req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        '__aff_click',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
        }),
      );
    });

    it('should set sameSite to lax for cross-site tracking', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue(mockLink);
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', {}, req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        '__aff_click',
        expect.any(String),
        expect.objectContaining({
          sameSite: 'lax',
        }),
      );
    });

    it('should use 30-day default cookie expiration', async () => {
      mockPrismaService.affiliateLink.findFirst.mockResolvedValue({
        ...mockLink,
        partner: { ...mockLink.partner, cookieDurationDays: undefined },
      });
      const res = mockResponse();
      const req = mockRequest();

      await controller.redirectClick('abc123', {}, req, res);

      expect(res.cookie).toHaveBeenCalledWith(
        '__aff_click',
        expect.any(String),
        expect.objectContaining({
          maxAge: 30 * 24 * 60 * 60 * 1000,
        }),
      );
    });
  });
});
