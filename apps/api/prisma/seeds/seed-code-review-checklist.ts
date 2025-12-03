import { PrismaClient, CodeReviewCategory, IssueSeverity } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Code Review Checklist Items - Master Data
 * This data is imported from the service's STANDARD_CODE_REVIEW_CHECKLIST
 * and will be persisted in the database for consistency and audit purposes.
 */
const CODE_REVIEW_CHECKLIST_DATA = [
  // ═══════════════════════════════════════════════════════════════════════════
  // CODE QUALITY
  // ═══════════════════════════════════════════════════════════════════════════
  {
    code: 'CQ_001',
    category: CodeReviewCategory.CODE_QUALITY,
    title: 'Follows Project Conventions',
    description: 'Code follows established project coding standards and style guide.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'Verify naming conventions (camelCase, PascalCase) are consistent',
      'Check file organization matches project structure',
      'Ensure imports are properly organized',
      'Verify consistent formatting (indentation, spacing)',
    ],
  },
  {
    code: 'CQ_002',
    category: CodeReviewCategory.CODE_QUALITY,
    title: 'Single Responsibility Principle',
    description: 'Functions and classes have a single, well-defined purpose.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'Each function does one thing well',
      'Functions are typically under 30-50 lines',
      'Classes handle one concern',
      'No "god objects" or monolithic functions',
    ],
  },
  {
    code: 'CQ_003',
    category: CodeReviewCategory.CODE_QUALITY,
    title: 'DRY Principle (No Duplication)',
    description: 'Code is not duplicated; common logic is extracted into reusable functions.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'Search for copy-pasted code blocks',
      'Check for repeated logic that could be abstracted',
      'Verify utility functions are used where appropriate',
      'Check for duplicated validation logic',
    ],
  },
  {
    code: 'CQ_004',
    category: CodeReviewCategory.CODE_QUALITY,
    title: 'Clear Naming',
    description: 'Variables, functions, and classes have descriptive, meaningful names.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'Variable names describe their contents',
      'Function names describe their actions',
      'Boolean variables use is/has/can prefixes',
      'No single-letter variables (except loop counters)',
      'No unclear abbreviations',
    ],
  },
  {
    code: 'CQ_005',
    category: CodeReviewCategory.CODE_QUALITY,
    title: 'Appropriate Comments',
    description: 'Comments explain "why" not "what", and complex logic is documented.',
    severity: IssueSeverity.LOW,
    checkSteps: [
      'Comments explain business logic and decisions',
      'No commented-out code left in',
      'JSDoc comments on public APIs',
      'TODO comments have associated tickets',
    ],
  },
  {
    code: 'CQ_006',
    category: CodeReviewCategory.CODE_QUALITY,
    title: 'No Dead Code',
    description: 'Unused variables, functions, imports, and commented code are removed.',
    severity: IssueSeverity.LOW,
    checkSteps: [
      'No unused imports',
      'No unused variables or functions',
      'No commented-out code blocks',
      'No unreachable code paths',
    ],
  },
  {
    code: 'CQ_007',
    category: CodeReviewCategory.CODE_QUALITY,
    title: 'Proper Error Messages',
    description: 'Error messages are specific, actionable, and user-friendly.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'Error messages describe what went wrong',
      'Error messages suggest how to fix the issue',
      'Technical details not exposed to end users',
      'Error codes are used for programmatic handling',
    ],
  },
  {
    code: 'CQ_008',
    category: CodeReviewCategory.CODE_QUALITY,
    title: 'Magic Numbers Eliminated',
    description: 'Hard-coded values are extracted into named constants.',
    severity: IssueSeverity.LOW,
    checkSteps: [
      'Numeric literals have descriptive const names',
      'String literals are in constants or enums',
      'Configuration values are externalized',
      'No unexplained magic numbers in code',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ARCHITECTURE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    code: 'ARCH_001',
    category: CodeReviewCategory.ARCHITECTURE,
    title: 'Follows Existing Patterns',
    description: 'Code follows established architectural patterns in the codebase.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'Service layer for business logic',
      'Controller layer for HTTP handling',
      'Repository/Prisma patterns for data access',
      'DTOs for data transfer',
      'Consistent module organization',
    ],
  },
  {
    code: 'ARCH_002',
    category: CodeReviewCategory.ARCHITECTURE,
    title: 'Proper Separation of Concerns',
    description: 'UI, business logic, and data access are properly separated.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'Controllers only handle HTTP request/response',
      'Services contain business logic',
      'No database queries in controllers',
      'No HTTP handling in services',
      "Frontend components don't contain business logic",
    ],
  },
  {
    code: 'ARCH_003',
    category: CodeReviewCategory.ARCHITECTURE,
    title: 'No Circular Dependencies',
    description: 'Module dependencies form a directed acyclic graph.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'Check import paths for cycles',
      'Verify no service A imports service B which imports service A',
      'Use dependency injection properly',
      'Check for implicit circular dependencies through shared state',
    ],
  },
  {
    code: 'ARCH_004',
    category: CodeReviewCategory.ARCHITECTURE,
    title: 'Appropriate Abstraction Level',
    description: 'Abstractions are at the right level - not too high or too low.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'No premature abstraction for single-use code',
      'Common patterns are properly abstracted',
      'Interfaces are not overly generic',
      'Concrete implementations are not leaked',
    ],
  },
  {
    code: 'ARCH_005',
    category: CodeReviewCategory.ARCHITECTURE,
    title: 'Scalable Design',
    description: 'Design can handle expected load and future growth.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'Stateless services where possible',
      'Proper use of caching',
      "No in-memory state that doesn't scale",
      'Pagination for list endpoints',
      'Async operations for long-running tasks',
    ],
  },
  {
    code: 'ARCH_006',
    category: CodeReviewCategory.ARCHITECTURE,
    title: 'No Over-Engineering',
    description: 'Solution complexity matches problem complexity.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'No unnecessary design patterns',
      'No premature optimization',
      'Simple solutions preferred over complex ones',
      "YAGNI principle followed (You Aren't Gonna Need It)",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TYPE SAFETY
  // ═══════════════════════════════════════════════════════════════════════════
  {
    code: 'TS_001',
    category: CodeReviewCategory.TYPE_SAFETY,
    title: 'No Unsafe Any Types',
    description: 'The `any` type is avoided unless absolutely necessary and justified.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'Search for "any" type usage',
      'Each "any" usage is justified with a comment',
      'Consider using "unknown" instead of "any"',
      'Check for implicit "any" from missing types',
    ],
  },
  {
    code: 'TS_002',
    category: CodeReviewCategory.TYPE_SAFETY,
    title: 'Proper Interface Definitions',
    description: 'All data structures have proper TypeScript interfaces.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'API request/response types are defined',
      'Database entity types match Prisma schema',
      'No inline object type literals',
      'Interfaces are in appropriate files',
    ],
  },
  {
    code: 'TS_003',
    category: CodeReviewCategory.TYPE_SAFETY,
    title: 'Nullable Types Handled',
    description: 'Null and undefined cases are properly handled.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'Optional properties marked with ?',
      'Null checks before accessing properties',
      'No non-null assertions (!) without justification',
      'Default values provided where appropriate',
    ],
  },
  {
    code: 'TS_004',
    category: CodeReviewCategory.TYPE_SAFETY,
    title: 'Generic Types Used Appropriately',
    description: 'Generics are used for type-safe reusable code.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'Generics have descriptive names (T, TData, etc.)',
      'Generic constraints are defined where needed',
      'No overly complex generic signatures',
      'Utility types (Partial, Pick, etc.) used appropriately',
    ],
  },
  {
    code: 'TS_005',
    category: CodeReviewCategory.TYPE_SAFETY,
    title: 'DTOs Properly Validated',
    description: 'Data Transfer Objects have validation decorators.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'class-validator decorators on DTO properties',
      '@IsString(), @IsNumber(), @IsEmail() etc. used',
      '@IsOptional() for optional fields',
      '@ValidateNested() for nested objects',
      'Custom validation for business rules',
    ],
  },
  {
    code: 'TS_006',
    category: CodeReviewCategory.TYPE_SAFETY,
    title: 'Enum Usage',
    description: 'Enums are used for fixed sets of values.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'String enums for user-facing values',
      'Enums match Prisma schema enums',
      'No magic strings that should be enums',
      'Enum values are properly typed in functions',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    code: 'EH_001',
    category: CodeReviewCategory.ERROR_HANDLING,
    title: 'All Async Operations Have Error Handling',
    description: 'Promises have catch handlers or are in try/catch blocks.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'All await calls are in try/catch',
      'All .then() have .catch() or error handling',
      'No unhandled promise rejections',
      'Error boundaries in React components',
    ],
  },
  {
    code: 'EH_002',
    category: CodeReviewCategory.ERROR_HANDLING,
    title: 'Errors Logged with Context',
    description: 'Errors are logged with sufficient context for debugging.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'Error logs include relevant context (userId, requestId, etc.)',
      'Stack traces are preserved',
      "Error logs don't include sensitive data",
      'Structured logging format used',
    ],
  },
  {
    code: 'EH_003',
    category: CodeReviewCategory.ERROR_HANDLING,
    title: 'User-Facing Errors Sanitized',
    description: 'Technical error details are not exposed to end users.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'Stack traces not shown to users',
      'Database error details not exposed',
      'File paths not exposed in errors',
      'Generic user messages with specific internal logging',
    ],
  },
  {
    code: 'EH_004',
    category: CodeReviewCategory.ERROR_HANDLING,
    title: 'Proper Try/Catch Scope',
    description: 'Try/catch blocks are appropriately scoped.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'Try blocks only wrap necessary code',
      'Specific exception types caught where possible',
      'No empty catch blocks',
      'Caught errors are handled or re-thrown',
    ],
  },
  {
    code: 'EH_005',
    category: CodeReviewCategory.ERROR_HANDLING,
    title: 'HTTP Status Codes Appropriate',
    description: 'API endpoints return correct HTTP status codes.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      '200 for successful GET/general success',
      '201 for successful creation',
      '204 for successful deletion',
      '400 for validation errors',
      '401 for authentication failures',
      '403 for authorization failures',
      '404 for not found',
      '409 for conflicts',
      '500 only for unexpected errors',
    ],
  },
  {
    code: 'EH_006',
    category: CodeReviewCategory.ERROR_HANDLING,
    title: 'Graceful Degradation',
    description: 'System handles partial failures gracefully.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      "Non-critical operations don't fail the whole request",
      'Fallback behavior for external service failures',
      'Circuit breakers for unreliable dependencies',
      'Timeout handling for external calls',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MAINTAINABILITY
  // ═══════════════════════════════════════════════════════════════════════════
  {
    code: 'MAINT_001',
    category: CodeReviewCategory.MAINTAINABILITY,
    title: 'Self-Documenting Code',
    description: 'Code is readable and understandable without extensive comments.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'Function names describe what they do',
      'Code flow is easy to follow',
      'Complex logic is broken into smaller functions',
      'No clever tricks that obscure intent',
    ],
  },
  {
    code: 'MAINT_002',
    category: CodeReviewCategory.MAINTAINABILITY,
    title: 'Complex Logic Documented',
    description: 'Business rules and complex algorithms are documented.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'Business logic has explanatory comments',
      'Algorithms have complexity notes',
      'Edge cases are documented',
      'Assumptions are stated',
    ],
  },
  {
    code: 'MAINT_003',
    category: CodeReviewCategory.MAINTAINABILITY,
    title: 'Minimal Dependencies',
    description: 'No unnecessary external dependencies added.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'New dependencies are justified',
      'Dependencies are actively maintained',
      'No dependencies with security vulnerabilities',
      'Lightweight alternatives preferred',
    ],
  },
  {
    code: 'MAINT_004',
    category: CodeReviewCategory.MAINTAINABILITY,
    title: 'Configuration Externalized',
    description: 'Environment-specific values are in configuration, not code.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'URLs, ports, and hosts are configurable',
      'Feature flags are externalized',
      'No environment checks in code (use config)',
      'Secrets are not hardcoded',
    ],
  },
  {
    code: 'MAINT_005',
    category: CodeReviewCategory.MAINTAINABILITY,
    title: 'Backwards Compatible',
    description: "Changes don't break existing functionality.",
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'API changes are backwards compatible',
      'Database migrations are safe',
      'No breaking changes to public interfaces',
      'Deprecation notices for removed features',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TESTING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    code: 'TEST_001',
    category: CodeReviewCategory.TESTING,
    title: 'Unit Tests Added',
    description: 'New code has appropriate unit test coverage.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'Service methods have unit tests',
      'Edge cases are tested',
      'Error paths are tested',
      'Mock dependencies appropriately',
    ],
  },
  {
    code: 'TEST_002',
    category: CodeReviewCategory.TESTING,
    title: 'Integration Tests Added',
    description: 'Integration points have appropriate tests.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'API endpoints have integration tests',
      'Database operations are tested',
      'External service integrations mocked',
      'Authentication/authorization tested',
    ],
  },
  {
    code: 'TEST_003',
    category: CodeReviewCategory.TESTING,
    title: 'Test Quality',
    description: 'Tests are well-written and maintainable.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'Tests have descriptive names',
      'AAA pattern (Arrange, Act, Assert)',
      'Tests are independent',
      'No flaky tests',
      'Test data factories used',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SECURITY - OWASP TOP 10
  // ═══════════════════════════════════════════════════════════════════════════
  {
    code: 'SEC_001',
    category: CodeReviewCategory.SECURITY,
    title: 'SQL Injection Prevention',
    description: 'Database queries are parameterized to prevent SQL injection.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'OWASP A03:2021',
    failureImpact: 'Complete database compromise, data breach',
    checkSteps: [
      'No raw SQL queries with string concatenation',
      'Prisma/ORM used for all database access',
      'Any raw queries use parameterized statements',
      'User input never directly in SQL',
    ],
  },
  {
    code: 'SEC_002',
    category: CodeReviewCategory.SECURITY,
    title: 'XSS Prevention',
    description: 'User input is properly escaped to prevent Cross-Site Scripting.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'OWASP A03:2021',
    failureImpact: 'Session hijacking, credential theft, defacement',
    checkSteps: [
      'React escapes output by default (verify not bypassed)',
      'No dangerouslySetInnerHTML without sanitization',
      'User input sanitized before storage',
      'Content-Security-Policy headers configured',
    ],
  },
  {
    code: 'SEC_003',
    category: CodeReviewCategory.SECURITY,
    title: 'Command Injection Prevention',
    description: 'No shell commands constructed from user input.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'OWASP A03:2021',
    failureImpact: 'Server compromise, arbitrary code execution',
    checkSteps: [
      'No exec(), spawn(), system() with user input',
      'File operations use safe paths',
      'No eval() or new Function() with user input',
      'Template literals not used for commands',
    ],
  },
  {
    code: 'SEC_004',
    category: CodeReviewCategory.SECURITY,
    title: 'Path Traversal Prevention',
    description: 'File operations validate paths to prevent directory traversal.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'OWASP A01:2021',
    failureImpact: 'Access to system files, sensitive data exposure',
    checkSteps: [
      'User input not directly used in file paths',
      'Path sanitization (remove ../, etc.)',
      'Whitelist allowed directories',
      'Validate file extensions',
    ],
  },
  {
    code: 'SEC_005',
    category: CodeReviewCategory.SECURITY,
    title: 'Insecure Deserialization Prevention',
    description: 'User-supplied data is not unsafely deserialized.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'OWASP A08:2021',
    failureImpact: 'Remote code execution, DoS attacks',
    checkSteps: [
      'No JSON.parse() on untrusted data without validation',
      'No YAML/XML parsing of untrusted data',
      'Avoid pickle/marshal on untrusted data',
      'Validate structure after deserialization',
    ],
  },
  {
    code: 'SEC_006',
    category: CodeReviewCategory.SECURITY,
    title: 'SSRF Prevention',
    description: 'Server-Side Request Forgery attacks are prevented.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'OWASP A10:2021',
    failureImpact: 'Internal network access, cloud metadata exposure',
    checkSteps: [
      'User-supplied URLs are validated',
      'No requests to internal IPs (127.0.0.1, 10.x, etc.)',
      'Whitelist allowed domains for external requests',
      'No access to cloud metadata endpoints',
    ],
  },
  {
    code: 'SEC_007',
    category: CodeReviewCategory.SECURITY,
    title: 'Mass Assignment Prevention',
    description: 'Object properties are not blindly assigned from user input.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'OWASP A01:2021',
    failureImpact: 'Privilege escalation, data manipulation',
    checkSteps: [
      'DTOs with explicit allowed fields',
      'No Object.assign() or spread from raw input',
      'Whitelist properties in create/update operations',
      'Admin fields not assignable by users',
    ],
  },
  {
    code: 'SEC_008',
    category: CodeReviewCategory.SECURITY,
    title: 'Security Misconfiguration',
    description: 'Security settings are properly configured.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'OWASP A05:2021',
    failureImpact: 'Unauthorized access, information disclosure',
    checkSteps: [
      'Debug mode disabled in production',
      'Detailed errors not exposed to users',
      'Default credentials changed',
      'Unnecessary features disabled',
      'Security headers configured',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    code: 'AUTH_001',
    category: CodeReviewCategory.AUTHENTICATION,
    title: 'Authentication Required on Protected Routes',
    description: 'All protected endpoints require valid authentication.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'SOC2 CC6.1, PCI-DSS 8.2',
    failureImpact: 'Unauthorized access to sensitive data',
    checkSteps: [
      'JwtAuthGuard applied to protected routes',
      'No public access to sensitive data',
      'Token validation on every request',
      'Session handling is secure',
    ],
  },
  {
    code: 'AUTH_002',
    category: CodeReviewCategory.AUTHENTICATION,
    title: 'Secure Token Handling',
    description: 'JWT tokens are handled securely.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'OWASP A02:2021, PCI-DSS 8.2.1',
    failureImpact: 'Token theft, account takeover',
    checkSteps: [
      'Tokens have appropriate expiration',
      'Refresh token rotation implemented',
      'Tokens stored securely (httpOnly cookies or secure storage)',
      "Token payload doesn't contain sensitive data",
    ],
  },
  {
    code: 'AUTH_003',
    category: CodeReviewCategory.AUTHENTICATION,
    title: 'Password Security',
    description: 'Passwords are handled securely.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'PCI-DSS 8.2.3, ISO A.9.4.3',
    failureImpact: 'Credential compromise',
    checkSteps: [
      'Passwords hashed with bcrypt/argon2',
      'Minimum password complexity enforced',
      'Password not logged',
      'Password reset tokens expire quickly',
      'Rate limiting on login attempts',
    ],
  },
  {
    code: 'AUTH_004',
    category: CodeReviewCategory.AUTHENTICATION,
    title: 'Multi-Factor Authentication',
    description: 'MFA is available/required for sensitive operations.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'PCI-DSS 8.3, SOC2 CC6.1',
    failureImpact: 'Reduced authentication security',
    checkSteps: [
      'MFA option available for users',
      'MFA required for admin operations',
      'MFA tokens have short expiration',
      'Backup codes handled securely',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHORIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    code: 'AUTHZ_001',
    category: CodeReviewCategory.AUTHORIZATION,
    title: 'Authorization Checks Before Data Access',
    description: 'All data access is preceded by authorization checks.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'SOC2 CC6.1, PCI-DSS 7.1',
    failureImpact: 'Unauthorized data access, IDOR vulnerabilities',
    checkSteps: [
      'Permission guards on controllers',
      'Resource ownership verified in services',
      'No direct object reference without auth check',
      'Tenant isolation enforced',
    ],
  },
  {
    code: 'AUTHZ_002',
    category: CodeReviewCategory.AUTHORIZATION,
    title: 'Principle of Least Privilege',
    description: 'Users have minimum necessary permissions.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'SOC2 CC6.2, ISO A.9.4.1, PCI-DSS 7.2',
    failureImpact: 'Excessive access, privilege escalation',
    checkSteps: [
      'Default roles have minimal permissions',
      'Permissions are granular',
      'Admin functions restricted appropriately',
      'No hardcoded superuser bypasses',
    ],
  },
  {
    code: 'AUTHZ_003',
    category: CodeReviewCategory.AUTHORIZATION,
    title: 'IDOR Prevention',
    description: 'Insecure Direct Object Reference vulnerabilities prevented.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'OWASP A01:2021',
    failureImpact: "Access to other users' data",
    checkSteps: [
      'IDs in URLs verified against user permissions',
      "Can't access resources by guessing IDs",
      'Multi-tenant queries include tenant filter',
      'File access checks ownership',
    ],
  },
  {
    code: 'AUTHZ_004',
    category: CodeReviewCategory.AUTHORIZATION,
    title: 'Function Level Access Control',
    description: 'Administrative functions are properly restricted.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'OWASP A01:2021, PCI-DSS 7.1',
    failureImpact: 'Unauthorized admin access',
    checkSteps: [
      'Admin routes require admin role',
      'No hidden admin endpoints',
      'Role checks on both frontend and backend',
      "Can't elevate own privileges",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INPUT VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    code: 'INPUT_001',
    category: CodeReviewCategory.INPUT_VALIDATION,
    title: 'All User Input Validated',
    description: 'Every user input is validated before use.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'OWASP A03:2021, PCI-DSS 6.5.1',
    failureImpact: 'Injection attacks, data corruption',
    checkSteps: [
      'Request body validated via DTOs',
      'Query parameters validated',
      'Path parameters validated',
      'File uploads validated (type, size)',
      'Headers validated where used',
    ],
  },
  {
    code: 'INPUT_002',
    category: CodeReviewCategory.INPUT_VALIDATION,
    title: 'Whitelist Validation',
    description: 'Input validation uses allowlists, not blocklists.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'OWASP A03:2021',
    failureImpact: 'Bypass of validation rules',
    checkSteps: [
      'Enum values validated against allowed list',
      'File types checked against whitelist',
      'Allowed characters defined, not blocked characters',
      'URLs validated against allowed domains',
    ],
  },
  {
    code: 'INPUT_003',
    category: CodeReviewCategory.INPUT_VALIDATION,
    title: 'Input Length Limits',
    description: 'Input fields have appropriate length limits.',
    severity: IssueSeverity.MEDIUM,
    complianceRef: 'OWASP A03:2021',
    failureImpact: 'DoS attacks, buffer issues, database overflow',
    checkSteps: [
      '@MaxLength() decorators on strings',
      'File size limits enforced',
      'Array length limits defined',
      'Reasonable limits for all text fields',
    ],
  },
  {
    code: 'INPUT_004',
    category: CodeReviewCategory.INPUT_VALIDATION,
    title: 'Type Coercion Safety',
    description: "Type coercion doesn't introduce vulnerabilities.",
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'Query params properly typed',
      'No truthy/falsy issues with validation',
      'JSON parsing handles unexpected types',
      'Number parsing handles NaN/Infinity',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OUTPUT ENCODING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    code: 'OUTPUT_001',
    category: CodeReviewCategory.OUTPUT_ENCODING,
    title: 'HTML Output Encoded',
    description: 'Dynamic content is properly escaped in HTML context.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'OWASP A03:2021',
    failureImpact: 'XSS attacks',
    checkSteps: [
      'React default escaping not bypassed',
      'Server-rendered HTML is escaped',
      'User content in emails is escaped',
      'PDF generation escapes content',
    ],
  },
  {
    code: 'OUTPUT_002',
    category: CodeReviewCategory.OUTPUT_ENCODING,
    title: 'JSON Output Safe',
    description: "JSON responses don't enable attacks.",
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'No sensitive data in JSON responses',
      'JSON responses have proper content-type',
      'No JSONP endpoints',
      'Avoid JSON hijacking vulnerabilities',
    ],
  },
  {
    code: 'OUTPUT_003',
    category: CodeReviewCategory.OUTPUT_ENCODING,
    title: 'URL Encoding',
    description: 'Dynamic URL components are properly encoded.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'URL parameters are encoded',
      'Redirect URLs are validated',
      'No open redirects',
      'File paths in URLs are safe',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CRYPTOGRAPHY
  // ═══════════════════════════════════════════════════════════════════════════
  {
    code: 'CRYPTO_001',
    category: CodeReviewCategory.CRYPTOGRAPHY,
    title: 'Strong Encryption Algorithms',
    description: 'Industry-standard encryption algorithms are used.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'PCI-DSS 3.4, PCI-DSS 4.1, SOC2 CC6.7',
    failureImpact: 'Data exposure, failed compliance audits',
    checkSteps: [
      'AES-256 or stronger for symmetric encryption',
      'RSA-2048+ or ECC for asymmetric',
      'No MD5 or SHA1 for security purposes',
      'HTTPS enforced for all communications',
    ],
  },
  {
    code: 'CRYPTO_002',
    category: CodeReviewCategory.CRYPTOGRAPHY,
    title: 'Secure Key Management',
    description: 'Cryptographic keys are securely managed.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'PCI-DSS 3.5, PCI-DSS 3.6',
    failureImpact: 'Key compromise, total data exposure',
    checkSteps: [
      'Keys not hardcoded in source',
      'Keys stored in secure vault/KMS',
      'Key rotation capability exists',
      'Different keys for different environments',
    ],
  },
  {
    code: 'CRYPTO_003',
    category: CodeReviewCategory.CRYPTOGRAPHY,
    title: 'Secure Random Number Generation',
    description: 'Cryptographically secure random numbers are used.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'crypto.randomBytes() for security-sensitive randoms',
      'No Math.random() for tokens/keys',
      'UUID v4 uses secure random',
      'Session IDs use secure random',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOC2 COMPLIANCE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    code: 'SOC2_001',
    category: CodeReviewCategory.SOC2,
    title: 'CC6.1 - Logical Access Controls',
    description: 'Logical access controls are implemented to protect data.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'SOC2 CC6.1',
    failureImpact: 'Failed SOC2 audit, compliance violation',
    checkSteps: [
      'Authentication required for all protected resources',
      'Role-based access control implemented',
      'Access is logged',
      'Session management is secure',
    ],
  },
  {
    code: 'SOC2_002',
    category: CodeReviewCategory.SOC2,
    title: 'CC6.2 - Access Restricted to Authorized Users',
    description: 'Access to system components is restricted to authorized individuals.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'SOC2 CC6.2',
    failureImpact: 'Failed SOC2 audit, unauthorized access',
    checkSteps: [
      'Permission checks before data access',
      'Multi-tenant isolation enforced',
      'API endpoints require authorization',
      'Admin functions restricted to admins',
    ],
  },
  {
    code: 'SOC2_003',
    category: CodeReviewCategory.SOC2,
    title: 'CC6.3 - Access Removed When No Longer Needed',
    description: 'User access is revoked when no longer required.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'SOC2 CC6.3',
    failureImpact: 'Orphaned access, security risk',
    checkSteps: [
      'User deactivation terminates access',
      'Session invalidation on logout/deactivation',
      'Role removal takes immediate effect',
      'No zombie access records',
    ],
  },
  {
    code: 'SOC2_004',
    category: CodeReviewCategory.SOC2,
    title: 'CC7.1 - Security Events Logged',
    description: 'Security-relevant events are logged and monitored.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'SOC2 CC7.1',
    failureImpact: 'No audit trail, failed compliance',
    checkSteps: [
      'Authentication events logged',
      'Authorization failures logged',
      'Data access events logged',
      'Administrative actions logged',
    ],
  },
  {
    code: 'SOC2_005',
    category: CodeReviewCategory.SOC2,
    title: 'CC7.2 - Anomalies Detectable',
    description: 'System can detect and respond to anomalies.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'SOC2 CC7.2',
    failureImpact: 'Undetected security incidents',
    checkSteps: [
      'Error rates are monitored',
      'Unusual patterns can be detected',
      'Alerts configured for security events',
      'Rate limiting detects abuse',
    ],
  },
  {
    code: 'SOC2_006',
    category: CodeReviewCategory.SOC2,
    title: 'CC8.1 - Change Management',
    description: 'Changes follow change management process.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'SOC2 CC8.1',
    failureImpact: 'Uncontrolled changes, audit failure',
    checkSteps: [
      'Code changes go through review',
      'Database migrations are versioned',
      'Changes are tested before deployment',
      'Rollback capability exists',
    ],
  },
  {
    code: 'SOC2_007',
    category: CodeReviewCategory.SOC2,
    title: 'Audit Trail for Data Changes',
    description: 'Data modifications are tracked in audit trail.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'SOC2 CC7.1',
    failureImpact: 'No accountability, compliance failure',
    checkSteps: [
      'Create/Update/Delete logged to audit table',
      'Audit records include who, what, when',
      'Audit logs are immutable',
      'Sensitive data changes are logged',
    ],
  },
  {
    code: 'SOC2_008',
    category: CodeReviewCategory.SOC2,
    title: 'Data Retention Policies',
    description: 'Data retention policies are respected.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'SOC2 CC6.5',
    failureImpact: 'Compliance violation, data hoarding',
    checkSteps: [
      'Retention periods defined and enforced',
      'Soft delete with eventual purge',
      'Backup retention aligned with policy',
      'Log retention configured',
    ],
  },
  {
    code: 'SOC2_009',
    category: CodeReviewCategory.SOC2,
    title: 'Encryption at Rest and in Transit',
    description: 'Data is encrypted at rest and in transit.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'SOC2 CC6.7',
    failureImpact: 'Data exposure, compliance failure',
    checkSteps: [
      'HTTPS enforced for all endpoints',
      'Database encryption enabled',
      'Sensitive fields encrypted at application level',
      'Backup encryption configured',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ISO 27001 COMPLIANCE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    code: 'ISO_001',
    category: CodeReviewCategory.ISO27001,
    title: 'A.9.4.1 - Information Access Restriction',
    description: 'Access to information and application system functions is restricted.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'ISO 27001 A.9.4.1',
    failureImpact: 'ISO audit failure, unauthorized access',
    checkSteps: [
      'Need-to-know principle enforced',
      'Access based on business requirements',
      'Segregation of duties where required',
      'Sensitive functions have additional restrictions',
    ],
  },
  {
    code: 'ISO_002',
    category: CodeReviewCategory.ISO27001,
    title: 'A.9.4.2 - Secure Log-on Procedures',
    description: 'Access controlled by secure log-on procedure.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'ISO 27001 A.9.4.2',
    failureImpact: 'Weak authentication, unauthorized access',
    checkSteps: [
      'Strong authentication mechanisms',
      'Account lockout after failed attempts',
      'Secure credential transmission',
      'Session timeout configured',
    ],
  },
  {
    code: 'ISO_003',
    category: CodeReviewCategory.ISO27001,
    title: 'A.9.4.3 - Password Management System',
    description: 'Password management systems enforce quality passwords.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'ISO 27001 A.9.4.3',
    failureImpact: 'Weak passwords, credential compromise',
    checkSteps: [
      'Password complexity requirements',
      'Password history enforced',
      'Secure password storage (hashing)',
      'Password change on first login option',
    ],
  },
  {
    code: 'ISO_004',
    category: CodeReviewCategory.ISO27001,
    title: 'A.12.4.1 - Event Logging',
    description: 'Event logs recording user activities and security events.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'ISO 27001 A.12.4.1',
    failureImpact: 'No audit trail, incident investigation impossible',
    checkSteps: [
      'User activities logged',
      'Exceptions and faults logged',
      'Information security events logged',
      'Logs contain sufficient detail',
    ],
  },
  {
    code: 'ISO_005',
    category: CodeReviewCategory.ISO27001,
    title: 'A.12.4.2 - Protection of Log Information',
    description: 'Logging facilities and log information protected.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'ISO 27001 A.12.4.2',
    failureImpact: 'Tampered logs, evidence destruction',
    checkSteps: [
      'Logs stored securely',
      'Log modification restricted',
      'Log integrity monitored',
      'Log access is logged',
    ],
  },
  {
    code: 'ISO_006',
    category: CodeReviewCategory.ISO27001,
    title: 'A.14.2.5 - Secure System Engineering Principles',
    description: 'Principles for engineering secure systems established and applied.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'ISO 27001 A.14.2.5',
    failureImpact: 'Insecure by design, systemic vulnerabilities',
    checkSteps: [
      'Security considered in design',
      'Input validation implemented',
      'Output encoding implemented',
      'Defense in depth applied',
    ],
  },
  {
    code: 'ISO_007',
    category: CodeReviewCategory.ISO27001,
    title: 'A.18.1.3 - Protection of Records',
    description: 'Records protected from loss, destruction, falsification.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'ISO 27001 A.18.1.3',
    failureImpact: 'Data loss, legal/compliance issues',
    checkSteps: [
      'Backup procedures in place',
      'Data integrity checks',
      'Recovery procedures tested',
      'Records classified appropriately',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PCI-DSS COMPLIANCE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    code: 'PCI_001',
    category: CodeReviewCategory.PCI_DSS,
    title: 'Req 3 - Protect Stored Cardholder Data',
    description: 'Cardholder data is not stored or is properly protected.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'PCI-DSS Requirement 3',
    failureImpact: 'PCI compliance failure, card data breach',
    checkSteps: [
      'Full PAN is never stored',
      'Card data tokenized, not stored raw',
      'CVV/CVC never stored',
      'Card data encryption if stored',
    ],
  },
  {
    code: 'PCI_002',
    category: CodeReviewCategory.PCI_DSS,
    title: 'Req 4 - Encrypt Transmission of Cardholder Data',
    description: 'Cardholder data encrypted during transmission.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'PCI-DSS Requirement 4',
    failureImpact: 'Card data interception',
    checkSteps: [
      'TLS 1.2+ for all card data transmission',
      'No card data in URLs',
      'No card data in logs',
      'Secure payment gateway integration',
    ],
  },
  {
    code: 'PCI_003',
    category: CodeReviewCategory.PCI_DSS,
    title: 'Req 6.5 - Address Common Coding Vulnerabilities',
    description: 'Applications developed based on secure coding guidelines.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'PCI-DSS Requirement 6.5',
    failureImpact: 'Exploitable vulnerabilities',
    checkSteps: [
      'Input validation (6.5.1)',
      'Buffer overflow protection (6.5.2)',
      'Secure cryptographic storage (6.5.3)',
      'Secure communications (6.5.4)',
      'Error handling (6.5.5)',
      'XSS prevention (6.5.7)',
      'Access control (6.5.8)',
      'CSRF prevention (6.5.9)',
      'Authentication controls (6.5.10)',
    ],
  },
  {
    code: 'PCI_004',
    category: CodeReviewCategory.PCI_DSS,
    title: 'Req 7 - Restrict Access to Cardholder Data',
    description: 'Access to cardholder data restricted by business need.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'PCI-DSS Requirement 7',
    failureImpact: 'Unauthorized card data access',
    checkSteps: [
      'Need-to-know access only',
      'Role-based access control',
      'Access requests logged',
      'Regular access reviews',
    ],
  },
  {
    code: 'PCI_005',
    category: CodeReviewCategory.PCI_DSS,
    title: 'Req 8 - Identify and Authenticate Access',
    description: 'Unique ID assigned to each person with computer access.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'PCI-DSS Requirement 8',
    failureImpact: 'Accountability issues, shared accounts',
    checkSteps: [
      'Unique user IDs',
      'No shared accounts',
      'Strong authentication',
      'MFA for remote access',
    ],
  },
  {
    code: 'PCI_006',
    category: CodeReviewCategory.PCI_DSS,
    title: 'Req 10 - Track and Monitor All Access',
    description: 'Track and monitor all access to network resources and cardholder data.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'PCI-DSS Requirement 10',
    failureImpact: 'No audit trail for card data access',
    checkSteps: [
      'Individual user actions traceable',
      'Access to audit trails logged',
      'Security events logged',
      'Logs retained appropriately',
    ],
  },
  {
    code: 'PCI_007',
    category: CodeReviewCategory.PCI_DSS,
    title: 'Req 10.2 - Automated Audit Trails',
    description: 'Automated audit trails for system components.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'PCI-DSS Requirement 10.2',
    failureImpact: 'Incomplete audit trail',
    checkSteps: [
      'Individual user access logged (10.2.1)',
      'Root/admin actions logged (10.2.2)',
      'Access to audit trails logged (10.2.3)',
      'Invalid access attempts logged (10.2.4)',
      'Auth mechanism changes logged (10.2.5)',
      'Initialization/stopping of logs logged (10.2.6)',
      'Creation/deletion of objects logged (10.2.7)',
    ],
  },
  {
    code: 'PCI_008',
    category: CodeReviewCategory.PCI_DSS,
    title: 'No PAN in Logs',
    description: 'Primary Account Number (PAN) never appears in logs.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'PCI-DSS Requirement 3.4',
    failureImpact: 'PAN exposure in logs',
    checkSteps: [
      'Log statements reviewed for PAN',
      "Error messages don't contain PAN",
      "Debug output doesn't contain PAN",
      'Log masking for card data',
    ],
  },
  {
    code: 'PCI_009',
    category: CodeReviewCategory.PCI_DSS,
    title: 'Proper Tokenization',
    description: 'Card data properly tokenized using payment gateway.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'PCI-DSS Requirement 3',
    failureImpact: 'Raw card data handling',
    checkSteps: [
      'Client-side tokenization (card.js, etc.)',
      'Tokens used for recurring payments',
      'Original card data never touches server',
      'Detokenization only by gateway',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // GDPR COMPLIANCE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    code: 'GDPR_001',
    category: CodeReviewCategory.GDPR,
    title: 'Art 5 - Data Minimization',
    description: 'Only necessary personal data is collected and processed.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'GDPR Article 5(1)(c)',
    failureImpact: 'GDPR violation, excessive data collection',
    checkSteps: [
      'Only required fields collected',
      'No excessive data collection',
      'Purpose for each field documented',
      'Optional fields clearly marked',
    ],
  },
  {
    code: 'GDPR_002',
    category: CodeReviewCategory.GDPR,
    title: 'Art 17 - Right to Erasure',
    description: 'System supports deletion of personal data on request.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'GDPR Article 17',
    failureImpact: 'GDPR violation, unable to fulfill erasure requests',
    checkSteps: [
      'Personal data can be identified',
      'Deletion mechanism exists',
      'Related data properly cascaded',
      'Backups can be processed',
    ],
  },
  {
    code: 'GDPR_003',
    category: CodeReviewCategory.GDPR,
    title: 'Art 20 - Data Portability',
    description: 'Personal data can be exported in machine-readable format.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'GDPR Article 20',
    failureImpact: 'GDPR violation, unable to fulfill export requests',
    checkSteps: [
      'Export functionality exists',
      'Common format (JSON, CSV)',
      'All user data included',
      'Export is complete and accurate',
    ],
  },
  {
    code: 'GDPR_004',
    category: CodeReviewCategory.GDPR,
    title: 'Art 25 - Privacy by Design',
    description: 'Data protection built into system design.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'GDPR Article 25',
    failureImpact: 'Inadequate privacy protection',
    checkSteps: [
      'Privacy considered in feature design',
      'Data protection defaults',
      'Minimal data processing',
      'Pseudonymization where appropriate',
    ],
  },
  {
    code: 'GDPR_005',
    category: CodeReviewCategory.GDPR,
    title: 'Art 30 - Records of Processing',
    description: 'Processing activities are documented.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'GDPR Article 30',
    failureImpact: 'Undocumented processing, audit failure',
    checkSteps: [
      'Data flows documented',
      'Processing purposes clear',
      'Data categories identified',
      'Retention periods defined',
    ],
  },
  {
    code: 'GDPR_006',
    category: CodeReviewCategory.GDPR,
    title: 'Art 32 - Security of Processing',
    description: 'Appropriate security measures for personal data.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'GDPR Article 32',
    failureImpact: 'GDPR violation, data breach',
    checkSteps: [
      'Encryption of personal data',
      'Access controls on personal data',
      'Regular security testing',
      'Incident response capability',
    ],
  },
  {
    code: 'GDPR_007',
    category: CodeReviewCategory.GDPR,
    title: 'PII Identification and Protection',
    description: 'Personally Identifiable Information is identified and protected.',
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'GDPR Article 4, Article 32',
    failureImpact: 'Unprotected personal data',
    checkSteps: [
      'PII fields identified (name, email, phone, etc.)',
      'PII encrypted in database',
      'PII masked in logs',
      'PII access restricted',
    ],
  },
  {
    code: 'GDPR_008',
    category: CodeReviewCategory.GDPR,
    title: 'Consent Tracking',
    description: 'User consent is properly tracked where required.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'GDPR Article 7',
    failureImpact: 'Processing without valid consent',
    checkSteps: [
      'Consent recorded with timestamp',
      'Consent version tracked',
      'Consent withdrawal mechanism',
      'Granular consent options',
    ],
  },
  {
    code: 'GDPR_009',
    category: CodeReviewCategory.GDPR,
    title: 'Cross-Border Data Transfer',
    description: 'Data transfers outside EU/EEA are properly handled.',
    severity: IssueSeverity.HIGH,
    complianceRef: 'GDPR Article 44-49',
    failureImpact: 'Illegal data transfer',
    checkSteps: [
      "Third-party services' data locations known",
      'Adequate transfer mechanisms in place',
      'Standard contractual clauses where needed',
      'Privacy Shield alternatives implemented',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PERFORMANCE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    code: 'PERF_001',
    category: CodeReviewCategory.PERFORMANCE,
    title: 'No N+1 Query Issues',
    description: 'Database queries are optimized to avoid N+1 patterns.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'List queries use proper includes/joins',
      'Batch loading for related data',
      'No queries inside loops',
      'Query count reasonable for operation',
    ],
  },
  {
    code: 'PERF_002',
    category: CodeReviewCategory.PERFORMANCE,
    title: 'Database Indexes',
    description: 'Appropriate indexes exist for queries.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'Indexed columns used in WHERE clauses',
      'Composite indexes for multi-column queries',
      'Foreign keys have indexes',
      'No index-only scans where possible',
    ],
  },
  {
    code: 'PERF_003',
    category: CodeReviewCategory.PERFORMANCE,
    title: 'Pagination Implemented',
    description: 'List endpoints use pagination to limit data transfer.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'Limit/offset or cursor pagination',
      'Reasonable default page size',
      'Maximum page size enforced',
      'Total count optional for performance',
    ],
  },
  {
    code: 'PERF_004',
    category: CodeReviewCategory.PERFORMANCE,
    title: 'No Unnecessary API Calls',
    description: "Frontend doesn't make redundant or excessive API calls.",
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'Data fetched once and cached',
      'No duplicate requests',
      'Proper use of React Query/SWR caching',
      'Debounced search inputs',
    ],
  },
  {
    code: 'PERF_005',
    category: CodeReviewCategory.PERFORMANCE,
    title: 'Proper Caching',
    description: 'Appropriate caching is implemented.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'Cache frequently accessed data',
      'Cache invalidation on updates',
      'Appropriate TTLs set',
      'Cache keys are unique and correct',
    ],
  },
  {
    code: 'PERF_006',
    category: CodeReviewCategory.PERFORMANCE,
    title: 'No Memory Leaks',
    description: "Code doesn't introduce memory leaks.",
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'Event listeners cleaned up',
      'Subscriptions unsubscribed',
      'Timers/intervals cleared',
      'Large objects released when done',
    ],
  },
  {
    code: 'PERF_007',
    category: CodeReviewCategory.PERFORMANCE,
    title: 'React Re-renders Minimized',
    description: "React components don't re-render unnecessarily.",
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'useMemo/useCallback for expensive operations',
      'React.memo for pure components',
      'Keys stable in lists',
      'Context providers not causing cascading re-renders',
    ],
  },
  {
    code: 'PERF_008',
    category: CodeReviewCategory.PERFORMANCE,
    title: 'Async Operations Non-Blocking',
    description: "Long-running operations don't block the main thread/event loop.",
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'Heavy computations offloaded',
      'Background jobs for long operations',
      'Progress feedback for slow operations',
      'Timeouts for external calls',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DATABASE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    code: 'DB_001',
    category: CodeReviewCategory.DATABASE,
    title: 'Safe Database Migrations',
    description: 'Database migrations are safe and reversible.',
    severity: IssueSeverity.CRITICAL,
    checkSteps: [
      'Migration tested on copy of production data',
      'Rollback migration exists',
      'No data loss during migration',
      'Migration is backwards compatible',
    ],
  },
  {
    code: 'DB_002',
    category: CodeReviewCategory.DATABASE,
    title: 'Transaction Safety',
    description: 'Multi-step operations use database transactions.',
    severity: IssueSeverity.CRITICAL,
    checkSteps: [
      'Prisma transactions for multi-table operations',
      'Rollback on partial failure',
      'No orphaned records possible',
      'Deadlock prevention considered',
    ],
  },
  {
    code: 'DB_003',
    category: CodeReviewCategory.DATABASE,
    title: 'Referential Integrity',
    description: 'Foreign key constraints maintain data integrity.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'Foreign keys properly defined',
      'Cascade rules appropriate',
      'No orphaned records possible',
      'Soft delete considerations',
    ],
  },
  {
    code: 'DB_004',
    category: CodeReviewCategory.DATABASE,
    title: 'Schema Matches Models',
    description: 'Database schema matches application models.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'Prisma schema up to date',
      'Types match between DB and app',
      'Enum values consistent',
      'Nullable fields handled correctly',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // API DESIGN
  // ═══════════════════════════════════════════════════════════════════════════
  {
    code: 'API_001',
    category: CodeReviewCategory.API_DESIGN,
    title: 'RESTful Design',
    description: 'API follows RESTful conventions.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'Proper HTTP verbs (GET, POST, PATCH, DELETE)',
      'Resource-based URLs',
      'Consistent naming conventions',
      'Proper use of HTTP status codes',
    ],
  },
  {
    code: 'API_002',
    category: CodeReviewCategory.API_DESIGN,
    title: 'Consistent Response Format',
    description: 'API responses have consistent structure.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'Error responses have consistent shape',
      'Success responses have consistent shape',
      'Pagination response format consistent',
      'Date formats consistent (ISO 8601)',
    ],
  },
  {
    code: 'API_003',
    category: CodeReviewCategory.API_DESIGN,
    title: 'Versioning Strategy',
    description: 'API versioning is properly handled.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'API version in URL or header',
      'Backwards compatibility maintained',
      'Deprecation notices for old versions',
      'Migration path documented',
    ],
  },
  {
    code: 'API_004',
    category: CodeReviewCategory.API_DESIGN,
    title: 'Documentation',
    description: 'API endpoints are properly documented.',
    severity: IssueSeverity.LOW,
    checkSteps: [
      'Swagger/OpenAPI decorators',
      'Request/response examples',
      'Error responses documented',
      'Authentication requirements clear',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGGING
  // ═══════════════════════════════════════════════════════════════════════════
  {
    code: 'LOG_001',
    category: CodeReviewCategory.LOGGING,
    title: 'Appropriate Log Levels',
    description: 'Log statements use appropriate log levels.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'ERROR for errors requiring attention',
      'WARN for potential issues',
      'INFO for significant events',
      'DEBUG for development details',
    ],
  },
  {
    code: 'LOG_002',
    category: CodeReviewCategory.LOGGING,
    title: 'No Sensitive Data in Logs',
    description: "Logs don't contain sensitive information.",
    severity: IssueSeverity.CRITICAL,
    complianceRef: 'PCI-DSS 3.4, GDPR Art 32',
    failureImpact: 'Sensitive data exposure',
    checkSteps: [
      'No passwords in logs',
      'No tokens/API keys in logs',
      'No card data in logs',
      'PII masked in logs',
    ],
  },
  {
    code: 'LOG_003',
    category: CodeReviewCategory.LOGGING,
    title: 'Structured Logging',
    description: 'Logs use structured format for searchability.',
    severity: IssueSeverity.MEDIUM,
    checkSteps: [
      'JSON format for logs',
      'Consistent field names',
      'Correlation IDs included',
      'Timestamps in ISO format',
    ],
  },
  {
    code: 'LOG_004',
    category: CodeReviewCategory.LOGGING,
    title: 'Request Tracing',
    description: 'Requests can be traced through the system.',
    severity: IssueSeverity.HIGH,
    checkSteps: [
      'Request ID propagated',
      'Correlation ID in all log entries',
      'Distributed tracing implemented',
      'Request/response logging at boundaries',
    ],
  },
];

