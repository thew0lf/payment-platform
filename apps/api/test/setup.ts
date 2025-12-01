/**
 * Test setup file for e2e tests
 */

// Extend Jest timeout for e2e tests
jest.setTimeout(30000);

// Global teardown
afterAll(async () => {
  // Allow async operations to complete
  await new Promise(resolve => setTimeout(resolve, 500));
});
