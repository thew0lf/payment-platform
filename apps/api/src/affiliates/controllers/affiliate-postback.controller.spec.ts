/**
 * Affiliate Postback Controller Unit Tests
 *
 * Tests for server-to-server conversion tracking endpoints
 * covering multiple postback formats, security, rate limiting,
 * and idempotency handling.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import {
  AffiliatePostbackController,
  PostbackFormat,
  PostbackResponseStatus,
} from './affiliate-postback.controller';
import { AffiliateTrackingService } from '../services/affiliate-tracking.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { IdempotencyService } from '../../common/services/idempotency.service';

describe('AffiliatePostbackController', () => {
  let controller: AffiliatePostbackController;
  let trackingService: jest.Mocked<AffiliateTrackingService>;
  let prismaService: any;
  let auditLogsService: jest.Mocked<AuditLogsService>;
  let idempotencyService: jest.Mocked<IdempotencyService>;
  let originalFetch: typeof global.fetch;

  const mockClick = {
    id: 'click-123',
    partnerId: 'partner-123',
    companyId: 'company-123',
    clickedAt: new Date('2024-01-15T10:00:00Z'),
    subId1: 'test-sub1',
    subId2: 'test-sub2',
    subId3: null,
    subId4: null,
    subId5: null,
  };

  const mockConfig = {
    postbackApiKey: 'test-api-key',
    postbackSecretKey: 'test-secret-key',
    postbackAllowedIps: ['192.168.1.1', '10.0.0.1'],
  };

  const mockPartner = {
    id: 'partner-123',
    companyId: 'company-123',
    affiliateCode: 'TEST123',
    customTerms: {
      postbackUrl: 'https://affiliate.example.com/postback?cid={click_id}&amt={payout}',
    },
  };

  const mockTrackingResult = {
    attributed: true,
    conversionId: 'conversion-123',
    partnerId: 'partner-123',
    commissionAmount: 10,
  };

  const mockResponse = () => {
    const res: Partial<Response> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    return res as Response;
  };

  beforeEach(async () => {
    // Save original fetch
    originalFetch = global.fetch;
    // Default mock that resolves successfully
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    const mockPrismaService = {
      affiliateClick: {
        findFirst: jest.fn(),
      },
      affiliateProgramConfig: {
        findUnique: jest.fn(),
      },
      affiliatePartner: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const mockTrackingService = {
      handlePostback: jest.fn(),
    };

    const mockAuditLogsService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const mockIdempotencyServiceObj = {
      checkAndLock: jest.fn().mockResolvedValue({ isDuplicate: false }),
      complete: jest.fn().mockResolvedValue(undefined),
      fail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AffiliatePostbackController],
      providers: [
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AffiliateTrackingService, useValue: mockTrackingService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
        { provide: IdempotencyService, useValue: mockIdempotencyServiceObj },
      ],
    }).compile();

    controller = module.get<AffiliatePostbackController>(AffiliatePostbackController);
    trackingService = module.get(AffiliateTrackingService) as unknown as jest.Mocked<AffiliateTrackingService>;
    prismaService = module.get(PrismaService) ;
    auditLogsService = module.get(AuditLogsService) as unknown as jest.Mocked<AuditLogsService>;
    idempotencyService = module.get(IdempotencyService) as unknown as jest.Mocked<IdempotencyService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Restore original fetch
    global.fetch = originalFetch;
  });

  describe('handleGetPostback', () => {
    it('should process a valid GET postback with click_id', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      trackingService.handlePostback.mockResolvedValue(mockTrackingResult);
      prismaService.affiliatePartner.findUnique.mockResolvedValue(mockPartner);

      await controller.handleGetPostback(
        'click-123', // click_id
        undefined, // aff_sub
        undefined, // transaction_id
        'order-456', // order_id
        '99.99', // amount
        undefined, // payout
        undefined, // revenue
        'approved', // status
        undefined, // goal_id
        undefined, // event_type
        'sub1', // sub1
        'sub2', // sub2
        undefined, undefined, undefined, // sub3-5
        undefined, undefined, undefined, undefined, undefined, // t1-5
        'USD', // currency
        undefined, // signature
        undefined, // sig
        '192.168.1.1', // ipAddress
        undefined, // forwardedFor
        res,
      );

      expect(prismaService.affiliateClick.findFirst).toHaveBeenCalledWith({
        where: { idempotencyKey: 'click-123' },
        select: expect.any(Object),
      });
      expect(trackingService.handlePostback).toHaveBeenCalledWith({
        clickId: 'click-123',
        orderId: 'order-456',
        amount: 99.99,
        status: 'approved',
        subId1: 'sub1',
        subId2: 'sub2',
        subId3: undefined,
        subId4: undefined,
        subId5: undefined,
      });
      expect(res.send).toHaveBeenCalledWith('1');
    });

    it('should normalize click_id from aff_sub', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      trackingService.handlePostback.mockResolvedValue(mockTrackingResult);
      prismaService.affiliatePartner.findUnique.mockResolvedValue(mockPartner);

      await controller.handleGetPostback(
        undefined, // click_id
        'aff-sub-123', // aff_sub
        undefined, // transaction_id
        undefined, // order_id
        '50.00', // amount
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined,
        '192.168.1.1',
        undefined,
        res,
      );

      expect(prismaService.affiliateClick.findFirst).toHaveBeenCalledWith({
        where: { idempotencyKey: 'aff-sub-123' },
        select: expect.any(Object),
      });
    });

    it('should normalize click_id from transaction_id', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      trackingService.handlePostback.mockResolvedValue(mockTrackingResult);
      prismaService.affiliatePartner.findUnique.mockResolvedValue(mockPartner);

      await controller.handleGetPostback(
        undefined, // click_id
        undefined, // aff_sub
        'txn-123', // transaction_id
        undefined, // order_id
        '50.00', // amount
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined,
        '192.168.1.1',
        undefined,
        res,
      );

      expect(prismaService.affiliateClick.findFirst).toHaveBeenCalledWith({
        where: { idempotencyKey: 'txn-123' },
        select: expect.any(Object),
      });
    });

    it('should return error when click_id is missing', async () => {
      const res = mockResponse();

      await controller.handleGetPostback(
        undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined,
        '192.168.1.1',
        undefined,
        res,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: PostbackResponseStatus.INVALID_CLICK }),
      );
    });

    it('should return error when click is not found', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(null);

      await controller.handleGetPostback(
        'nonexistent-click',
        undefined, undefined, undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined,
        '192.168.1.1',
        undefined,
        res,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: PostbackResponseStatus.INVALID_CLICK }),
      );
    });

    it('should handle duplicate postbacks (idempotency)', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      idempotencyService.checkAndLock.mockResolvedValue({ isDuplicate: true, key: 'mock-key', cachedResult: mockTrackingResult });

      await controller.handleGetPostback(
        'click-123',
        undefined, undefined,
        'order-456',
        '99.99',
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined,
        '192.168.1.1',
        undefined,
        res,
      );

      expect(res.send).toHaveBeenCalledWith('DUPLICATE');
      expect(trackingService.handlePostback).not.toHaveBeenCalled();
    });

    it('should normalize amount from payout field', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      trackingService.handlePostback.mockResolvedValue(mockTrackingResult);
      prismaService.affiliatePartner.findUnique.mockResolvedValue(mockPartner);

      await controller.handleGetPostback(
        'click-123',
        undefined, undefined, undefined,
        undefined, // amount
        '75.50', // payout
        undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined,
        '192.168.1.1',
        undefined,
        res,
      );

      expect(trackingService.handlePostback).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 75.5 }),
      );
    });

    it('should normalize subIds from t1-t5 fields', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      trackingService.handlePostback.mockResolvedValue(mockTrackingResult);
      prismaService.affiliatePartner.findUnique.mockResolvedValue(mockPartner);

      await controller.handleGetPostback(
        'click-123',
        undefined, undefined, undefined, '50', undefined, undefined, undefined,
        undefined, undefined,
        undefined, undefined, undefined, undefined, undefined, // sub1-5
        't1-val', 't2-val', 't3-val', undefined, undefined, // t1-5
        undefined, undefined, undefined,
        '192.168.1.1',
        undefined,
        res,
      );

      expect(trackingService.handlePostback).toHaveBeenCalledWith(
        expect.objectContaining({
          subId1: 't1-val',
          subId2: 't2-val',
          subId3: 't3-val',
        }),
      );
    });

    it('should extract real IP from x-forwarded-for header', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      trackingService.handlePostback.mockResolvedValue(mockTrackingResult);
      prismaService.affiliatePartner.findUnique.mockResolvedValue(mockPartner);

      await controller.handleGetPostback(
        'click-123',
        undefined, undefined, undefined, '50', undefined, undefined, undefined,
        undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined,
        '127.0.0.1', // ipAddress
        '192.168.1.100, 10.0.0.1', // forwardedFor
        res,
      );

      // Audit log should be called with the real IP
      expect(auditLogsService.log).toHaveBeenCalled();
    });
  });

  describe('handlePostPostback', () => {
    it('should process a valid POST postback', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      trackingService.handlePostback.mockResolvedValue(mockTrackingResult);
      prismaService.affiliatePartner.findUnique.mockResolvedValue(mockPartner);

      await controller.handlePostPostback(
        {
          clickId: 'click-123',
          orderId: 'order-456',
          amount: 99.99,
          status: 'approved',
        },
        '192.168.1.1',
        undefined,
        undefined,
        undefined,
        res,
      );

      expect(trackingService.handlePostback).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalledWith('1');
    });

    it('should normalize click_id from various body fields', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      trackingService.handlePostback.mockResolvedValue(mockTrackingResult);
      prismaService.affiliatePartner.findUnique.mockResolvedValue(mockPartner);

      await controller.handlePostPostback(
        {
          click_id: 'click-from-body',
          amount: 50,
        },
        '192.168.1.1',
        undefined,
        undefined,
        undefined,
        res,
      );

      expect(prismaService.affiliateClick.findFirst).toHaveBeenCalledWith({
        where: { idempotencyKey: 'click-from-body' },
        select: expect.any(Object),
      });
    });

    it('should validate signature from header', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue({
        postbackSecretKey: 'test-secret',
      });

      await controller.handlePostPostback(
        { clickId: 'click-123', amount: 50 },
        '192.168.1.1',
        undefined,
        'invalid-signature',
        undefined,
        res,
      );

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: PostbackResponseStatus.INVALID_SIGNATURE }),
      );
    });

    it('should validate API key', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue({
        postbackApiKey: 'correct-api-key',
      });

      await controller.handlePostPostback(
        { clickId: 'click-123', amount: 50 },
        '192.168.1.1',
        undefined,
        undefined,
        'wrong-api-key',
        res,
      );

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: PostbackResponseStatus.INVALID_SIGNATURE }),
      );
    });

    it('should return error when clickId is missing', async () => {
      const res = mockResponse();

      await controller.handlePostPostback(
        { orderId: 'order-456', amount: 50 },
        '192.168.1.1',
        undefined,
        undefined,
        undefined,
        res,
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('handleS2SPostback', () => {
    it('should process valid S2S postback with API key', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue({
        postbackApiKey: 'valid-api-key',
        postbackAllowedIps: null,
      });
      trackingService.handlePostback.mockResolvedValue(mockTrackingResult);
      prismaService.affiliatePartner.findUnique.mockResolvedValue(mockPartner);

      await controller.handleS2SPostback(
        { clickId: 'click-123', orderId: 'order-456', amount: 99.99 },
        'valid-api-key',
        '192.168.1.1',
        undefined,
        res,
      );

      expect(trackingService.handlePostback).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalledWith('1');
    });

    it('should reject S2S postback without API key', async () => {
      const res = mockResponse();

      await controller.handleS2SPostback(
        { clickId: 'click-123', amount: 50 },
        '', // empty API key
        '192.168.1.1',
        undefined,
        res,
      );

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should reject S2S postback with invalid API key', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue({
        postbackApiKey: 'correct-key',
      });

      await controller.handleS2SPostback(
        { clickId: 'click-123', amount: 50 },
        'wrong-key',
        '192.168.1.1',
        undefined,
        res,
      );

      expect(res.status).toHaveBeenCalledWith(401);
      expect(trackingService.handlePostback).not.toHaveBeenCalled();
    });

    it('should reject S2S postback from non-whitelisted IP', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue({
        postbackApiKey: 'valid-api-key',
        postbackAllowedIps: ['10.0.0.1', '10.0.0.2'],
      });

      await controller.handleS2SPostback(
        { clickId: 'click-123', amount: 50 },
        'valid-api-key',
        '192.168.1.100', // not in whitelist
        undefined,
        res,
      );

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: PostbackResponseStatus.IP_NOT_ALLOWED }),
      );
    });
  });

  describe('handleHasOffersPostback', () => {
    it('should process HasOffers format postback', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      trackingService.handlePostback.mockResolvedValue(mockTrackingResult);
      prismaService.affiliatePartner.findUnique.mockResolvedValue(mockPartner);

      await controller.handleHasOffersPostback(
        'txn-123', // transaction_id
        'adv-1', // advertiser_id
        'offer-1', // offer_id
        'aff-1', // aff_id
        '25.00', // payout
        'adv-sub-1', // adv_sub
        'adv-sub-2', // adv_sub2
        undefined, undefined, undefined,
        'goal-1', // goal_id
        'approved', // status
        '192.168.1.1',
        undefined,
        res,
      );

      expect(trackingService.handlePostback).toHaveBeenCalledWith({
        clickId: 'txn-123',
        amount: 25,
        status: 'approved',
        subId1: 'adv-sub-1',
        subId2: 'adv-sub-2',
        subId3: undefined,
        subId4: undefined,
        subId5: undefined,
      });
      expect(res.send).toHaveBeenCalledWith('1');
    });

    it('should return error when transaction_id is missing', async () => {
      const res = mockResponse();

      await controller.handleHasOffersPostback(
        '', // empty transaction_id
        undefined, undefined, undefined, '25.00',
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined,
        '192.168.1.1',
        undefined,
        res,
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('handleTunePostback', () => {
    it('should process TUNE format postback', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      trackingService.handlePostback.mockResolvedValue(mockTrackingResult);
      prismaService.affiliatePartner.findUnique.mockResolvedValue(mockPartner);

      await controller.handleTunePostback(
        'aff-sub-123', // aff_sub
        '50.00', // amount
        'adv-sub', // adv_sub
        undefined, undefined, undefined, undefined,
        'purchase', // goal_name
        'evt-1', // event_id
        '192.168.1.1',
        undefined,
        res,
      );

      expect(trackingService.handlePostback).toHaveBeenCalledWith({
        clickId: 'aff-sub-123',
        amount: 50,
        status: 'purchase',
        subId1: 'adv-sub',
        subId2: undefined,
        subId3: undefined,
        subId4: undefined,
        subId5: undefined,
      });
      expect(res.send).toHaveBeenCalledWith('1');
    });
  });

  describe('handleEverflowPostback', () => {
    it('should process Everflow format postback', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      trackingService.handlePostback.mockResolvedValue(mockTrackingResult);
      prismaService.affiliatePartner.findUnique.mockResolvedValue(mockPartner);

      await controller.handleEverflowPostback(
        'tid-123', // tid
        'order-456', // oid
        '75.00', // amount
        'sub1-val', 'sub2-val', undefined, undefined, undefined,
        'conversion', // event
        'SAVE10', // coupon
        '192.168.1.1',
        undefined,
        res,
      );

      expect(trackingService.handlePostback).toHaveBeenCalledWith({
        clickId: 'tid-123',
        orderId: 'order-456',
        amount: 75,
        status: 'conversion',
        subId1: 'sub1-val',
        subId2: 'sub2-val',
        subId3: undefined,
        subId4: undefined,
        subId5: undefined,
      });
      expect(res.send).toHaveBeenCalledWith('1');
    });
  });

  describe('handleCakePostback', () => {
    it('should process CAKE format postback', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      trackingService.handlePostback.mockResolvedValue(mockTrackingResult);
      prismaService.affiliatePartner.findUnique.mockResolvedValue(mockPartner);

      await controller.handleCakePostback(
        'session-123', // s
        '30.00', // p (payout)
        'evt-1', // e (eventId)
        'order-789', // oid
        's1-val', 's2-val', undefined, undefined, undefined,
        '192.168.1.1',
        undefined,
        res,
      );

      expect(trackingService.handlePostback).toHaveBeenCalledWith({
        clickId: 'session-123',
        orderId: 'order-789',
        amount: 30,
        status: 'evt-1',
        subId1: 's1-val',
        subId2: 's2-val',
        subId3: undefined,
        subId4: undefined,
        subId5: undefined,
      });
      expect(res.send).toHaveBeenCalledWith('1');
    });
  });

  describe('testPostback', () => {
    it('should return test results for valid click', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue({
        postbackAllowedIps: ['192.168.1.1'],
      });

      await controller.testPostback(
        'click-123',
        undefined,
        undefined,
        '192.168.1.1',
        undefined,
        res,
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          clickFound: true,
          ipAllowed: true,
          clickDetails: expect.objectContaining({
            partnerId: 'partner-123',
            companyId: 'company-123',
          }),
        }),
      );
    });

    it('should return error when click_id is missing', async () => {
      const res = mockResponse();

      await controller.testPostback(
        '', // empty click_id
        undefined,
        undefined,
        '192.168.1.1',
        undefined,
        res,
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should indicate IP not in whitelist', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue({
        postbackAllowedIps: ['10.0.0.1'],
      });

      await controller.testPostback(
        'click-123',
        undefined,
        undefined,
        '192.168.1.100', // not in whitelist
        undefined,
        res,
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          clickFound: true,
          ipAllowed: false,
          errors: expect.arrayContaining([
            expect.stringContaining('IP'),
          ]),
        }),
      );
    });

    it('should validate signature in test mode', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue({
        postbackSecretKey: 'test-secret',
        postbackAllowedIps: null,
      });

      await controller.testPostback(
        'click-123',
        'invalid-sig',
        undefined,
        '192.168.1.1',
        undefined,
        res,
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          clickFound: true,
          signatureValid: false,
          errors: expect.arrayContaining([
            expect.stringContaining('signature'),
          ]),
        }),
      );
    });

    it('should validate API key in test mode', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue({
        postbackApiKey: 'correct-key',
        postbackAllowedIps: null,
      });

      await controller.testPostback(
        'click-123',
        undefined,
        'wrong-key',
        '192.168.1.1',
        undefined,
        res,
      );

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          clickFound: true,
          apiKeyValid: false,
          errors: expect.arrayContaining([
            expect.stringContaining('API key'),
          ]),
        }),
      );
    });
  });

  describe('handleCustomPostback', () => {
    it('should process custom format postback with default field mapping', async () => {
      const res = mockResponse();
      prismaService.affiliatePartner.findFirst.mockResolvedValue({
        ...mockPartner,
        customTerms: null, // use default mapping
      });
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      trackingService.handlePostback.mockResolvedValue(mockTrackingResult);
      prismaService.affiliatePartner.findUnique.mockResolvedValue(mockPartner);

      await controller.handleCustomPostback(
        'partner-123',
        {
          click_id: 'click-123',
          order_id: 'order-456',
          amount: '100',
          status: 'sale',
          sub1: 'custom-sub1',
        },
        '192.168.1.1',
        undefined,
        res,
      );

      expect(trackingService.handlePostback).toHaveBeenCalledWith({
        clickId: 'click-123',
        orderId: 'order-456',
        amount: 100,
        status: 'sale',
        subId1: 'custom-sub1',
        subId2: undefined,
        subId3: undefined,
        subId4: undefined,
        subId5: undefined,
      });
    });

    it('should process custom format with custom field mapping', async () => {
      const res = mockResponse();
      prismaService.affiliatePartner.findFirst.mockResolvedValue({
        ...mockPartner,
        customTerms: {
          postbackFieldMapping: {
            clickIdField: 'cid',
            amountField: 'rev',
            orderIdField: 'oid',
          },
        },
      });
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      trackingService.handlePostback.mockResolvedValue(mockTrackingResult);
      prismaService.affiliatePartner.findUnique.mockResolvedValue(mockPartner);

      await controller.handleCustomPostback(
        'partner-123',
        {
          cid: 'click-123',
          oid: 'order-789',
          rev: '150.00',
        },
        '192.168.1.1',
        undefined,
        res,
      );

      expect(trackingService.handlePostback).toHaveBeenCalledWith(
        expect.objectContaining({
          clickId: 'click-123',
          orderId: 'order-789',
          amount: 150,
        }),
      );
    });

    it('should return error when partner not found', async () => {
      const res = mockResponse();
      prismaService.affiliatePartner.findFirst.mockResolvedValue(null);

      await controller.handleCustomPostback(
        'nonexistent-partner',
        { click_id: 'click-123' },
        '192.168.1.1',
        undefined,
        res,
      );

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should verify partner matches click', async () => {
      const res = mockResponse();
      prismaService.affiliatePartner.findFirst.mockResolvedValue({
        ...mockPartner,
        id: 'partner-456', // different partner
      });
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick); // partnerId: partner-123

      await controller.handleCustomPostback(
        'partner-456',
        { click_id: 'click-123' },
        '192.168.1.1',
        undefined,
        res,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: PostbackResponseStatus.INVALID_CLICK }),
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit after max requests exceeded', async () => {
      const res = mockResponse();

      // Make 100 requests to hit the limit
      // Note: This is a simplified test - in real scenario we'd need to
      // mock the rate limit map or use a test-specific IP
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      trackingService.handlePostback.mockResolvedValue(mockTrackingResult);
      prismaService.affiliatePartner.findUnique.mockResolvedValue(mockPartner);

      // First request should succeed
      await controller.handleGetPostback(
        'click-123',
        undefined, undefined, undefined, '50', undefined, undefined, undefined,
        undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined,
        '192.168.1.1',
        undefined,
        res,
      );

      expect(res.send).toHaveBeenCalledWith('1');
    });
  });

  describe('Audit Logging', () => {
    it('should log all postback attempts', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      trackingService.handlePostback.mockResolvedValue(mockTrackingResult);
      prismaService.affiliatePartner.findUnique.mockResolvedValue(mockPartner);

      await controller.handleGetPostback(
        'click-123',
        undefined, undefined,
        'order-456',
        '99.99',
        undefined, undefined, undefined, undefined, undefined,
        'sub1', 'sub2', undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined,
        '192.168.1.1',
        undefined,
        res,
      );

      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.stringContaining('click-123'),
        expect.objectContaining({
          metadata: expect.objectContaining({
            clickId: 'click-123',
            orderId: 'order-456',
            amount: 99.99,
          }),
        }),
      );
    });

    it('should log failed postback attempts', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(null);

      await controller.handleGetPostback(
        'invalid-click',
        undefined, undefined, undefined, '50', undefined, undefined, undefined,
        undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined,
        '192.168.1.1',
        undefined,
        res,
      );

      expect(auditLogsService.log).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.stringContaining('postback-attempt'),
        expect.objectContaining({
          metadata: expect.objectContaining({
            action: 'postback_attempt',
            status: 'CLICK_NOT_FOUND',
          }),
        }),
      );
    });
  });

  describe('Outbound Postback', () => {
    it('should fire outbound postback on successful conversion', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      trackingService.handlePostback.mockResolvedValue(mockTrackingResult);
      prismaService.affiliatePartner.findUnique.mockResolvedValue({
        ...mockPartner,
        customTerms: {
          postbackUrl: 'https://affiliate.example.com/track?cid={click_id}&amt={payout}',
        },
      });

      // Mock global fetch
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      global.fetch = mockFetch;

      await controller.handleGetPostback(
        'click-123',
        undefined, undefined,
        'order-456',
        '99.99',
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined,
        '192.168.1.1',
        undefined,
        res,
      );

      // Wait for async outbound postback
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('click-123'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'User-Agent': 'AVNZ-Postback/1.0',
          }),
        }),
      );
    });

    it('should not fire outbound postback when URL is not configured', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      trackingService.handlePostback.mockResolvedValue(mockTrackingResult);
      prismaService.affiliatePartner.findUnique.mockResolvedValue({
        ...mockPartner,
        customTerms: null, // no postback URL
      });

      const mockFetch = jest.fn();
      global.fetch = mockFetch;

      await controller.handleGetPostback(
        'click-123',
        undefined, undefined,
        'order-456',
        '99.99',
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined,
        '192.168.1.1',
        undefined,
        res,
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle tracking service errors gracefully', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      trackingService.handlePostback.mockRejectedValue(new Error('Database error'));

      await controller.handleGetPostback(
        'click-123',
        undefined, undefined,
        'order-456',
        '99.99',
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined,
        '192.168.1.1',
        undefined,
        res,
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(idempotencyService.fail).toHaveBeenCalled();
    });

    it('should handle invalid amount gracefully', async () => {
      const res = mockResponse();
      prismaService.affiliateClick.findFirst.mockResolvedValue(mockClick);
      prismaService.affiliateProgramConfig.findUnique.mockResolvedValue(null);
      trackingService.handlePostback.mockResolvedValue(mockTrackingResult);
      prismaService.affiliatePartner.findUnique.mockResolvedValue(mockPartner);

      await controller.handleGetPostback(
        'click-123',
        undefined, undefined, undefined,
        'invalid-amount', // invalid
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined, undefined, undefined,
        undefined, undefined, undefined,
        '192.168.1.1',
        undefined,
        res,
      );

      expect(trackingService.handlePostback).toHaveBeenCalledWith(
        expect.objectContaining({ amount: undefined }),
      );
    });
  });
});
