# OTM Current Product Flow Documentation

Last updated: 2026-05-05

This document explains the current OTM product flow after the recent tenant SaaS, product-owner, menu-permission, dashboard, and tenant-creation changes.

It should be read together with:

- `docs/OTM_Project_Overview.md`
- `docs/TENANT_SAAS_DOCUMENTATION.md`

Those two documents describe the original project workflow and the first SaaS conversion phase. This document explains the current working flow in the codebase now.

## 1. Product Summary

OTM is an operation management system that tracks a purchase order from order creation to delivery, installation, signed document verification, vendor billing, accounts approval, management approval, and payment.

The product is now moving into a tenant-based SaaS model.

Current product idea:

```text
Product Owner
  -> creates tenant companies
  -> controls master screen setup
  -> has full product-level visibility

Tenant Company Admin / Users
  -> log in under one company
  -> see only allowed menus
  -> see only their company data
  -> manage operational workflow inside their tenant
```

## 2. Current Technology Stack

```text
Backend  : Django + Django REST Framework
Frontend : React + Vite + Tailwind CSS
Database : MySQL
Auth     : Bearer token using existing user/vendor unique_id format
Tenant   : Company code based tenant database switching
```

Important frontend paths:

```text
frontend/src/App.tsx
frontend/src/context/AuthContext.tsx
frontend/src/components/layout/Sidebar.tsx
frontend/src/utils/menuRoutes.ts
frontend/src/utils/authAccess.ts
```

Important backend paths:

```text
Backend/master/viewsets/auth/login_viewset.py
Backend/master/viewsets/tenant/tenant_viewset.py
Backend/master/tenant.py
Backend/master/tenant_db.py
Backend/master/authentication.py
Backend/master/urls.py
```

## 3. Login and Tenant Context Flow

### 3.1 Product Owner Login

Product owner is identified as a user without `sess_company_id`.

Product owner flow:

```text
Login without company tenant context
-> backend authenticates product owner from master/default DB
-> backend returns full menu tree
-> frontend allows product-owner-only routes
-> product owner can create/delete tenants and manage screen setup
```

Product owner rules:

- Product owner has full permission.
- Product owner can access tenant creation.
- Product owner can access user screen setup.
- Product owner can access all product screens through permission bypass.
- The duplicate `Main Screen` menu is hidden from the sidebar for all logins, including product owner, because it maps to the same UI as `User Screen`.

### 3.2 Tenant User Login

Tenant users log in with company context.

Flow:

```text
User enters company code/name/id + username + password
-> backend resolves company from tenant_company
-> token is built with company code context
-> TenantDatabaseMiddleware switches request DB
-> backend authenticates user/vendor inside tenant DB
-> backend returns only that company's allowed menus
```

Important company fields:

```text
sess_company_id
sess_branch_id
```

The backend decides real tenant access from the authenticated user/session. The frontend may hold company data for display, but it must not be trusted for security.

### 3.3 Token and Database Switching

Tenant-aware token format:

```text
COMPANY-CODE:user_unique_id
```

Backend flow:

```text
Authorization header
-> split tenant token
-> resolve company_code
-> load company database settings
-> switch default DB for the request
-> authenticate user/vendor from that tenant DB
```

Implemented in:

```text
Backend/master/tenant_db.py
Backend/master/authentication.py
```

## 4. Menu and Permission Flow

### 4.1 Menu Source

Menus are built from:

```text
user_screen_main
user_screen_sections
user_screen
user_screen_permission
```

Product owner gets a full active screen tree from `user_screen`.

Tenant users get menus from `user_screen_permission` filtered by:

```text
user_type
sess_company_id
is_active = 1
is_delete = 0
```

### 4.2 Owner-Only Menus

The following screens are product-owner-only:

```text
Tenant Creation
User Screen
Company Creation / Tenant aliases
```

Tenant users must not see:

```text
Tenant Creation
User Screen
Main Screen
```

Current frontend route protection:

