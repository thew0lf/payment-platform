import { PrismaClient, QACheckCategory, IssueSeverity } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * QA Checklist Items - Master Data
 * This data is imported from the service's STANDARD_QA_CHECKLIST
 * and will be persisted in the database for consistency and audit purposes.
 */
const QA_CHECKLIST_DATA = [
  // ═══════════════════════════════════════════════════════════════
  // SECURITY CHECKS
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'SEC_001',
    category: QACheckCategory.SECURITY,
    title: 'Authentication Required',
    description: 'All new endpoints require proper authentication. Test with and without valid tokens.',
    severity: IssueSeverity.CRITICAL,
    testSteps: [
      'Identify all new API endpoints',
      'Test each endpoint without authentication (should return 401)',
      'Test with invalid/expired tokens (should return 401)',
      'Test with valid tokens (should succeed)',
    ],
    expectedResult: 'All protected endpoints return 401 when accessed without valid authentication',
  },
  {
    code: 'SEC_002',
    category: QACheckCategory.SECURITY,
    title: 'Authorization Enforced',
    description: 'Users can only access resources they own or have permission to access.',
    severity: IssueSeverity.CRITICAL,
    testSteps: [
      'Login as User A and create/access resources',
      'Login as User B and try to access User A resources',
      'Verify access is denied or only shows appropriate data',
      'Test cross-organization access (should fail)',
    ],
    expectedResult: 'Users cannot access resources belonging to other users or organizations',
  },
  {
    code: 'SEC_003',
    category: QACheckCategory.SECURITY,
    title: 'Input Validation',
    description: 'All user inputs are validated and sanitized to prevent injection attacks.',
    severity: IssueSeverity.CRITICAL,
    testSteps: [
      "Test SQL injection in text fields: ' OR 1=1 --",
      'Test XSS in text fields: <script>alert("xss")</script>',
      'Test command injection: ; ls -la',
      "Verify error messages don't expose system details",
    ],
    expectedResult: 'All injection attempts are blocked or sanitized; no system information exposed',
  },
  {
    code: 'SEC_004',
    category: QACheckCategory.SECURITY,
    title: 'Sensitive Data Protected',
    description: 'Passwords, tokens, and sensitive data are never logged or exposed in responses.',
    severity: IssueSeverity.CRITICAL,
    testSteps: [
      "Check API responses don't include passwords or tokens",
      'Check console logs for sensitive data',
      'Check network responses for leaked credentials',
      'Verify sensitive fields are masked/redacted',
    ],
    expectedResult: 'No sensitive data visible in responses, logs, or network traffic',
  },
  {
    code: 'SEC_005',
    category: QACheckCategory.SECURITY,
    title: 'Rate Limiting',
    description: 'Endpoints that could be abused have appropriate rate limiting.',
    severity: IssueSeverity.HIGH,
    testSteps: [
      'Identify sensitive endpoints (login, password reset, etc.)',
      'Make rapid requests to these endpoints',
      'Verify rate limiting kicks in',
      'Check rate limit headers in responses',
    ],
    expectedResult: 'Rate limiting activates after threshold; proper headers returned',
  },

  // ═══════════════════════════════════════════════════════════════
  // PERMISSIONS CHECKS
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'PERM_001',
    category: QACheckCategory.PERMISSIONS,
    title: 'New Permissions Registered',
    description: 'Any new permissions are properly registered in the RBAC system.',
    severity: IssueSeverity.CRITICAL,
    testSteps: [
      'Check if feature requires new permissions',
      'Verify permissions exist in the Permission table',
      'Test permission enforcement on endpoints',
      'Check permission appears in role management UI',
    ],
    expectedResult: 'All required permissions exist and are enforceable',
  },
  {
    code: 'PERM_002',
    category: QACheckCategory.PERMISSIONS,
    title: 'Permission Guards Applied',
    description: 'Endpoints are protected with appropriate permission guards.',
    severity: IssueSeverity.CRITICAL,
    testSteps: [
      'Identify all new endpoints',
      'Verify each has @Roles or permission decorator',
      'Test with user lacking required permission (should fail)',
      'Test with user having required permission (should succeed)',
    ],
    expectedResult: 'All endpoints enforce permissions; unauthorized access blocked',
  },
  {
    code: 'PERM_003',
    category: QACheckCategory.PERMISSIONS,
    title: 'Multi-Role Testing',
    description: 'Feature works correctly for all applicable user roles.',
    severity: IssueSeverity.HIGH,
    testSteps: [
      'List all roles that should access this feature',
      'Test as Organization Admin',
      'Test as Client Admin',
      'Test as Company User',
      'Test as each custom role with varying permissions',
    ],
    expectedResult: 'Feature behaves correctly for each role based on their permissions',
  },
  {
    code: 'PERM_004',
    category: QACheckCategory.PERMISSIONS,
    title: 'Scope Isolation',
    description: 'Data is properly scoped to organization/client/company.',
    severity: IssueSeverity.CRITICAL,
    testSteps: [
      'Create data as Organization A',
      'Login as Organization B',
      'Verify Organization A data is not visible',
      'Repeat for Client and Company scopes',
    ],
    expectedResult: 'Complete data isolation between different organizations/clients/companies',
  },

  // ═══════════════════════════════════════════════════════════════
  // FUNCTIONALITY CHECKS
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'FUNC_001',
    category: QACheckCategory.FUNCTIONALITY,
    title: 'CRUD Operations',
    description: 'Create, Read, Update, Delete operations work correctly.',
    severity: IssueSeverity.HIGH,
    testSteps: [
      'Test creating new records',
      'Test reading/listing records',
      'Test updating existing records',
      'Test deleting records (soft delete if applicable)',
      'Verify cascade effects on related data',
    ],
    expectedResult: 'All CRUD operations work correctly with proper data persistence',
  },
  {
    code: 'FUNC_002',
    category: QACheckCategory.FUNCTIONALITY,
    title: 'Search and Filtering',
    description: 'Search, filter, and sort functionality works correctly.',
    severity: IssueSeverity.MEDIUM,
    testSteps: [
      'Test search with various terms',
      'Test each filter option',
      'Test sorting (asc/desc)',
      'Test pagination',
      'Test combined filters',
    ],
    expectedResult: 'Search, filtering, and sorting return correct results',
  },
  {
    code: 'FUNC_003',
    category: QACheckCategory.FUNCTIONALITY,
    title: 'Form Validation',
    description: 'All forms properly validate input before submission.',
    severity: IssueSeverity.HIGH,
    testSteps: [
      'Submit form with empty required fields',
      'Submit form with invalid data formats',
      'Submit form with boundary values',
      'Verify error messages are clear and helpful',
      'Test successful submission',
    ],
    expectedResult: 'Forms validate all inputs; clear error messages shown; valid submissions succeed',
  },
  {
    code: 'FUNC_004',
    category: QACheckCategory.FUNCTIONALITY,
    title: 'Navigation Flow',
    description: 'User can navigate to and from the feature correctly.',
    severity: IssueSeverity.MEDIUM,
    testSteps: [
      'Find the feature in navigation',
      'Test breadcrumb navigation',
      'Test back button behavior',
      'Test deep linking to the feature',
      'Test redirects after actions',
    ],
    expectedResult: 'Navigation is intuitive; all paths work correctly',
  },

  // ═══════════════════════════════════════════════════════════════
  // ERROR HANDLING CHECKS
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'ERR_001',
    category: QACheckCategory.ERROR_HANDLING,
    title: 'API Error Responses',
    description: 'API returns appropriate error codes and messages.',
    severity: IssueSeverity.HIGH,
    testSteps: [
      'Test 400 Bad Request scenarios',
      'Test 401 Unauthorized scenarios',
      'Test 403 Forbidden scenarios',
      'Test 404 Not Found scenarios',
      'Test 500 Server Error handling',
    ],
    expectedResult: 'Correct HTTP status codes with helpful error messages',
  },
  {
    code: 'ERR_002',
    category: QACheckCategory.ERROR_HANDLING,
    title: 'UI Error States',
    description: 'UI gracefully handles and displays errors.',
    severity: IssueSeverity.HIGH,
    testSteps: [
      'Test network error handling',
      'Test validation error display',
      'Test API error display',
      'Verify error messages are user-friendly',
      'Test error recovery options',
    ],
    expectedResult: 'Errors are displayed clearly; users can understand and recover',
  },
  {
    code: 'ERR_003',
    category: QACheckCategory.ERROR_HANDLING,
    title: 'Loading States',
    description: 'Loading states are shown during async operations.',
    severity: IssueSeverity.MEDIUM,
    testSteps: [
      'Verify loading indicators on data fetch',
      'Verify button loading states during submission',
      'Test skeleton loaders for lists',
      'Ensure no UI flicker',
    ],
    expectedResult: 'Clear loading indicators; no UI flickering or jarring transitions',
  },
  {
    code: 'ERR_004',
    category: QACheckCategory.ERROR_HANDLING,
    title: 'Empty States',
    description: 'Empty states are handled gracefully.',
    severity: IssueSeverity.MEDIUM,
    testSteps: [
      'View list with no data',
      'Verify helpful empty state message',
      'Check call-to-action in empty state',
      'Test search with no results',
    ],
    expectedResult: 'Helpful empty state messages with appropriate CTAs',
  },

  // ═══════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'EDGE_001',
    category: QACheckCategory.EDGE_CASES,
    title: 'Boundary Values',
    description: 'Feature handles min/max/boundary values correctly.',
    severity: IssueSeverity.MEDIUM,
    testSteps: [
      'Test with minimum allowed values',
      'Test with maximum allowed values',
      'Test with zero values',
      'Test with negative values (if applicable)',
      'Test with very large numbers/strings',
    ],
    expectedResult: 'Boundary values handled correctly; appropriate errors for out-of-bounds',
  },
  {
    code: 'EDGE_002',
    category: QACheckCategory.EDGE_CASES,
    title: 'Special Characters',
    description: 'Feature handles special characters and unicode correctly.',
    severity: IssueSeverity.MEDIUM,
    testSteps: [
      'Test with unicode characters: 日本語',
      'Test with emojis: 🎉🔥💯',
      "Test with special chars: <>&\"\\'/\\n\\t",
      'Test with very long strings',
      'Test with whitespace-only strings',
    ],
    expectedResult: 'Special characters displayed and stored correctly; no corruption',
  },
  {
    code: 'EDGE_003',
    category: QACheckCategory.EDGE_CASES,
    title: 'Concurrent Operations',
    description: 'Feature handles concurrent edits/operations.',
    severity: IssueSeverity.HIGH,
    testSteps: [
      'Open same record in two browser tabs',
      'Edit in both tabs simultaneously',
      'Verify no data corruption',
      'Check optimistic locking if implemented',
    ],
    expectedResult: 'No data corruption; conflicts handled gracefully',
  },
  {
    code: 'EDGE_004',
    category: QACheckCategory.EDGE_CASES,
    title: 'Session Expiry',
    description: 'Feature handles session expiry gracefully.',
    severity: IssueSeverity.MEDIUM,
    testSteps: [
      'Start filling a form',
      'Wait for session to expire',
      'Submit the form',
      'Verify redirect to login',
      'Check form data preservation',
    ],
    expectedResult: 'User redirected to login; form data preserved if possible',
  },

  // ═══════════════════════════════════════════════════════════════
  // PERFORMANCE CHECKS
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'PERF_001',
    category: QACheckCategory.PERFORMANCE,
    title: 'Database Queries',
    description: 'No N+1 queries or inefficient database access.',
    severity: IssueSeverity.HIGH,
    testSteps: [
      'Monitor query logs during list operations',
      'Check for proper use of includes/joins',
      'Verify indexes exist for filtered columns',
      'Test with large datasets',
    ],
    expectedResult: 'Efficient queries; no N+1 patterns; proper indexing',
  },
  {
    code: 'PERF_002',
    category: QACheckCategory.PERFORMANCE,
    title: 'API Response Times',
    description: 'API responses return within acceptable time limits.',
    severity: IssueSeverity.HIGH,
    testSteps: [
      'Test response time with small datasets (<100ms)',
      'Test response time with medium datasets (<500ms)',
      'Test response time with large datasets (<2s)',
      'Check for proper pagination',
    ],
    expectedResult: 'Response times within acceptable limits for each dataset size',
  },
  {
    code: 'PERF_003',
    category: QACheckCategory.PERFORMANCE,
    title: 'UI Rendering',
    description: 'UI renders without unnecessary re-renders or lag.',
    severity: IssueSeverity.MEDIUM,
    testSteps: [
      'Profile React renders with DevTools',
      'Check for unnecessary state updates',
      'Verify proper memoization',
      'Test with large lists (virtualization)',
    ],
    expectedResult: 'Minimal re-renders; smooth UI performance',
  },

  // ═══════════════════════════════════════════════════════════════
  // ACCESSIBILITY CHECKS
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'A11Y_001',
    category: QACheckCategory.ACCESSIBILITY,
    title: 'Keyboard Navigation',
    description: 'Feature is fully usable with keyboard only.',
    severity: IssueSeverity.MEDIUM,
    testSteps: [
      'Tab through all interactive elements',
      'Verify focus indicators are visible',
      'Test all actions with Enter/Space',
      'Check Escape closes modals',
    ],
    expectedResult: 'Full keyboard navigation; visible focus indicators',
  },
  {
    code: 'A11Y_002',
    category: QACheckCategory.ACCESSIBILITY,
    title: 'Screen Reader Support',
    description: 'Feature works with screen readers.',
    severity: IssueSeverity.MEDIUM,
    testSteps: [
      'Check all images have alt text',
      'Verify form labels are associated',
      'Test ARIA labels on buttons/links',
      'Check heading hierarchy',
    ],
    expectedResult: 'All content accessible via screen reader',
  },
  {
    code: 'A11Y_003',
    category: QACheckCategory.ACCESSIBILITY,
    title: 'Color Contrast',
    description: 'Text has sufficient color contrast.',
    severity: IssueSeverity.MEDIUM,
    testSteps: [
      'Check text contrast ratio (4.5:1 minimum)',
      'Verify information not conveyed by color alone',
      'Test with color blindness simulator',
    ],
    expectedResult: 'WCAG AA compliant contrast ratios',
  },

  // ═══════════════════════════════════════════════════════════════
  // RESPONSIVE DESIGN CHECKS
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'RESP_001',
    category: QACheckCategory.RESPONSIVE,
    title: 'Mobile Viewport',
    description: 'Feature works correctly on mobile devices.',
    severity: IssueSeverity.HIGH,
    testSteps: [
      'Test at 320px width (iPhone SE)',
      'Test at 375px width (iPhone)',
      'Test at 414px width (iPhone Plus)',
      'Verify touch targets are 44px minimum',
      'Check horizontal scrolling is avoided',
    ],
    expectedResult: 'Fully functional on mobile; proper touch targets; no horizontal scroll',
  },
  {
    code: 'RESP_002',
    category: QACheckCategory.RESPONSIVE,
    title: 'Tablet Viewport',
    description: 'Feature works correctly on tablets.',
    severity: IssueSeverity.MEDIUM,
    testSteps: [
      'Test at 768px width (iPad portrait)',
      'Test at 1024px width (iPad landscape)',
      'Verify layout adapts appropriately',
    ],
    expectedResult: 'Layout adapts correctly to tablet viewports',
  },
  {
    code: 'RESP_003',
    category: QACheckCategory.RESPONSIVE,
    title: 'Desktop Viewport',
    description: 'Feature works correctly on large screens.',
    severity: IssueSeverity.MEDIUM,
    testSteps: [
      'Test at 1280px width',
      'Test at 1920px width',
      "Verify content doesn't stretch too wide",
    ],
    expectedResult: 'Content properly constrained; good use of space',
  },

  // ═══════════════════════════════════════════════════════════════
  // DATA INTEGRITY CHECKS
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'DATA_001',
    category: QACheckCategory.DATA_INTEGRITY,
    title: 'Transaction Safety',
    description: 'Multi-step operations use database transactions.',
    severity: IssueSeverity.CRITICAL,
    testSteps: [
      'Identify multi-step database operations',
      'Test with failure mid-operation',
      'Verify rollback on failure',
      'Check no orphaned data',
    ],
    expectedResult: 'All operations atomic; failures result in complete rollback',
  },
  {
    code: 'DATA_002',
    category: QACheckCategory.DATA_INTEGRITY,
    title: 'Soft Delete Consistency',
    description: 'Soft delete properly handles related records.',
    severity: IssueSeverity.HIGH,
    testSteps: [
      'Soft delete a record with relations',
      'Verify related records are handled',
      'Check cascade delete rules',
      'Test restore functionality',
    ],
    expectedResult: 'Related records handled correctly; restore works properly',
  },
  {
    code: 'DATA_003',
    category: QACheckCategory.DATA_INTEGRITY,
    title: 'Data Persistence',
    description: 'All changes are properly persisted.',
    severity: IssueSeverity.HIGH,
    testSteps: [
      'Make changes and refresh page',
      'Verify changes are preserved',
      'Log out and log back in',
      'Verify changes still exist',
    ],
    expectedResult: 'All data changes persist across sessions',
  },

  // ═══════════════════════════════════════════════════════════════
  // INTEGRATION CHECKS
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'INT_001',
    category: QACheckCategory.INTEGRATION,
    title: 'Audit Log Integration',
    description: 'Important actions are logged to audit log.',
    severity: IssueSeverity.HIGH,
    testSteps: [
      'Perform create/update/delete operations',
      'Check audit log for entries',
      'Verify action details are accurate',
      'Check user and timestamp',
    ],
    expectedResult: 'All significant actions logged with accurate details',
  },
  {
    code: 'INT_002',
    category: QACheckCategory.INTEGRATION,
    title: 'Dashboard Metrics',
    description: 'Feature properly updates dashboard metrics.',
    severity: IssueSeverity.MEDIUM,
    testSteps: [
      'Note current dashboard values',
      'Perform operations that should affect metrics',
      'Refresh dashboard',
      'Verify metrics updated correctly',
    ],
    expectedResult: 'Dashboard metrics reflect changes correctly',
  },

  // ═══════════════════════════════════════════════════════════════
  // DOCUMENTATION CHECKS
  // ═══════════════════════════════════════════════════════════════
  {
    code: 'DOC_001',
    category: QACheckCategory.DOCUMENTATION,
    title: 'API Documentation',
    description: 'New API endpoints are documented.',
    severity: IssueSeverity.LOW,
    testSteps: [
      'Check Swagger/OpenAPI docs updated',
      'Verify request/response examples',
      'Check error documentation',
    ],
    expectedResult: 'All new endpoints documented with examples',
  },
  {
    code: 'DOC_002',
    category: QACheckCategory.DOCUMENTATION,
    title: 'Code Comments',
    description: 'Complex logic has appropriate comments.',
    severity: IssueSeverity.LOW,
    testSteps: [
      'Review new code files',
      'Check functions have JSDoc comments',
      'Verify complex logic is explained',
    ],
    expectedResult: 'Public APIs and complex logic properly documented',
  },
];

