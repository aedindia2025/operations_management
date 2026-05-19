# OTM Project Overview and Workflow

> Current update: this overview describes the core operational workflow. For the latest combined product flow after the SaaS, product-owner, tenant creation/delete, menu visibility, and dashboard company-filter changes, see `docs/OTM_CURRENT_PRODUCT_FLOW.md`.

## 1. Project Overview

OTM is a full-stack order-to-material and post-delivery operations management system. It tracks a purchase order from order intake through stock handling, consignee assignment, invoice generation, approvals, quality control, dispatch, delivery confirmation, installation, signed document verification, and vendor payment processing.

The application is designed as an operational control system for teams such as:

- Order / sales operations
- Purchase / stock team
- Stores
- Operations
- Accounts
- Service / installation
- Vendor finance / payment teams
- Admin and reporting users

At a high level, the system uses one PO as the root business record and then creates linked records for consignee allocation, invoice/DC handling, approvals, dispatch, installation, signed documents, and vendor billing.

## 2. Current Tech Stack

### Frontend

- React 18
- Vite
- Tailwind CSS
- Axios
- React Router

Frontend app structure is route-driven, with modules grouped by business area such as `Order`, `Purchase`, `Stores`, `Operation`, `Accounts`, `Service`, `Vendor`, `Reports`, `Documents`, `Admin`, and `Settings`.

### Backend

- Django 6
- Django REST Framework
- MySQL
- Cookie/session-assisted auditing with bearer-token authentication
- Media/file storage under backend `media/`

The backend is not only model-driven; it also relies heavily on:

- existing MySQL tables
- raw SQL
- legacy-compatible table structures
- stored procedures for some data retrieval and inserts

## 3. High-Level Architecture

### Frontend responsibilities

- Login and permission-based navigation
- Module-specific list and form screens
- File upload and download actions
- Status-based workflow screens
- Reporting and document browsing

### Backend responsibilities

- Authentication
- Business workflow APIs
- Approval/state changes
- File persistence and retrieval
- Data shaping for dashboards and lists
- Integration with legacy/existing database schema

### Authentication and access

The frontend stores a bearer token in local storage and calls:

- `api/auth/login/`
- `api/auth/me/`

The returned user payload contains screen permissions and menu definitions, so the sidebar and screen access are permission-controlled.

## 4. Main Business Modules in the Project

### Core transaction modules

- Purchase Order
- Stock Position
- Consignee Stock Assign
- Invoice and DC
- Operation Approval
- Accounts Approval
- Material QC
- Dispatch
- Delivery Confirmation
- Installation
- Signed Document Verification
- Vendor Allocation
- Vendor Bill Creation
- Vendor Bill Approval
- Accounts Bill Entry
- Accounts Bill Approval
- Management Bill Approval
- Payment Transaction

### Supporting master/admin modules

- State, district, city
- Customer and account vertical/sector
- Item and product category
- Consignee and courier
- Vendor and service engineer
- Users, user type, user screen, user permission

### Reporting/document modules

- Dashboard summary
- PO-wise report
- Payment process report
- PO-wise document view

## 5. End-to-End Workflow

The requested business flow can be expressed like this:

`Order -> Purchase -> Stores -> Consignee Stock Assign -> Invoice/DC -> Operation Approval -> Accounts Approval -> Material QC -> Dispatch -> Delivery Confirmation -> Installation (if vendor allocated) -> Signed Document -> Vendor Module`

There is one important implementation nuance in the current codebase:

- The business flow clearly places `Accounts Approval` before `Material QC`.
- In the current backend implementation, the `Material QC` pending list is available once `Operation Approval` is approved.
- However, `Dispatch` requires both `Accounts Approval = approved` and `Material QC = approved`.

So the practical operational flow still behaves close to the requested sequence, but the code currently exposes QC slightly earlier than the strict business wording suggests.

## 6. Stage-by-Stage Explanation

### Stage 1: Order - Purchase Order

This is the starting point of the workflow.

#### Purpose

- Capture PO header details
- Capture product lines
- Capture consignee lines/batches
- Store delivery and installation due dates
- Upload PO copy and related commercial files

#### Main data handled

- PO number, PO date, department, executive, GST and billing details
- Product rows with quantity, pricing, tax, warranty, BG, delivery due days, installation due days
- Consignee rows with address, contact, district, state, pincode, zone, branch

