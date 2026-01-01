/**
 * Cross-Site Session Controller Tests
 * Testing API endpoints for cross-site session management (authenticated and public)
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  CrossSiteSessionController,
  PublicCrossSiteSessionController,
} from './cross-site-session.controller';
import { CrossSiteSessionService } from '../services/cross-site-session.service';
import { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { ScopeType } from '@prisma/client';
import {
  CrossSiteSessionData,
  SessionDataType,
  SessionMigrationResult,
  SessionStatus,
  SessionSummary,
} from '../types/cross-site-session.types';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('CrossSiteSessionController', () => {
  let controller: CrossSiteSessionController;
  let crossSiteSessionService: jest.Mocked<CrossSiteSessionService>;

  const mockCompanyId = 'company-123';
  const mockClientId = 'client-456';
  const mockSessionId = 'session-789';
  const mockSessionToken = 'b1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    sub: 'user-1',
    email: 'user@company.com',
    scopeType: 'COMPANY' as ScopeType,
    scopeId: mockCompanyId,
    companyId: mockCompanyId,
    clientId: mockClientId,
    organizationId: 'org-1',
    role: 'ADMIN',
  };

  const mockSessionData: CrossSiteSessionData = {
    id: mockSessionId,
    companyId: mockCompanyId,
    sessionToken: mockSessionToken,
    customerId: mockUser.id,
    status: SessionStatus.ACTIVE,
    dataReferences: [
      {
        type: SessionDataType.CART,
        entityId: 'cart-123',
        siteId: 'site-1',
        lastUpdated: new Date(),
      },
    ],
    deviceInfo: {
      userAgent: 'Mozilla/5.0',
      ipAddress: '192.168.1.1',
    },
    firstSeenAt: new Date(),
    lastActiveAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSessionSummary: SessionSummary = {
    sessionId: mockSessionId,
    cartItemCount: 3,
    wishlistItemCount: 5,
    comparisonItemCount: 2,
    lastActiveAt: new Date(),
    activeSites: ['site-1', 'site-2'],
  };

  const mockMergeResult: SessionMigrationResult = {
    success: true,
    sourceSessionId: 'guest-session-123',
    targetSessionId: mockSessionId,
    migratedData: {
      cart: { itemCount: 2, cartId: 'cart-456' },
      wishlist: { itemCount: 3, wishlistId: 'wishlist-789' },
    },
    conflicts: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrossSiteSessionController],
      providers: [
        {
          provide: CrossSiteSessionService,
          useValue: {
            getSessionByCustomerId: jest.fn(),
            getSessionById: jest.fn(),
            getSessionByToken: jest.fn(),
            getOrCreateSession: jest.fn(),
            createSession: jest.fn(),
            transferSession: jest.fn(),
            mergeSessions: jest.fn(),
            mergeSessionsOnLogin: jest.fn(),
            getSessionSummary: jest.fn(),
            updateActivity: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CrossSiteSessionController>(CrossSiteSessionController);
    crossSiteSessionService = module.get(CrossSiteSessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSession', () => {
    it('should return existing session for user', async () => {
      crossSiteSessionService.getSessionByCustomerId.mockResolvedValue(mockSessionData);

      const result = await controller.getSession(mockUser);

      expect(result).toEqual(mockSessionData);
      expect(crossSiteSessionService.getSessionByCustomerId).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.companyId,
      );
    });

    it('should create new session if none exists', async () => {
      crossSiteSessionService.getSessionByCustomerId.mockResolvedValue(null);
      crossSiteSessionService.getOrCreateSession.mockResolvedValue(mockSessionData);

      const result = await controller.getSession(mockUser);

      expect(result).toEqual(mockSessionData);
      expect(crossSiteSessionService.getOrCreateSession).toHaveBeenCalledWith(mockUser.companyId, {
        customerId: mockUser.id,
      });
    });

    it('should not create session if user already has one', async () => {
      crossSiteSessionService.getSessionByCustomerId.mockResolvedValue(mockSessionData);

      await controller.getSession(mockUser);

      expect(crossSiteSessionService.getOrCreateSession).not.toHaveBeenCalled();
    });

    it('should work with CLIENT scope type user', async () => {
      const clientUser: AuthenticatedUser = {
        id: 'user-client',
        sub: 'user-client',
        email: 'client@example.com',
        scopeType: 'CLIENT' as ScopeType,
        scopeId: 'client-123',
        clientId: 'client-123',
        companyId: 'company-abc',
        organizationId: 'org-1',
        role: 'ADMIN',
      };

      crossSiteSessionService.getSessionByCustomerId.mockResolvedValue(mockSessionData);

      await controller.getSession(clientUser);

      expect(crossSiteSessionService.getSessionByCustomerId).toHaveBeenCalledWith(
        'user-client',
        'company-abc',
      );
    });

    it('should work with ORGANIZATION scope type user', async () => {
      const orgUser: AuthenticatedUser = {
        id: 'user-org',
        sub: 'user-org',
        email: 'org@example.com',
        scopeType: 'ORGANIZATION' as ScopeType,
        scopeId: 'org-123',
        organizationId: 'org-123',
        role: 'SUPER_ADMIN',
      };

      crossSiteSessionService.getSessionByCustomerId.mockResolvedValue(null);
      crossSiteSessionService.getOrCreateSession.mockResolvedValue(mockSessionData);

      await controller.getSession(orgUser);

      expect(crossSiteSessionService.getSessionByCustomerId).toHaveBeenCalledWith(
        'user-org',
        undefined,
      );
    });
  });

  describe('transferSession', () => {
    const transferDto = {
      targetSiteId: 'site-2',
      dataTypes: [SessionDataType.CART, SessionDataType.WISHLIST],
    };

    it('should transfer session to another site', async () => {
      crossSiteSessionService.getSessionByCustomerId.mockResolvedValue(mockSessionData);
      crossSiteSessionService.transferSession.mockResolvedValue(mockSessionData);

      const result = await controller.transferSession(mockUser, transferDto);

      expect(result).toEqual(mockSessionData);
      expect(crossSiteSessionService.transferSession).toHaveBeenCalledWith(
        mockSessionToken,
        { targetSiteId: 'site-2', dataTypes: transferDto.dataTypes },
        mockUser.id,
      );
    });

    it('should throw NotFoundException when session not found', async () => {
      crossSiteSessionService.getSessionByCustomerId.mockResolvedValue(null);

      await expect(controller.transferSession(mockUser, transferDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.transferSession(mockUser, transferDto)).rejects.toThrow(
        'Session not found',
      );
    });

    it('should transfer all data types when not specified', async () => {
      const minimalTransferDto = { targetSiteId: 'site-3' };
      crossSiteSessionService.getSessionByCustomerId.mockResolvedValue(mockSessionData);
      crossSiteSessionService.transferSession.mockResolvedValue(mockSessionData);

      await controller.transferSession(mockUser, minimalTransferDto);

      expect(crossSiteSessionService.transferSession).toHaveBeenCalledWith(
        mockSessionToken,
        { targetSiteId: 'site-3', dataTypes: undefined },
        mockUser.id,
      );
    });

    it('should pass user ID as actorId for audit logging', async () => {
      crossSiteSessionService.getSessionByCustomerId.mockResolvedValue(mockSessionData);
      crossSiteSessionService.transferSession.mockResolvedValue(mockSessionData);

      await controller.transferSession(mockUser, transferDto);

      expect(crossSiteSessionService.transferSession).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        mockUser.id,
      );
    });
  });

  describe('mergeSession', () => {
    const mergeDto = { sourceSessionId: 'guest-session-123' };

    it('should merge guest session into user session', async () => {
      crossSiteSessionService.getOrCreateSession.mockResolvedValue(mockSessionData);
      crossSiteSessionService.mergeSessions.mockResolvedValue(mockMergeResult);

      const result = await controller.mergeSession(mockUser, mergeDto);

      expect(result).toEqual(mockMergeResult);
      expect(crossSiteSessionService.getOrCreateSession).toHaveBeenCalledWith(mockUser.companyId, {
        customerId: mockUser.id,
      });
      expect(crossSiteSessionService.mergeSessions).toHaveBeenCalledWith(
        mergeDto.sourceSessionId,
        mockSessionId,
        mockUser.id,
      );
    });

    it('should create user session if none exists before merging', async () => {
      const newSession = { ...mockSessionData, id: 'new-session-id' };
      crossSiteSessionService.getOrCreateSession.mockResolvedValue(newSession);
      crossSiteSessionService.mergeSessions.mockResolvedValue({
        ...mockMergeResult,
        targetSessionId: 'new-session-id',
      });

      await controller.mergeSession(mockUser, mergeDto);

      expect(crossSiteSessionService.getOrCreateSession).toHaveBeenCalledWith(mockUser.companyId, {
        customerId: mockUser.id,
      });
    });

    it('should pass user ID as actorId for audit logging', async () => {
      crossSiteSessionService.getOrCreateSession.mockResolvedValue(mockSessionData);
      crossSiteSessionService.mergeSessions.mockResolvedValue(mockMergeResult);

      await controller.mergeSession(mockUser, mergeDto);

      expect(crossSiteSessionService.mergeSessions).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        mockUser.id,
      );
    });
  });

  describe('getSessionSummary', () => {
    it('should return session summary with all data counts', async () => {
      crossSiteSessionService.getSessionByCustomerId.mockResolvedValue(mockSessionData);
      crossSiteSessionService.getSessionSummary.mockResolvedValue(mockSessionSummary);

      const result = await controller.getSessionSummary(mockUser);

      expect(result).toEqual(mockSessionSummary);
      expect(crossSiteSessionService.getSessionSummary).toHaveBeenCalledWith(mockSessionId);
    });

    it('should return empty summary when no session exists', async () => {
      crossSiteSessionService.getSessionByCustomerId.mockResolvedValue(null);

      const result = await controller.getSessionSummary(mockUser);

      expect(result).toEqual({
        sessionId: null,
        cartItemCount: 0,
        wishlistItemCount: 0,
        comparisonItemCount: 0,
        totalItemCount: 0,
        lastActivity: null,
      });
      expect(crossSiteSessionService.getSessionSummary).not.toHaveBeenCalled();
    });

    it('should fetch session before getting summary', async () => {
      crossSiteSessionService.getSessionByCustomerId.mockResolvedValue(mockSessionData);
      crossSiteSessionService.getSessionSummary.mockResolvedValue(mockSessionSummary);

      await controller.getSessionSummary(mockUser);

      // Verify both methods were called
      expect(crossSiteSessionService.getSessionByCustomerId).toHaveBeenCalled();
      expect(crossSiteSessionService.getSessionSummary).toHaveBeenCalled();
    });
  });
});

describe('PublicCrossSiteSessionController', () => {
  let controller: PublicCrossSiteSessionController;
  let crossSiteSessionService: jest.Mocked<CrossSiteSessionService>;

  const mockCompanyId = 'company-123';
  const mockSessionId = 'session-789';
  const mockSessionToken = 'b1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

  const mockSessionData: CrossSiteSessionData = {
    id: mockSessionId,
    companyId: mockCompanyId,
    sessionToken: mockSessionToken,
    status: SessionStatus.ACTIVE,
    dataReferences: [],
    firstSeenAt: new Date(),
    lastActiveAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSessionSummary: SessionSummary = {
    sessionId: mockSessionId,
    cartItemCount: 3,
    wishlistItemCount: 5,
    comparisonItemCount: 2,
    lastActiveAt: new Date(),
    activeSites: ['site-1'],
  };

  const emptySessionResponse = {
    id: null,
    sessionToken: null,
    cartItemCount: 0,
    wishlistItemCount: 0,
    comparisonItemCount: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicCrossSiteSessionController],
      providers: [
        {
          provide: CrossSiteSessionService,
          useValue: {
            getSessionById: jest.fn(),
            getSessionByToken: jest.fn(),
            getOrCreateSession: jest.fn(),
            createSession: jest.fn(),
            transferSession: jest.fn(),
            updateActivity: jest.fn(),
            getSessionSummary: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PublicCrossSiteSessionController>(PublicCrossSiteSessionController);
    crossSiteSessionService = module.get(CrossSiteSessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSession', () => {
    it('should return session by token', async () => {
      crossSiteSessionService.getSessionByToken.mockResolvedValue(mockSessionData);

      const result = await controller.getSession(mockSessionToken, mockCompanyId);

      expect(result).toEqual(mockSessionData);
      expect(crossSiteSessionService.getSessionByToken).toHaveBeenCalledWith(
        mockSessionToken,
        mockCompanyId,
      );
    });

    it('should return empty response when no session token', async () => {
      const result = await controller.getSession('', mockCompanyId);

      expect(result).toEqual(emptySessionResponse);
      expect(crossSiteSessionService.getSessionByToken).not.toHaveBeenCalled();
    });

    it('should return empty response when no company ID', async () => {
      const result = await controller.getSession(mockSessionToken, '');

      expect(result).toEqual(emptySessionResponse);
      expect(crossSiteSessionService.getSessionByToken).not.toHaveBeenCalled();
    });

    it('should return empty response when both headers missing', async () => {
      const result = await controller.getSession('', '');

      expect(result).toEqual(emptySessionResponse);
      expect(crossSiteSessionService.getSessionByToken).not.toHaveBeenCalled();
    });

    it('should return empty response when session not found', async () => {
      crossSiteSessionService.getSessionByToken.mockResolvedValue(null);

      const result = await controller.getSession(mockSessionToken, mockCompanyId);

      expect(result).toEqual(emptySessionResponse);
    });

    it('should return empty response when session token is undefined', async () => {
      const result = await controller.getSession(undefined as unknown as string, mockCompanyId);

      expect(result).toEqual(emptySessionResponse);
      expect(crossSiteSessionService.getSessionByToken).not.toHaveBeenCalled();
    });

    it('should return empty response when company ID is undefined', async () => {
      const result = await controller.getSession(
        mockSessionToken,
        undefined as unknown as string,
      );

      expect(result).toEqual(emptySessionResponse);
      expect(crossSiteSessionService.getSessionByToken).not.toHaveBeenCalled();
    });
  });

  describe('createSession', () => {
    const createDto = {
      siteId: 'site-123',
      visitorId: 'visitor-456',
      deviceFingerprint: 'fingerprint-abc',
      userAgent: 'Mozilla/5.0',
      ipAddress: '192.168.1.1',
    };

    it('should create new anonymous session', async () => {
      crossSiteSessionService.getOrCreateSession.mockResolvedValue(mockSessionData);

      const result = await controller.createSession(mockCompanyId, createDto);

      expect(result).toEqual(mockSessionData);
      expect(crossSiteSessionService.getOrCreateSession).toHaveBeenCalledWith(mockCompanyId, {
        siteId: 'site-123',
        visitorId: 'visitor-456',
        deviceFingerprint: 'fingerprint-abc',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
      });
    });

    it('should throw BadRequestException when company ID is missing', async () => {
      await expect(controller.createSession('', createDto)).rejects.toThrow(BadRequestException);
      await expect(controller.createSession('', createDto)).rejects.toThrow(
        'Company ID is required',
      );
    });

    it('should create session with minimal data', async () => {
      const minimalDto = {};
      crossSiteSessionService.getOrCreateSession.mockResolvedValue(mockSessionData);

      await controller.createSession(mockCompanyId, minimalDto);

      expect(crossSiteSessionService.getOrCreateSession).toHaveBeenCalledWith(mockCompanyId, {
        siteId: undefined,
        visitorId: undefined,
        deviceFingerprint: undefined,
        userAgent: undefined,
        ipAddress: undefined,
      });
    });

    it('should create session with only siteId', async () => {
      const siteOnlyDto = { siteId: 'main-site' };
      crossSiteSessionService.getOrCreateSession.mockResolvedValue(mockSessionData);

      await controller.createSession(mockCompanyId, siteOnlyDto);

      expect(crossSiteSessionService.getOrCreateSession).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({ siteId: 'main-site' }),
      );
    });
  });

  describe('transferSession', () => {
    const transferDto = {
      targetSiteId: 'site-2',
      dataTypes: [SessionDataType.CART],
    };

    it('should transfer session with valid session token', async () => {
      crossSiteSessionService.getSessionById.mockResolvedValue(mockSessionData);
      crossSiteSessionService.transferSession.mockResolvedValue(mockSessionData);

      const result = await controller.transferSession(
        mockSessionId,
        mockSessionToken,
        mockCompanyId,
        transferDto,
      );

      expect(result).toEqual(mockSessionData);
      expect(crossSiteSessionService.transferSession).toHaveBeenCalledWith(mockSessionToken, {
        targetSiteId: 'site-2',
        dataTypes: [SessionDataType.CART],
      });
    });

    it('should throw ForbiddenException when session token is missing', async () => {
      await expect(
        controller.transferSession(mockSessionId, '', mockCompanyId, transferDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.transferSession(mockSessionId, '', mockCompanyId, transferDto),
      ).rejects.toThrow('Session token required for session operations');
    });

    it('should throw ForbiddenException when session token is undefined', async () => {
      await expect(
        controller.transferSession(
          mockSessionId,
          undefined as unknown as string,
          mockCompanyId,
          transferDto,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when session not found', async () => {
      crossSiteSessionService.getSessionById.mockResolvedValue(null as unknown as CrossSiteSessionData);

      await expect(
        controller.transferSession(mockSessionId, mockSessionToken, mockCompanyId, transferDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when company ID does not match', async () => {
      crossSiteSessionService.getSessionById.mockResolvedValue(mockSessionData);

      await expect(
        controller.transferSession(mockSessionId, mockSessionToken, 'wrong-company', transferDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.transferSession(mockSessionId, mockSessionToken, 'wrong-company', transferDto),
      ).rejects.toThrow('Access denied to this session');
    });

    it('should throw ForbiddenException when session token mismatch', async () => {
      crossSiteSessionService.getSessionById.mockResolvedValue(mockSessionData);

      await expect(
        controller.transferSession(mockSessionId, '0000000000000000000000000000000000000000000000000000000000000000', mockCompanyId, transferDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.transferSession(mockSessionId, '0000000000000000000000000000000000000000000000000000000000000000', mockCompanyId, transferDto),
      ).rejects.toThrow('Session token mismatch - access denied');
    });
  });

  describe('updateActivity', () => {
    const activityDto = {
      currentSiteId: 'site-2',
      currentPage: '/products/123',
    };

    it('should update session activity with valid token', async () => {
      crossSiteSessionService.getSessionById.mockResolvedValue(mockSessionData);
      crossSiteSessionService.updateActivity.mockResolvedValue(mockSessionData);

      const result = await controller.updateActivity(
        mockSessionId,
        mockSessionToken,
        mockCompanyId,
        activityDto,
      );

      expect(result).toEqual(mockSessionData);
      expect(crossSiteSessionService.updateActivity).toHaveBeenCalledWith(mockSessionId, {
        currentSiteId: 'site-2',
        currentPage: '/products/123',
      });
    });

    it('should throw ForbiddenException when session token is missing', async () => {
      await expect(
        controller.updateActivity(mockSessionId, '', mockCompanyId, activityDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when session not found', async () => {
      crossSiteSessionService.getSessionById.mockResolvedValue(null as unknown as CrossSiteSessionData);

      await expect(
        controller.updateActivity(mockSessionId, mockSessionToken, mockCompanyId, activityDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when session token mismatch', async () => {
      crossSiteSessionService.getSessionById.mockResolvedValue(mockSessionData);

      await expect(
        controller.updateActivity(mockSessionId, '0000000000000000000000000000000000000000000000000000000000000000', mockCompanyId, activityDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.updateActivity(mockSessionId, '0000000000000000000000000000000000000000000000000000000000000000', mockCompanyId, activityDto),
      ).rejects.toThrow('Session token mismatch - access denied');
    });

    it('should throw ForbiddenException when company ID mismatch', async () => {
      crossSiteSessionService.getSessionById.mockResolvedValue(mockSessionData);

      await expect(
        controller.updateActivity(mockSessionId, mockSessionToken, 'wrong-company', activityDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.updateActivity(mockSessionId, mockSessionToken, 'wrong-company', activityDto),
      ).rejects.toThrow('Access denied to this session');
    });

    it('should update activity with minimal data', async () => {
      const minimalDto = {};
      crossSiteSessionService.getSessionById.mockResolvedValue(mockSessionData);
      crossSiteSessionService.updateActivity.mockResolvedValue(mockSessionData);

      await controller.updateActivity(mockSessionId, mockSessionToken, mockCompanyId, minimalDto);

      expect(crossSiteSessionService.updateActivity).toHaveBeenCalledWith(mockSessionId, {
        currentSiteId: undefined,
        currentPage: undefined,
      });
    });
  });

  describe('getSessionSummary', () => {
    it('should return session summary with valid token', async () => {
      crossSiteSessionService.getSessionById.mockResolvedValue(mockSessionData);
      crossSiteSessionService.getSessionSummary.mockResolvedValue(mockSessionSummary);

      const result = await controller.getSessionSummary(
        mockSessionId,
        mockSessionToken,
        mockCompanyId,
      );

      expect(result).toEqual(mockSessionSummary);
      expect(crossSiteSessionService.getSessionSummary).toHaveBeenCalledWith(mockSessionId);
    });

    it('should throw ForbiddenException when session token is missing', async () => {
      await expect(
        controller.getSessionSummary(mockSessionId, '', mockCompanyId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when session not found', async () => {
      crossSiteSessionService.getSessionById.mockResolvedValue(null as unknown as CrossSiteSessionData);

      await expect(
        controller.getSessionSummary(mockSessionId, mockSessionToken, mockCompanyId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when session token mismatch', async () => {
      crossSiteSessionService.getSessionById.mockResolvedValue(mockSessionData);

      await expect(
        controller.getSessionSummary(mockSessionId, '0000000000000000000000000000000000000000000000000000000000000000', mockCompanyId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when company ID mismatch', async () => {
      crossSiteSessionService.getSessionById.mockResolvedValue(mockSessionData);

      await expect(
        controller.getSessionSummary(mockSessionId, mockSessionToken, 'wrong-company'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Security - Session Token Validation', () => {
    it('should validate session token before allowing transfer', async () => {
      await expect(
        controller.transferSession(mockSessionId, '', mockCompanyId, { targetSiteId: 'site-1' }),
      ).rejects.toThrow('Session token required for session operations');
    });

    it('should validate session token before allowing activity update', async () => {
      await expect(
        controller.updateActivity(mockSessionId, '', mockCompanyId, {}),
      ).rejects.toThrow('Session token required for session operations');
    });

    it('should validate session token before allowing summary', async () => {
      await expect(
        controller.getSessionSummary(mockSessionId, '', mockCompanyId),
      ).rejects.toThrow('Session token required for session operations');
    });

    it('should validate company ID before checking token match', async () => {
      const differentCompanySession = { ...mockSessionData, companyId: 'different-company' };
      crossSiteSessionService.getSessionById.mockResolvedValue(differentCompanySession);

      await expect(
        controller.transferSession(mockSessionId, mockSessionToken, mockCompanyId, {
          targetSiteId: 'site-1',
        }),
      ).rejects.toThrow('Access denied to this session');
    });

    it('should validate token match after company validation', async () => {
      crossSiteSessionService.getSessionById.mockResolvedValue(mockSessionData);

      await expect(
        controller.transferSession(mockSessionId, '0000000000000000000000000000000000000000000000000000000000000000', mockCompanyId, {
          targetSiteId: 'site-1',
        }),
      ).rejects.toThrow('Session token mismatch - access denied');
    });
  });
});

describe('CrossSiteSessionController - Edge Cases', () => {
  let controller: CrossSiteSessionController;
  let crossSiteSessionService: jest.Mocked<CrossSiteSessionService>;

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    sub: 'user-1',
    email: 'user@company.com',
    scopeType: 'COMPANY' as ScopeType,
    scopeId: 'company-123',
    companyId: 'company-123',
    clientId: 'client-456',
    organizationId: 'org-1',
    role: 'ADMIN',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrossSiteSessionController],
      providers: [
        {
          provide: CrossSiteSessionService,
          useValue: {
            getSessionByCustomerId: jest.fn(),
            getSessionById: jest.fn(),
            getOrCreateSession: jest.fn(),
            transferSession: jest.fn(),
            mergeSessions: jest.fn(),
            getSessionSummary: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CrossSiteSessionController>(CrossSiteSessionController);
    crossSiteSessionService = module.get(CrossSiteSessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User with undefined companyId', () => {
    it('should handle user without companyId in getSession', async () => {
      const userNoCompany = { ...mockUser, companyId: undefined };
      crossSiteSessionService.getSessionByCustomerId.mockResolvedValue(null);
      crossSiteSessionService.getOrCreateSession.mockResolvedValue({
        id: 'session-1',
        companyId: userNoCompany.scopeId,
        sessionToken: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        status: SessionStatus.ACTIVE,
        dataReferences: [],
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as CrossSiteSessionData);

      await controller.getSession(userNoCompany);

      expect(crossSiteSessionService.getSessionByCustomerId).toHaveBeenCalledWith(
        userNoCompany.id,
        undefined,
      );
    });
  });

  describe('Session with different data types', () => {
    it('should handle transferring specific data types only', async () => {
      const mockSession: CrossSiteSessionData = {
        id: 'session-1',
        companyId: 'company-123',
        sessionToken: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        customerId: 'user-1',
        status: SessionStatus.ACTIVE,
        dataReferences: [
          { type: SessionDataType.CART, entityId: 'cart-1', siteId: 'site-1', lastUpdated: new Date() },
          { type: SessionDataType.WISHLIST, entityId: 'wish-1', siteId: 'site-1', lastUpdated: new Date() },
          { type: SessionDataType.COMPARISON, entityId: 'comp-1', siteId: 'site-1', lastUpdated: new Date() },
        ],
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      crossSiteSessionService.getSessionByCustomerId.mockResolvedValue(mockSession);
      crossSiteSessionService.transferSession.mockResolvedValue(mockSession);

      await controller.transferSession(mockUser, {
        targetSiteId: 'site-2',
        dataTypes: [SessionDataType.CART],
      });

      expect(crossSiteSessionService.transferSession).toHaveBeenCalledWith(
        'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        { targetSiteId: 'site-2', dataTypes: [SessionDataType.CART] },
        mockUser.id,
      );
    });
  });

  describe('Merge with empty source session', () => {
    it('should handle merge when source has no data', async () => {
      const mockSession: CrossSiteSessionData = {
        id: 'session-1',
        companyId: 'company-123',
        sessionToken: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        status: SessionStatus.ACTIVE,
        dataReferences: [],
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const emptyMergeResult: SessionMigrationResult = {
        success: true,
        sourceSessionId: 'guest-session',
        targetSessionId: 'session-1',
        migratedData: {},
        conflicts: [],
      };

      crossSiteSessionService.getOrCreateSession.mockResolvedValue(mockSession);
      crossSiteSessionService.mergeSessions.mockResolvedValue(emptyMergeResult);

      const result = await controller.mergeSession(mockUser, { sourceSessionId: 'guest-session' });

      expect(result.migratedData).toEqual({});
      expect(result.conflicts).toHaveLength(0);
    });
  });
});

describe('PublicCrossSiteSessionController - Edge Cases', () => {
  let controller: PublicCrossSiteSessionController;
  let crossSiteSessionService: jest.Mocked<CrossSiteSessionService>;

  const mockCompanyId = 'company-123';
  const mockSessionToken = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicCrossSiteSessionController],
      providers: [
        {
          provide: CrossSiteSessionService,
          useValue: {
            getSessionById: jest.fn(),
            getSessionByToken: jest.fn(),
            getOrCreateSession: jest.fn(),
            transferSession: jest.fn(),
            updateActivity: jest.fn(),
            getSessionSummary: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PublicCrossSiteSessionController>(PublicCrossSiteSessionController);
    crossSiteSessionService = module.get(CrossSiteSessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Whitespace handling in headers', () => {
    it('should handle whitespace-only session token as truthy', async () => {
      await controller.getSession('   ', mockCompanyId);

      expect(crossSiteSessionService.getSessionByToken).toHaveBeenCalledWith('   ', mockCompanyId);
    });

    it('should handle whitespace-only company ID as truthy', async () => {
      await controller.getSession(mockSessionToken, '   ');

      expect(crossSiteSessionService.getSessionByToken).toHaveBeenCalledWith(
        mockSessionToken,
        '   ',
      );
    });
  });

  describe('Device info handling', () => {
    it('should handle all device info fields', async () => {
      const mockSession: CrossSiteSessionData = {
        id: 'session-1',
        companyId: mockCompanyId,
        sessionToken: mockSessionToken,
        status: SessionStatus.ACTIVE,
        dataReferences: [],
        deviceInfo: {
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
          fingerprint: 'fp-123',
        },
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      crossSiteSessionService.getOrCreateSession.mockResolvedValue(mockSession);

      const createDto = {
        siteId: 'site-1',
        visitorId: 'visitor-1',
        deviceFingerprint: 'fp-123',
        userAgent: 'Mozilla/5.0',
        ipAddress: '192.168.1.1',
      };

      await controller.createSession(mockCompanyId, createDto);

      expect(crossSiteSessionService.getOrCreateSession).toHaveBeenCalledWith(
        mockCompanyId,
        expect.objectContaining({
          deviceFingerprint: 'fp-123',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
        }),
      );
    });
  });

  describe('Long string handling', () => {
    it('should handle long page URL in activity update', async () => {
      const mockSession: CrossSiteSessionData = {
        id: 'session-1',
        companyId: mockCompanyId,
        sessionToken: mockSessionToken,
        status: SessionStatus.ACTIVE,
        dataReferences: [],
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      crossSiteSessionService.getSessionById.mockResolvedValue(mockSession);
      crossSiteSessionService.updateActivity.mockResolvedValue(mockSession);

      const longUrl = '/products/' + 'a'.repeat(2000);
      const activityDto = { currentPage: longUrl };

      await controller.updateActivity('session-1', mockSessionToken, mockCompanyId, activityDto);

      expect(crossSiteSessionService.updateActivity).toHaveBeenCalledWith(
        'session-1',
        expect.objectContaining({
          currentPage: longUrl,
        }),
      );
    });
  });

  describe('Session with all data types', () => {
    it('should handle session with cart, wishlist, and comparison data', async () => {
      const mockSession: CrossSiteSessionData = {
        id: 'session-1',
        companyId: mockCompanyId,
        sessionToken: mockSessionToken,
        status: SessionStatus.ACTIVE,
        dataReferences: [
          { type: SessionDataType.CART, entityId: 'cart-1', siteId: 'site-1', lastUpdated: new Date() },
          { type: SessionDataType.WISHLIST, entityId: 'wish-1', siteId: 'site-1', lastUpdated: new Date() },
          { type: SessionDataType.COMPARISON, entityId: 'comp-1', siteId: 'site-1', lastUpdated: new Date() },
        ],
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSummary: SessionSummary = {
        sessionId: 'session-1',
        cartItemCount: 5,
        wishlistItemCount: 10,
        comparisonItemCount: 3,
        lastActiveAt: new Date(),
        activeSites: ['site-1', 'site-2'],
      };

      crossSiteSessionService.getSessionById.mockResolvedValue(mockSession);
      crossSiteSessionService.getSessionSummary.mockResolvedValue(mockSummary);

      const result = await controller.getSessionSummary('session-1', mockSessionToken, mockCompanyId);

      expect(result.cartItemCount).toBe(5);
      expect(result.wishlistItemCount).toBe(10);
      expect(result.comparisonItemCount).toBe(3);
      expect(result.activeSites).toHaveLength(2);
    });
  });

  describe('Multiple sites handling', () => {
    it('should handle transferring to different sites', async () => {
      const mockSession: CrossSiteSessionData = {
        id: 'session-1',
        companyId: mockCompanyId,
        sessionToken: mockSessionToken,
        status: SessionStatus.ACTIVE,
        dataReferences: [
          { type: SessionDataType.CART, entityId: 'cart-1', siteId: 'site-1', lastUpdated: new Date() },
        ],
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      crossSiteSessionService.getSessionById.mockResolvedValue(mockSession);
      crossSiteSessionService.transferSession.mockResolvedValue({
        ...mockSession,
        dataReferences: [
          ...mockSession.dataReferences,
          { type: SessionDataType.CART, entityId: 'cart-2', siteId: 'site-2', lastUpdated: new Date() },
        ],
      });

      const result = await controller.transferSession(
        'session-1',
        mockSessionToken,
        mockCompanyId,
        { targetSiteId: 'site-2', dataTypes: [SessionDataType.CART] },
      );

      expect(result.dataReferences).toHaveLength(2);
    });
  });

  describe('Expired session handling', () => {
    it('should handle expired session token gracefully', async () => {
      crossSiteSessionService.getSessionByToken.mockResolvedValue(null);

      const result = await controller.getSession(mockSessionToken, mockCompanyId);

      expect(result).toEqual({
        id: null,
        sessionToken: null,
        cartItemCount: 0,
        wishlistItemCount: 0,
        comparisonItemCount: 0,
      });
    });
  });
});

describe('CrossSiteSessionController - Authorization Scenarios', () => {
  let controller: CrossSiteSessionController;
  let crossSiteSessionService: jest.Mocked<CrossSiteSessionService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrossSiteSessionController],
      providers: [
        {
          provide: CrossSiteSessionService,
          useValue: {
            getSessionByCustomerId: jest.fn(),
            getSessionById: jest.fn(),
            getOrCreateSession: jest.fn(),
            transferSession: jest.fn(),
            mergeSessions: jest.fn(),
            getSessionSummary: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CrossSiteSessionController>(CrossSiteSessionController);
    crossSiteSessionService = module.get(CrossSiteSessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User ID as actorId for audit logging', () => {
    it('should use user.id for transfer session audit log', async () => {
      const mockUser: AuthenticatedUser = {
        id: 'user-audit-test',
        sub: 'user-audit-test',
        email: 'audit@example.com',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: 'company-123',
        companyId: 'company-123',
        role: 'ADMIN',
      };

      const mockSession: CrossSiteSessionData = {
        id: 'session-1',
        companyId: 'company-123',
        sessionToken: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        customerId: 'user-audit-test',
        status: SessionStatus.ACTIVE,
        dataReferences: [],
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      crossSiteSessionService.getSessionByCustomerId.mockResolvedValue(mockSession);
      crossSiteSessionService.transferSession.mockResolvedValue(mockSession);

      await controller.transferSession(mockUser, { targetSiteId: 'site-2' });

      expect(crossSiteSessionService.transferSession).toHaveBeenCalledWith(
        'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        expect.any(Object),
        'user-audit-test',
      );
    });

    it('should use user.id for merge session audit log', async () => {
      const mockUser: AuthenticatedUser = {
        id: 'user-merge-test',
        sub: 'user-merge-test',
        email: 'merge@example.com',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: 'company-123',
        companyId: 'company-123',
        role: 'USER',
      };

      const mockSession: CrossSiteSessionData = {
        id: 'session-1',
        companyId: 'company-123',
        sessionToken: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        status: SessionStatus.ACTIVE,
        dataReferences: [],
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMergeResult: SessionMigrationResult = {
        success: true,
        sourceSessionId: 'guest-session',
        targetSessionId: 'session-1',
        migratedData: {},
        conflicts: [],
      };

      crossSiteSessionService.getOrCreateSession.mockResolvedValue(mockSession);
      crossSiteSessionService.mergeSessions.mockResolvedValue(mockMergeResult);

      await controller.mergeSession(mockUser, { sourceSessionId: 'guest-session' });

      expect(crossSiteSessionService.mergeSessions).toHaveBeenCalledWith(
        'guest-session',
        'session-1',
        'user-merge-test',
      );
    });
  });

  describe('Different scope types access', () => {
    it('should allow COMPANY scope user to access their own session', async () => {
      const companyUser: AuthenticatedUser = {
        id: 'user-company',
        sub: 'user-company',
        email: 'company@example.com',
        scopeType: 'COMPANY' as ScopeType,
        scopeId: 'company-123',
        companyId: 'company-123',
        role: 'USER',
      };

      const mockSession: CrossSiteSessionData = {
        id: 'session-1',
        companyId: 'company-123',
        sessionToken: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        customerId: 'user-company',
        status: SessionStatus.ACTIVE,
        dataReferences: [],
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      crossSiteSessionService.getSessionByCustomerId.mockResolvedValue(mockSession);

      const result = await controller.getSession(companyUser);

      expect(result).toEqual(mockSession);
      expect(crossSiteSessionService.getSessionByCustomerId).toHaveBeenCalledWith(
        'user-company',
        'company-123',
      );
    });

    it('should allow CLIENT scope user to access their session', async () => {
      const clientUser: AuthenticatedUser = {
        id: 'user-client',
        sub: 'user-client',
        email: 'client@example.com',
        scopeType: 'CLIENT' as ScopeType,
        scopeId: 'client-123',
        clientId: 'client-123',
        companyId: 'company-abc',
        organizationId: 'org-1',
        role: 'ADMIN',
      };

      const mockSession: CrossSiteSessionData = {
        id: 'session-1',
        companyId: 'company-abc',
        sessionToken: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        customerId: 'user-client',
        status: SessionStatus.ACTIVE,
        dataReferences: [],
        firstSeenAt: new Date(),
        lastActiveAt: new Date(),
        expiresAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      crossSiteSessionService.getSessionByCustomerId.mockResolvedValue(mockSession);

      const result = await controller.getSession(clientUser);

      expect(result).toEqual(mockSession);
      expect(crossSiteSessionService.getSessionByCustomerId).toHaveBeenCalledWith(
        'user-client',
        'company-abc',
      );
    });
  });
});

describe('DTO Validation', () => {
  let controller: CrossSiteSessionController;
  let publicController: PublicCrossSiteSessionController;
  let crossSiteSessionService: jest.Mocked<CrossSiteSessionService>;

  const mockUser: AuthenticatedUser = {
    id: 'user-1',
    sub: 'user-1',
    email: 'user@company.com',
    scopeType: 'COMPANY' as ScopeType,
    scopeId: 'company-123',
    companyId: 'company-123',
    role: 'ADMIN',
  };

  const mockSession: CrossSiteSessionData = {
    id: 'session-1',
    companyId: 'company-123',
    sessionToken: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    customerId: 'user-1',
    status: SessionStatus.ACTIVE,
    dataReferences: [],
    firstSeenAt: new Date(),
    lastActiveAt: new Date(),
    expiresAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrossSiteSessionController, PublicCrossSiteSessionController],
      providers: [
        {
          provide: CrossSiteSessionService,
          useValue: {
            getSessionByCustomerId: jest.fn(),
            getSessionById: jest.fn(),
            getSessionByToken: jest.fn(),
            getOrCreateSession: jest.fn(),
            transferSession: jest.fn(),
            mergeSessions: jest.fn(),
            updateActivity: jest.fn(),
            getSessionSummary: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CrossSiteSessionController>(CrossSiteSessionController);
    publicController = module.get<PublicCrossSiteSessionController>(
      PublicCrossSiteSessionController,
    );
    crossSiteSessionService = module.get(CrossSiteSessionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('TransferSessionDto', () => {
    it('should pass targetSiteId to service', async () => {
      crossSiteSessionService.getSessionByCustomerId.mockResolvedValue(mockSession);
      crossSiteSessionService.transferSession.mockResolvedValue(mockSession);

      const dto = { targetSiteId: 'new-site' };
      await controller.transferSession(mockUser, dto);

      expect(crossSiteSessionService.transferSession).toHaveBeenCalledWith(
        'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        expect.objectContaining({ targetSiteId: 'new-site' }),
        mockUser.id,
      );
    });

    it('should pass dataTypes array to service', async () => {
      crossSiteSessionService.getSessionByCustomerId.mockResolvedValue(mockSession);
      crossSiteSessionService.transferSession.mockResolvedValue(mockSession);

      const dto = {
        targetSiteId: 'new-site',
        dataTypes: [SessionDataType.CART, SessionDataType.WISHLIST],
      };
      await controller.transferSession(mockUser, dto);

      expect(crossSiteSessionService.transferSession).toHaveBeenCalledWith(
        'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        expect.objectContaining({
          dataTypes: [SessionDataType.CART, SessionDataType.WISHLIST],
        }),
        mockUser.id,
      );
    });
  });

  describe('MergeSessionDto', () => {
    it('should pass sourceSessionId to service', async () => {
      crossSiteSessionService.getOrCreateSession.mockResolvedValue(mockSession);
      crossSiteSessionService.mergeSessions.mockResolvedValue({
        success: true,
        sourceSessionId: 'guest-session-123',
        targetSessionId: 'session-1',
        migratedData: {},
        conflicts: [],
      });

      const dto = { sourceSessionId: 'guest-session-123' };
      await controller.mergeSession(mockUser, dto);

      expect(crossSiteSessionService.mergeSessions).toHaveBeenCalledWith(
        'guest-session-123',
        'session-1',
        mockUser.id,
      );
    });
  });

  describe('CreateSessionDto (Public Controller)', () => {
    it('should pass all fields to service', async () => {
      crossSiteSessionService.getOrCreateSession.mockResolvedValue(mockSession);

      const dto = {
        siteId: 'site-123',
        visitorId: 'visitor-456',
        deviceFingerprint: 'fp-abc',
        userAgent: 'Mozilla/5.0',
        ipAddress: '10.0.0.1',
      };
      await publicController.createSession('company-123', dto);

      expect(crossSiteSessionService.getOrCreateSession).toHaveBeenCalledWith(
        'company-123',
        expect.objectContaining({
          siteId: 'site-123',
          visitorId: 'visitor-456',
          deviceFingerprint: 'fp-abc',
          userAgent: 'Mozilla/5.0',
          ipAddress: '10.0.0.1',
        }),
      );
    });
  });

  describe('UpdateActivityDto (Public Controller)', () => {
    it('should pass currentSiteId and currentPage to service', async () => {
      crossSiteSessionService.getSessionById.mockResolvedValue(mockSession);
      crossSiteSessionService.updateActivity.mockResolvedValue(mockSession);

      const dto = {
        currentSiteId: 'site-2',
        currentPage: '/checkout',
      };
      await publicController.updateActivity('session-1', 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', 'company-123', dto);

      expect(crossSiteSessionService.updateActivity).toHaveBeenCalledWith(
        'session-1',
        expect.objectContaining({
          currentSiteId: 'site-2',
          currentPage: '/checkout',
        }),
      );
    });
  });
});