```text
/admin/tenant-creation/list  -> ProductOwnerOnly
/admin/tenant-creation/form  -> ProductOwnerOnly
/admin/user-screen/list      -> ProductOwnerOnly
/admin/user-screen/form      -> ProductOwnerOnly
```

Current sidebar rule:

```text
Tenant Creation -> only product owner
User Screen     -> only product owner
Main Screen     -> hidden for every login
```

### 4.3 Tenant Admin Menus

Tenant company admins can still use normal company admin screens if their permissions allow them:

```text
User Creation
User Type
User Type Permissions / User Permission
Settings
Order
Purchase
Stores
Operation
Accounts
Service & Support
Vendor
Reports
Document Library
```

All of those must remain tenant-filtered by company.

## 5. Tenant Creation Flow

Tenant creation is available only to product owner.

Frontend:

```text
Menu: Admin -> Tenant Creation
List route: /admin/tenant-creation/list
Form route: /admin/tenant-creation/form
API file: frontend/src/api/tenantApi.ts
```

Backend API:

```text
GET    /api/master/tenants/companies/
POST   /api/master/tenants/companies/
DELETE /api/master/tenants/companies/<unique_id>/
GET    /api/master/tenants/companies/resolve/
```

### 5.1 Create Tenant Steps

```text
Product owner opens Tenant Creation
-> enters company profile
-> enters default branch/admin user details
-> frontend validates company code, email, mobile
-> POST /api/master/tenants/companies/
-> backend creates TenantCompany in master DB
-> backend provisions tenant database
-> backend clones default setup tables
-> backend creates default branch in tenant DB
-> backend creates tenant admin user in tenant DB
-> frontend shows success alert
-> frontend redirects back to tenant list
```

Default setup cloned into tenant:

```text
user_screen_main
user_screen_sections
user_screen_actions
user_screen
user_type
user_screen_permission
```

The clone maps `sess_company_id` to the new tenant company id where needed.

### 5.2 Tenant Admin Created During Tenant Creation

The tenant creation form can create a company admin user.

Important default behavior:

- If username is empty, backend uses `admin`.
- If password is empty, backend generates a default based on company code.
- Admin user gets `sess_company_id` and `sess_branch_id`.
- Admin user is created inside the tenant database.

## 6. Tenant Delete Flow

Tenant delete is restricted and protected.

Frontend delete flow:

```text
Product owner clicks delete in Tenant Creation List
-> SweetAlert asks owner password
-> SweetAlert asks exact company code confirmation
-> DELETE /api/master/tenants/companies/<unique_id>/
-> success alert
-> tenant list reloads
```

Backend security rules:

- Only product owner can call delete.
- Product owner password is required.
- Confirm company code must match.
- Deleted tenant is disabled, not physically dropped.

Backend delete result:

```text
Master DB:
  tenant_company.is_active = 0
  tenant_company.is_delete = 1
  tenant_company.subscription_status = deleted

Tenant DB:
  tenant_company disabled/deleted
  tenant_branch disabled/deleted
  user_creation disabled/deleted for that company
```

Effect:

- Tenant disappears from active tenant list.
- Tenant users cannot log in.
- Tenant database remains available for recovery/audit if needed.

## 7. Dashboard Company Data Flow

Dashboard values should display against the logged-in company.

Current rule:

```text
Product owner without company context -> can see global/product-level data where available
Tenant user with sess_company_id      -> sees only company-specific data
```

Dashboard uses:

```text
Backend/master/viewsets/dashboard/dashboard_viewset.py
request_company_id(request)
```

Company filters are applied to dashboard queries using `sess_company_id`, mainly on `po_form` and related workflow joins.

Important note:

Some legacy summary views/tables do not contain `sess_company_id`. Those are blocked or returned as zero for tenant users until the database views are rebuilt with company id support.

## 8. Tenant Filtering Rule for APIs

Every tenant business API must use company context from the backend.

Correct:

```python
company_id = request_company_id(request)
queryset = queryset.filter(sess_company_id=company_id)
```

Correct helper usage:

```python
tenant_queryset(request, SomeModel.objects.filter(is_delete=0), include_global=False)
```

Wrong:

