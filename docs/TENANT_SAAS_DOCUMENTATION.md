# OTM Tenant Based SaaS Documentation

> Current update: this document was the first SaaS conversion note. For the latest full product flow after tenant creation UI, product-owner menu rules, tenant delete security, and dashboard company filtering changes, see `docs/OTM_CURRENT_PRODUCT_FLOW.md`.

## 1. Purpose

This document explains how the OTM project is converted into a tenant based SaaS product.

Tenant based SaaS means many companies use the same application, same backend, and same database, but every company sees only its own data.

Example:

```text
Company A logs in -> sees only Company A vendors, purchase orders, invoices, stock, payments, reports
Company B logs in -> sees only Company B vendors, purchase orders, invoices, stock, payments, reports
Super Admin logs in -> can manage all companies
```

## 2. Current Project Stack

The project contains:

```text
Backend  -> Django + Django REST Framework + MySQL
Frontend -> React + Vite
Database -> MySQL database operation_team_beta
```

Many existing tables already have a company column named:

```text
sess_company_id
```

That column is now treated as the tenant/company ID.

## 3. Tenant Model

New tenant tables:

```text
tenant_company
tenant_branch
```

`tenant_company` stores each SaaS company/customer.

Important fields:

```text
unique_id
company_code
company_name
legal_name
contact_name
contact_email
contact_no
gst_no
pan_no
subscription_plan
subscription_status
is_active
is_delete
```

`tenant_branch` stores company branches.

Important fields:

```text
unique_id
company_id
branch_code
branch_name
is_default
is_active
is_delete
```

## 4. User Tenant Ownership

Normal users now have:

```text
sess_company_id
sess_branch_id
```

Vendor users already had these fields.

Every user must be assigned to a company. After login, the backend returns:

```json
{
  "user": {
    "unique_id": "...",
    "name": "...",
    "role": "...",
    "sess_company_id": "COMPANY_ID",
    "sess_branch_id": "BRANCH_ID",
    "menus": []
  }
}
```

The frontend should store this only as display/session context. The backend must always decide the real company from the authenticated user.

## 5. Tenant Isolation Rule

Every tenant specific API must filter by company.

Correct:

```python
VendorCreation.objects.filter(is_delete=0, sess_company_id=request.user.sess_company_id)
```

Wrong:

```python
VendorCreation.objects.filter(is_delete=0)
```

Wrong:

```python
VendorCreation.objects.filter(sess_company_id=request.data["sess_company_id"])
```

The frontend can send `sess_company_id`, but the backend should not trust it for security. The backend should use the logged-in user's company.

## 6. Shared Helper

Tenant helper file:

```text
Backend/master/tenant.py
```

Important helpers:

```python
request_company_id(request)
tenant_queryset(request, queryset)
tenant_audit_payload(request)
HasTenantContext
```

Use this pattern in APIs:

```python
from master.tenant import tenant_queryset, tenant_audit_payload

qs = tenant_queryset(request, VendorCreation.objects.filter(is_delete=0), include_global=False)
serializer.save(**tenant_audit_payload(request))
```

## 7. Permissions

Permissions are now company aware using:

```text
user_screen_permission.sess_company_id
```

This allows different companies to use the same screen system but different access rules.

Recommended actions:

```text
view
create
edit
delete
approve
reject
print
export
import
assign
upload
download
```

Recommended roles:

```text
Super Admin
Company Admin
Branch Admin
Manager
Approver
Accounts User
Operations User
Stock User
Vendor User
Read Only User
```

## 8. Super Admin Permissions

Super Admin can:

```text
Create company
Edit company
Suspend company
Create default branch
Create company admin
Clone setup from another company
View all tenants
Manage subscription status
View audit logs
```

Super Admin should not accidentally mix company operational data. Even super admin screens should clearly show the selected company.

## 9. Company Admin Permissions

Company Admin can:

```text
Manage company users
Manage branches
Manage departments
Manage user roles
Manage user permissions
Manage vendors
Manage item masters
View company reports
```

Company Admin must only access their own company.

## 10. Operational Permissions

Purchase order module:

```text
po.view
po.create
po.edit
po.delete
po.approve
po.print
po.export
```

Vendor module:

```text
vendor.view
vendor.create
vendor.edit
vendor.delete
vendor.upload
vendor.download
```

Stock module:

```text
stock.view
stock.create
stock.edit
stock.assign
stock.export
```

Invoice and bill module:

```text
invoice.view
invoice.create
invoice.verify
invoice.approve
invoice.reject
invoice.upload
invoice.download
```

Payment module:

```text
payment.view
payment.create
payment.approve
payment.reject
payment.export
```

Reports:

```text
report.view
report.export
report.print
```

## 11. Company Setup Clone

Use the command:

```bash
python manage.py clone_company_setup --source-company SOURCE_ID --target-company TARGET_ID
```

Dry run:

```bash
python manage.py clone_company_setup --source-company SOURCE_ID --target-company TARGET_ID --dry-run
```

Clone only one model:

```bash
python manage.py clone_company_setup --source-company SOURCE_ID --target-company TARGET_ID --table master.UserType
```

Default cloned setup data:

```text
User types
User permissions
Departments
Account sectors
Account verticals
Main categories
Units
Insurance types
Couriers
Engineer names
Items
Item sub data
```

Do not clone transactional data by default:

```text
Purchase orders
Invoices
Payments
Stock transactions
Vendor bills
Customer payments
Audit logs
Uploaded private documents
```