/**
 * Template names and descriptions by category
 */
const QA_CATEGORY_TEMPLATES: Record<
  QACheckCategory,
  { name: string; description: string; applicableTo: string[] }
> = {
  [QACheckCategory.SECURITY]: {
    name: 'Security',
    description: 'Authentication, authorization, and input validation checks',
    applicableTo: ['api', 'frontend', 'both'],
  },
  [QACheckCategory.PERMISSIONS]: {
    name: 'Permissions',
    description: 'RBAC and tenant isolation checks',
    applicableTo: ['api', 'frontend', 'both'],
  },
  [QACheckCategory.FUNCTIONALITY]: {
    name: 'Functionality',
    description: 'Core feature functionality checks',
    applicableTo: ['api', 'frontend', 'both'],
  },
  [QACheckCategory.ERROR_HANDLING]: {
    name: 'Error Handling',
    description: 'Error states and user feedback checks',
    applicableTo: ['api', 'frontend', 'both'],
  },
  [QACheckCategory.EDGE_CASES]: {
    name: 'Edge Cases',
    description: 'Boundary conditions and unusual input checks',
    applicableTo: ['api', 'frontend', 'both'],
  },
  [QACheckCategory.PERFORMANCE]: {
    name: 'Performance',
    description: 'Load times and efficiency checks',
    applicableTo: ['api', 'frontend', 'both'],
  },
  [QACheckCategory.ACCESSIBILITY]: {
    name: 'Accessibility',
    description: 'WCAG compliance and assistive technology checks',
    applicableTo: ['frontend'],
  },
  [QACheckCategory.RESPONSIVE]: {
    name: 'Responsive Design',
    description: 'Mobile and tablet layout checks',
    applicableTo: ['frontend'],
  },
  [QACheckCategory.DATA_INTEGRITY]: {
    name: 'Data Integrity',
    description: 'Data persistence and transaction safety checks',
    applicableTo: ['api'],
  },
  [QACheckCategory.INTEGRATION]: {
    name: 'Integration',
    description: 'Third-party service and system integration checks',
    applicableTo: ['api', 'frontend', 'both'],
  },
  [QACheckCategory.DOCUMENTATION]: {
    name: 'Documentation',
    description: 'API docs and code comment checks',
    applicableTo: ['api', 'frontend', 'both'],
  },
};

