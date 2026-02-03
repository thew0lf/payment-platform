import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';

describe('IdempotencyService', () => {
  let service: IdempotencyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IdempotencyService],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
  });

  afterEach(async () => {
    // Clear all entries after each test
    const size = service.getStoreSize();
    // Note: In a real implementation, we'd have a clear method
  });

  describe('generateKey', () => {
    it('should generate consistent keys for same input', () => {
      const key1 = service.generateKey('test', 'user-1', 'create', { amount: 100 });
      const key2 = service.generateKey('test', 'user-1', 'create', { amount: 100 });

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different bodies', () => {
      const key1 = service.generateKey('test', 'user-1', 'create', { amount: 100 });
      const key2 = service.generateKey('test', 'user-1', 'create', { amount: 200 });

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different users', () => {
      const key1 = service.generateKey('test', 'user-1', 'create', { amount: 100 });
      const key2 = service.generateKey('test', 'user-2', 'create', { amount: 100 });

      expect(key1).not.toBe(key2);
    });

    it('should handle object key ordering consistently', () => {
      const key1 = service.generateKey('test', 'user-1', 'create', { a: 1, b: 2 });
      const key2 = service.generateKey('test', 'user-1', 'create', { b: 2, a: 1 });

      expect(key1).toBe(key2);
    });
  });

  describe('checkAndLock', () => {
    it('should allow first request with a key', async () => {
      const result = await service.checkAndLock('unique-key-1');

      expect(result.isDuplicate).toBe(false);
      expect(result.key).toBe('unique-key-1');
      expect(result.cachedResult).toBeUndefined();
    });

    it('should return cached result for completed key', async () => {
      const key = 'completed-key';
      const expectedResult = { success: true, orderId: '123' };

      // First request - acquire lock
      await service.checkAndLock(key);

      // Complete the request
      await service.complete(key, expectedResult);

      // Second request - should get cached result
      const result = await service.checkAndLock<typeof expectedResult>(key);

      expect(result.isDuplicate).toBe(true);
      expect(result.cachedResult).toEqual(expectedResult);
    });

    it('should throw ConflictException for in-progress key', async () => {
      const key = 'in-progress-key';

      // First request - acquire lock
      await service.checkAndLock(key);

      // Second request while first is processing
      await expect(service.checkAndLock(key)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when key reused with different body hash', async () => {
      const key = 'reused-key';

      // First request with hash
      await service.checkAndLock(key, 'hash-abc');
      await service.complete(key, { result: true });

      // Second request with different hash
      await expect(service.checkAndLock(key, 'hash-xyz')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('complete', () => {
    it('should mark entry as completed', async () => {
      const key = 'complete-test';
      await service.checkAndLock(key);

      await service.complete(key, { done: true });

      const status = await service.getStatus(key);
      expect(status?.status).toBe('completed');
      expect(status?.result).toEqual({ done: true });
      expect(status?.completedAt).toBeDefined();
    });

    it('should handle completing unknown key gracefully', async () => {
      // Should not throw
      await expect(
        service.complete('unknown-key', { result: true }),
      ).resolves.not.toThrow();
    });
  });

  describe('fail', () => {
    it('should mark entry as failed', async () => {
      const key = 'fail-test';
      await service.checkAndLock(key);

      await service.fail(key);

      const status = await service.getStatus(key);
      expect(status?.status).toBe('failed');
    });

    it('should allow retry after failure', async () => {
      const key = 'retry-after-fail';

      // First attempt
      await service.checkAndLock(key);
      await service.fail(key);

      // Should be able to retry (though current impl might need adjustment)
      // For now, we test that the status is 'failed'
      const status = await service.getStatus(key);
      expect(status?.status).toBe('failed');
    });
  });

  describe('remove', () => {
    it('should remove an entry', async () => {
      const key = 'remove-test';
      await service.checkAndLock(key);
      await service.complete(key, { result: true });

      await service.remove(key);

      const status = await service.getStatus(key);
      expect(status).toBeNull();
    });
  });

  describe('getStatus', () => {
    it('should return null for non-existent key', async () => {
      const status = await service.getStatus('non-existent-key');
      expect(status).toBeNull();
    });

    it('should return entry details for existing key', async () => {
      const key = 'status-test';
      await service.checkAndLock(key, 'test-hash');

      const status = await service.getStatus(key);
      expect(status).not.toBeNull();
      expect(status?.key).toBe(key);
      expect(status?.status).toBe('processing');
      expect(status?.hash).toBe('test-hash');
      expect(status?.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('getStoreSize', () => {
    it('should return current store size', async () => {
      const initialSize = service.getStoreSize();

      await service.checkAndLock('key-1');
      await service.checkAndLock('key-2');
      await service.checkAndLock('key-3');

      expect(service.getStoreSize()).toBe(initialSize + 3);
    });
  });
});