#### Main tables

- `po_form`
- `product_details_sub`
- `consignee_details_sub`
- `po_product_assign_details`

#### Output to next stage

- A complete PO master record
- Product and consignee structure ready for stock and assignment activity

### Stage 2: Purchase - Stock Position

This stage represents stock readiness against the PO.

#### Purpose

- Create stock records against PO products
- Track stock quantity, stock value, remaining quantity
- Maintain part number and stock remarks

#### Main tables

- `stock_position_main`
- `stock_position`
- `stock_position_sublist`

#### Output to next stage

- Stock availability and product-level stock values
- Readiness for consignee stock assignment

### Stage 3: Stores - Consignee Stock Assign

This stage connects available stock to consignee demand.

#### Purpose

- Assign item quantities to specific consignee records
- Link invoice-oriented execution to consignee-level stock planning

#### Main table currently visible in code

- `ConsigneeStock` model in `consignee_stock_model.py`

#### Business role

- Moves the workflow from generic stock to consignee-specific execution
- Prepares the system for invoice/DC creation per consignee/DC combination

### Stage 4: Stores - Invoice and DC

This is the document creation stage for invoice and dispatch challan data.

#### Purpose

- Create invoice number and invoice date
- Create DC number and DC date
- Attach invoice, DC, IR files
- Link invoice/DC to PO and consignee
- Store ledger/customer references

#### Main tables

- `invoice_creation_main`
- `invoice_creation`
- `invoice_sublist`
- `invoice_verfication_table`

#### Main status fields

- `doc_approval_sts`
- `invoice_doc_status`

#### Output to next stage

- A DC/invoice package ready for operation approval

### Stage 5: Operation Approval

This is the first formal approval gate after invoice/DC creation.

#### Purpose

- Review invoice, DC, IR and PO-linked document package
- Approve or reject the operational document set

#### Meaning in code

- `Pending = 0`
- `Approved = 1`
- `Not Approved = 2`

#### What happens on approval

- `doc_approval_sts` becomes approved
- `invoice_doc_status` is also updated
- approver and approval date are stored

#### What happens on rejection

- rejection reason is captured
- invoice/DC fields can be cleared/reset for the rejected DC flow

#### Output to next stage

- Approved record becomes eligible for accounts review
- Approved record also becomes visible to Material QC in the current implementation

### Stage 6: Accounts Approval

This is the finance/accounts review stage for the approved invoice/DC record.

#### Purpose

- Perform accounts-side verification after operation approval
- Approve or reject commercial correctness before downstream execution

#### Key implementation behavior

- Pending list uses records with `invoice_doc_status = 1`
- Approved accounts action updates:
  - `ac_team_verifiy_status = 1`
  - `invoice_doc_status = 4`
- Rejected accounts action updates:
  - `ac_team_verifiy_status = 2`
  - `invoice_doc_status = 2`

#### Why this stage matters

- Vendor Allocation pending records are fetched from accounts-approved rows
- Dispatch also requires accounts approval to be approved

#### Output to next stage

- Record becomes commercially cleared for execution

### Stage 7: Material QC

This is the material/document QC validation stage.

#### Purpose

- Confirm QC acceptance or rejection before dispatch
- Store QC approver and rejection remarks

#### Meaning in code

- `Pending = 0`
- `Approved = 1`
- `Rejected = 2`

#### Current entry condition in code

- `doc_approval_sts = 1`
- `material_qc = 0`

#### Important note

- The QC list is not directly gated by accounts approval in the current backend query.
- But the next stage, dispatch, requires both:
  - `material_qc = 1`
  - `ac_team_verifiy_status = 1`

#### Output to next stage

- QC-approved document/package becomes dispatch-ready

### Stage 8: Dispatch

This stage handles actual outward movement of material/documents.

#### Purpose

- Create dispatch record
- Capture dispatch date
- Capture mode of delivery
- Capture courier/POD details
- Upload dispatch/e-invoice/proof files
- Track transit and delivery progression

#### Main table

- `dispatch_list`

#### Pending dispatch entry condition in code

- `dispatch_status = 0`
- `material_qc = 1`
- `ac_team_verifiy_status = 1`
- no active record exists yet in `dispatch_list` for the DC number

#### Dispatch sub-states

- Pending dispatch
- Transit
- Delivery

