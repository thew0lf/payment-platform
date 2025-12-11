# QA Test Cases - December 2025 Release

## Test Scope

This document covers manual QA test cases for the following newly implemented features:
1. Customer Management (Create/Edit)
2. Order Management (Create)
3. Shipments Row Actions
4. Subscriptions Row Actions

**QA Lead:** Senior QA Engineer
**Test Environment:** Staging
**Browser Matrix:** Chrome, Firefox, Safari, Edge, Mobile Safari, Mobile Chrome

---

## 1. Customer Create Page (`/customers/new`)

### 1.1 Page Load Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CUS-001 | Page loads correctly | Navigate to `/customers/new` | Page displays "New Customer" heading, form fields visible | P1 |
| CUS-002 | Unauthenticated redirect | Access page without login | Redirected to login page | P1 |
| CUS-003 | Back link works | Click "Back to Customers" | Navigate to `/customers` list | P2 |
| CUS-004 | Company selector visibility | Load page as org/client user | Company dropdown visible | P1 |
| CUS-005 | Company selector hidden | Load page as company user | Company dropdown hidden | P2 |

### 1.2 Form Validation Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CUS-010 | Email required | Submit with empty email | "Email is required" error shown | P1 |
| CUS-011 | Email format validation | Enter "notanemail" as email | "Enter a valid email" error shown | P1 |
| CUS-012 | Valid email formats | Test: test@example.com, test+tag@domain.co.uk | All accepted | P1 |
| CUS-013 | First name optional | Submit without first name | Form submits successfully | P2 |
| CUS-014 | Phone format | Enter various phone formats | International formats accepted | P2 |
| CUS-015 | Maximum field lengths | Enter 500+ chars in name fields | Characters truncated or rejected | P3 |

### 1.3 Submission Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CUS-020 | Successful creation | Fill all fields, submit | Success toast, redirect to customer list or detail | P1 |
| CUS-021 | Duplicate email | Enter existing customer email | Error: "Email already exists" | P1 |
| CUS-022 | Network error | Disconnect network, submit | Error toast shown, form remains | P2 |
| CUS-023 | Button disabled while submitting | Click submit | Button shows loading state | P2 |
| CUS-024 | Double submit prevention | Click submit rapidly | Only one request sent | P2 |

### 1.4 Access Control Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CUS-030 | Org user sees all companies | Login as org admin | All companies in dropdown | P1 |
| CUS-031 | Client user sees client companies | Login as client admin | Only client's companies visible | P1 |
| CUS-032 | Cannot create in other tenant | Manipulate companyId in request | 403 Forbidden response | P1 |

---

## 2. Customer Edit Page (`/customers/[id]/edit`)

### 2.1 Page Load Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CED-001 | Page loads with data | Navigate to edit page | Form pre-filled with customer data | P1 |
| CED-002 | Invalid customer ID | Navigate to `/customers/invalid/edit` | 404 page or redirect | P1 |
| CED-003 | Deleted customer | Navigate to soft-deleted customer | 404 page or redirect | P1 |
| CED-004 | Email field disabled | Load edit page | Email field is read-only/disabled | P1 |

### 2.2 Form Editing Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CED-010 | Update first name | Change first name, save | Customer updated, success toast | P1 |
| CED-011 | Update phone | Change phone number, save | Customer updated | P1 |
| CED-012 | Change status to Inactive | Select INACTIVE status, save | Customer status updated | P1 |
| CED-013 | Change status to Suspended | Select SUSPENDED status, save | Customer status updated | P1 |
| CED-014 | Clear optional fields | Remove phone, save | Customer updated with null phone | P2 |

### 2.3 Access Control Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| CED-020 | Cannot edit other tenant's customer | Access customer from different tenant | 403 Forbidden or redirect | P1 |
| CED-021 | Cannot change companyId | Manipulate request to change company | Request rejected, company unchanged | P1 |
| CED-022 | Cannot change email | Manipulate request to change email | Request rejected, email unchanged | P1 |

---

## 3. Order Create Page (`/orders/new`)

### 3.1 Page Load Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ORD-001 | Page loads correctly | Navigate to `/orders/new` | "New Order" heading, form visible | P1 |
| ORD-002 | Customer search visible | Load page | Customer search input visible | P1 |
| ORD-003 | Initial item row | Load page | One order item row present | P1 |

### 3.2 Customer Selection Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ORD-010 | Search customers | Type "test" in search | Customer dropdown appears | P1 |
| ORD-011 | Select customer | Click customer in dropdown | Customer selected, name displayed | P1 |
| ORD-012 | Clear customer | Click X on selected customer | Customer deselected | P2 |
| ORD-013 | Auto-fill shipping address | Select customer with address | Shipping fields pre-populated | P2 |
| ORD-014 | No results found | Search for non-existent customer | "No customers found" message | P2 |

