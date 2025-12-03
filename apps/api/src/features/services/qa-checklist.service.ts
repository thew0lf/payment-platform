import { Injectable } from '@nestjs/common';
import { QACheckCategory } from '../types/feature.types';

/**
 * QA Checklist Service
 *
 * Provides standard QA checklist templates for feature review.
 * These checks ensure consistent quality across all features.
 */
@Injectable()
export class QAChecklistService {

  /**
   * Get the standard QA checklist for a feature
   * This is the master checklist that AI QA will use to review features
   */
  getStandardChecklist() {
    return STANDARD_QA_CHECKLIST;
  }

  /**
   * Get checklist by category
   */
  getChecklistByCategory(category: QACheckCategory) {
    return STANDARD_QA_CHECKLIST.filter((check) => check.category === category);
  }

  /**
   * Create a feature-specific checklist from the standard template
   * Includes feature context for better AI understanding
   */
  createFeatureChecklist(featureSpec: {
    filesAdded?: string[];
    filesModified?: string[];
    apiEndpoints?: string[];
    uiPages?: string[];
    permissionsAdded?: string[];
  }) {
    const checklist = STANDARD_QA_CHECKLIST.map((check) => ({
      ...check,
      id: `check-${check.code}`,
      status: 'PENDING' as const,
      result: null as string | null,
      notes: null as string | null,
      testedAt: null as Date | null,
    }));

    // Add dynamic checks based on feature spec
    const dynamicChecks = [];

    // Add permission checks if permissions were added
    if (featureSpec.permissionsAdded?.length) {
      for (const perm of featureSpec.permissionsAdded) {
        dynamicChecks.push({
          id: `check-perm-${perm}`,
          code: `PERM_${perm.toUpperCase().replace(/[:.]/g, '_')}`,
          category: QACheckCategory.PERMISSIONS,
          title: `Verify permission: ${perm}`,
          description: `Ensure the permission "${perm}" is properly enforced. Test with users who have and don't have this permission.`,
          severity: 'HIGH',
          status: 'PENDING',
          result: null,
          notes: null,
          testedAt: null,
          testSteps: [
            `Find a user with "${perm}" permission`,
            `Verify they can access the feature`,
            `Find a user without "${perm}" permission`,
            `Verify they CANNOT access the feature`,
            `Check permission is listed in the database`,
          ],
        });
      }
    }

    // Add API endpoint checks
    if (featureSpec.apiEndpoints?.length) {
      for (const endpoint of featureSpec.apiEndpoints) {
        dynamicChecks.push({
          id: `check-api-${endpoint.replace(/[/:.]/g, '-')}`,
          code: `API_${endpoint.toUpperCase().replace(/[/:.]/g, '_')}`,
          category: QACheckCategory.FUNCTIONALITY,
          title: `Verify API endpoint: ${endpoint}`,
          description: `Test the API endpoint "${endpoint}" for proper functionality, authentication, and error handling.`,
          severity: 'HIGH',
          status: 'PENDING',
          result: null,
          notes: null,
          testedAt: null,
          testSteps: [
            `Test endpoint with valid authentication`,
            `Test endpoint without authentication (should fail)`,
            `Test with valid request body/params`,
            `Test with invalid request body/params`,
            `Verify response format matches expected`,
          ],
        });
      }
    }

    // Add UI page checks
    if (featureSpec.uiPages?.length) {
      for (const page of featureSpec.uiPages) {
        dynamicChecks.push({
          id: `check-ui-${page.replace(/[/:.]/g, '-')}`,
          code: `UI_${page.toUpperCase().replace(/[/:.]/g, '_')}`,
          category: QACheckCategory.FUNCTIONALITY,
          title: `Verify UI page: ${page}`,
          description: `Test the UI page "${page}" for proper rendering, functionality, and user experience.`,
          severity: 'HIGH',
          status: 'PENDING',
          result: null,
          notes: null,
          testedAt: null,
          testSteps: [
            `Navigate to the page`,
            `Verify all elements render correctly`,
            `Test all interactive elements`,
            `Check mobile responsiveness`,
            `Test loading and error states`,
          ],
        });
      }
    }

    return [...checklist, ...dynamicChecks];
  }

}