#### Output to next stage

- A dispatch record with delivery lifecycle tracking

### Stage 9: Delivery Confirmation

This stage confirms that dispatched material/documents reached the consignee.

#### Purpose

- Record receiver name and contact
- Record proof received date
- Store remarks
- Confirm delivery completion

#### Main tables

- `dispatch_list`
- `dc_num_status`

#### Key status meaning in code

- dispatch record status values are used to separate pending/completed delivery confirmation
- delivery confirmation also updates `dc_num_status.delv_conf_status`

#### Output to next stage

- Completed delivery record
- Post-delivery operational trail is established

### Stage 10: Installation

This stage exists only where installation/vendor work is part of the job.

#### Purpose

- Assign engineer/vendor for installation
- Capture installation completion date
- Track DC/IR/SNR document receipt after installation

#### Important business rule

- Installation is relevant only when vendor/engineer allocation exists

#### Key implementation behavior

- Pending installation list requires:
  - `vendor_bulk_sts = 1`
  - installation not yet fully completed for document closure

#### Related tables

- `installation_details`
- `installation_details_sublist`
- linked fields in `invoice_creation_main`

#### Status role

- installation allocation and completion data are stored back on the invoice-linked main record

#### Output to next stage

- Installation proof/documents are ready for signed-document verification

### Stage 11: Signed Document Verification

This stage validates final signed delivery/installation documents.

#### Purpose

- Verify DC signed document
- Verify IR signed document
- Verify SNR signed document where applicable
- Track mismatch, verification, and rejection reason

#### Main tables

- `sign_doc_verification_detail`
- `installation_details`
- `installation_details_sublist`
- `dc_ir_doc_dispatch_details`
- `dc_num_status`

#### Key status meaning

- verification states include pending, mismatch, verified
- signed completion status is tracked against DC number

#### Output to next stage

- Signed-complete operational closure
- Vendor-billing-related verification tables can proceed

### Stage 12: Vendor Module

This stage handles vendor billing, approvals, and payment processing.

#### Purpose

- Create vendor bill
- Attach vendor invoice and supporting files
- Route bill for approval
- Enter account details
- Perform finance/accounts approval
- Perform management approval
- Record payment transaction

#### Main tables

- `vendor_payment_details_main`
- `vendor_payment_details`
- `invoice_verfication_table`
- `vendor_creation`

#### Vendor workflow inside this module

- Vendor Bill Creation
- Vendor Bill Approval
- Accounts Bill Entry
- Accounts Bill Approval
- Management Bill Approval
- Payment Transaction

#### Important fields tracked

- vendor bill approval status
- accounts entry status
- finance approval
- management approval
- transaction date
- transaction ID
- payable amount

#### Final outcome

- End-to-end vendor payment lifecycle is recorded against installation/service-related work

## 7. Exact Flow Handoffs Between Stages

### Flow summary

1. `Purchase Order` creates the main transaction root.
2. `Stock Position` represents inventory readiness against the PO.
3. `Consignee Stock Assign` links stock to consignee-wise execution.
4. `Invoice/DC` creates commercial and dispatch documents.
5. `Operation Approval` validates the invoice/DC document set.
6. `Accounts Approval` gives finance-side clearance.
7. `Material QC` validates dispatch readiness.
8. `Dispatch` creates outward movement and transit records.
9. `Delivery Confirmation` confirms final receipt at consignee end.
10. `Vendor Allocation` can happen after accounts-cleared operation flow and is required for installation-driven execution.
11. `Installation` happens only where vendor/engineer allocation is relevant.
12. `Signed Document` verifies final signed proof set.
13. `Vendor Module` completes bill approval and payment processing.

## 8. Status-Based Dependency Summary

| Stage | Main condition observed in code | Result |
| --- | --- | --- |
| Operation Approval pending | Invoice/DC exists and `doc_approval_sts = 0` | Await operation review |
| Operation Approval approved | `doc_approval_sts = 1` | Record becomes operation-approved |
| Accounts Approval pending | `invoice_doc_status = 1` | Await accounts review |
| Accounts Approval approved | `ac_team_verifiy_status = 1`, `invoice_doc_status = 4` | Commercial clearance complete |
| Vendor Allocation pending | `invoice_doc_status = 4` and `vendor_bulk_sts = 0` | Vendor allocation is possible |
| Material QC pending | `doc_approval_sts = 1` and `material_qc = 0` | QC can be performed |
| Dispatch pending | `material_qc = 1` and `ac_team_verifiy_status = 1` and no dispatch row yet | Dispatch can be created |
| Installation pending | `vendor_bulk_sts = 1` | Installation work is available |
| Signed document progression | installation/document records exist | Final proof verification progresses |
| Vendor billing/payment | signed/invoice verification and vendor-payment rows are available | Vendor payment chain proceeds |