### 3.3 Order Items Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ORD-020 | Add item row | Click "Add Item" | New empty item row added | P1 |
| ORD-021 | Remove item row | Click remove on item | Item row removed | P1 |
| ORD-022 | Cannot remove last item | Have 1 item, try remove | Button disabled or prevented | P1 |
| ORD-023 | Item total calculation | Enter qty=2, price=25.00 | Line total shows $50.00 | P1 |
| ORD-024 | SKU field | Enter SKU | SKU accepted and stored | P2 |
| ORD-025 | Product name field | Enter product name | Name accepted and stored | P1 |
| ORD-026 | Quantity validation | Enter 0 or negative | Error or prevented | P1 |
| ORD-027 | Price validation | Enter negative price | Error or prevented | P1 |

### 3.4 Order Totals Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ORD-030 | Subtotal calculation | Add items: $25 + $30 | Subtotal shows $55.00 | P1 |
| ORD-031 | Shipping amount | Enter shipping $5.99 | Shipping shows $5.99 | P1 |
| ORD-032 | Total calculation | Subtotal $55 + Shipping $5.99 | Total shows $60.99 | P1 |
| ORD-033 | Tax calculation (if applicable) | Check tax display | Tax calculated correctly | P2 |

### 3.5 Shipping Address Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ORD-040 | First name required | Submit without first name | Validation error | P1 |
| ORD-041 | Last name required | Submit without last name | Validation error | P1 |
| ORD-042 | Address required | Submit without address1 | Validation error | P1 |
| ORD-043 | City required | Submit without city | Validation error | P1 |
| ORD-044 | State required | Submit without state | Validation error | P1 |
| ORD-045 | Postal code required | Submit without postal | Validation error | P1 |
| ORD-046 | Country default | Load form | US pre-selected or empty | P2 |

### 3.6 Form Submission Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ORD-050 | Successful order creation | Fill all required fields | Success toast, order created | P1 |
| ORD-051 | Order number generated | Create order | Order number displayed (format: X-NNN-NNN-NNN) | P1 |
| ORD-052 | Redirect after create | Create order | Redirect to order detail or list | P1 |
| ORD-053 | Missing customer | Submit without customer | Validation error | P1 |
| ORD-054 | Missing items | Submit with empty items | Validation error | P1 |

### 3.7 Security Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ORD-060 | No credit card fields | Inspect page | No card number/CVV inputs | P1 |
| ORD-061 | XSS in notes | Enter `<script>alert(1)</script>` in notes | Script not executed | P1 |
| ORD-062 | XSS in product name | Enter `<img onerror=alert(1)>` | Script not executed | P1 |

---

## 4. Shipments Row Actions (`/shipments`)

### 4.1 Actions Menu Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SHP-001 | Actions menu visible | View shipments table | "..." menu on each row | P1 |
| SHP-002 | Open actions menu | Click "..." on row | Dropdown appears with options | P1 |
| SHP-003 | View Order option | Open menu | "View Order" option present | P2 |
| SHP-004 | Update Status option | Open menu | "Update Status" option present | P1 |
| SHP-005 | Click outside closes menu | Open menu, click outside | Menu closes | P2 |

### 4.2 View Order Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SHP-010 | Navigate to order | Click "View Order" | Navigate to `/orders/[orderId]` | P2 |
| SHP-011 | Order loads correctly | Follow View Order link | Order detail page displays | P2 |

### 4.3 Update Status Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SHP-020 | Open status modal | Click "Update Status" | Modal opens with status options | P1 |
| SHP-021 | Current status shown | Open modal | Current status pre-selected | P2 |
| SHP-022 | Status options available | Open modal | All statuses visible: PENDING, PROCESSING, SHIPPED, IN_TRANSIT, DELIVERED, RETURNED | P1 |
| SHP-023 | Update to SHIPPED | Select SHIPPED, save | Status updated, success toast | P1 |
| SHP-024 | Update to DELIVERED | Select DELIVERED, save | Status updated, success toast | P1 |
| SHP-025 | Cancel modal | Click Cancel | Modal closes, no changes | P2 |
| SHP-026 | Table refreshes | Update status | Table shows new status | P1 |

---

## 5. Subscriptions Row Actions (`/subscriptions`)

### 5.1 Actions Menu Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SUB-001 | Actions menu visible | View subscriptions table | "..." menu on each row | P1 |
| SUB-002 | Open actions menu | Click "..." on row | Dropdown appears | P1 |
| SUB-003 | View Customer option | Open menu | "View Customer" option present | P2 |
| SUB-004 | Pause option (active sub) | Open menu on ACTIVE | "Pause" option present | P1 |
| SUB-005 | Resume option (paused sub) | Open menu on PAUSED | "Resume" option present | P1 |
| SUB-006 | Cancel option | Open menu | "Cancel Subscription" option present (red) | P1 |

### 5.2 View Customer Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SUB-010 | Navigate to customer | Click "View Customer" | Navigate to `/customers/[customerId]` | P2 |

### 5.3 Pause/Resume Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SUB-020 | Pause active subscription | Click Pause on ACTIVE | Confirmation modal appears | P1 |
| SUB-021 | Confirm pause | Click "Pause Subscription" | Status changes to PAUSED, toast shown | P1 |
| SUB-022 | Resume paused subscription | Click Resume on PAUSED | Status changes to ACTIVE, toast shown | P1 |
| SUB-023 | Cancel pause modal | Click Cancel | Modal closes, no changes | P2 |