```python
queryset = SomeModel.objects.filter(is_delete=0)
```

Wrong:

```python
company_id = request.data["sess_company_id"]
```

Recent company-filtered areas include:

```text
Purchase Order
Stock Position
Consignee Stock Assign
Invoice/DC
Operation Approval
Accounts Approval
Material QC
Dispatch
Delivery Confirmation
Installation
Signed Document Verification
Vendor Creation
User Creation
User Type / Permission
Dashboard
```

More legacy APIs should still be reviewed as part of final SaaS hardening.

## 9. Main Operational Product Flow

The main business workflow is PO-driven.

High-level flow:

```text
Purchase Order
-> Stock Position
-> Consignee Stock Assign
-> Invoice & DC
-> Operation Approval
-> Accounts Approval
-> Material QC
-> Dispatch
-> Delivery Confirmation
-> Installation / Service
-> Signed Document Verification
-> Vendor Allocation
-> Vendor Bill Creation
-> Vendor Bill Approval
-> Accounts Bill Entry
-> Accounts Bill Approval
-> Management Bill Approval
-> Payment Transaction
-> Reports and Documents
```

## 10. Stage-by-Stage Business Flow

### 10.1 Purchase Order

Purpose:

- Create PO header.
- Add product details.
- Add consignee/address details.
- Upload PO files.
- Capture GST, billing, department, executive, delivery due date, and installation due date details.

Main frontend routes:

```text
/order/purchase-order/list
/order/purchase-order/form
```

Main backend area:

```text
Backend/master/viewsets/purchase_order/purchase_order_viewset.py
```

Tenant rule:

```text
PO is saved and listed by sess_company_id.
```

### 10.2 Stock Position

Purpose:

- Record stock availability against PO products.
- Track part number, stock quantity, remaining quantity, and value.

Routes:

```text
/purchase/stock-position/list
/purchase/stock-position/form
```

Tenant rule:

```text
Stock lists and records are filtered by company.
```

### 10.3 Consignee Stock Assign

Purpose:

- Assign available stock to consignee-level requirements.
- Prepare execution data for invoice/DC.

Route:

```text
/stores/consignee-stock/list
```

Tenant rule:

```text
Pending/completed queries filter through PO company id.
```

### 10.4 Invoice and DC

Purpose:

- Create invoice and DC details.
- Upload invoice, DC, IR, and related files.
- Link invoice/DC to PO and consignee.

Routes:

```text
/stores/invoice-dc/list
/stores/invoice-dc/form
```

Output:

```text
Record moves to Operation Approval.
```

### 10.5 Operation Approval

Purpose:

- Operations team reviews invoice/DC documents.
- Approves or rejects the operational document package.

Routes:

```text
/operation/approval/list
/operation/approval/form
```

Output:

```text
Approved record moves to Accounts Approval and Material QC visibility.
Rejected record requires correction.
```

### 10.6 Accounts Approval

Purpose:

- Accounts team reviews commercial correctness after operation approval.
- Approves/rejects account-side document status.

Routes:

```text
/accounts/approval/list
/accounts/approval/form
```

Output:

```text
Dispatch requires accounts approval and material QC approval.
```

### 10.7 Material QC

Purpose:

- Stores/QC team verifies material readiness and document/product quality.

Routes:

```text
/stores/material-qc/list
/stores/material-qc/form
```

Output:

```text
QC approved records become eligible for dispatch when accounts approval is also complete.
```

### 10.8 Dispatch

Purpose:

- Create dispatch record.
- Track transit.
- Mark delivery.
- Upload dispatch-related files.

Routes:

```text
/stores/dispatch/list
/stores/dispatch/form
/stores/dispatch/transit
/stores/dispatch/delivery
```

Tenant rule:

```text
Dispatch pending, transit, and delivery lists filter through PO company id.
```

### 10.9 Delivery Confirmation

Purpose:

- Operations team confirms delivery status.
- Supports pending and completed delivery lists.

Routes:

```text
/operation/delivery/list
/operation/delivery/form
```

Recent fix:

```text
Delivery confirmation list now filters by company through the linked PO.
```