## 11A. Create Company And Login

Create a company:

```http
POST /api/master/tenants/companies/
```

Example body:

```json
{
  "company_code": "ABC",
  "company_name": "ABC Technologies",
  "contact_name": "Admin",
  "contact_email": "admin@abc.com",
  "contact_no": "9999999999",
  "branch_name": "Head Office",
  "admin_username": "abcadmin",
  "admin_password": "123456",
  "admin_name": "ABC Admin"
}
```

The backend creates:

```text
tenant_company row
tenant_branch row
optional admin user if admin_username and admin_password are sent
```

Resolve/check company before login:

```http
GET /api/master/tenants/companies/resolve/?company_code=ABC
```

Login against a company:

```http
POST /api/auth/login/
```

Example body:

```json
{
  "company_code": "ABC",
  "username": "abcadmin",
  "password": "123456"
}
```

The backend finds company `ABC`, then checks the user only inside that company's `sess_company_id`.

The login screen should show:

```text
Company Code
Username
Password
```

Company code is better than company name because it is short, unique, and stable.

## 12. Database Migration

New migration:

```text
Backend/master/migrations/0009_tenant_company.py
```

Apply it:

```bash
cd Backend
python manage.py migrate
```

This creates:

```text
tenant_company
tenant_branch
```

And adds:

```text
user.sess_company_id
user.sess_branch_id
user_screen_permission.sess_company_id
```

## 13. API Conversion Pattern

Every list API should change from:

```python
Model.objects.filter(is_delete=0)
```

To:

```python
tenant_queryset(request, Model.objects.filter(is_delete=0), include_global=False)
```

Every create API should set audit data from backend:

```python
serializer.save(**tenant_audit_payload(request))
```

For serializers/models that may not have every audit column, use:

```python
from master.tenant import tenant_save_kwargs

serializer.save(**tenant_save_kwargs(request, ModelClass))
```

For manual object updates and soft deletes:

```python
from master.tenant import apply_tenant_audit

obj.is_delete = 1
apply_tenant_audit(obj, request)
obj.save()
```

Never use frontend company values as the source of truth:

```python
# Wrong
sess_company_id=request.data.get("sess_company_id")

# Correct
sess_company_id=request_company_id(request)
```

Every raw SQL query should include:

```sql
WHERE sess_company_id = %s
```

And the value must come from:

```python
request_company_id(request)
```

## 14. Frontend Rules

After login, frontend receives:

```text
access_token
user.sess_company_id
user.sess_branch_id
user.menus
user.screens
user.actions
```

Frontend should:

```text
Show menus from user.menus
Hide buttons when action permission is missing
Send Authorization: Bearer <token>
Avoid manually choosing another company except Super Admin screens
```

The frontend installs a global fetch wrapper in:

```text
frontend/src/api/installTenantFetch.ts
```

That wrapper adds:

```http
Authorization: Bearer <token>
```

to every `/api/...` fetch request. Axios requests already add the same token through `frontend/src/api/axios.ts`.

Frontend should not decide security. Hidden buttons are user experience only. Backend permission checks must still protect data.

## 15. Rollout Checklist

Phase 1:

```text
Create tenant tables
Add company fields to users
Make login return company context
Make permissions company aware
Add clone setup command
Tenant-filter vendor creation API
```

Phase 2:

```text
Tenant-filter department, item, unit, category, courier, service engineer APIs
Tenant-filter purchase order APIs
Tenant-filter stock APIs
Tenant-filter invoice APIs
Tenant-filter dispatch APIs
Tenant-filter vendor bill APIs
Tenant-filter payment APIs
Tenant-filter reports
```

Phase 3:

```text
Add Super Admin company management UI
Add Company Admin user management UI
Add tenant audit log
Add subscription limits
Hash passwords
Replace unique_id token with JWT
Add tests for tenant isolation
```

## 16. Security Requirements

Before production SaaS release:

```text
DEBUG must be False
SECRET_KEY must move to environment variable
Database password must move to environment variable
CORS_ALLOW_ALL_ORIGINS must be False
Passwords must be hashed
Bearer token should be JWT or secure session token
Every tenant API must be company filtered
Uploads should be stored under company folders
Backups should be per tenant recoverable
Audit logs should be enabled for approvals and payments
```

## 17. Testing Tenant Isolation

Minimum test:

```text
Create Company A
Create Company B
Create User A under Company A
Create User B under Company B
Create vendor under Company A
Login as User B
Call vendor list API
Confirm Company A vendor is not returned
```

Repeat this for:

```text
PO
Stock
Invoice
Payment
Reports
Uploads
Permissions
```

## 18. Current Implementation Status

Completed in this phase:

```text
TenantCompany model
TenantBranch model
User company fields
Permission company field
Tenant helper utilities
Login payload company support
Auth request.company_id support
Company-aware permission loading
Company setup clone command
Vendor list/create tenant filtering
Tenant company management APIs
Tenant creation frontend screens
Tenant delete password/code confirmation
Product-owner-only tenant and user screen routes
Tenant users hidden from Tenant Creation/User Screen/Main Screen menus
Dashboard company filtering updates
Full SaaS conversion document
```

Remaining:

```text
Audit and complete tenant filtering for any remaining legacy APIs
Add JWT/password security hardening
Add automated tests
Rebuild legacy dashboard/report summary views with company id where missing
```



POST http://127.0.0.1:7000/api/master/user/list/
http://127.0.0.1:7000/api/master/tenants/companies/
