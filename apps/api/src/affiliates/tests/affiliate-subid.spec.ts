import { Test, TestingModule } from '@nestjs/testing';
import { AffiliateConversionsService } from '../services/affiliate-conversions.service';
import { AffiliateReportsService } from '../services/affiliate-reports.service';
import { PrismaService } from '../../prisma/prisma.service';
import { HierarchyService, UserContext } from '../../hierarchy/hierarchy.service';
import { ScopeType } from '@prisma/client';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import { normalizeSubIdField, SUBID_ALIAS_MAP } from '../dto/affiliate-reports.dto';

describe('SubID Tracking', () => {
  describe('normalizeSubIdField helper', () => {
    it('should return subId1-5 as-is', () => {
      expect(normalizeSubIdField('subId1')).toBe('subId1');
      expect(normalizeSubIdField('subId2')).toBe('subId2');
      expect(normalizeSubIdField('subId3')).toBe('subId3');
      expect(normalizeSubIdField('subId4')).toBe('subId4');
      expect(normalizeSubIdField('subId5')).toBe('subId5');
    });

    it('should map t1-5 to subId1-5', () => {
      expect(normalizeSubIdField('t1')).toBe('subId1');
      expect(normalizeSubIdField('t2')).toBe('subId2');
      expect(normalizeSubIdField('t3')).toBe('subId3');
      expect(normalizeSubIdField('t4')).toBe('subId4');
      expect(normalizeSubIdField('t5')).toBe('subId5');
    });

    it('should return null for invalid fields', () => {
      expect(normalizeSubIdField('t6')).toBeNull();
      expect(normalizeSubIdField('subId6')).toBeNull();
      expect(normalizeSubIdField('invalid')).toBeNull();
      expect(normalizeSubIdField('')).toBeNull();
    });
  });

  describe('SUBID_ALIAS_MAP', () => {
    it('should correctly map t1-t5 to subId1-subId5', () => {
      expect(SUBID_ALIAS_MAP.t1).toBe('subId1');
      expect(SUBID_ALIAS_MAP.t2).toBe('subId2');
      expect(SUBID_ALIAS_MAP.t3).toBe('subId3');
      expect(SUBID_ALIAS_MAP.t4).toBe('subId4');
      expect(SUBID_ALIAS_MAP.t5).toBe('subId5');
    });
  });

  describe('AffiliateConversionsService SubID handling', () => {
    let service: AffiliateConversionsService;
    let prismaService: PrismaService;
    let hierarchyService: HierarchyService;
    let auditLogsService: AuditLogsService;

    const mockUser: UserContext = {
      sub: 'user-123',
      scopeType: ScopeType.COMPANY,
      scopeId: 'company-1',
    };

    beforeEach(async () => {
      const mockPrismaService = {
        affiliateConversion: {
          findMany: jest.fn(),
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          count: jest.fn(),
          aggregate: jest.fn(),
          groupBy: jest.fn(),
        },
        affiliateClick: {
          count: jest.fn(),
          findFirst: jest.fn(),
          findMany: jest.fn(),
          groupBy: jest.fn(),
        },
        affiliatePartner: {
          findFirst: jest.fn(),
          update: jest.fn(),
        },
        affiliateProgramConfig: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
        },
        $queryRawUnsafe: jest.fn(),
        $transaction: jest.fn((fn) => fn({
          affiliateConversion: { create: jest.fn().mockResolvedValue({ id: 'conv-1' }) },
          affiliatePartner: { update: jest.fn() },
        })),
      };

      const mockHierarchyService = {
        getAccessibleCompanyIds: jest.fn().mockResolvedValue(['company-1']),
        validateCompanyAccess: jest.fn().mockResolvedValue(true),
      };

      const mockAuditLogsService = {
        log: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AffiliateConversionsService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: HierarchyService, useValue: mockHierarchyService },
          { provide: AuditLogsService, useValue: mockAuditLogsService },
        ],
      }).compile();

      service = module.get<AffiliateConversionsService>(AffiliateConversionsService);
      prismaService = module.get<PrismaService>(PrismaService);
      hierarchyService = module.get<HierarchyService>(HierarchyService);
      auditLogsService = module.get<AuditLogsService>(AuditLogsService);
    });

    describe('getStatsBySubId', () => {
      it('should normalize t1 to subId1', async () => {
        const mockResults: any[] = [];
        (prismaService.$queryRawUnsafe as jest.Mock).mockResolvedValue(mockResults);

        await service.getStatsBySubId(mockUser, {
          groupBy: 't1' as any,
          companyId: 'company-1',
        });

        // The query should use subId1 internally
        const queryCall = (prismaService.$queryRawUnsafe as jest.Mock).mock.calls[0][0];
        expect(queryCall).toContain('"subId1"');
      });

      it('should normalize t2 to subId2', async () => {
        const mockResults: any[] = [];
        (prismaService.$queryRawUnsafe as jest.Mock).mockResolvedValue(mockResults);

        await service.getStatsBySubId(mockUser, {
          groupBy: 't2' as any,
          companyId: 'company-1',
        });

        const queryCall = (prismaService.$queryRawUnsafe as jest.Mock).mock.calls[0][0];
        expect(queryCall).toContain('"subId2"');
      });

      it('should accept subId1-5 directly', async () => {
        const mockResults: any[] = [];
        (prismaService.$queryRawUnsafe as jest.Mock).mockResolvedValue(mockResults);

        await service.getStatsBySubId(mockUser, {
          groupBy: 'subId3',
          companyId: 'company-1',
        });

        const queryCall = (prismaService.$queryRawUnsafe as jest.Mock).mock.calls[0][0];
        expect(queryCall).toContain('"subId3"');
      });

      it('should return original groupBy value in response', async () => {
        const mockResults: any[] = [];
        (prismaService.$queryRawUnsafe as jest.Mock).mockResolvedValue(mockResults);

        const result = await service.getStatsBySubId(mockUser, {
          groupBy: 't1' as any,
          companyId: 'company-1',
        });

        // Should return original t1, not normalized subId1
        expect(result.groupBy).toBe('t1');
      });

      it('should calculate totals correctly', async () => {
        const mockResults = [
          { subIdValue: 'campaign-a', conversions: 10, revenue: 500, commissions: 50, averageOrderValue: 50 },
          { subIdValue: 'campaign-b', conversions: 5, revenue: 250, commissions: 25, averageOrderValue: 50 },
        ];
        const mockClicks = [
          { subIdValue: 'campaign-a', clicks: 100 },
          { subIdValue: 'campaign-b', clicks: 50 },
        ];

        (prismaService.$queryRawUnsafe as jest.Mock)
          .mockResolvedValueOnce(mockResults)
          .mockResolvedValueOnce(mockClicks);

        const result = await service.getStatsBySubId(mockUser, {
          groupBy: 't1' as any,
          companyId: 'company-1',
        });

        expect(result.totals.conversions).toBe(15);
        expect(result.totals.revenue).toBe(750);
        expect(result.totals.commissions).toBe(75);
        expect(result.totals.clicks).toBe(150);
      });
    });
  });
});