### 10.10 Installation / Service

Purpose:

- Track installation after delivery where installation/service is required.
- Assign or update service/installation details.

Routes:

```text
/service/installation/list
/service/installation/form
/service/installation/dispatch/:id
```

Tenant rule:

```text
Installation lists filter through company-aware PO joins.
```

### 10.11 Signed Document Verification

Purpose:

- Verify signed documents after dispatch/delivery/installation flow.
- Track pending, verified, mismatch, IR pending, and SNR pending statuses.

Routes:

```text
/operation/signed-document/list
/operation/signed-document/form
```

Tenant rule:

```text
Signed document queries filter through company-aware PO joins.
```

### 10.12 Vendor Allocation and Re-Vendor Allocation

Purpose:

- Allocate vendor/service engineer/team against operational work.
- Handle re-allocation and revisit payment flows.

Routes:

```text
/operation/vendor-allocation/list
/operation/revendor-allocation/list
/vendor/revisit-payment/list
```

Output:

```text
Allocated work becomes available for vendor billing and payment workflow.
```

### 10.13 Vendor Bill Creation

Purpose:

- Vendor team creates bills for eligible work.
- Uploads bill/supporting files.

Routes:

```text
/vendor/bill-creation/list
/vendor/bill-creation/form
/vendor/bill-creation/invoice-preview
```

Output:

```text
Bill moves to vendor bill approval.
```

### 10.14 Vendor Bill Approval

Purpose:

- Approve or reject vendor-submitted bill.
- Update remarks.
- Export bill approval data.

Routes:

```text
/vendor/bill-approval/list
/vendor/bill-approval/form
```

Output:

```text
Approved bill moves to accounts bill entry.
```

### 10.15 Accounts Bill Entry

Purpose:

- Accounts team enters finance/accounting details for approved vendor bill.
- Can reject back with reason.

Routes:

```text
/vendor/accounts-bill-entry/list
/vendor/accounts-bill-entry/form
```

Output:

```text
Record moves to accounts bill approval.
```

### 10.16 Accounts Bill Approval

Purpose:

- Finance approval for accounts-entered vendor bill.
- Can approve, reject, update remarks, export.

Routes:

```text
/vendor/accounts-bill-approval/list
/vendor/accounts-bill-approval/form
```

Output:

```text
Record moves to management approval.
```

### 10.17 Management Bill Approval

Purpose:

- Final management approval before payment transaction.

Routes:

```text
/vendor/management-bill-approval/list
/vendor/management-bill-approval/form
```

Output:

```text
Approved record becomes available for payment transaction.
```

### 10.18 Payment Transaction

Purpose:

- Accounts/vendor finance records payment transaction.
- Tracks payment status and history.

Routes:

```text
/vendor/payment-transaction/list
/vendor/payment-transaction/form
```

Related routes:

```text
/vendor/bank-details/list
/vendor/onsite-engineer-payment/list
```

## 11. Admin and Settings Flow

### 11.1 Product Owner Admin

Product owner-only:

```text
Tenant Creation
User Screen
```

Hidden for all:

```text
Main Screen
```

### 11.2 Tenant Admin

Tenant admin can manage company users and permissions, depending on granted menu permissions:

```text
User Creation
User Type
User Permission
```

Tenant admin cannot manage:

```text
Tenant Creation
User Screen
Main Screen
```

### 11.3 Settings Masters

Common settings modules:

```text
State
District
City
Account Vertical
Account Sector
Customer
Item
Service Engineer
Vendor
Insurance Type
Product Category
Main Category
Unit
Executive
Consignee
Pincode
Courier
```

Tenant filtering status:

- Most master modules now use `tenant_queryset` or `request_company_id`.
- Shared/global records can be allowed only where intentionally configured with `include_global=True`.
- Company-specific setup should use `include_global=False`.

## 12. Reports and Documents

Current report/document routes:

```text
/reports/po-wise
/reports/completed-po
/reports/overdue-incomplete-po
/reports/payment-process-report
/documents/po-wise
```

Purpose:

