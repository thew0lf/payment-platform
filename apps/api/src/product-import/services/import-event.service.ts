import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Subject, Observable, filter, map } from 'rxjs';
import {
  ImportEvent,
  ImportEventType,
  ImportJobProgress,
  ImportJobError,
  ConflictInfo,
} from '../types/product-import.types';

// Event constants for internal use
export const IMPORT_EVENT_PREFIX = 'product-import';

// Configurable cleanup delay (ms) after job completion
const JOB_CLEANUP_DELAY_MS = 5000;

export interface ImportEventPayload {
  jobId: string;
  companyId: string;
  event: ImportEvent;
}

@Injectable()
export class ImportEventService {
  private readonly logger = new Logger(ImportEventService.name);
  private readonly eventSubject = new Subject<ImportEventPayload>();

  // Track active subscriptions for cleanup
  private readonly activeSubscriptions = new Map<string, Set<string>>();

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Subscribe to events for a specific job
   */
  subscribeToJob(jobId: string, companyId: string): Observable<ImportEvent> {
    const subscriptionId = `${jobId}-${Date.now()}`;

    // Track subscription
    if (!this.activeSubscriptions.has(jobId)) {
      this.activeSubscriptions.set(jobId, new Set());
    }
    this.activeSubscriptions.get(jobId)!.add(subscriptionId);

    this.logger.debug(`Client subscribed to job ${jobId} (subscription: ${subscriptionId})`);

    return this.eventSubject.pipe(
      filter((payload) => payload.jobId === jobId && payload.companyId === companyId),
      map((payload) => payload.event),
    );
  }

  /**
   * Emit a job started event
   */
  emitJobStarted(jobId: string, companyId: string, progress: ImportJobProgress): void {
    this.emitEvent(jobId, companyId, 'job:started', progress);
  }

  /**
   * Emit a progress update event
   */
  emitProgress(jobId: string, companyId: string, progress: ImportJobProgress): void {
    this.emitEvent(jobId, companyId, 'job:progress', progress);
  }

  /**
   * Emit a phase change event
   */
  emitPhaseChanged(jobId: string, companyId: string, progress: ImportJobProgress): void {
    this.emitEvent(jobId, companyId, 'job:phase-changed', progress);
  }

  /**
   * Emit a product imported event
   */
  emitProductImported(
    jobId: string,
    companyId: string,
    productId: string,
    sku: string,
  ): void {
    this.emitEvent(jobId, companyId, 'job:product-imported', { productId, sku });
  }

  /**
   * Emit a product skipped event
   */
  emitProductSkipped(
    jobId: string,
    companyId: string,
    productId: string,
    sku: string,
  ): void {
    this.emitEvent(jobId, companyId, 'job:product-skipped', { productId, sku });
  }

  /**
   * Emit a product error event
   */
  emitProductError(
    jobId: string,
    companyId: string,
    error: ImportJobError,
  ): void {
    this.emitEvent(jobId, companyId, 'job:product-error', error);
  }

  /**
   * Emit a conflict detected event
   */
  emitConflictDetected(
    jobId: string,
    companyId: string,
    conflict: ConflictInfo,
  ): void {
    this.emitEvent(jobId, companyId, 'job:conflict-detected', conflict);
  }

  /**
   * Emit a job completed event
   */
  emitJobCompleted(jobId: string, companyId: string, progress: ImportJobProgress): void {
    this.emitEvent(jobId, companyId, 'job:completed', progress);
    this.cleanupJob(jobId);
  }

  /**
   * Emit a job failed event
   */
  emitJobFailed(jobId: string, companyId: string, error: ImportJobError): void {
    this.emitEvent(jobId, companyId, 'job:failed', error);
    this.cleanupJob(jobId);
  }

  /**
   * Emit a job cancelled event
   */
  emitJobCancelled(jobId: string, companyId: string, progress: ImportJobProgress): void {
    this.emitEvent(jobId, companyId, 'job:cancelled', progress);
    this.cleanupJob(jobId);
  }

  /**
   * Get the number of active subscriptions for a job
   */
  getSubscriptionCount(jobId: string): number {
    return this.activeSubscriptions.get(jobId)?.size || 0;
  }

  /**
   * Internal method to emit events
   */
  private emitEvent(
    jobId: string,
    companyId: string,
    type: ImportEventType,
    data: ImportJobProgress | ImportJobError | ConflictInfo | { productId: string; sku: string },
  ): void {
    const event: ImportEvent = {
      type,
      jobId,
      timestamp: new Date(),
      data,
    };

    const payload: ImportEventPayload = {
      jobId,
      companyId,
      event,
    };

    // Emit to RxJS subject for SSE subscribers
    this.eventSubject.next(payload);

    // Also emit through NestJS event emitter for internal listeners
    this.eventEmitter.emit(`${IMPORT_EVENT_PREFIX}.${type}`, payload);

    this.logger.debug(`Emitted ${type} for job ${jobId}`);
  }

  /**
   * Cleanup subscriptions for a completed/failed job
   */
  private cleanupJob(jobId: string): void {
    // Give clients time to receive final event before cleanup
    setTimeout(() => {
      this.activeSubscriptions.delete(jobId);
      this.logger.debug(`Cleaned up subscriptions for job ${jobId}`);
    }, JOB_CLEANUP_DELAY_MS);
  }
}