/**
 * Standard QA Checklist - Master Template
 *
 * This checklist is used by AI QA Manager to systematically review features.
 * It covers security, permissions, functionality, error handling, edge cases,
 * performance, accessibility, responsive design, data integrity, integration,
 * and documentation.
 */
export const STANDARD_QA_CHECKLIST = [
  // ═══════════════════════════════════════════════════════════════
  // SECURITY CHECKS
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'SEC_001',
    category: QACheckCategory.SECURITY,
    title: 'Authentication Required',
    description: 'All new endpoints require proper authentication. Test with and without valid tokens.',
    severity: 'CRITICAL',
    testSteps: [
      'Identify all new API endpoints',
      'Test each endpoint without authentication (should return 401)',
      'Test with invalid/expired tokens (should return 401)',
      'Test with valid tokens (should succeed)',
    ],
  },
  {
    code: 'SEC_002',
    category: QACheckCategory.SECURITY,
    title: 'Authorization Enforced',
    description: 'Users can only access resources they own or have permission to access.',
    severity: 'CRITICAL',
    testSteps: [
      'Login as User A and create/access resources',
      'Login as User B and try to access User A resources',
      'Verify access is denied or only shows appropriate data',
      'Test cross-organization access (should fail)',
    ],
  },
  {
    code: 'SEC_003',
    category: QACheckCategory.SECURITY,
    title: 'Input Validation',
    description: 'All user inputs are validated and sanitized to prevent injection attacks.',
    severity: 'CRITICAL',
    testSteps: [
      'Test SQL injection in text fields: \' OR 1=1 --',
      'Test XSS in text fields: <script>alert("xss")</script>',
      'Test command injection: ; ls -la',
      'Verify error messages don\'t expose system details',
    ],
  },
  {
    code: 'SEC_004',
    category: QACheckCategory.SECURITY,
    title: 'Sensitive Data Protected',
    description: 'Passwords, tokens, and sensitive data are never logged or exposed in responses.',
    severity: 'CRITICAL',
    testSteps: [
      'Check API responses don\'t include passwords or tokens',
      'Check console logs for sensitive data',
      'Check network responses for leaked credentials',
      'Verify sensitive fields are masked/redacted',
    ],
  },
  {
    code: 'SEC_005',
    category: QACheckCategory.SECURITY,
    title: 'Rate Limiting',
    description: 'Endpoints that could be abused have appropriate rate limiting.',
    severity: 'HIGH',
    testSteps: [
      'Identify sensitive endpoints (login, password reset, etc.)',
      'Make rapid requests to these endpoints',
      'Verify rate limiting kicks in',
      'Check rate limit headers in responses',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // PERMISSIONS CHECKS
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'PERM_001',
    category: QACheckCategory.PERMISSIONS,
    title: 'New Permissions Registered',
    description: 'Any new permissions are properly registered in the RBAC system.',
    severity: 'CRITICAL',
    testSteps: [
      'Check if feature requires new permissions',
      'Verify permissions exist in the Permission table',
      'Test permission enforcement on endpoints',
      'Check permission appears in role management UI',
    ],
  },
  {
    code: 'PERM_002',
    category: QACheckCategory.PERMISSIONS,
    title: 'Permission Guards Applied',
    description: 'Endpoints are protected with appropriate permission guards.',
    severity: 'CRITICAL',
    testSteps: [
      'Identify all new endpoints',
      'Verify each has @Roles or permission decorator',
      'Test with user lacking required permission (should fail)',
      'Test with user having required permission (should succeed)',
    ],
  },
  {
    code: 'PERM_003',
    category: QACheckCategory.PERMISSIONS,
    title: 'Multi-Role Testing',
    description: 'Feature works correctly for all applicable user roles.',
    severity: 'HIGH',
    testSteps: [
      'List all roles that should access this feature',
      'Test as Organization Admin',
      'Test as Client Admin',
      'Test as Company User',
      'Test as each custom role with varying permissions',
    ],
  },
  {
    code: 'PERM_004',
    category: QACheckCategory.PERMISSIONS,
    title: 'Scope Isolation',
    description: 'Data is properly scoped to organization/client/company.',
    severity: 'CRITICAL',
    testSteps: [
      'Create data as Organization A',
      'Login as Organization B',
      'Verify Organization A data is not visible',
      'Repeat for Client and Company scopes',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // FUNCTIONALITY CHECKS
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'FUNC_001',
    category: QACheckCategory.FUNCTIONALITY,
    title: 'CRUD Operations',
    description: 'Create, Read, Update, Delete operations work correctly.',
    severity: 'HIGH',
    testSteps: [
      'Test creating new records',
      'Test reading/listing records',
      'Test updating existing records',
      'Test deleting records (soft delete if applicable)',
      'Verify cascade effects on related data',
    ],
  },
  {
    code: 'FUNC_002',
    category: QACheckCategory.FUNCTIONALITY,
    title: 'Search and Filtering',
    description: 'Search, filter, and sort functionality works correctly.',
    severity: 'MEDIUM',
    testSteps: [
      'Test search with various terms',
      'Test each filter option',
      'Test sorting (asc/desc)',
      'Test pagination',
      'Test combined filters',
    ],
  },
  {
    code: 'FUNC_003',
    category: QACheckCategory.FUNCTIONALITY,
    title: 'Form Validation',
    description: 'All forms properly validate input before submission.',
    severity: 'HIGH',
    testSteps: [
      'Submit form with empty required fields',
      'Submit form with invalid data formats',
      'Submit form with boundary values',
      'Verify error messages are clear and helpful',
      'Test successful submission',
    ],
  },
  {
    code: 'FUNC_004',
    category: QACheckCategory.FUNCTIONALITY,
    title: 'Navigation Flow',
    description: 'User can navigate to and from the feature correctly.',
    severity: 'MEDIUM',
    testSteps: [
      'Find the feature in navigation',
      'Test breadcrumb navigation',
      'Test back button behavior',
      'Test deep linking to the feature',
      'Test redirects after actions',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ERROR HANDLING CHECKS
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'ERR_001',
    category: QACheckCategory.ERROR_HANDLING,
    title: 'API Error Responses',
    description: 'API returns appropriate error codes and messages.',
    severity: 'HIGH',
    testSteps: [
      'Test 400 Bad Request scenarios',
      'Test 401 Unauthorized scenarios',
      'Test 403 Forbidden scenarios',
      'Test 404 Not Found scenarios',
      'Test 500 Server Error handling',
    ],
  },
  {
    code: 'ERR_002',
    category: QACheckCategory.ERROR_HANDLING,
    title: 'UI Error States',
    description: 'UI gracefully handles and displays errors.',
    severity: 'HIGH',
    testSteps: [
      'Test network error handling',
      'Test validation error display',
      'Test API error display',
      'Verify error messages are user-friendly',
      'Test error recovery options',
    ],
  },
  {
    code: 'ERR_003',
    category: QACheckCategory.ERROR_HANDLING,
    title: 'Loading States',
    description: 'Loading states are shown during async operations.',
    severity: 'MEDIUM',
    testSteps: [
      'Verify loading indicators on data fetch',
      'Verify button loading states during submission',
      'Test skeleton loaders for lists',
      'Ensure no UI flicker',
    ],
  },
  {
    code: 'ERR_004',
    category: QACheckCategory.ERROR_HANDLING,
    title: 'Empty States',
    description: 'Empty states are handled gracefully.',
    severity: 'MEDIUM',
    testSteps: [
      'View list with no data',
      'Verify helpful empty state message',
      'Check call-to-action in empty state',
      'Test search with no results',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'EDGE_001',
    category: QACheckCategory.EDGE_CASES,
    title: 'Boundary Values',
    description: 'Feature handles min/max/boundary values correctly.',
    severity: 'MEDIUM',
    testSteps: [
      'Test with minimum allowed values',
      'Test with maximum allowed values',
      'Test with zero values',
      'Test with negative values (if applicable)',
      'Test with very large numbers/strings',
    ],
  },
  {
    code: 'EDGE_002',
    category: QACheckCategory.EDGE_CASES,
    title: 'Special Characters',
    description: 'Feature handles special characters and unicode correctly.',
    severity: 'MEDIUM',
    testSteps: [
      'Test with unicode characters: 日本語',
      'Test with emojis: 🎉🔥💯',
      'Test with special chars: <>&"\\\'/\\n\\t',
      'Test with very long strings',
      'Test with whitespace-only strings',
    ],
  },
  {
    code: 'EDGE_003',
    category: QACheckCategory.EDGE_CASES,
    title: 'Concurrent Operations',
    description: 'Feature handles concurrent edits/operations.',
    severity: 'HIGH',
    testSteps: [
      'Open same record in two browser tabs',
      'Edit in both tabs simultaneously',
      'Verify no data corruption',
      'Check optimistic locking if implemented',
    ],
  },
  {
    code: 'EDGE_004',
    category: QACheckCategory.EDGE_CASES,
    title: 'Session Expiry',
    description: 'Feature handles session expiry gracefully.',
    severity: 'MEDIUM',
    testSteps: [
      'Start filling a form',
      'Wait for session to expire',
      'Submit the form',
      'Verify redirect to login',
      'Check form data preservation',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // PERFORMANCE CHECKS
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'PERF_001',
    category: QACheckCategory.PERFORMANCE,
    title: 'Database Queries',
    description: 'No N+1 queries or inefficient database access.',
    severity: 'HIGH',
    testSteps: [
      'Monitor query logs during list operations',
      'Check for proper use of includes/joins',
      'Verify indexes exist for filtered columns',
      'Test with large datasets',
    ],
  },
  {
    code: 'PERF_002',
    category: QACheckCategory.PERFORMANCE,
    title: 'API Response Times',
    description: 'API responses return within acceptable time limits.',
    severity: 'HIGH',
    testSteps: [
      'Test response time with small datasets (<100ms)',
      'Test response time with medium datasets (<500ms)',
      'Test response time with large datasets (<2s)',
      'Check for proper pagination',
    ],
  },
  {
    code: 'PERF_003',
    category: QACheckCategory.PERFORMANCE,
    title: 'UI Rendering',
    description: 'UI renders without unnecessary re-renders or lag.',
    severity: 'MEDIUM',
    testSteps: [
      'Profile React renders with DevTools',
      'Check for unnecessary state updates',
      'Verify proper memoization',
      'Test with large lists (virtualization)',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ACCESSIBILITY CHECKS
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'A11Y_001',
    category: QACheckCategory.ACCESSIBILITY,
    title: 'Keyboard Navigation',
    description: 'Feature is fully usable with keyboard only.',
    severity: 'MEDIUM',
    testSteps: [
      'Tab through all interactive elements',
      'Verify focus indicators are visible',
      'Test all actions with Enter/Space',
      'Check Escape closes modals',
    ],
  },
  {
    code: 'A11Y_002',
    category: QACheckCategory.ACCESSIBILITY,
    title: 'Screen Reader Support',
    description: 'Feature works with screen readers.',
    severity: 'MEDIUM',
    testSteps: [
      'Check all images have alt text',
      'Verify form labels are associated',
      'Test ARIA labels on buttons/links',
      'Check heading hierarchy',
    ],
  },
  {
    code: 'A11Y_003',
    category: QACheckCategory.ACCESSIBILITY,
    title: 'Color Contrast',
    description: 'Text has sufficient color contrast.',
    severity: 'MEDIUM',
    testSteps: [
      'Check text contrast ratio (4.5:1 minimum)',
      'Verify information not conveyed by color alone',
      'Test with color blindness simulator',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // RESPONSIVE DESIGN CHECKS
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'RESP_001',
    category: QACheckCategory.RESPONSIVE,
    title: 'Mobile Viewport',
    description: 'Feature works correctly on mobile devices.',
    severity: 'HIGH',
    testSteps: [
      'Test at 320px width (iPhone SE)',
      'Test at 375px width (iPhone)',
      'Test at 414px width (iPhone Plus)',
      'Verify touch targets are 44px minimum',
      'Check horizontal scrolling is avoided',
    ],
  },
  {
    code: 'RESP_002',
    category: QACheckCategory.RESPONSIVE,
    title: 'Tablet Viewport',
    description: 'Feature works correctly on tablets.',
    severity: 'MEDIUM',
    testSteps: [
      'Test at 768px width (iPad portrait)',
      'Test at 1024px width (iPad landscape)',
      'Verify layout adapts appropriately',
    ],
  },
  {
    code: 'RESP_003',
    category: QACheckCategory.RESPONSIVE,
    title: 'Desktop Viewport',
    description: 'Feature works correctly on large screens.',
    severity: 'MEDIUM',
    testSteps: [
      'Test at 1280px width',
      'Test at 1920px width',
      'Verify content doesn\'t stretch too wide',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // DATA INTEGRITY CHECKS
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'DATA_001',
    category: QACheckCategory.DATA_INTEGRITY,
    title: 'Transaction Safety',
    description: 'Multi-step operations use database transactions.',
    severity: 'CRITICAL',
    testSteps: [
      'Identify multi-step database operations',
      'Test with failure mid-operation',
      'Verify rollback on failure',
      'Check no orphaned data',
    ],
  },
  {
    code: 'DATA_002',
    category: QACheckCategory.DATA_INTEGRITY,
    title: 'Soft Delete Consistency',
    description: 'Soft delete properly handles related records.',
    severity: 'HIGH',
    testSteps: [
      'Soft delete a record with relations',
      'Verify related records are handled',
      'Check cascade delete rules',
      'Test restore functionality',
    ],
  },
  {
    code: 'DATA_003',
    category: QACheckCategory.DATA_INTEGRITY,
    title: 'Data Persistence',
    description: 'All changes are properly persisted.',
    severity: 'HIGH',
    testSteps: [
      'Make changes and refresh page',
      'Verify changes are preserved',
      'Log out and log back in',
      'Verify changes still exist',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // INTEGRATION CHECKS
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'INT_001',
    category: QACheckCategory.INTEGRATION,
    title: 'Audit Log Integration',
    description: 'Important actions are logged to audit log.',
    severity: 'HIGH',
    testSteps: [
      'Perform create/update/delete operations',
      'Check audit log for entries',
      'Verify action details are accurate',
      'Check user and timestamp',
    ],
  },
  {
    code: 'INT_002',
    category: QACheckCategory.INTEGRATION,
    title: 'Dashboard Metrics',
    description: 'Feature properly updates dashboard metrics.',
    severity: 'MEDIUM',
    testSteps: [
      'Note current dashboard values',
      'Perform operations that should affect metrics',
      'Refresh dashboard',
      'Verify metrics updated correctly',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // DOCUMENTATION CHECKS
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'DOC_001',
    category: QACheckCategory.DOCUMENTATION,
    title: 'API Documentation',
    description: 'New API endpoints are documented.',
    severity: 'LOW',
    testSteps: [
      'Check Swagger/OpenAPI docs updated',
      'Verify request/response examples',
      'Check error documentation',
    ],
  },
  {
    code: 'DOC_002',
    category: QACheckCategory.DOCUMENTATION,
    title: 'Code Comments',
    description: 'Complex logic has appropriate comments.',
    severity: 'LOW',
    testSteps: [
      'Review new code files',
      'Check functions have JSDoc comments',
      'Verify complex logic is explained',
    ],
  },
];