- PO-wise reporting.
- Completed PO reporting.
- Overdue incomplete PO reporting.
- Vendor payment process reporting.
- PO-wise file/document browsing and download.

Tenant rule:

```text
Reports must filter by the logged-in company unless product-owner/global reporting is intentionally required.
```

## 13. Current Security Model

Implemented security controls:

- Bearer authentication.
- Company-aware token parsing.
- Tenant database middleware.
- Backend-side company id resolution.
- Product-owner-only tenant APIs.
- Product-owner-only user screen routes.
- Owner password + company-code confirmation before tenant delete.
- Deleted tenant users are disabled.
- Frontend session timeout after inactivity.

Current limitations to improve:

- Password storage still supports legacy plain-text and MD5 checks.
- Strong password hashing should be added.
- More automated tests are needed.
- Remaining legacy APIs should be audited for tenant filtering.
- Some report/dashboard summary sources need company id support in DB views.

## 14. Current Role Meaning

### Product Owner

Can:

- See product-level system.
- Create tenant.
- Delete/disable tenant with password confirmation.
- Access User Screen setup.
- Access full screen permission bypass.

Cannot see:

- `Main Screen` duplicate sidebar menu, because it is intentionally hidden for every login.

### Tenant SuperAdmin / Company Admin

Can:

- Log in only within tenant company.
- See menus allowed by company permissions.
- Manage users/user types/permissions if granted.
- Operate company workflow.

Cannot:

- Create/delete tenants.
- Access User Screen setup.
- See Main Screen menu.
- See another company's data.

### Tenant Normal User

Can:

- Access assigned screens/actions only.
- See only company-specific operational data.

Cannot:

- Access hidden owner/admin setup screens.
- Access other tenant data.

## 15. Current API Reference Highlights

Tenant management:

```text
GET    /api/master/tenants/companies/
POST   /api/master/tenants/companies/
DELETE /api/master/tenants/companies/<unique_id>/
GET    /api/master/tenants/companies/resolve/
```

Auth:

```text
POST /api/auth/login/
GET  /api/auth/me/
```

Dashboard:

```text
GET /api/master/dashboard/summary/
```

Admin:

```text
POST /api/master/user/list/
GET  /api/master/user-screen/list/
GET  /api/master/user-permission/options/
GET  /api/master/user-permission/matrix/
```

Operational modules are exposed under `/api/master/` and mapped to the React routes listed in this document.

## 16. Current Frontend Access Rules

Protected routes:

```text
Protected
  -> requires logged-in user
  -> used for normal product screens

ProductOwnerOnly
  -> requires logged-in user
  -> requires isProductOwnerUser(user)
  -> redirects tenant users to /dashboard
```

Product owner detection:

```text
No sess_company_id OR role = productowner
```

Menu route resolving:

```text
screen folder/name -> normalized key -> React route
```

Examples:

```text
tenant_creation -> /admin/tenant-creation/list
user_screen     -> /admin/user-screen/list
main_screen     -> /admin/user-screen/list, but hidden in sidebar
purchase_order  -> /order/purchase-order/list
dispatch        -> /stores/dispatch/list
```

## 17. Recommended Next Work

High priority:

```text
Audit every remaining backend API for tenant filtering.
Add automated tests for tenant isolation.
Replace legacy plain/MD5 password checks with Django password hashing.
Add tests for product-owner-only screens and tenant user menu hiding.
Add tests for tenant delete password/code confirmation.
Add dashboard/report tests to confirm company-specific values.
```

Medium priority:

```text
Rebuild legacy summary views with sess_company_id.
Add tenant edit/suspend/reactivate screen if required.
Add audit log for tenant create/delete.
Add company selector for product-owner reporting if global reporting becomes too broad.
```

## 18. One-Line End-to-End Flow

```text
Product Owner creates a tenant -> tenant admin logs in under company -> tenant users receive company menus -> PO is created -> stock assigned -> invoice/DC created -> operation/accounts/QC approvals happen -> dispatch/delivery/installation/signed documents complete -> vendor billing and approvals finish -> payment transaction and reports close the cycle.
```