/**
 * Template names and descriptions by category
 */
const CATEGORY_TEMPLATES: Record<
  CodeReviewCategory,
  { name: string; description: string; complianceRef?: string; applicableTo: string[] }
> = {
  [CodeReviewCategory.CODE_QUALITY]: {
    name: 'Code Quality',
    description: 'Code quality and best practices checks',
    applicableTo: ['api', 'frontend', 'both'],
  },
  [CodeReviewCategory.ARCHITECTURE]: {
    name: 'Architecture',
    description: 'Architecture and design pattern checks',
    applicableTo: ['api', 'frontend', 'both'],
  },
  [CodeReviewCategory.TYPE_SAFETY]: {
    name: 'Type Safety',
    description: 'TypeScript type safety checks',
    applicableTo: ['api', 'frontend', 'both'],
  },
  [CodeReviewCategory.ERROR_HANDLING]: {
    name: 'Error Handling',
    description: 'Error handling and exception management checks',
    applicableTo: ['api', 'frontend', 'both'],
  },
  [CodeReviewCategory.MAINTAINABILITY]: {
    name: 'Maintainability',
    description: 'Code maintainability and readability checks',
    applicableTo: ['api', 'frontend', 'both'],
  },
  [CodeReviewCategory.TESTING]: {
    name: 'Testing',
    description: 'Test coverage and quality checks',
    applicableTo: ['api', 'frontend', 'both'],
  },
  [CodeReviewCategory.SECURITY]: {
    name: 'Security - OWASP',
    description: 'OWASP Top 10 security vulnerability checks',
    complianceRef: 'OWASP Top 10',
    applicableTo: ['api', 'frontend', 'both'],
  },
  [CodeReviewCategory.AUTHENTICATION]: {
    name: 'Authentication',
    description: 'Authentication mechanism security checks',
    complianceRef: 'SOC2 CC6.1, PCI-DSS 8.2',
    applicableTo: ['api'],
  },
  [CodeReviewCategory.AUTHORIZATION]: {
    name: 'Authorization',
    description: 'Authorization and access control checks',
    complianceRef: 'SOC2 CC6.1, PCI-DSS 7.1',
    applicableTo: ['api'],
  },
  [CodeReviewCategory.INPUT_VALIDATION]: {
    name: 'Input Validation',
    description: 'Input validation and sanitization checks',
    complianceRef: 'OWASP A03:2021',
    applicableTo: ['api', 'frontend'],
  },
  [CodeReviewCategory.OUTPUT_ENCODING]: {
    name: 'Output Encoding',
    description: 'Output encoding and XSS prevention checks',
    complianceRef: 'OWASP A03:2021',
    applicableTo: ['api', 'frontend'],
  },
  [CodeReviewCategory.CRYPTOGRAPHY]: {
    name: 'Cryptography',
    description: 'Encryption and key management checks',
    complianceRef: 'PCI-DSS 3.4, SOC2 CC6.7',
    applicableTo: ['api'],
  },
  [CodeReviewCategory.SOC2]: {
    name: 'SOC2 Compliance',
    description: 'SOC2 Trust Services Criteria compliance checks',
    complianceRef: 'SOC2 CC6, CC7, CC8',
    applicableTo: ['api', 'frontend', 'both'],
  },
  [CodeReviewCategory.ISO27001]: {
    name: 'ISO 27001 Compliance',
    description: 'ISO 27001 information security compliance checks',
    complianceRef: 'ISO 27001 Annex A',
    applicableTo: ['api', 'frontend', 'both'],
  },
  [CodeReviewCategory.PCI_DSS]: {
    name: 'PCI-DSS Compliance',
    description: 'PCI Data Security Standard compliance checks',
    complianceRef: 'PCI-DSS v4.0',
    applicableTo: ['api'],
  },
  [CodeReviewCategory.GDPR]: {
    name: 'GDPR Compliance',
    description: 'General Data Protection Regulation compliance checks',
    complianceRef: 'GDPR Articles 5, 17, 20, 25, 30, 32',
    applicableTo: ['api', 'frontend', 'both'],
  },
  [CodeReviewCategory.PERFORMANCE]: {
    name: 'Performance',
    description: 'Performance optimization and efficiency checks',
    applicableTo: ['api', 'frontend', 'both'],
  },
  [CodeReviewCategory.DATABASE]: {
    name: 'Database',
    description: 'Database operations and migrations checks',
    applicableTo: ['api'],
  },
  [CodeReviewCategory.API_DESIGN]: {
    name: 'API Design',
    description: 'RESTful API design and consistency checks',
    applicableTo: ['api'],
  },
  [CodeReviewCategory.LOGGING]: {
    name: 'Logging',
    description: 'Logging and audit trail checks',
    complianceRef: 'SOC2 CC7.1, PCI-DSS 10.2',
    applicableTo: ['api', 'frontend'],
  },
};