## 9. Business Interpretation of the Requested Flow

Your requested business flow is valid for this project and matches the implemented modules:

`Order -> Purchase -> Stores -> Consignee Stock Assign -> Invoice -> Operation Approval -> Vendor Allocation possible -> Accounts Approval -> Material QC -> Dispatch -> Delivery Confirmation -> Installation (if vendor allocated) -> Signed Document -> Vendor Module`

### Clean stage explanation in business language

- `Order`: create and approve the PO base record.
- `Purchase`: confirm stock or procurement availability for the PO items.
- `Stores`: assign material stock to each consignee.
- `Invoice/DC`: generate invoice and dispatch challan documents.
- `Operation Approval`: operations team validates PO/invoice/DC/IR document correctness.
- `Vendor Allocation possible`: once the invoice flow is commercially mature, vendor/engineer assignment can be planned for service/install-linked execution.
- `Accounts Approval`: accounts team confirms financial/document compliance.
- `Material QC`: QC confirms readiness for dispatch.
- `Dispatch`: material is shipped or handed over.
- `Delivery Confirmation`: receiving end confirms delivery.
- `Installation`: performed only when vendor allocation or engineer execution is required.
- `Signed Document`: DC/IR/SNR signed proofs are validated and closed.
- `Vendor Module`: vendor bill, approval, accounts entry, management approval, and payment transaction are processed.

## 10. Project Strengths Observed

- Clear business-module separation
- Strong end-to-end PO traceability
- Approval-driven process control
- Separate handling for commercial, operational, QC, dispatch, delivery, and installation stages
- Dedicated vendor payment approval chain
- Reporting and document retrieval modules already available

## 11. Current Implementation Notes

- The project appears to be a migration/modernization of an older operational system into a React + Django stack.
- Several models use existing database tables with `managed = False`, which suggests the database schema already existed before the Django layer.
- Many viewsets use raw SQL and stored procedures for business-critical queries.
- Status fields are central to navigation between stages.
- Files are important throughout the workflow: PO copy, invoice, DC, IR, dispatch proof, installation proof, signed documents, and vendor invoices.

## 12. Key Code Areas for This Workflow

- Frontend routes: `frontend/src/App.tsx`
- Frontend menu mapping: `frontend/src/utils/menuRoutes.ts`
- Backend API root: `Backend/otm_project/urls.py`
- Backend module routing: `Backend/master/urls.py`
- Core workflow models:
  - `Backend/master/apps/purchase_order/purchaseordermodel.py`
  - `Backend/master/apps/Stockposition/stockpositionmodel.py`
  - `Backend/master/apps/Consignee_Stock_Assign/consignee_stock_model.py`
  - `Backend/master/apps/operation_approval/operationapprovalmodel.py`
  - `Backend/master/apps/material_qc/material_qc_model.py`
  - `Backend/master/apps/dispatch/dispatch_model.py`
  - `Backend/master/apps/delivery_confirmation/delivery_confirmation_model.py`
  - `Backend/master/apps/signed_document_verification/signed_doc_verification_model.py`
  - `Backend/master/apps/vendor_allocation/vendorallocation_model.py`
  - `Backend/master/apps/vendor_bill_creation/vendorbillcreationmodel.py`

## 13. Final Summary

OTM is a workflow-heavy operational platform that starts from purchase order creation and drives the full lifecycle up to delivery, installation, signed proof verification, and vendor payment processing.

The most important execution flow in the current project is:

`PO creation -> stock readiness -> consignee assignment -> invoice/DC creation -> operation approval -> accounts approval -> QC -> dispatch -> delivery confirmation -> installation/document closure -> vendor billing/payment`

This means the project is not just an order entry system. It is a complete operational tracking and control platform for commercial documents, inventory-linked execution, service/vendor work, and post-execution payment processes.
