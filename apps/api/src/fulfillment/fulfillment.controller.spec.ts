import { Test, TestingModule } from '@nestjs/testing';
import { FulfillmentController } from './fulfillment.controller';
import { ShipmentsService } from './services/shipments.service';
import { HierarchyService } from '../hierarchy/hierarchy.service';
import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

describe('FulfillmentController - Hierarchical Access Control', () => {
  let controller: FulfillmentController;
  let shipmentsService: jest.Mocked<ShipmentsService>;
  let hierarchyService: jest.Mocked<HierarchyService>;

  // Mock users at different scope levels
  const orgAdminUser: AuthenticatedUser = {
    sub: 'org-admin-1',
    id: 'org-admin-1',
    email: 'org@test.com',
    role: 'ADMIN',
    scopeType: 'ORGANIZATION',
    scopeId: 'org-1',
    organizationId: 'org-1',
    clientId: undefined,
    companyId: undefined,
    departmentId: undefined,
  };

  const clientAdminUser: AuthenticatedUser = {
    sub: 'client-admin-1',
    id: 'client-admin-1',
    email: 'client@test.com',
    role: 'ADMIN',
    scopeType: 'CLIENT',
    scopeId: 'client-1',
    organizationId: 'org-1',
    clientId: 'client-1',
    companyId: undefined,
    departmentId: undefined,
  };

  const companyUser: AuthenticatedUser = {
    sub: 'company-user-1',
    id: 'company-user-1',
    email: 'company@test.com',
    role: 'MANAGER',
    scopeType: 'COMPANY',
    scopeId: 'company-1',
    organizationId: 'org-1',
    clientId: 'client-1',
    companyId: 'company-1',
    departmentId: undefined,
  };

  const otherCompanyUser: AuthenticatedUser = {
    sub: 'other-company-user-1',
    id: 'other-company-user-1',
    email: 'other@test.com',
    role: 'MANAGER',
    scopeType: 'COMPANY',
    scopeId: 'company-2',
    organizationId: 'org-1',
    clientId: 'client-1',
    companyId: 'company-2',
    departmentId: undefined,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FulfillmentController],
      providers: [
        {
          provide: ShipmentsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            findByOrderId: jest.fn(),
            update: jest.fn(),
            markShipped: jest.fn(),
            markDelivered: jest.fn(),
            addEvent: jest.fn(),
          },
        },
        {
          provide: HierarchyService,
          useValue: {
            canAccessCompany: jest.fn(),
            getUserScopeFilter: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FulfillmentController>(FulfillmentController);
    shipmentsService = module.get(ShipmentsService);
    hierarchyService = module.get(HierarchyService);
  });

  describe('getCompanyId - Write Operations', () => {
    it('should use scopeId for COMPANY scope user on create', async () => {
      const mockShipment = {
        id: 'shipment-1',
        orderId: 'order-1',
        shipmentNumber: 'SH-00001',
        status: 'PENDING',
      } as any;
      shipmentsService.create.mockResolvedValue(mockShipment);

      await controller.createShipment(
        { orderId: 'order-1', carrier: 'UPS', carrierService: 'Ground' },
        companyUser,
      );

      expect(shipmentsService.create).toHaveBeenCalledWith(
        'company-1',
        { orderId: 'order-1', carrier: 'UPS', carrierService: 'Ground' },
        'company-user-1',
      );
    });

    it('should throw ForbiddenException for ORGANIZATION user without company context', async () => {
      await expect(
        controller.createShipment({ orderId: 'order-1', carrier: 'UPS' }, orgAdminUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should use companyId from user context if available', async () => {
      const userWithCompany: AuthenticatedUser = {
        ...clientAdminUser,
        companyId: 'company-1',
      };

      const mockShipment = {
        id: 'shipment-1',
        orderId: 'order-1',
        shipmentNumber: 'SH-00001',
        status: 'PENDING',
      } as any;
      shipmentsService.create.mockResolvedValue(mockShipment);

      await controller.createShipment({ orderId: 'order-1', carrier: 'FEDEX' } as any, userWithCompany);

      expect(shipmentsService.create).toHaveBeenCalledWith(
        'company-1',
        { orderId: 'order-1', carrier: 'FEDEX' },
        'client-admin-1',
      );
    });
  });

  describe('getCompanyIdForQuery - Read Operations', () => {
    it('should always filter by scopeId for COMPANY scope user', async () => {
      shipmentsService.findAll.mockResolvedValue([]);

      await controller.getShipments('order-1', undefined as any, companyUser);

      expect(shipmentsService.findAll).toHaveBeenCalledWith('order-1', 'company-1');
    });

    it('should allow ORGANIZATION admin to query all shipments (no companyId filter)', async () => {
      shipmentsService.findAll.mockResolvedValue([]);

      await controller.getShipments('order-1', undefined as any, orgAdminUser);

      expect(shipmentsService.findAll).toHaveBeenCalledWith('order-1', undefined);
    });

    it('should allow CLIENT admin to query all shipments within client scope', async () => {
      shipmentsService.findAll.mockResolvedValue([]);

      await controller.getShipments(undefined as any, undefined as any, clientAdminUser);

      expect(shipmentsService.findAll).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should validate company access when CLIENT admin passes companyId query param', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(true);
      shipmentsService.findAll.mockResolvedValue([]);

      await controller.getShipments(undefined as any, 'company-1', clientAdminUser);

      expect(hierarchyService.canAccessCompany).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'client-admin-1',
          scopeType: 'CLIENT',
          scopeId: 'client-1',
        }),
        'company-1',
      );
      expect(shipmentsService.findAll).toHaveBeenCalledWith(undefined, 'company-1');
    });

    it('should throw ForbiddenException when CLIENT admin tries to access unauthorized company', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(false);

      await expect(
        controller.getShipments(undefined as any, 'unauthorized-company', clientAdminUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getShipment - Single Read', () => {
    it('should use company scopeId for fetching single shipment', async () => {
      const mockShipment = {
        id: 'shipment-1',
        orderId: 'order-1',
        shipmentNumber: 'SH-00001',
        status: 'PENDING',
      } as any;
      shipmentsService.findById.mockResolvedValue(mockShipment);

      await controller.getShipment('shipment-1', companyUser);

      expect(shipmentsService.findById).toHaveBeenCalledWith('shipment-1', 'company-1');
    });
  });

  describe('updateShipment - Write Operations', () => {
    it('should use company scopeId for update', async () => {
      const mockShipment = {
        id: 'shipment-1',
        orderId: 'order-1',
        shipmentNumber: 'SH-00001',
        status: 'PENDING',
        trackingNumber: 'TRACK123',
      } as any;
      shipmentsService.update.mockResolvedValue(mockShipment);

      await controller.updateShipment('shipment-1', { trackingNumber: 'TRACK123' }, companyUser);

      expect(shipmentsService.update).toHaveBeenCalledWith(
        'shipment-1',
        'company-1',
        { trackingNumber: 'TRACK123' },
        'company-user-1',
      );
    });
  });

  describe('markShipped - Status Actions', () => {
    it('should use company scopeId for marking shipped', async () => {
      const mockShipment = {
        id: 'shipment-1',
        orderId: 'order-1',
        shipmentNumber: 'SH-00001',
        status: 'IN_TRANSIT',
      } as any;
      shipmentsService.markShipped.mockResolvedValue(mockShipment);

      await controller.markShipped('shipment-1', { trackingNumber: 'TRACK123' }, companyUser);

      expect(shipmentsService.markShipped).toHaveBeenCalledWith(
        'shipment-1',
        'company-1',
        'company-user-1',
        'TRACK123',
      );
    });
  });

  describe('markDelivered - Status Actions', () => {
    it('should use company scopeId for marking delivered', async () => {
      const mockShipment = {
        id: 'shipment-1',
        orderId: 'order-1',
        shipmentNumber: 'SH-00001',
        status: 'DELIVERED',
      } as any;
      shipmentsService.markDelivered.mockResolvedValue(mockShipment);

      await controller.markDelivered('shipment-1', { signedBy: 'John Doe' }, companyUser);

      expect(shipmentsService.markDelivered).toHaveBeenCalledWith(
        'shipment-1',
        'company-1',
        'company-user-1',
        'John Doe',
      );
    });

    it('should allow delivery without signature', async () => {
      const mockShipment = {
        id: 'shipment-1',
        orderId: 'order-1',
        shipmentNumber: 'SH-00001',
        status: 'DELIVERED',
      } as any;
      shipmentsService.markDelivered.mockResolvedValue(mockShipment);

      await controller.markDelivered('shipment-1', {}, companyUser);

      expect(shipmentsService.markDelivered).toHaveBeenCalledWith(
        'shipment-1',
        'company-1',
        'company-user-1',
        undefined,
      );
    });
  });

  describe('addEvent - Tracking Events', () => {
    it('should use company scopeId for adding tracking events', async () => {
      const mockEvent = {
        id: 'event-1',
        shipmentId: 'shipment-1',
        status: 'IN_TRANSIT',
        description: 'Package in transit',
      } as any;
      shipmentsService.addEvent.mockResolvedValue(mockEvent);

      await controller.addEvent(
        'shipment-1',
        { status: 'IN_TRANSIT', description: 'Package in transit' },
        companyUser,
      );

      expect(shipmentsService.addEvent).toHaveBeenCalledWith(
        'shipment-1',
        'company-1',
        { status: 'IN_TRANSIT', description: 'Package in transit' },
        'company-user-1',
      );
    });
  });

  describe('Cross-Scope Security', () => {
    it('should prevent COMPANY user from creating shipments for other companies', async () => {
      // The controller uses the user's scopeId, so this test verifies
      // that the service is always called with the user's company
      const mockShipment = { id: 'shipment-1' } as any;
      shipmentsService.create.mockResolvedValue(mockShipment);

      await controller.createShipment({ orderId: 'order-1', carrier: 'UPS' }, companyUser);

      expect(shipmentsService.create).toHaveBeenCalledWith(
        'company-1', // Always the user's company
        expect.any(Object),
        'company-user-1',
      );
    });

    it('should prevent COMPANY user from accessing other company shipments via query', async () => {
      // COMPANY users always get filtered by their scopeId, ignoring any companyId param
      shipmentsService.findAll.mockResolvedValue([]);

      await controller.getShipments('order-1', 'other-company', companyUser);

      // The companyId from user scope takes precedence
      expect(shipmentsService.findAll).toHaveBeenCalledWith('order-1', 'company-1');
    });

    it('should ensure different COMPANY users get isolated data', async () => {
      shipmentsService.findAll.mockResolvedValue([]);

      // First company user
      await controller.getShipments(undefined as any, undefined as any, companyUser);
      expect(shipmentsService.findAll).toHaveBeenCalledWith(undefined, 'company-1');

      jest.clearAllMocks();

      // Second company user (different company)
      await controller.getShipments(undefined as any, undefined as any, otherCompanyUser);
      expect(shipmentsService.findAll).toHaveBeenCalledWith(undefined, 'company-2');
    });
  });

  describe('CLIENT scope access validation', () => {
    it('should allow CLIENT admin to access companies within their client', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(true);
      shipmentsService.findAll.mockResolvedValue([]);

      await controller.getShipments(undefined as any, 'company-under-client', clientAdminUser);

      expect(hierarchyService.canAccessCompany).toHaveBeenCalled();
      expect(shipmentsService.findAll).toHaveBeenCalledWith(undefined, 'company-under-client');
    });

    it('should deny CLIENT admin access to companies outside their client', async () => {
      hierarchyService.canAccessCompany.mockResolvedValue(false);

      await expect(
        controller.getShipments(undefined as any, 'company-other-client', clientAdminUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