### 5.4 Cancel Subscription Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| SUB-030 | Open cancel modal | Click "Cancel Subscription" | Confirmation modal with warning | P1 |
| SUB-031 | Warning text visible | Open cancel modal | "This action cannot be undone" text | P1 |
| SUB-032 | Reason field (optional) | Enter cancellation reason | Field accepts text | P2 |
| SUB-033 | Confirm cancel | Click "Cancel Subscription" | Status changes to CANCELLED, toast shown | P1 |
| SUB-034 | Table updates | Cancel subscription | Row shows CANCELLED status | P1 |
| SUB-035 | Actions on cancelled | Open menu on CANCELLED | Limited/no actions available | P2 |

---

## 6. Cross-Browser Testing Matrix

| Feature | Chrome | Firefox | Safari | Edge | iOS Safari | Android Chrome |
|---------|--------|---------|--------|------|------------|----------------|
| Customer Create | Required | Required | Required | Optional | Required | Required |
| Customer Edit | Required | Required | Required | Optional | Required | Required |
| Order Create | Required | Required | Required | Optional | Required | Required |
| Shipments Actions | Required | Required | Required | Optional | Optional | Optional |
| Subscriptions Actions | Required | Required | Required | Optional | Optional | Optional |

---

## 7. Responsive Design Tests

### 7.1 Mobile View (< 640px)

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| RES-001 | Customer form mobile | View /customers/new on mobile | Form stacks vertically, all fields accessible | P1 |
| RES-002 | Order form mobile | View /orders/new on mobile | Form usable, items scrollable | P1 |
| RES-003 | Touch targets | Test all buttons | Min 44px touch targets | P2 |
| RES-004 | Dropdown menus | Open action menus | Menus don't overflow screen | P2 |

### 7.2 Tablet View (640px - 1024px)

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| RES-010 | Form layout tablet | View forms on tablet | 2-column layout where appropriate | P2 |
| RES-011 | Table actions tablet | Use row actions | Actions accessible and usable | P2 |

---

## 8. Accessibility Tests (WCAG 2.1 AA)

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| A11Y-001 | Keyboard navigation | Tab through forms | All fields focusable in order | P1 |
| A11Y-002 | Form labels | Inspect forms | All inputs have associated labels | P1 |
| A11Y-003 | Error announcements | Submit invalid form | Screen reader announces errors | P2 |
| A11Y-004 | Modal focus trap | Open modal, tab | Focus stays within modal | P2 |
| A11Y-005 | Color contrast | Check text contrast | Min 4.5:1 ratio | P2 |
| A11Y-006 | Focus indicators | Tab through page | Visible focus ring on all elements | P2 |

---

## 9. Performance Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| PERF-001 | Form load time | Navigate to /customers/new | Page loads < 2s | P2 |
| PERF-002 | Customer search | Type in search | Results appear < 500ms | P2 |
| PERF-003 | Status update | Update shipment status | Update completes < 2s | P2 |
| PERF-004 | Large order | Create order with 20 items | Form remains responsive | P3 |

---

## 10. Data Integrity Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| DATA-001 | Customer persistence | Create customer, refresh | Customer still exists | P1 |
| DATA-002 | Order totals match | Create order, check DB | DB totals match UI | P1 |
| DATA-003 | Status history | Update status multiple times | All status changes logged | P2 |
| DATA-004 | Audit trail | Perform CRUD operations | Actions logged in audit log | P2 |

---

## 11. Error Handling Tests

| ID | Test Case | Steps | Expected Result | Priority |
|----|-----------|-------|-----------------|----------|
| ERR-001 | API timeout | Slow network response | Loading state, then error toast | P2 |
| ERR-002 | 401 Unauthorized | Session expires during use | Redirect to login | P1 |
| ERR-003 | 403 Forbidden | Access denied by backend | Friendly error message | P1 |
| ERR-004 | 500 Server Error | Backend fails | "Something went wrong" toast | P2 |
| ERR-005 | Network offline | Disconnect network | Offline indicator or error | P3 |

---

## Sign-off Checklist

- [ ] All P1 tests passed
- [ ] All P2 tests passed or documented as known issues
- [ ] Cross-browser testing complete
- [ ] Mobile testing complete
- [ ] Accessibility review complete
- [ ] Performance acceptable
- [ ] Security tests passed

**QA Sign-off:** _________________ **Date:** _________________

**Verdict:** [ ] APPROVED FOR RELEASE | [ ] BLOCKED - See Issues

---

## Appendix: Test Data Requirements

### Required Test Users
- Organization Admin (access to all companies)
- Client Admin (access to client's companies only)
- Company User (access to single company)

### Required Test Data
- Active customer with orders
- Customer in each status (ACTIVE, INACTIVE, SUSPENDED)
- Subscriptions in each status (ACTIVE, PAUSED, CANCELLED)
- Shipments in each status (PENDING through DELIVERED)
- Orders with various item counts (1, 5, 20 items)

---

*Document Version: 1.0*
*Last Updated: December 11, 2025*
*Prepared by: Senior QA Engineer*