async function seedQAChecklist() {
  console.log('🔍 Seeding QA Checklist...');

  // Group items by category
  const itemsByCategory = QA_CHECKLIST_DATA.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<QACheckCategory, typeof QA_CHECKLIST_DATA>,
  );

  let totalTemplates = 0;
  let totalItems = 0;

  // Create templates and items for each category
  for (const [category, items] of Object.entries(itemsByCategory)) {
    const categoryKey = category as QACheckCategory;
    const templateInfo = QA_CATEGORY_TEMPLATES[categoryKey];

    // Upsert template
    const existingTemplate = await prisma.qAChecklistTemplate.findFirst({
      where: {
        category: categoryKey,
        isActive: true,
      },
    });

    let template;
    if (existingTemplate) {
      template = await prisma.qAChecklistTemplate.update({
        where: { id: existingTemplate.id },
        data: {
          name: templateInfo.name,
          description: templateInfo.description,
          applicableTo: templateInfo.applicableTo,
          displayOrder: Object.values(QACheckCategory).indexOf(categoryKey),
        },
      });
    } else {
      template = await prisma.qAChecklistTemplate.create({
        data: {
          name: templateInfo.name,
          description: templateInfo.description,
          category: categoryKey,
          applicableTo: templateInfo.applicableTo,
          isRequired: true,
          displayOrder: Object.values(QACheckCategory).indexOf(categoryKey),
          isActive: true,
        },
      });
    }
    totalTemplates++;

    // Delete existing items for this template (to allow updates)
    await prisma.qAChecklistItem.deleteMany({
      where: { templateId: template.id },
    });

    // Create items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await prisma.qAChecklistItem.create({
        data: {
          templateId: template.id,
          title: item.title,
          description: item.description,
          howToTest: item.testSteps.join('\n'),
          expectedResult: item.expectedResult,
          failureSeverity: item.severity,
          displayOrder: i,
          isActive: true,
        },
      });
      totalItems++;
    }

    console.log(`  ✓ ${templateInfo.name}: ${items.length} checks`);
  }

  console.log(`✅ QA Checklist seeding complete!`);
  console.log(`   ${totalTemplates} templates, ${totalItems} items`);
}

// Run if called directly
if (require.main === module) {
  seedQAChecklist()
    .catch((e) => {
      console.error('Error seeding QA Checklist:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedQAChecklist, QA_CHECKLIST_DATA };