async function seedCodeReviewChecklist() {
  console.log('📝 Seeding Code Review Checklist...');

  // Group items by category
  const itemsByCategory = CODE_REVIEW_CHECKLIST_DATA.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<CodeReviewCategory, typeof CODE_REVIEW_CHECKLIST_DATA>,
  );

  let totalTemplates = 0;
  let totalItems = 0;

  // Create templates and items for each category
  for (const [category, items] of Object.entries(itemsByCategory)) {
    const categoryKey = category as CodeReviewCategory;
    const templateInfo = CATEGORY_TEMPLATES[categoryKey];

    // Upsert template
    const existingTemplate = await prisma.codeReviewChecklistTemplate.findFirst({
      where: {
        category: categoryKey,
        isActive: true,
      },
    });

    let template;
    if (existingTemplate) {
      template = await prisma.codeReviewChecklistTemplate.update({
        where: { id: existingTemplate.id },
        data: {
          name: templateInfo.name,
          description: templateInfo.description,
          complianceRef: templateInfo.complianceRef,
          applicableTo: templateInfo.applicableTo,
          displayOrder: Object.values(CodeReviewCategory).indexOf(categoryKey),
        },
      });
    } else {
      template = await prisma.codeReviewChecklistTemplate.create({
        data: {
          name: templateInfo.name,
          description: templateInfo.description,
          category: categoryKey,
          complianceRef: templateInfo.complianceRef,
          applicableTo: templateInfo.applicableTo,
          isRequired: true,
          displayOrder: Object.values(CodeReviewCategory).indexOf(categoryKey),
          isActive: true,
        },
      });
    }
    totalTemplates++;

    // Delete existing items for this template (to allow updates)
    await prisma.codeReviewChecklistItem.deleteMany({
      where: { templateId: template.id },
    });

    // Create items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await prisma.codeReviewChecklistItem.create({
        data: {
          templateId: template.id,
          code: item.code,
          title: item.title,
          description: item.description,
          checkSteps: item.checkSteps,
          complianceRef: item.complianceRef,
          failureImpact: item.failureImpact,
          severity: item.severity,
          displayOrder: i,
          isActive: true,
        },
      });
      totalItems++;
    }

    console.log(`  ✓ ${templateInfo.name}: ${items.length} checks`);
  }

  console.log(`✅ Code Review Checklist seeding complete!`);
  console.log(`   ${totalTemplates} templates, ${totalItems} items`);
}

// Run if called directly
if (require.main === module) {
  seedCodeReviewChecklist()
    .catch((e) => {
      console.error('Error seeding Code Review Checklist:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedCodeReviewChecklist, CODE_REVIEW_CHECKLIST_DATA };
