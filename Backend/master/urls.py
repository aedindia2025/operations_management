from django.urls import path
from master.viewsets.po_report.po_report_viewset import (
    PoReportCustomerOptionsView,
    PoReportPoNumberOptionsView,
    PoReportDownloadView,
)
from master.viewsets.completed_po_report.completed_po_report_viewset import (
    CompletedPoReportDownloadView,
)
from master.viewsets.payment_process_report.payment_process_report_viewset import (
    PaymentProcessReportListView,
)
from master.viewsets.po_wise_document.po_wise_document_viewset import (
    PowiseDocCustomerOptionsView,
    PowiseDocPoNumberOptionsView,
    PowiseDocStateOptionsView,
    PowiseDocDistrictOptionsView,
    PowiseDocZoneOptionsView,
    PowiseDocFileListView,
    PowiseDocDownloadView,
)
from master.viewsets.dashboard.dashboard_viewset import (
    DashboardSummaryView,
)
from master.viewsets.vendor_bill_approval.vendor_bill_approval_viewset import (
    VendorBillListView,
    VendorBillDetailView,
    VendorBillUpdateRemarkView,
    VendorBillApproveView,
    VendorBillExportView,
    VendorBillApprovalFileView,
)
from master.viewsets.accounts_team_bill_entry.accounts_bill_entry_viewset import (
    AccountsBillEntryListView,
    AccountsBillEntryDetailView,
    AccountsBillEntrySaveView,
    AccountsBillEntryRejectView,
    AccountsBillEntryExportView,
)
from master.viewsets.state.state_viewstate import (
    StateListCreateView,
    StateDetailView,
)
from master.viewsets.district.district_viewset import (
    DistrictListCreateView,
    DistrictDetailView,
    StateOptionsView,
    DistrictImportView,
)
from master.viewsets.account_sector.accountsector_viewset import (
    AccountSectorListCreateView,
    AccountSectorDetailView,
)
from master.viewsets.city.city_viewset import (
    CityCreationListView,
    CityCreationCreateView,
    CityCreationDetailView,
    DistrictOptionByStateView,
    StateOptionView,
)
from master.viewsets.account_vertical.accountvertical_viewset import (
    AccountVerticalListCreateView,
    AccountVerticalDetailView,
)
from master.viewsets.user_type.user_type_viewset import (
    UserTypeListCreateView,
    UserTypeDetailView,
)
from master.viewsets.user.user_viewset import (
    UserCreationListCreateView,
    UserCreationDetailView,
    UserTypeOptionsView,
)
from master.viewsets.user_screen.user_screen_viewset import (
    UserScreenListCreateView,
    UserScreenDetailView,
    UserScreenOptionsView,
    UserScreenSectionOptionsView,
)
from master.viewsets.user_permission.user_permission_viewset import (
    UserPermissionListCreateView,
    UserPermissionDetailView,
    UserPermissionOptionsView,
    UserPermissionMatrixView,
)
from master.viewsets.tenant.tenant_viewset import (
    TenantCompanyListCreateView,
    TenantCompanyDetailView,
    TenantCompanyResolveView,
)
from master.viewsets.department.department_viewset import (
    DepartmentListView,
    DepartmentCreateView,
    DepartmentDetailView,
    DepartmentSublistCreateUpdateView,
    DepartmentSublistDataTableView,
    DepartmentSublistDetailView,
    AccountSectorOptionView,
)
from master.viewsets.item_creation.item_creation_viewset import (
    ItemCreationListView,
    ItemCreationCreateView,
    ItemCreationDetailView,
    ItemSubListView,
    ItemSubCreateUpdateView,
    ItemSubDetailView,
    ItemCreationExcelImportView,
)
from master.viewsets.service_engineer.engineer_viewset import (
    EngineerListView,
    EngineerCreateView,
    EngineerDetailView,
    EmpIdOptionView,
    EngineerNameOptionView,
)
from master.viewsets.vendor_creation.vendor_viewset import (
    VendorListView,
    VendorCreateView,
    VendorDetailView,
    VendorIdGenerateView,
    VendorDistrictOptionView,
    VendorStateOptionView,
)
from master.viewsets.bank_details.bank_details_viewset import (
    BankDetailsApproveView,
    BankDetailsListView,
)
from master.viewsets.vendor_bill_creation.vendor_bill_creation_viewset import (
    VendorBillCreationListCreateView,
    VendorBillCreationDetailView,
    VendorBillCreationPendingDetailView,
    VendorBillCreationBillCreateView,
    VendorBillCreationBillDetailView,
    VendorBillCreationFileView,
    OnsiteEngineerPaymentListCreateView,
)
from master.viewsets.unit_creation.unitcreation_viewset import (
    UnitCreationListView,
    UnitCreationCreateView,
    UnitCreationDetailView,
)
from master.viewsets.main_category.maincategory_viewset import (
    MainCategoryListView,
    MainCategoryCreateView,
    MainCategoryDetailView,
)
from master.viewsets.executive_creation.executivecreation_viewset import (
    ExecutiveCreationListView,
    ExecutiveCreationCreateView,
    ExecutiveCreationDetailView,
)
from master.viewsets.consignee_creation.consigneecreation_viewset import (
    ConsigneeCreationListView,
    ConsigneeCreationCreateView,
    ConsigneeCreationDetailView,
    ConsigneeDistrictOptionView,
)
from master.viewsets.pincode_creation.pincode_viewset import (
    PincodeCreationListView,
    PincodeCreationCreateView,
    PincodeCreationDetailView,
    PincodeStateOptionView,
    PincodeDistrictOptionView,
    PincodeCityOptionView,
)
from master.viewsets.courier_creation.courier_viewset import (
    CourierListView,
    CourierCreateView,
    CourierDetailView,
)
from master.viewsets.insurance_type.insurance_type_viewset import (
    InsuranceTypeListCreateView,
    InsuranceTypeDetailView,
)
from master.viewsets.product_category.productcategory_viewset import (
    ProductCategoryListView,
    ProductCategoryCreateView,
    ProductCategoryDetailView,
)
from master.viewsets.purchase_order.purchase_order_viewset import (
    PurchaseOrderAmcDetailView,
    PurchaseOrderAmcListCreateView,
    PurchaseOrderAssignImportView,
    PurchaseOrderAssignSaveView,
    PurchaseOrderAssignView,
    PurchaseOrderCancelListView,
    PurchaseOrderCancelView,
    PurchaseOrderConsigneeBatchListView,
    PurchaseOrderConsigneeBatchDeleteView,
    PurchaseOrderConsigneeBatchDateUpdateView,
    PurchaseOrderConsigneeDetailView,
    PurchaseOrderConsigneeImportView,
    PurchaseOrderConsigneeListCreateView,
    PurchaseOrderCreateView,
    PurchaseOrderDetailView,
    PurchaseOrderFileView,
    PurchaseOrderListView,
    PurchaseOrderOptionsView,
    PurchaseOrderPendingVerifyView,
    PurchaseOrderProductDetailView,
    PurchaseOrderProductListCreateView,
    PurchaseOrderPushView,
    PurchaseOrderVerifyBatchesView,
)
from master.viewsets.Stockposition.stock_position_viewset import (
    StockPositionPendingListView,
    StockPositionProcessingListView,
    StockPositionCompleteListView,
    StockPositionCreateView,
    StockPositionDetailView,
    StockPositionPartNoUpdateView,
    StockPositionStatusUpdateView,
    StockPositionExportView,
)
from master.viewsets.Consignee_Stock_Assign.consignee_stock_viewset import (
    ConsigneeStockAPIView,
)
from master.viewsets.material_qc.material_qc_viewset import (
    MaterialQCListView,
    MaterialQCCreateView,
    MaterialQCDetailView,
)
from master.viewsets.installation.installation_viewset import (
    InstallationListView,
    InstallationSourceDetailView,
    InstallationCreateView,
    InstallationDetailView,
    InstallationDispatchDetailView,
    InstallationFileView,
    InstallationTeamMemberOptionsView,
)
from master.viewsets.invoice.invoice_viewset import (
    InvoiceListView,
    InvoiceSourceDetailView,
    InvoiceCreateView,
    InvoiceDetailView,
    InvoiceDeleteView,
    InvoiceDocRowDeleteView,
    InvoiceFileView,
    LedgerOptionsView,
)
from master.viewsets.dispatch.dispatch_viewset import (
    DispatchPendingListView,
    DispatchTransitListView as DispatchModuleTransitListView,
    DispatchDeliveryListView as DispatchModuleDeliveryListView,
    DispatchFileView,
    DispatchListView,
    DispatchCreateView,
    DispatchDetailView,
    DispatchTransitDetailView,
    DispatchTransitUpdateView,
    DispatchDeliveryDetailView,
    DispatchDeliveryUpdateView,
)
from master.viewsets.vendor_allocation.vendorallocation_viewset import (
    DispatchCreateUpdateView,
    VendorAllocationPendingListView,
    VendorAllocationZonePendingListView,
    VendorAllocationCompletedListView,
    VendorAllocationMetaView,
    VendorAllocationDetailView,
    VendorAllocationProductDetailsView,
    DispatchTransitListView,
    DispatchDeliveryListView,
    VendorBulkAssignView,
    TeamAllocationUpdateView,
    VendorAllocationExcelExportView,
    DistrictByStateOptionView,
    EngineerRoleOptionView,
    RevendorAllocationPendingListView,
    RevendorAllocationProductDetailsView,
    RevendorBulkAssignView,
    RevisitPaymentPendingListView,
    RevisitPaymentProductDetailsView,
    RevisitPaymentBulkAssignView,
)
from master.viewsets.operation_approval.operation_approval_viewset import (
    OperationApprovalListView,
    PendingApprovalListView,
    OperationApprovalDetailView,
    OperationApprovalUpdateView,
    BulkApprovalView,
    OperationApprovalExportView,
    OperationApprovalFilterOptionsView,
)
from master.viewsets.delivery_confirmation.delivery_confirmation_viewset import (
    PendingDeliveryListView,
    CompletedDeliveryListView,
    DispatchDetailView as DeliveryConfirmationDetailView,
    DeliveryConfirmView,
    DeliveryBulkConfirmView,
)

