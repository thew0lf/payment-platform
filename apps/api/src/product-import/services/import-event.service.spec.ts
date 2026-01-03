import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { take, toArray } from 'rxjs/operators';
import { firstValueFrom, timeout } from 'rxjs';
import { ImportEventService, IMPORT_EVENT_PREFIX } from './import-event.service';
import { ImportJobStatus, ImportJobPhase } from '@prisma/client';
import { ImportJobProgressEvent, ImportJobError, ConflictInfo } from '../types/product-import.types';

describe('ImportEventService', () => {
  let service: ImportEventService;
  let eventEmitter: EventEmitter2;

  const mockJobId = 'job-123';
  const mockCompanyId = 'company-456';

  const mockProgress: ImportJobProgressEvent = {
    id: mockJobId,
    status: ImportJobStatus.IN_PROGRESS,
    phase: ImportJobPhase.CREATING,
    progress: 50,
    totalProducts: 100,
    processedProducts: 50,
    totalImages: 200,
    processedImages: 100,
    importedCount: 45,
    skippedCount: 5,
    errorCount: 0,
  };

  const mockError: ImportJobError = {
    message: 'Test error',
    code: 'UNKNOWN_ERROR',
    timestamp: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportEventService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ImportEventService>(ImportEventService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('subscribeToJob', () => {
    it('should create a subscription and filter events by jobId and companyId', async () => {
      const subscription = service.subscribeToJob(mockJobId, mockCompanyId);

      // Emit an event after subscription
      setTimeout(() => {
        service.emitProgress(mockJobId, mockCompanyId, mockProgress);
      }, 10);

      const event = await firstValueFrom(
        subscription.pipe(
          take(1),
          timeout(1000),
        ),
      );

      expect(event.type).toBe('job:progress');
      expect(event.jobId).toBe(mockJobId);
      expect(event.data).toEqual(mockProgress);
    });

    it('should filter out events for different jobs', async () => {
      const subscription = service.subscribeToJob(mockJobId, mockCompanyId);
      const events: any[] = [];

      const sub = subscription.subscribe((event) => events.push(event));

      // Emit event for different job
      service.emitProgress('other-job', mockCompanyId, mockProgress);
      // Emit event for correct job
      service.emitProgress(mockJobId, mockCompanyId, mockProgress);

      await new Promise((resolve) => setTimeout(resolve, 50));
      sub.unsubscribe();

      expect(events.length).toBe(1);
      expect(events[0].jobId).toBe(mockJobId);
    });

    it('should filter out events for different companies', async () => {
      const subscription = service.subscribeToJob(mockJobId, mockCompanyId);
      const events: any[] = [];

      const sub = subscription.subscribe((event) => events.push(event));

      // Emit event for different company
      service.emitProgress(mockJobId, 'other-company', mockProgress);
      // Emit event for correct company
      service.emitProgress(mockJobId, mockCompanyId, mockProgress);

      await new Promise((resolve) => setTimeout(resolve, 50));
      sub.unsubscribe();

      expect(events.length).toBe(1);
    });

    it('should track active subscriptions', () => {
      service.subscribeToJob(mockJobId, mockCompanyId);

      expect(service.getSubscriptionCount(mockJobId)).toBe(1);
    });
  });

  describe('emitJobStarted', () => {
    it('should emit job:started event', () => {
      service.emitJobStarted(mockJobId, mockCompanyId, mockProgress);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        `${IMPORT_EVENT_PREFIX}.job:started`,
        expect.objectContaining({
          jobId: mockJobId,
          companyId: mockCompanyId,
          event: expect.objectContaining({
            type: 'job:started',
            jobId: mockJobId,
            data: mockProgress,
          }),
        }),
      );
    });
  });

  describe('emitProgress', () => {
    it('should emit job:progress event', () => {
      service.emitProgress(mockJobId, mockCompanyId, mockProgress);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        `${IMPORT_EVENT_PREFIX}.job:progress`,
        expect.objectContaining({
          jobId: mockJobId,
          companyId: mockCompanyId,
          event: expect.objectContaining({
            type: 'job:progress',
            data: mockProgress,
          }),
        }),
      );
    });
  });

  describe('emitPhaseChanged', () => {
    it('should emit job:phase-changed event', () => {
      service.emitPhaseChanged(mockJobId, mockCompanyId, mockProgress);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        `${IMPORT_EVENT_PREFIX}.job:phase-changed`,
        expect.objectContaining({
          jobId: mockJobId,
          event: expect.objectContaining({
            type: 'job:phase-changed',
          }),
        }),
      );
    });
  });

  describe('emitProductImported', () => {
    it('should emit job:product-imported event with productId and sku', () => {
      service.emitProductImported(mockJobId, mockCompanyId, 'prod-1', 'SKU-001');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        `${IMPORT_EVENT_PREFIX}.job:product-imported`,
        expect.objectContaining({
          event: expect.objectContaining({
            type: 'job:product-imported',
            data: { productId: 'prod-1', sku: 'SKU-001' },
          }),
        }),
      );
    });
  });

  describe('emitProductSkipped', () => {
    it('should emit job:product-skipped event', () => {
      service.emitProductSkipped(mockJobId, mockCompanyId, 'prod-1', 'SKU-001');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        `${IMPORT_EVENT_PREFIX}.job:product-skipped`,
        expect.objectContaining({
          event: expect.objectContaining({
            type: 'job:product-skipped',
            data: { productId: 'prod-1', sku: 'SKU-001' },
          }),
        }),
      );
    });
  });

  describe('emitProductError', () => {
    it('should emit job:product-error event', () => {
      service.emitProductError(mockJobId, mockCompanyId, mockError);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        `${IMPORT_EVENT_PREFIX}.job:product-error`,
        expect.objectContaining({
          event: expect.objectContaining({
            type: 'job:product-error',
            data: mockError,
          }),
        }),
      );
    });
  });

  describe('emitConflictDetected', () => {
    it('should emit job:conflict-detected event with conflict info', () => {
      const mockConflict: ConflictInfo = {
        externalId: 'ext-123',
        sku: 'SKU-001',
        existingProductId: 'prod-456',
        conflictType: 'SKU',
        resolution: 'SKIP',
        skipped: true,
      };

      service.emitConflictDetected(mockJobId, mockCompanyId, mockConflict);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        `${IMPORT_EVENT_PREFIX}.job:conflict-detected`,
        expect.objectContaining({
          jobId: mockJobId,
          companyId: mockCompanyId,
          event: expect.objectContaining({
            type: 'job:conflict-detected',
            data: mockConflict,
          }),
        }),
      );
    });

    it('should emit conflict event with FORCE_CREATE resolution', () => {
      const mockConflict: ConflictInfo = {
        externalId: 'ext-789',
        sku: 'SKU-002',
        existingProductId: 'prod-existing',
        conflictType: 'BOTH',
        resolution: 'FORCE_CREATE',
        skipped: false,
        modified: true,
        modifiedSku: 'SKU-002-1',
      };

      service.emitConflictDetected(mockJobId, mockCompanyId, mockConflict);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        `${IMPORT_EVENT_PREFIX}.job:conflict-detected`,
        expect.objectContaining({
          event: expect.objectContaining({
            type: 'job:conflict-detected',
            data: expect.objectContaining({
              resolution: 'FORCE_CREATE',
              modified: true,
              modifiedSku: 'SKU-002-1',
            }),
          }),
        }),
      );
    });
  });

  describe('emitJobCompleted', () => {
    it('should emit job:completed event', () => {
      service.emitJobCompleted(mockJobId, mockCompanyId, {
        ...mockProgress,
        status: ImportJobStatus.COMPLETED,
        phase: ImportJobPhase.DONE,
        progress: 100,
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        `${IMPORT_EVENT_PREFIX}.job:completed`,
        expect.objectContaining({
          event: expect.objectContaining({
            type: 'job:completed',
          }),
        }),
      );
    });

    it('should schedule cleanup after completion', () => {
      jest.useFakeTimers();

      service.subscribeToJob(mockJobId, mockCompanyId);
      expect(service.getSubscriptionCount(mockJobId)).toBe(1);

      service.emitJobCompleted(mockJobId, mockCompanyId, mockProgress);

      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000);

      expect(service.getSubscriptionCount(mockJobId)).toBe(0);

      jest.useRealTimers();
    });
  });

  describe('emitJobFailed', () => {
    it('should emit job:failed event', () => {
      service.emitJobFailed(mockJobId, mockCompanyId, mockError);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        `${IMPORT_EVENT_PREFIX}.job:failed`,
        expect.objectContaining({
          event: expect.objectContaining({
            type: 'job:failed',
            data: mockError,
          }),
        }),
      );
    });

    it('should schedule cleanup after failure', () => {
      jest.useFakeTimers();

      service.subscribeToJob(mockJobId, mockCompanyId);
      service.emitJobFailed(mockJobId, mockCompanyId, mockError);

      jest.advanceTimersByTime(5000);

      expect(service.getSubscriptionCount(mockJobId)).toBe(0);

      jest.useRealTimers();
    });
  });

  describe('emitJobCancelled', () => {
    it('should emit job:cancelled event', () => {
      service.emitJobCancelled(mockJobId, mockCompanyId, mockProgress);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        `${IMPORT_EVENT_PREFIX}.job:cancelled`,
        expect.objectContaining({
          event: expect.objectContaining({
            type: 'job:cancelled',
          }),
        }),
      );
    });
  });

  describe('getSubscriptionCount', () => {
    it('should return 0 for non-existent job', () => {
      expect(service.getSubscriptionCount('non-existent')).toBe(0);
    });

    it('should track multiple subscriptions', async () => {
      // Subscriptions in the same millisecond may have the same ID,
      // so we space them out
      service.subscribeToJob(mockJobId, mockCompanyId);
      await new Promise((r) => setTimeout(r, 5));
      service.subscribeToJob(mockJobId, mockCompanyId);
      await new Promise((r) => setTimeout(r, 5));
      service.subscribeToJob(mockJobId, mockCompanyId);

      expect(service.getSubscriptionCount(mockJobId)).toBe(3);
    });
  });

  describe('event timestamp', () => {
    it('should include timestamp in all events', () => {
      const beforeEmit = new Date();
      service.emitProgress(mockJobId, mockCompanyId, mockProgress);
      const afterEmit = new Date();

      const emitCall = (eventEmitter.emit as jest.Mock).mock.calls[0];
      const eventPayload = emitCall[1];
      const timestamp = eventPayload.event.timestamp;

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeEmit.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterEmit.getTime());
    });
  });

  describe('concurrent subscriptions', () => {
    it('should handle multiple concurrent subscriptions to the same job', async () => {
      const sub1Events: any[] = [];
      const sub2Events: any[] = [];

      const s1 = service.subscribeToJob(mockJobId, mockCompanyId).subscribe((e) => sub1Events.push(e));
      const s2 = service.subscribeToJob(mockJobId, mockCompanyId).subscribe((e) => sub2Events.push(e));

      service.emitProgress(mockJobId, mockCompanyId, mockProgress);

      await new Promise((resolve) => setTimeout(resolve, 50));

      s1.unsubscribe();
      s2.unsubscribe();

      expect(sub1Events.length).toBe(1);
      expect(sub2Events.length).toBe(1);
    });
  });
});