from master.viewsets.accounts_approval.accounts_approval_viewset import (
    AccountsApprovalViewSet,
)

from master.viewsets.security_deposit.security_deposit_viewset import (
    SecurityDepositViewSet,
)
from master.viewsets.customer_payment.customer_payment_viewset import (
    PaymentListView,
    PaymentDetailView,
    PaymentSaveView,
    BillCancelView,
    PaymentDeleteView,
    UserPermissionView,
    PaymentExcelExportView,
)
from master.viewsets.signed_document_verification.signed_doc_verification_viewset import (
    SignDocVerificationListView,
    SignDocVerificationDetailView,
    SignDocVerificationSaveView,
    SignDocVerificationExportView,
    SignDocVerificationExportPendingView,
    SignDocVerificationDeleteView,
)
from master.viewsets.Payment_Transaction_Form.payment_viewset import (
    PaymentTransactionView,
)
from master.viewsets.notifications.notification_viewset import (
    PaymentNotificationView,
)
from master.viewsets.chat.chat_viewset import (
    ChatConversationListView,
    ChatMessageView,
    ChatUserListView,
)
from master.viewsets.Management_Team_Bill_Approval.management_viewset import (
    ManagementApprovalView,
    ManagementBillApproveView,
    ManagementBillDetailView,
    ManagementBillExportView,
    ManagementBillListView,
    ManagementBillUpdateRemarkView,
)
from master.viewsets.Accounts_Team_Bill_Approval.accounts_bill_approval_viewset import (
    AccountsBillApprovalApproveView,
    AccountsBillApprovalDetailView,
    AccountsBillApprovalExportView,
    AccountsBillApprovalFileView,
    AccountsBillApprovalListView,
    AccountsBillApprovalUpdateRemarkView,
)
urlpatterns = [
    path("tenants/companies/", TenantCompanyListCreateView.as_view(), name="tenant-company-list-create"),
    path("tenants/companies/resolve/", TenantCompanyResolveView.as_view(), name="tenant-company-resolve"),
    path("tenants/companies/<str:unique_id>/", TenantCompanyDetailView.as_view(), name="tenant-company-detail"),
    path("district/import/", DistrictImportView.as_view()),
    path("dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),

     # ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ Vendor Bill Approval ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚ÂÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ #
    path("vendor-bill-approval/list/",          VendorBillListView.as_view(),         name="vendor-bill-list"),
    path("vendor-bill-approval/detail/",        VendorBillDetailView.as_view(),       name="vendor-bill-detail"),
    path("vendor-bill-approval/update-remark/", VendorBillUpdateRemarkView.as_view(), name="vendor-bill-remark"),
    path("vendor-bill-approval/approve/",       VendorBillApproveView.as_view(),      name="vendor-bill-approve"),
    path("vendor-bill-approval/export/",        VendorBillExportView.as_view(),       name="vendor-bill-export"),
    path("vendor-bill-approval/files/<str:file_kind>/<str:filename>/", VendorBillApprovalFileView.as_view(), name="vendor-bill-approval-file"),
    path("accounts-bill-entry/list/",           AccountsBillEntryListView.as_view(),   name="accounts-bill-entry-list"),
    path("accounts-bill-entry/detail/",         AccountsBillEntryDetailView.as_view(), name="accounts-bill-entry-detail"),
    path("accounts-bill-entry/save/",           AccountsBillEntrySaveView.as_view(),   name="accounts-bill-entry-save"),
    path("accounts-bill-entry/reject/",         AccountsBillEntryRejectView.as_view(), name="accounts-bill-entry-reject"),
    path("accounts-bill-entry/export/",         AccountsBillEntryExportView.as_view(), name="accounts-bill-entry-export"),
    # -- Accounts Team Bill Approval (alias) ------------------------- #
    path("accounts-bill-approval/list/",          AccountsBillApprovalListView.as_view(),         name="accounts-bill-list"),
    path("accounts-bill-approval/detail/",        AccountsBillApprovalDetailView.as_view(),       name="accounts-bill-detail"),
    path("accounts-bill-approval/files/<str:file_kind>/<str:filename>/", AccountsBillApprovalFileView.as_view(), name="accounts-bill-file"),
    path("accounts-bill-approval/update-remark/", AccountsBillApprovalUpdateRemarkView.as_view(), name="accounts-bill-remark"),
    path("accounts-bill-approval/approve/",       AccountsBillApprovalApproveView.as_view(),      name="accounts-bill-approve"),
    path("accounts-bill-approval/export/",        AccountsBillApprovalExportView.as_view(),       name="accounts-bill-export"),
    path("management-bill-approval/list/",          ManagementBillListView.as_view(),         name="management-bill-list"),
    path("management-bill-approval/detail/",        ManagementBillDetailView.as_view(),       name="management-bill-detail"),
    path("management-bill-approval/update-remark/", ManagementBillUpdateRemarkView.as_view(), name="management-bill-remark"),
    path("management-bill-approval/approve/",       ManagementBillApproveView.as_view(),      name="management-bill-approve"),
    path("management-bill-approval/export/",        ManagementBillExportView.as_view(),       name="management-bill-export"),
    # -- PO Wise Document -------------------------------------------- #
    path("po-wise-document/customers/",  PowiseDocCustomerOptionsView.as_view(),  name="powise-doc-customers"),
    path("po-wise-document/po-numbers/", PowiseDocPoNumberOptionsView.as_view(),  name="powise-doc-po-numbers"),
    path("po-wise-document/states/",     PowiseDocStateOptionsView.as_view(),     name="powise-doc-states"),
    path("po-wise-document/districts/",  PowiseDocDistrictOptionsView.as_view(),  name="powise-doc-districts"),
    path("po-wise-document/zones/",      PowiseDocZoneOptionsView.as_view(),      name="powise-doc-zones"),
    path("po-wise-document/files/",      PowiseDocFileListView.as_view(),         name="powise-doc-files"),
    path("po-wise-document/download/",   PowiseDocDownloadView.as_view(),         name="powise-doc-download"),
    # -- PO Report --------------------------------------------------- #
    path("po-report/customers/",  PoReportCustomerOptionsView.as_view(),  name="po-report-customers"),
    path("po-report/po-numbers/", PoReportPoNumberOptionsView.as_view(),  name="po-report-po-numbers"),
    path("po-report/download/",   PoReportDownloadView.as_view(),         name="po-report-download"),

    # -- Completed PO Report ---------------------------------------- #
    path("completed-po-report/download/", CompletedPoReportDownloadView.as_view(), name="completed-po-report-download"),

    # -- Payment Process Report ------------------------------------- #
    path("payment-process-report/list/", PaymentProcessReportListView.as_view(), name="payment-process-report-list"),

    # -- State ------------------------------------------------------- #
    path("state/list/", StateListCreateView.as_view(), name="state-list"),
    path("state/<str:unique_id>/", StateDetailView.as_view(), name="state-detail"),

    # -- District ---------------------------------------------------- #
    path("district/list/", DistrictListCreateView.as_view(), name="district-list"),
    path("district/state-options/", StateOptionsView.as_view(), name="district-state-options"),
    path("district/<str:unique_id>/", DistrictDetailView.as_view(), name="district-detail"),

    # -- Account Sector ---------------------------------------------- #
    path("account-sector/list/", AccountSectorListCreateView.as_view(), name="account-sector-list"),
    path("account-sector/<str:unique_id>/", AccountSectorDetailView.as_view(), name="account-sector-detail"),

    # -- City -------------------------------------------------------- #
    path("city/list/", CityCreationListView.as_view(), name="city-list"),
    path("city/create/", CityCreationCreateView.as_view(), name="city-create"),
    path("city/state-options/", StateOptionView.as_view(), name="city-state-options"),
    path("city/district-options/", DistrictOptionByStateView.as_view(), name="city-district-options"),
    path("city/<str:unique_id>/", CityCreationDetailView.as_view(), name="city-detail"),

    # -- Account Vertical -------------------------------------------- #
    path("account-vertical/list/", AccountVerticalListCreateView.as_view(), name="account-vertical-list"),
    path("account-vertical/<str:unique_id>/", AccountVerticalDetailView.as_view(), name="account-vertical-detail"),

    # -- User Type --------------------------------------------------- #
    path("user-type/list/", UserTypeListCreateView.as_view(), name="user-type-list"),
    path("user-type/<str:unique_id>/", UserTypeDetailView.as_view(), name="user-type-detail"),

    # -- User -------------------------------------------------------- #
    path("user/options/user-types/", UserTypeOptionsView.as_view(), name="user-options-user-types"),
    path("user/list/", UserCreationListCreateView.as_view(), name="user-list"),
    path("user/<str:unique_id>/", UserCreationDetailView.as_view(), name="user-detail"),

    # -- User Screen ------------------------------------------------- #
    path("user-screen/options/", UserScreenOptionsView.as_view(), name="user-screen-options"),
    path("user-screen/sections/", UserScreenSectionOptionsView.as_view(), name="user-screen-sections"),
    path("user-screen/list/", UserScreenListCreateView.as_view(), name="user-screen-list"),
    path("user-screen/<str:unique_id>/", UserScreenDetailView.as_view(), name="user-screen-detail"),

    # -- User Permission --------------------------------------------- #
    path("user-permission/options/", UserPermissionOptionsView.as_view(), name="user-permission-options"),
    path("user-permission/matrix/", UserPermissionMatrixView.as_view(), name="user-permission-matrix"),
    path("user-permission/list/", UserPermissionListCreateView.as_view(), name="user-permission-list"),
    path("user-permission/<str:user_type>/", UserPermissionDetailView.as_view(), name="user-permission-detail"),

    # -- Department -------------------------------------------------- #
    path("department/list/", DepartmentListView.as_view(), name="department-list"),
    path("department/create/", DepartmentCreateView.as_view(), name="department-create"),
    path("department/options/account-sectors/", AccountSectorOptionView.as_view(), name="department-acc-sector-options"),
    path("department/sublist/", DepartmentSublistCreateUpdateView.as_view(), name="department-sublist-cu"),
    path("department/sublist/datatable/", DepartmentSublistDataTableView.as_view(), name="department-sublist-dt"),
    path("department/sublist/<str:unique_id>/", DepartmentSublistDetailView.as_view(), name="department-sublist-detail"),
    path("department/sublist/<str:unique_id>/delete/", DepartmentSublistDetailView.as_view(), name="department-sublist-delete"),
    path("department/<str:unique_id>/", DepartmentDetailView.as_view(), name="department-detail"),
    path("department/<str:unique_id>/update/", DepartmentDetailView.as_view(), name="department-update"),
    path("department/<str:unique_id>/delete/", DepartmentDetailView.as_view(), name="department-delete"),

    # -- Item Creation ----------------------------------------------- #
    path("item-creation/list/",   ItemCreationListView.as_view(),        name="item-creation-list"),
    path("item-creation/create/", ItemCreationCreateView.as_view(),      name="item-creation-create"),
    path("item-creation/import/", ItemCreationExcelImportView.as_view(), name="item-creation-import"),
    path("item-creation/sub/",              ItemSubListView.as_view(),         name="item-sub-list"),
    path("item-creation/sub/create/",       ItemSubCreateUpdateView.as_view(), name="item-sub-cu"),
    path("item-creation/sub/<str:unique_id>/",        ItemSubDetailView.as_view(), name="item-sub-detail"),
    path("item-creation/sub/<str:unique_id>/delete/", ItemSubDetailView.as_view(), name="item-sub-delete"),
    path("item-creation/<str:unique_id>/",        ItemCreationDetailView.as_view(), name="item-creation-detail"),
    path("item-creation/<str:unique_id>/update/", ItemCreationDetailView.as_view(), name="item-creation-update"),
    path("item-creation/<str:unique_id>/delete/", ItemCreationDetailView.as_view(), name="item-creation-delete"),

    # -- Service Engineer -------------------------------------------- #
    path("service-engineer/list/",                   EngineerListView.as_view(),        name="engineer-list"),
    path("service-engineer/create/",                 EngineerCreateView.as_view(),      name="engineer-create"),
    path("service-engineer/options/emp-id/",         EmpIdOptionView.as_view(),         name="engineer-emp-id-options"),
    path("service-engineer/options/engineer-names/", EngineerNameOptionView.as_view(),  name="engineer-name-options"),
    path("service-engineer/<str:unique_id>/",        EngineerDetailView.as_view(),      name="engineer-detail"),
    path("service-engineer/<str:unique_id>/update/", EngineerDetailView.as_view(),      name="engineer-update"),
    path("service-engineer/<str:unique_id>/delete/", EngineerDetailView.as_view(),      name="engineer-delete"),

    # -- Vendor Creation --------------------------------------------- #
    path("vendor/list/",                   VendorListView.as_view(),           name="vendor-list"),
    path("vendor/create/",                 VendorCreateView.as_view(),         name="vendor-create"),
    path("vendor/options/states/",         VendorStateOptionView.as_view(),    name="vendor-state-options"),
    path("vendor/options/districts/",      VendorDistrictOptionView.as_view(), name="vendor-district-options"),
    path("vendor/generate-id/",            VendorIdGenerateView.as_view(),     name="vendor-id-generate"),
    path("vendor/<str:unique_id>/",        VendorDetailView.as_view(),         name="vendor-detail"),
    path("vendor/<str:unique_id>/update/", VendorDetailView.as_view(),         name="vendor-update"),
    path("vendor/<str:unique_id>/delete/", VendorDetailView.as_view(),         name="vendor-delete"),

    # -- Vendor Bill Creation ------------------------------------------------ #
    path("vendor-bill-creation/list/", VendorBillCreationListCreateView.as_view(), name="vendor-bill-creation-list"),
    path("vendor-bill-creation/create/", VendorBillCreationListCreateView.as_view(), name="vendor-bill-creation-create"),
    path("vendor-bill-creation/pending-detail/", VendorBillCreationPendingDetailView.as_view(), name="vendor-bill-creation-pending-detail"),
    path("vendor-bill-creation/create-bill/", VendorBillCreationBillCreateView.as_view(), name="vendor-bill-creation-create-bill"),
    path("vendor-bill-creation/bill-detail/", VendorBillCreationBillDetailView.as_view(), name="vendor-bill-creation-bill-detail"),
    path("vendor-bill-creation/files/<str:file_kind>/<str:filename>/", VendorBillCreationFileView.as_view(), name="vendor-bill-creation-file"),
    path("vendor-bill-creation/<str:unique_id>/", VendorBillCreationDetailView.as_view(), name="vendor-bill-creation-detail"),
    path("vendor-bill-creation/<str:unique_id>/update/", VendorBillCreationDetailView.as_view(), name="vendor-bill-creation-update"),
    path("vendor-bill-creation/<str:unique_id>/delete/", VendorBillCreationDetailView.as_view(), name="vendor-bill-creation-delete"),
    path("onsite-engineer-payment/list/", OnsiteEngineerPaymentListCreateView.as_view(), name="onsite-engineer-payment-list"),
    path("onsite-engineer-payment/create/", OnsiteEngineerPaymentListCreateView.as_view(), name="onsite-engineer-payment-create"),

    # -- Unit Creation ----------------------------------------------- #
    path("unit-creation/list/",                   UnitCreationListView.as_view(),   name="unit-creation-list"),
    path("unit-creation/create/",                 UnitCreationCreateView.as_view(), name="unit-creation-create"),
    path("unit-creation/<str:unique_id>/",        UnitCreationDetailView.as_view(), name="unit-creation-detail"),
    path("unit-creation/<str:unique_id>/update/", UnitCreationDetailView.as_view(), name="unit-creation-update"),
    path("unit-creation/<str:unique_id>/delete/", UnitCreationDetailView.as_view(), name="unit-creation-delete"),

    # -- Main Category ----------------------------------------------- #
    path("main-category/list/",                   MainCategoryListView.as_view(),   name="main-category-list"),
    path("main-category/create/",                 MainCategoryCreateView.as_view(), name="main-category-create"),
    path("main-category/<str:unique_id>/",        MainCategoryDetailView.as_view(), name="main-category-detail"),
    path("main-category/<str:unique_id>/update/", MainCategoryDetailView.as_view(), name="main-category-update"),
    path("main-category/<str:unique_id>/delete/", MainCategoryDetailView.as_view(), name="main-category-delete"),

    # -- Executive Creation ------------------------------------------ #
    path("executive-creation/list/",                   ExecutiveCreationListView.as_view(),   name="executive-creation-list"),
    path("executive-creation/create/",                 ExecutiveCreationCreateView.as_view(), name="executive-creation-create"),
    path("executive-creation/<str:unique_id>/",        ExecutiveCreationDetailView.as_view(), name="executive-creation-detail"),
    path("executive-creation/<str:unique_id>/update/", ExecutiveCreationDetailView.as_view(), name="executive-creation-update"),
    path("executive-creation/<str:unique_id>/delete/", ExecutiveCreationDetailView.as_view(), name="executive-creation-delete"),

    # -- Consignee Creation ------------------------------------------ #
    path("consignee-creation/list/",                   ConsigneeCreationListView.as_view(),   name="consignee-creation-list"),
    path("consignee-creation/create/",                 ConsigneeCreationCreateView.as_view(), name="consignee-creation-create"),
    path("consignee-creation/options/districts/",      ConsigneeDistrictOptionView.as_view(), name="consignee-district-options"),
    path("consignee-creation/<str:unique_id>/",        ConsigneeCreationDetailView.as_view(), name="consignee-creation-detail"),
    path("consignee-creation/<str:unique_id>/update/", ConsigneeCreationDetailView.as_view(), name="consignee-creation-update"),
    path("consignee-creation/<str:unique_id>/delete/", ConsigneeCreationDetailView.as_view(), name="consignee-creation-delete"),

    # -- Pincode Creation -------------------------------------------- #
    path("pincode/list/",                   PincodeCreationListView.as_view(),    name="pincode-list"),
    path("pincode/create/",                 PincodeCreationCreateView.as_view(),  name="pincode-create"),
    path("pincode/options/states/",         PincodeStateOptionView.as_view(),     name="pincode-state-options"),
    path("pincode/options/districts/",      PincodeDistrictOptionView.as_view(),  name="pincode-district-options"),
    path("pincode/options/cities/",         PincodeCityOptionView.as_view(),      name="pincode-city-options"),
    path("pincode/<str:unique_id>/",        PincodeCreationDetailView.as_view(),  name="pincode-detail"),
    path("pincode/<str:unique_id>/update/", PincodeCreationDetailView.as_view(),  name="pincode-update"),
    path("pincode/<str:unique_id>/delete/", PincodeCreationDetailView.as_view(),  name="pincode-delete"),

    # -- Courier Creation -------------------------------------------- #
    path("courier/list/",                   CourierListView.as_view(),   name="courier-list"),
    path("courier/create/",                 CourierCreateView.as_view(), name="courier-create"),
    path("courier/<str:unique_id>/",        CourierDetailView.as_view(), name="courier-detail"),
    path("courier/<str:unique_id>/update/", CourierDetailView.as_view(), name="courier-update"),
    path("courier/<str:unique_id>/delete/", CourierDetailView.as_view(), name="courier-delete"),

    # -- Insurance Type ---------------------------------------------- #
    path("insurance-type/list/",                   InsuranceTypeListCreateView.as_view(), name="insurance-type-list"),
    path("insurance-type/create/",                 InsuranceTypeListCreateView.as_view(), name="insurance-type-create"),
    path("insurance-type/<str:unique_id>/",        InsuranceTypeDetailView.as_view(),     name="insurance-type-detail"),
    path("insurance-type/<str:unique_id>/update/", InsuranceTypeDetailView.as_view(),     name="insurance-type-update"),
    path("insurance-type/<str:unique_id>/delete/", InsuranceTypeDetailView.as_view(),     name="insurance-type-delete"),

    # -- Product Category -------------------------------------------- #
    path("product-category/list/",                   ProductCategoryListView.as_view(),   name="product-category-list"),
    path("product-category/create/",                 ProductCategoryCreateView.as_view(), name="product-category-create"),
    path("product-category/<str:unique_id>/",        ProductCategoryDetailView.as_view(), name="product-category-detail"),
    path("product-category/<str:unique_id>/update/", ProductCategoryDetailView.as_view(), name="product-category-update"),
    path("product-category/<str:unique_id>/delete/", ProductCategoryDetailView.as_view(), name="product-category-delete"),

    # -- Purchase Order ---------------------------------------------- #
    path("purchase-order/options/",                                          PurchaseOrderOptionsView.as_view(),           name="purchase-order-options"),
    path("purchase-order/list/",                                             PurchaseOrderListView.as_view(),              name="purchase-order-list"),
    path("purchase-order/cancel-list/",                                      PurchaseOrderCancelListView.as_view(),        name="purchase-order-cancel-list"),
    path("purchase-order/create/",                                           PurchaseOrderCreateView.as_view(),            name="purchase-order-create"),
    path("purchase-order/push/",                                             PurchaseOrderPushView.as_view(),              name="purchase-order-push"),
    path("purchase-order/files/<str:folder>/<str:filename>/",                PurchaseOrderFileView.as_view(),              name="purchase-order-file"),
    path("purchase-order/consignee-batches/verify/",                         PurchaseOrderVerifyBatchesView.as_view(),     name="purchase-order-verify-batches"),
    path("purchase-order/products/<str:sub_id>/",                            PurchaseOrderProductDetailView.as_view(),     name="purchase-order-product-detail"),
    path("purchase-order/products/<str:sub_id>/delete/",                     PurchaseOrderProductDetailView.as_view(),     name="purchase-order-product-delete"),
    path("purchase-order/consignees/<str:sub_id>/",                          PurchaseOrderConsigneeDetailView.as_view(),   name="purchase-order-consignee-detail"),
    path("purchase-order/consignees/<str:sub_id>/delete/",                   PurchaseOrderConsigneeDetailView.as_view(),   name="purchase-order-consignee-delete"),
    path("purchase-order/<str:unique_id>/",                                  PurchaseOrderDetailView.as_view(),            name="purchase-order-detail"),
    path("purchase-order/<str:unique_id>/update/",                           PurchaseOrderDetailView.as_view(),            name="purchase-order-update"),
    path("purchase-order/<str:unique_id>/delete/",                           PurchaseOrderDetailView.as_view(),            name="purchase-order-delete"),
    path("purchase-order/<str:unique_id>/products/",                         PurchaseOrderProductListCreateView.as_view(), name="purchase-order-products"),
    path("purchase-order/<str:unique_id>/products/create/",                  PurchaseOrderProductListCreateView.as_view(), name="purchase-order-products-create"),
    path("purchase-order/<str:unique_id>/consignees/",                       PurchaseOrderConsigneeListCreateView.as_view(), name="purchase-order-consignees"),
    path("purchase-order/<str:unique_id>/consignees/create/",                PurchaseOrderConsigneeListCreateView.as_view(), name="purchase-order-consignees-create"),
    path("purchase-order/<str:unique_id>/consignees/import/",                PurchaseOrderConsigneeImportView.as_view(),   name="purchase-order-consignees-import"),
    path("purchase-order/<str:unique_id>/amc-sublist/",                      PurchaseOrderAmcListCreateView.as_view(),     name="purchase-order-amc-sublist"),
    path("purchase-order/<str:unique_id>/consignee-batches/",                PurchaseOrderConsigneeBatchListView.as_view(), name="purchase-order-consignee-batches"),
    path("purchase-order/<str:unique_id>/consignee-batches/<str:batch_id>/delete/", PurchaseOrderConsigneeBatchDeleteView.as_view(), name="purchase-order-consignee-batch-delete"),
    path("purchase-order/<str:unique_id>/consignee-batches/<str:batch_id>/received-date/", PurchaseOrderConsigneeBatchDateUpdateView.as_view(), name="purchase-order-consignee-batch-date"),
    path("purchase-order/<str:unique_id>/consignee-batches/pending-verify/", PurchaseOrderPendingVerifyView.as_view(),     name="purchase-order-pending-verify"),
    path("purchase-order/<str:unique_id>/assign/import/",                     PurchaseOrderAssignImportView.as_view(),      name="purchase-order-assign-import"),
    path("purchase-order/<str:unique_id>/assign/save/",                      PurchaseOrderAssignSaveView.as_view(),        name="purchase-order-assign-save"),
    path("purchase-order/<str:unique_id>/assign/<str:batch_id>/",            PurchaseOrderAssignView.as_view(),            name="purchase-order-assign"),
    path("purchase-order/amc-sublist/<str:sub_id>/delete/",                  PurchaseOrderAmcDetailView.as_view(),         name="purchase-order-amc-sublist-delete"),
    path("purchase-order/<str:unique_id>/cancel/",                           PurchaseOrderCancelView.as_view(),            name="purchase-order-cancel"),

    # -- Stock Position ---------------------------------------------- #
    path("stock-position/pending/",                       StockPositionPendingListView.as_view(),    name="stock-pending"),
    path("stock-position/processing/",                    StockPositionProcessingListView.as_view(), name="stock-processing"),
    path("stock-position/complete/",                      StockPositionCompleteListView.as_view(),   name="stock-complete"),
    path("stock-position/create/",                        StockPositionCreateView.as_view(),         name="stock-create"),
    path("stock-position/export/",                        StockPositionExportView.as_view(),         name="stock-export"),
    path("stock-position/<str:unique_id>/",               StockPositionDetailView.as_view(),         name="stock-detail"),
    path("stock-position/<str:unique_id>/delete/",        StockPositionDetailView.as_view(),         name="stock-delete"),
    path("stock-position/<str:unique_id>/part-no/",        StockPositionPartNoUpdateView.as_view(),   name="stock-part-no-update"),
    path("stock-position/<str:unique_id>/update-status/", StockPositionStatusUpdateView.as_view(),   name="stock-update-status"),

    # -- Consignee Stock Assign -------------------------------------- #
    path("consignee-stock/list/",                   ConsigneeStockAPIView.as_view(), name="consignee-stock-list"),
    path("consignee-stock/create/",                 ConsigneeStockAPIView.as_view(), name="consignee-stock-create"),
    path("consignee-stock/pending/",                ConsigneeStockAPIView.as_view(), name="consignee-stock-pending"),
    path("consignee-stock/<str:unique_id>/",        ConsigneeStockAPIView.as_view(), name="consignee-stock-detail"),
    path("consignee-stock/<str:unique_id>/update/", ConsigneeStockAPIView.as_view(), name="consignee-stock-update"),
    path("consignee-stock/<str:unique_id>/delete/", ConsigneeStockAPIView.as_view(), name="consignee-stock-delete"),

    # -- Invoice and DC ---------------------------------------------- #
    path("invoice-dc/list/",                            InvoiceListView.as_view(),         name="invoice-list"),
    path("invoice-dc/create/",                          InvoiceCreateView.as_view(),       name="invoice-create"),
    path("invoice-dc/source/<str:source_unique_id>/",  InvoiceSourceDetailView.as_view(), name="invoice-source-detail"),
    path("invoice-dc/doc-row/<str:unique_id>/delete/", InvoiceDocRowDeleteView.as_view(), name="invoice-doc-row-delete"),
    path("invoice-dc/<str:unique_id>/delete/",         InvoiceDeleteView.as_view(),       name="invoice-delete"),
    path("invoice-dc/files/<str:filename>/",            InvoiceFileView.as_view(),         name="invoice-file"),
    path("invoice-dc/ledger-options/",                  LedgerOptionsView.as_view(),       name="ledger-options"),
    path("invoice-dc/<str:unique_id>/",                 InvoiceDetailView.as_view(),       name="invoice-detail"),
    path("invoice-dc/<str:unique_id>/update/",          InvoiceDetailView.as_view(),       name="invoice-update"),

    # -- Installation ------------------------------------------------ #
    path("installation/team-member-options/",             InstallationTeamMemberOptionsView.as_view(),  name="installation-team-member-options"),
    path("installation/list/",                            InstallationListView.as_view(),         name="installation-list"),
    path("installation/create/",                          InstallationCreateView.as_view(),       name="installation-create"),
    path("installation/source/<str:source_unique_id>/",  InstallationSourceDetailView.as_view(), name="installation-source-detail"),
    path("installation/files/<str:filename>/",            InstallationFileView.as_view(),         name="installation-file"),
    path("installation/dispatch/<str:unique_id>/",        InstallationDispatchDetailView.as_view(), name="installation-dispatch-detail"),
    path("installation/<str:unique_id>/",                 InstallationDetailView.as_view(),       name="installation-detail"),
    path("installation/<str:unique_id>/update/",          InstallationDetailView.as_view(),       name="installation-update"),
    path("installation/<str:unique_id>/delete/",          InstallationDetailView.as_view(),       name="installation-delete"),

    # -- Material QC ------------------------------------------------- #
    path("material-qc/list/",                   MaterialQCListView.as_view(),   name="material-qc-list"),
    path("material-qc/create/",                 MaterialQCCreateView.as_view(), name="material-qc-create"),
    path("material-qc/<str:unique_id>/",        MaterialQCDetailView.as_view(), name="material-qc-detail"),
    path("material-qc/<str:unique_id>/update/", MaterialQCDetailView.as_view(), name="material-qc-update"),
    path("material-qc/<str:unique_id>/delete/", MaterialQCDetailView.as_view(), name="material-qc-delete"),

    # -- Dispatch ---------------------------------------------------- #
    path("dispatch/pending/",                DispatchPendingListView.as_view(), name="dispatch-pending"),
    path("dispatch/transit/",                DispatchModuleTransitListView.as_view(), name="dispatch-transit"),
    path("dispatch/delivery/",               DispatchModuleDeliveryListView.as_view(), name="dispatch-delivery"),
    path("dispatch/transit/detail/",         DispatchTransitDetailView.as_view(), name="dispatch-transit-detail"),
    path("dispatch/transit/update/",         DispatchTransitUpdateView.as_view(), name="dispatch-transit-update"),
    path("dispatch/delivery/detail/",        DispatchDeliveryDetailView.as_view(), name="dispatch-delivery-detail"),
    path("dispatch/delivery/update/",        DispatchDeliveryUpdateView.as_view(), name="dispatch-delivery-update"),
    path("dispatch/files/<path:filename>/",  DispatchFileView.as_view(), name="dispatch-file"),
    path("dispatch/list/",                   DispatchListView.as_view(),   name="dispatch-list"),
    path("dispatch/create/",                 DispatchCreateView.as_view(), name="dispatch-create"),
    path("dispatch/<str:unique_id>/",        DispatchDetailView.as_view(), name="dispatch-detail"),
    path("dispatch/<str:unique_id>/update/", DispatchDetailView.as_view(), name="dispatch-update"),
    path("dispatch/<str:unique_id>/delete/", DispatchDetailView.as_view(), name="dispatch-delete"),

    # -- Vendor Allocation ------------------------------------------- #
    path("vendor-allocation/dispatch/create/",       DispatchCreateUpdateView.as_view(),          name="vendor-dispatch-create"),
    path("vendor-allocation/bulk-assign/",           VendorBulkAssignView.as_view(),              name="vendor-bulk-assign"),
    path("vendor-allocation/team-assign/",           TeamAllocationUpdateView.as_view(),           name="vendor-team-assign"),
    path("vendor-allocation/meta/",                  VendorAllocationMetaView.as_view(),           name="vendor-allocation-meta"),
    path("vendor-allocation/product-details/",       VendorAllocationProductDetailsView.as_view(), name="vendor-allocation-product-details"),
    path("vendor-allocation/pending/",               VendorAllocationPendingListView.as_view(),   name="vendor-allocation-pending"),
    path("vendor-allocation/completed/",             VendorAllocationCompletedListView.as_view(), name="vendor-allocation-completed"),
    path("vendor-allocation/transit/",               DispatchTransitListView.as_view(),           name="vendor-allocation-transit"),
    path("vendor-allocation/delivery/",              DispatchDeliveryListView.as_view(),          name="vendor-allocation-delivery"),
    path("vendor-allocation/export/",                VendorAllocationExcelExportView.as_view(),   name="vendor-allocation-export"),
    path("vendor-allocation/options/districts/",     DistrictByStateOptionView.as_view(),         name="vendor-allocation-districts"),
    path("vendor-allocation/options/engineer-role/", EngineerRoleOptionView.as_view(),            name="vendor-allocation-engineer-role"),
    path("vendor-allocation/<str:unique_id>/",       VendorAllocationDetailView.as_view(),        name="vendor-allocation-detail"),

    # -- Vendor Allocation Zone -------------------------------------- #
    path("vendor-allocation-zone/dispatch/create/",       DispatchCreateUpdateView.as_view(),          name="vendor-allocation-zone-dispatch-create"),
    path("vendor-allocation-zone/bulk-assign/",           RevendorBulkAssignView.as_view(),            name="vendor-allocation-zone-bulk-assign"),
    path("vendor-allocation-zone/team-assign/",           TeamAllocationUpdateView.as_view(),           name="vendor-allocation-zone-team-assign"),
    path("vendor-allocation-zone/meta/",                  VendorAllocationMetaView.as_view(),           name="vendor-allocation-zone-meta"),
    path("vendor-allocation-zone/product-details/",       RevendorAllocationProductDetailsView.as_view(), name="vendor-allocation-zone-product-details"),
    path("vendor-allocation-zone/pending/",               VendorAllocationZonePendingListView.as_view(), name="vendor-allocation-zone-pending"),
    path("vendor-allocation-zone/completed/",             VendorAllocationCompletedListView.as_view(),  name="vendor-allocation-zone-completed"),
    path("vendor-allocation-zone/transit/",               DispatchTransitListView.as_view(),            name="vendor-allocation-zone-transit"),
    path("vendor-allocation-zone/delivery/",              DispatchDeliveryListView.as_view(),           name="vendor-allocation-zone-delivery"),
    path("vendor-allocation-zone/export/",                VendorAllocationExcelExportView.as_view(),    name="vendor-allocation-zone-export"),
    path("vendor-allocation-zone/options/districts/",     DistrictByStateOptionView.as_view(),          name="vendor-allocation-zone-districts"),
    path("vendor-allocation-zone/options/engineer-role/", EngineerRoleOptionView.as_view(),             name="vendor-allocation-zone-engineer-role"),
    path("vendor-allocation-zone/<str:unique_id>/",       VendorAllocationDetailView.as_view(),         name="vendor-allocation-zone-detail"),

    # -- Revendor Allocation ----------------------------------------- #
    path("revendor-allocation/pending/",             RevendorAllocationPendingListView.as_view(),        name="revendor-allocation-pending"),
    path("revendor-allocation/product-details/",     RevendorAllocationProductDetailsView.as_view(),     name="revendor-allocation-product-details"),
    path("revendor-allocation/bulk-assign/",         RevendorBulkAssignView.as_view(),                  name="revendor-bulk-assign"),

    # -- Revisit Payment --------------------------------------------- #
    path("revisit-payment/pending/",                  RevisitPaymentPendingListView.as_view(),           name="revisit-payment-pending"),
    path("revisit-payment/product-details/",          RevisitPaymentProductDetailsView.as_view(),        name="revisit-payment-product-details"),
    path("revisit-payment/bulk-assign/",              RevisitPaymentBulkAssignView.as_view(),            name="revisit-payment-bulk-assign"),

    # -- Operation Approval ------------------------------------------ #
    path("operation-approval/list/",                         OperationApprovalListView.as_view(),  name="op-approval-list"),
    path("operation-approval/pending/",                      PendingApprovalListView.as_view(),    name="op-approval-pending"),
    path("operation-approval/filter-options/",               OperationApprovalFilterOptionsView.as_view(), name="op-approval-filter-options"),
    path("operation-approval/bulk-approve/",                 BulkApprovalView.as_view(),           name="op-approval-bulk"),
    path("operation-approval/export/",                       OperationApprovalExportView.as_view(), name="op-approval-export"),
    path("operation-approval/<str:unique_id>/",              OperationApprovalDetailView.as_view(), name="op-approval-detail"),
    path("operation-approval/<str:unique_id>/approve/",      OperationApprovalUpdateView.as_view(), name="op-approval-approve"),
    path("operation-approval/<str:unique_id>/delete/",       OperationApprovalDetailView.as_view(), name="op-approval-delete"),

    # -- Delivery Confirmation --------------------------------------- #
    path("delivery-confirmation/pending/",                        PendingDeliveryListView.as_view(),          name="delivery-confirmation-pending"),
    path("delivery-confirmation/completed/",                      CompletedDeliveryListView.as_view(),        name="delivery-confirmation-completed"),
    path("delivery-confirmation/confirm/",                        DeliveryConfirmView.as_view(),              name="delivery-confirmation-confirm"),
    path("delivery-confirmation/bulk-confirm/",                   DeliveryBulkConfirmView.as_view(),          name="delivery-confirmation-bulk-confirm"),
    path("delivery-confirmation/<str:unique_id>/",                DeliveryConfirmationDetailView.as_view(),   name="delivery-confirmation-detail"),
    path("delivery-confirmation/<str:unique_id>/update/",         DeliveryConfirmationDetailView.as_view(),   name="delivery-confirmation-update"),
    path("delivery-confirmation/<str:unique_id>/delete/",         DeliveryConfirmationDetailView.as_view(),   name="delivery-confirmation-delete"),

    # -- Accounts Approval ------------------------------------------- #
    path("accounts-approval/pending/", AccountsApprovalViewSet.as_view({"get": "pending"}), name="accounts-approval-pending"),
    path("accounts-approval/completed/", AccountsApprovalViewSet.as_view({"get": "completed"}), name="accounts-approval-completed"),
    path("accounts-approval/pending-list/", AccountsApprovalViewSet.as_view({"get": "pending_list"}), name="accounts-approval-pending-list"),
    path("accounts-approval/approve-reject/", AccountsApprovalViewSet.as_view({"post": "approve_reject"}), name="accounts-approval-approve-reject"),
    path("accounts-approval/overall-approval/", AccountsApprovalViewSet.as_view({"post": "overall_approval"}), name="accounts-approval-overall-approval"),
    path("accounts-approval/export-excel/", AccountsApprovalViewSet.as_view({"get": "export_excel"}), name="accounts-approval-export-excel"),
    path("accounts-approval/<str:pk>/", AccountsApprovalViewSet.as_view({"get": "retrieve"}), name="accounts-approval-detail"),
    path("accounts-approval/<str:pk>/delete/", AccountsApprovalViewSet.as_view({"delete": "soft_delete"}), name="accounts-approval-delete"),

     # -- Security Deposit ------------------------------------------- #
    path("security-deposit/list/", SecurityDepositViewSet.as_view({"get": "datatable"}), name="security-deposit-list"),
    path("security-deposit/partial-bill-list/", SecurityDepositViewSet.as_view({"get": "partial_bill_datatable"}), name="security-deposit-partial-bill-list"),
    path("security-deposit/partial-payment-list/", SecurityDepositViewSet.as_view({"get": "partial_payment_datatable"}), name="security-deposit-partial-payment-list"),
    path("security-deposit/bill-generate-list/", SecurityDepositViewSet.as_view({"get": "bill_generate_datatable"}), name="security-deposit-bill-generate-list"),
    path("security-deposit/customer-details/", SecurityDepositViewSet.as_view({"get": "customer_details"}), name="security-deposit-customer-details"),
    path("security-deposit/form-data/", SecurityDepositViewSet.as_view({"get": "form_data"}), name="security-deposit-form-data"),
    path("security-deposit/view/", SecurityDepositViewSet.as_view({"get": "view_bill"}), name="security-deposit-view"),
    path("security-deposit/create-update/", SecurityDepositViewSet.as_view({"post": "create_update"}), name="security-deposit-create-update"),
    path("security-deposit/partial-bill-main/", SecurityDepositViewSet.as_view({"post": "partial_bill_main"}), name="security-deposit-partial-bill-main"),
    path("security-deposit/partial-bill-add/", SecurityDepositViewSet.as_view({"post": "partial_bill_creation_add_update"}), name="security-deposit-partial-bill-add"),
    path("security-deposit/export-excel/", SecurityDepositViewSet.as_view({"get": "export_excel"}), name="security-deposit-export-excel"),
    path("security-deposit/<str:pk>/delete/", SecurityDepositViewSet.as_view({"delete": "soft_delete"}), name="security-deposit-delete"),

    # -- Customer Payment ------------------------------------------- #
    path("payment/list/", PaymentListView.as_view(), name="payment-list"),
    path("payment/detail/", PaymentDetailView.as_view(), name="payment-detail"),
    path("payment/save/", PaymentSaveView.as_view(), name="payment-save"),
    path("payment/cancel/", BillCancelView.as_view(), name="payment-cancel"),
    path("payment/permissions/", UserPermissionView.as_view(), name="payment-permissions"),
    path("payment/export/excel/", PaymentExcelExportView.as_view(), name="payment-export-excel"),
    path("payment/<str:unique_id>/delete/", PaymentDeleteView.as_view(), name="payment-delete"),
    
      # -- Signed Document Verification -------------------------------- #
    path("signed-doc-verification/list/",                            SignDocVerificationListView.as_view(),         name="signed-doc-verification-list"),
    path("signed-doc-verification/save/",                            SignDocVerificationSaveView.as_view(),         name="signed-doc-verification-save"),
    path("signed-doc-verification/export/",                          SignDocVerificationExportView.as_view(),       name="signed-doc-verification-export"),
    path("signed-doc-verification/export-pending/",                  SignDocVerificationExportPendingView.as_view(), name="signed-doc-verification-export-pending"),
    path("signed-doc-verification/<str:unique_id>/delete/",          SignDocVerificationDeleteView.as_view(),       name="signed-doc-verification-delete"),
    path("signed-doc-verification/<str:consignee_unique_id>/",       SignDocVerificationDetailView.as_view(),       name="signed-doc-verification-detail"),
    path("signed-doc-verification/<str:consignee_unique_id>/update/", SignDocVerificationDetailView.as_view(),      name="signed-doc-verification-update"),
    
    # -- Payment Transaction ------------------------- #
    path("payment-transaction/list/", PaymentTransactionView.as_view(), name="payment-transaction-list"),
    path("payment-transaction/create/", PaymentTransactionView.as_view(), name="payment-transaction-create"),
    path("payment-transaction/notifications/", PaymentNotificationView.as_view(), name="payment-transaction-notifications"),
    path("payment-transaction/<str:unique_id>/", PaymentTransactionView.as_view(), name="payment-transaction-detail"),
    path("payment-transaction/<str:unique_id>/update/", PaymentTransactionView.as_view(), name="payment-transaction-update"),
    path("payment-transaction/<str:unique_id>/delete/", PaymentTransactionView.as_view(), name="payment-transaction-delete"),

    # -- Chat -------------------------------------------------------- #
    path("chat/users/", ChatUserListView.as_view(), name="chat-users"),
    path("chat/conversations/", ChatConversationListView.as_view(), name="chat-conversations"),
    path("chat/messages/", ChatMessageView.as_view(), name="chat-messages"),

    # -- Bank Details -------------------------------- #
    path("bank-details/list/", BankDetailsListView.as_view(), name="bank-details-list"),
    path("bank-details/approve/", BankDetailsApproveView.as_view(), name="bank-details-approve"),
    
    # -- Management Approval ------------------------- #
    path("management-approval/list/", ManagementBillApproveView.as_view(), name="management-approval-list"),
    path("management-approval/create/", ManagementBillApproveView.as_view(), name="management-approval-create"),
    path("management-approval/approved/", ManagementBillApproveView.as_view(), name="management-approval-approved"),
    path("management-approval/rejected/", ManagementBillApproveView.as_view(), name="management-approval-rejected"),

    path("management-approval/<str:unique_id>/", ManagementBillApproveView.as_view(), name="management-approval-detail"),
    path("management-approval/<str:unique_id>/approve/", ManagementBillApproveView.as_view(), name="management-approval-approve"),
    path("management-approval/<str:unique_id>/reject/", ManagementBillApproveView.as_view(), name="management-approval-reject"),
    path("management-approval/<str:unique_id>/delete/", ManagementBillApproveView.as_view(), name="management-approval-delete"),
]








