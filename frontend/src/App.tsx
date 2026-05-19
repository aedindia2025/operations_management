import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/layout/Layout";
import type { ReactNode } from "react";
import { isProductOwnerUser } from "./utils/authAccess";

// ─── Core ────────────────────────────────────────────────────
import Login     from "./pages/login/Login";
import Dashboard from "./pages/dashboard/Dashboard";

// ─── Order ───────────────────────────────────────────────────
import PurchaseOrderList    from "./pages/order/PurchaseOrderList";
import PurchaseOrderForm    from "./pages/order/PurchaseOrderForm";
import PurchaseOrderConsigneeDetails from "./pages/order/PurchaseOrderConsigneeDetails";

// ─── Purchase ────────────────────────────────────────────────
import StockPositionList    from "./pages/purchase/StockPositionList";
import StockPositionForm    from "./pages/purchase/StockPositionForm";

// ─── Stores ──────────────────────────────────────────────────
import ConsigneeStockList   from "./pages/stores/ConsigneeStockList";
import ConsigneeStockForm   from "./pages/stores/ConsigneeStockForm";
import InvoiceDcList        from "./pages/stores/InvoiceDcList";
import InvoiceDcForm        from "./pages/stores/InvoiceDcForm";
import MaterialQcList       from "./pages/stores/MaterialQcList";
import MaterialQcForm       from "./pages/stores/MaterialQcForm";
import DispatchList         from "./pages/stores/DispatchList";
import DispatchForm         from "./pages/stores/DispatchForm";
import DispatchTransitForm  from "./pages/stores/DispatchTransitForm";
import DispatchDeliveryForm from "./pages/stores/DispatchDeliveryForm";

// ─── Operation ───────────────────────────────────────────────
import OperationApprovalList    from "./pages/operation/OperationApprovalList";
import OperationApprovalForm    from "./pages/operation/OperationApprovalForm";
import VendorAllocationList     from "./pages/operation/VendorAllocationList";
import VendorAllocationForm     from "./pages/operation/VendorAllocationForm";
import VendorAllocationZoneList from "./pages/operation/VendorAllocationZoneList";
import VendorAllocationZoneForm from "./pages/operation/VendorAllocationZoneForm";
import DeliveryConfirmationList from "./pages/operation/DeliveryConfirmationList";
import DeliveryConfirmationForm from "./pages/operation/DeliveryConfirmationForm";
import SignedDocumentList       from "./pages/operation/SignedDocumentList";
import SignedDocumentForm       from "./pages/operation/SignedDocumentForm";

// ─── Accounts ────────────────────────────────────────────────
import AccountsApprovalList  from "./pages/accounts/AccountsApprovalList";
import AccountsApprovalForm  from "./pages/accounts/AccountsApprovalForm";
import SecurityDepositList   from "./pages/accounts/SecurityDepositList";
import SecurityDepositForm   from "./pages/accounts/SecurityDepositForm";
import CustomerPaymentList   from "./pages/accounts/CustomerPaymentList";
import CustomerPaymentForm   from "./pages/accounts/CustomerPaymentForm";

// ─── Service & Support ───────────────────────────────────────
import InstallationList      from "./pages/service/InstallationList";
import InstallationForm      from "./pages/service/InstallationForm";
import InstallationDispatchForm from "./pages/service/InstallationDispatchForm";

// ─── Vendor ──────────────────────────────────────────────────
import VendorBillCreationList     from "./pages/vendor/VendorBillCreationList";
import VendorBillCreationForm     from "./pages/vendor/VendorBillCreationForm";
import VendorBillInvoicePreviewPage from "./pages/vendor/VendorBillInvoicePreviewPage";
import VendorBillApprovalList     from "./pages/vendor/VendorBillApprovalList";
import VendorBillApprovalForm     from "./pages/vendor/VendorBillApprovalForm";
import AccountsBillEntryList      from "./pages/vendor/AccountsBillEntryList";
import AccountsBillEntryForm      from "./pages/vendor/AccountsBillEntryForm";
import AccountsBillApprovalList   from "./pages/vendor/AccountsBillApprovalList";
import AccountsBillApprovalForm   from "./pages/vendor/AccountsBillApprovalForm";
import ManagementBillApprovalList from "./pages/vendor/ManagementBillApprovalList";
import ManagementBillApprovalForm from "./pages/vendor/ManagementBillApprovalForm";
import PaymentTransactionList     from "./pages/vendor/PaymentTransactionList";
import PaymentTransactionForm     from "./pages/vendor/PaymentTransactionForm";
import BankDetailsList           from "./pages/vendor/BankDetailsList";
import OnsiteEngineerPaymentList from "./pages/vendor/OnsiteEngineerPaymentList";
import OnsiteEngineerPaymentForm from "./pages/vendor/OnsiteEngineerPaymentForm";

// ─── Reports & Documents ─────────────────────────────────────
import PoWiseReport   from "./pages/reports/PoWiseReport";
import CompletedPoReport from "./pages/reports/CompletedPoReport";
import OverdueIncompletePoReport from "./pages/reports/OverdueIncompletePoReport";
import PaymentProcessReport from "./pages/reports/PaymentProcessReport";
import PoWiseDocument from "./pages/documents/PoWiseDocument";

// ─── Admin ───────────────────────────────────────────────────
import UserScreenList     from "./pages/admin/UserScreenList";
import UserScreenForm     from "./pages/admin/UserScreenForm";
import UserCreationList   from "./pages/admin/UserCreationList";
import UserCreationForm   from "./pages/admin/UserCreationForm";
import TenantCreationList from "./pages/admin/TenantCreationList";
import TenantCreationForm from "./pages/admin/TenantCreationForm";
import UserTypeList       from "./pages/admin/UserTypeList";
import UserTypeForm       from "./pages/admin/UserTypeForm";
import UserPermissionList from "./pages/admin/UserPermissionList";
import UserPermissionForm from "./pages/admin/UserPermissionForm";

// ─── Settings ────────────────────────────────────────────────
import StateCreationList       from "./pages/settings/StateCreationList";
import StateCreationForm       from "./pages/settings/StateCreationForm";
import DistrictCreationList    from "./pages/settings/DistrictCreationList";
import DistrictCreationForm    from "./pages/settings/DistrictCreationForm";
import CityCreationList        from "./pages/settings/CityCreationList";
import CityCreationForm        from "./pages/settings/CityCreationForm";
import AccountVerticalList     from "./pages/settings/AccountVerticalList";
import AccountVerticalForm     from "./pages/settings/AccountVerticalForm";
import AccountSectorList       from "./pages/settings/AccountSectorList";
import AccountSectorForm       from "./pages/settings/AccountSectorForm";
import CustomerCreationList    from "./pages/settings/CustomerCreationList";
import CustomerCreationForm    from "./pages/settings/CustomerCreationForm";
import ItemCreationList        from "./pages/settings/ItemCreationList";
import ItemCreationForm        from "./pages/settings/ItemCreationForm";
import ServiceEngineerList     from "./pages/settings/ServiceEngineerList";
import ServiceEngineerForm     from "./pages/settings/ServiceEngineerForm";
import VendorCreationList      from "./pages/settings/VendorCreationList";
import VendorCreationForm      from "./pages/settings/VendorCreationForm";
import InsuranceTypeList       from "./pages/settings/InsuranceTypeList";
import InsuranceTypeForm       from "./pages/settings/InsuranceTypeForm";
import ProductCategoryList     from "./pages/settings/ProductCategoryList";
import ProductCategoryForm     from "./pages/settings/ProductCategoryForm";
import MainCategoryList        from "./pages/settings/MainCategoryList";
import MainCategoryForm        from "./pages/settings/MainCategoryForm";
import UnitCreationList        from "./pages/settings/UnitCreationList";
import UnitCreationForm        from "./pages/settings/UnitCreationForm";
import ExecutiveCreationList   from "./pages/settings/ExecutiveCreationList";
import ExecutiveCreationForm   from "./pages/settings/ExecutiveCreationForm";
import ConsigneeCreationList   from "./pages/settings/ConsigneeCreationList";
import ConsigneeCreationForm   from "./pages/settings/ConsigneeCreationForm";
import PincodeCreationList     from "./pages/settings/PincodeCreationList";
import PincodeCreationForm     from "./pages/settings/PincodeCreationForm";
import CourierCreationList     from "./pages/settings/CourierCreationList";
import CourierCreationForm     from "./pages/settings/CourierCreationForm";

// ─── Auth guard ──────────────────────────────────────────────
function Protected({ children }: { children: ReactNode }) {
  const { user, isAuthReady } = useAuth();
  if (!isAuthReady) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function ProductOwnerOnly({ children }: { children: ReactNode }) {
  const { user, isAuthReady } = useAuth();
  if (!isAuthReady) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isProductOwnerUser(user)) return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user, isAuthReady } = useAuth();
  return (
    <Routes>

      {/* ── Public ── */}
      <Route path="/login" element={!isAuthReady ? null : user ? <Navigate to="/" replace /> : <Login />} />

      {/* ── Dashboard ── */}
      <Route path="/"          element={<Protected><Dashboard /></Protected>} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />

      {/* ── Order ── */}
      <Route path="/order/purchase-order/list"        element={<Protected><PurchaseOrderList /></Protected>} />
      <Route path="/order/purchase-order/form"        element={<Protected><PurchaseOrderForm /></Protected>} />
      <Route path="/order/purchase-order/form/:id"    element={<Protected><PurchaseOrderForm /></Protected>} />
      <Route path="/order/purchase-order/consignee-details/:id/:batchId" element={<Protected><PurchaseOrderConsigneeDetails /></Protected>} />

      {/* ── Purchase ── */}
      <Route path="/purchase/stock-position/list"     element={<Protected><StockPositionList /></Protected>} />
      <Route path="/purchase/stock-position/form"     element={<Protected><StockPositionForm /></Protected>} />
      <Route path="/purchase/stock-position/form/:id" element={<Protected><StockPositionForm /></Protected>} />

      {/* ── Stores ── */}
      <Route path="/stores/consignee-stock/list"      element={<Protected><ConsigneeStockList /></Protected>} />
      <Route path="/stores/consignee-stock/form"      element={<Protected><ConsigneeStockForm /></Protected>} />
      <Route path="/stores/consignee-stock/form/:id"  element={<Protected><ConsigneeStockForm /></Protected>} />
      <Route path="/stores/invoice-dc/list"           element={<Protected><InvoiceDcList /></Protected>} />
      <Route path="/stores/invoice-dc/form"           element={<Protected><InvoiceDcForm /></Protected>} />
      <Route path="/stores/invoice-dc/form/:id"       element={<Protected><InvoiceDcForm /></Protected>} />
      <Route path="/stores/material-qc/list"          element={<Protected><MaterialQcList /></Protected>} />
      <Route path="/stores/material-qc/form"          element={<Protected><MaterialQcForm /></Protected>} />
      <Route path="/stores/material-qc/form/:id"      element={<Protected><MaterialQcForm /></Protected>} />
      <Route path="/stores/dispatch/list"             element={<Protected><DispatchList /></Protected>} />
      <Route path="/stores/dispatch/form"             element={<Protected><DispatchForm /></Protected>} />
      <Route path="/stores/dispatch/form/:id"         element={<Protected><DispatchForm /></Protected>} />
      <Route path="/stores/dispatch/transit"          element={<Protected><DispatchTransitForm /></Protected>} />
      <Route path="/stores/dispatch/delivery"         element={<Protected><DispatchDeliveryForm /></Protected>} />

      {/* ── Operation ── */}
      <Route path="/operation/approval/list"           element={<Protected><OperationApprovalList /></Protected>} />
      <Route path="/operation/approval/form"           element={<Protected><OperationApprovalForm /></Protected>} />
      <Route path="/operation/approval/form/:id"       element={<Protected><OperationApprovalForm /></Protected>} />
      <Route path="/operation/vendor-allocation/list"  element={<Protected><VendorAllocationList /></Protected>} />
      <Route path="/operation/vendor-allocation/form"  element={<Protected><VendorAllocationForm /></Protected>} />
      <Route path="/operation/vendor-allocation/form/:id" element={<Protected><VendorAllocationForm /></Protected>} />
      <Route path="/operation/vendor-allocation-zone/list"  element={<Protected><VendorAllocationZoneList /></Protected>} />
      <Route path="/operation/vendor-allocation-zone/form"  element={<Protected><VendorAllocationZoneForm /></Protected>} />
      <Route path="/operation/vendor-allocation-zone/form/:id" element={<Protected><VendorAllocationZoneForm /></Protected>} />
      <Route path="/operation/revendor-allocation/list"  element={<Protected><VendorAllocationList /></Protected>} />
      <Route path="/operation/revendor-allocation/form"  element={<Protected><VendorAllocationForm /></Protected>} />
      <Route path="/operation/revendor-allocation/form/:id" element={<Protected><VendorAllocationForm /></Protected>} />
      <Route path="/operation/delivery/list"           element={<Protected><DeliveryConfirmationList /></Protected>} />
      <Route path="/operation/delivery/form"           element={<Protected><DeliveryConfirmationForm /></Protected>} />
      <Route path="/operation/delivery/form/:id"       element={<Protected><DeliveryConfirmationForm /></Protected>} />
      <Route path="/operation/signed-document/list"    element={<Protected><SignedDocumentList /></Protected>} />
      <Route path="/operation/signed-document/form"    element={<Protected><SignedDocumentForm /></Protected>} />
      <Route path="/operation/signed-document/form/:id" element={<Protected><SignedDocumentForm /></Protected>} />

      {/* ── Accounts ── */}
      <Route path="/accounts/approval/list"            element={<Protected><AccountsApprovalList /></Protected>} />
      <Route path="/accounts/approval/form"            element={<Protected><AccountsApprovalForm /></Protected>} />
      <Route path="/accounts/approval/form/:id"        element={<Protected><AccountsApprovalForm /></Protected>} />
      <Route path="/accounts/security-deposit/list"    element={<Protected><SecurityDepositList /></Protected>} />
      <Route path="/accounts/security-deposit/form"    element={<Protected><SecurityDepositForm /></Protected>} />
      <Route path="/accounts/security-deposit/form/:id" element={<Protected><SecurityDepositForm /></Protected>} />
      <Route path="/accounts/customer-payment/list"    element={<Protected><CustomerPaymentList /></Protected>} />
      <Route path="/accounts/customer-payment/form"    element={<Protected><CustomerPaymentForm /></Protected>} />
      <Route path="/accounts/customer-payment/form/:id" element={<Protected><CustomerPaymentForm /></Protected>} />

      {/* ── Service & Support ── */}
      <Route path="/service/installation/list"         element={<Protected><InstallationList /></Protected>} />
      <Route path="/service/installation/form"         element={<Protected><InstallationForm /></Protected>} />
      <Route path="/service/installation/form/:id"     element={<Protected><InstallationForm /></Protected>} />
      <Route path="/service/installation/dispatch/:id" element={<Protected><InstallationDispatchForm /></Protected>} />

      {/* ── Vendor ── */}
      <Route path="/vendor/bill-creation/list"             element={<Protected><VendorBillCreationList /></Protected>} />
      <Route path="/vendor/bill-creation/form"             element={<Protected><VendorBillCreationForm /></Protected>} />
      <Route path="/vendor/bill-creation/form/:id"         element={<Protected><VendorBillCreationForm /></Protected>} />
      <Route path="/vendor/bill-creation/invoice-preview"  element={<Protected><VendorBillInvoicePreviewPage /></Protected>} />
      <Route path="/vendor/bill-approval/list"             element={<Protected><VendorBillApprovalList /></Protected>} />
      <Route path="/vendor/bill-approval/form"             element={<Protected><VendorBillApprovalForm /></Protected>} />
      <Route path="/vendor/bill-approval/form/:id"         element={<Protected><VendorBillApprovalForm /></Protected>} />
      <Route path="/vendor/accounts-bill-entry/list"       element={<Protected><AccountsBillEntryList /></Protected>} />
      <Route path="/vendor/accounts-bill-entry/form"       element={<Protected><AccountsBillEntryForm /></Protected>} />
      <Route path="/vendor/accounts-bill-entry/form/:id"   element={<Protected><AccountsBillEntryForm /></Protected>} />
      <Route path="/vendor/accounts-bill-approval/list"    element={<Protected><AccountsBillApprovalList /></Protected>} />
      <Route path="/vendor/accounts-bill-approval/form"    element={<Protected><AccountsBillApprovalForm /></Protected>} />
      <Route path="/vendor/accounts-bill-approval/form/:id" element={<Protected><AccountsBillApprovalForm /></Protected>} />
      <Route path="/vendor/management-bill-approval/list"  element={<Protected><ManagementBillApprovalList /></Protected>} />
      <Route path="/vendor/management-bill-approval/form"  element={<Protected><ManagementBillApprovalForm /></Protected>} />
      <Route path="/vendor/management-bill-approval/form/:id" element={<Protected><ManagementBillApprovalForm /></Protected>} />
      <Route path="/vendor/payment-transaction/list"       element={<Protected><PaymentTransactionList /></Protected>} />
      <Route path="/vendor/payment-transaction/form"       element={<Protected><PaymentTransactionForm /></Protected>} />
      <Route path="/vendor/payment-transaction/form/:id"   element={<Protected><PaymentTransactionForm /></Protected>} />
      <Route path="/vendor/bank-details/list"              element={<Protected><BankDetailsList /></Protected>} />
      <Route path="/vendor/onsite-engineer-payment/list"   element={<Protected><OnsiteEngineerPaymentList /></Protected>} />
      <Route path="/vendor/onsite-engineer-payment/form"   element={<Protected><OnsiteEngineerPaymentForm /></Protected>} />
      <Route path="/vendor/revisit-payment/list"           element={<Protected><VendorAllocationList /></Protected>} />
      <Route path="/vendor/revisit-payment/form"           element={<Protected><VendorAllocationForm /></Protected>} />
      <Route path="/vendor/revisit-payment/form/:id"       element={<Protected><VendorAllocationForm /></Protected>} />
      <Route path="/vendor/revist-payment/list"            element={<Protected><VendorAllocationList /></Protected>} />
      <Route path="/vendor/revist-payment/form"            element={<Protected><VendorAllocationForm /></Protected>} />
      <Route path="/vendor/revist-payment/form/:id"        element={<Protected><VendorAllocationForm /></Protected>} />

      {/* ── Reports ── */}
      <Route path="/reports/po-wise"   element={<Protected><PoWiseReport /></Protected>} />
      <Route path="/reports/completed-po" element={<Protected><CompletedPoReport /></Protected>} />
      <Route path="/reports/overdue-incomplete-po" element={<Protected><OverdueIncompletePoReport /></Protected>} />
      <Route path="/reports/payment-process-report" element={<Protected><PaymentProcessReport /></Protected>} />

      {/* ── Documents ── */}
      <Route path="/documents/po-wise" element={<Protected><PoWiseDocument /></Protected>} />

      {/* ── Admin ── */}
      <Route path="/admin/user-screen/list"         element={<ProductOwnerOnly><UserScreenList /></ProductOwnerOnly>} />
      <Route path="/admin/user-screen/form"         element={<ProductOwnerOnly><UserScreenForm /></ProductOwnerOnly>} />
      <Route path="/admin/user-screen/form/:id"     element={<ProductOwnerOnly><UserScreenForm /></ProductOwnerOnly>} />
      <Route path="/admin/user-creation/list"       element={<Protected><UserCreationList /></Protected>} />
      <Route path="/admin/user-creation/form"       element={<Protected><UserCreationForm /></Protected>} />
      <Route path="/admin/user-creation/form/:id"   element={<Protected><UserCreationForm /></Protected>} />
      <Route path="/admin/tenant-creation/list"     element={<ProductOwnerOnly><TenantCreationList /></ProductOwnerOnly>} />
      <Route path="/admin/tenant-creation/form"     element={<ProductOwnerOnly><TenantCreationForm /></ProductOwnerOnly>} />
      <Route path="/admin/user-type/list"           element={<Protected><UserTypeList /></Protected>} />
      <Route path="/admin/user-type/form"           element={<Protected><UserTypeForm /></Protected>} />
      <Route path="/admin/user-type/form/:id"       element={<Protected><UserTypeForm /></Protected>} />
      <Route path="/admin/user-permission/list"     element={<Protected><UserPermissionList /></Protected>} />
      <Route path="/admin/user-permission/form"     element={<Protected><UserPermissionForm /></Protected>} />
      <Route path="/admin/user-permission/form/:id" element={<Protected><UserPermissionForm /></Protected>} />

      {/* ── Settings ── */}
      <Route path="/settings/state/list"              element={<Protected><StateCreationList /></Protected>} />
      <Route path="/settings/state/form"              element={<Protected><StateCreationForm /></Protected>} />
      <Route path="/settings/state/form/:id"          element={<Protected><StateCreationForm /></Protected>} />
      <Route path="/settings/district/list"           element={<Protected><DistrictCreationList /></Protected>} />
      <Route path="/settings/district/form"           element={<Protected><DistrictCreationForm /></Protected>} />
      <Route path="/settings/district/form/:id"       element={<Protected><DistrictCreationForm /></Protected>} />
      <Route path="/settings/city/list"               element={<Protected><CityCreationList /></Protected>} />
      <Route path="/settings/city/form"               element={<Protected><CityCreationForm /></Protected>} />
      <Route path="/settings/city/form/:id"           element={<Protected><CityCreationForm /></Protected>} />
      <Route path="/settings/account-vertical/list"   element={<Protected><AccountVerticalList /></Protected>} />
      <Route path="/settings/account-vertical/form"   element={<Protected><AccountVerticalForm /></Protected>} />
      <Route path="/settings/account-vertical/form/:id" element={<Protected><AccountVerticalForm /></Protected>} />
      <Route path="/settings/account-sector/list"     element={<Protected><AccountSectorList /></Protected>} />
      <Route path="/settings/account-sector/form"     element={<Protected><AccountSectorForm /></Protected>} />
      <Route path="/settings/account-sector/form/:id" element={<Protected><AccountSectorForm /></Protected>} />
      <Route path="/settings/customer/list"           element={<Protected><CustomerCreationList /></Protected>} />
      <Route path="/settings/customer/form"           element={<Protected><CustomerCreationForm /></Protected>} />
      <Route path="/settings/customer/form/:id"       element={<Protected><CustomerCreationForm /></Protected>} />
      <Route path="/settings/item/list"               element={<Protected><ItemCreationList /></Protected>} />
      <Route path="/settings/item/form"               element={<Protected><ItemCreationForm /></Protected>} />
      <Route path="/settings/item/form/:id"           element={<Protected><ItemCreationForm /></Protected>} />
      <Route path="/settings/service-engineer/list"   element={<Protected><ServiceEngineerList /></Protected>} />
      <Route path="/settings/service-engineer/form"   element={<Protected><ServiceEngineerForm /></Protected>} />
      <Route path="/settings/service-engineer/form/:id" element={<Protected><ServiceEngineerForm /></Protected>} />
      <Route path="/settings/vendor/list"             element={<Protected><VendorCreationList /></Protected>} />
      <Route path="/settings/vendor/form"             element={<Protected><VendorCreationForm /></Protected>} />
      <Route path="/settings/vendor/form/:id"         element={<Protected><VendorCreationForm /></Protected>} />
      <Route path="/settings/insurance-type/list"     element={<Protected><InsuranceTypeList /></Protected>} />
      <Route path="/settings/insurance-type/form"     element={<Protected><InsuranceTypeForm /></Protected>} />
      <Route path="/settings/insurance-type/form/:id" element={<Protected><InsuranceTypeForm /></Protected>} />
      <Route path="/settings/product-category/list"   element={<Protected><ProductCategoryList /></Protected>} />
      <Route path="/settings/product-category/form"   element={<Protected><ProductCategoryForm /></Protected>} />
      <Route path="/settings/product-category/form/:id" element={<Protected><ProductCategoryForm /></Protected>} />
      <Route path="/settings/main-category/list"      element={<Protected><MainCategoryList /></Protected>} />
      <Route path="/settings/main-category/form"      element={<Protected><MainCategoryForm /></Protected>} />
      <Route path="/settings/main-category/form/:id"  element={<Protected><MainCategoryForm /></Protected>} />
      <Route path="/settings/unit/list"               element={<Protected><UnitCreationList /></Protected>} />
      <Route path="/settings/unit/form"               element={<Protected><UnitCreationForm /></Protected>} />
      <Route path="/settings/unit/form/:id"           element={<Protected><UnitCreationForm /></Protected>} />
      <Route path="/settings/executive/list"          element={<Protected><ExecutiveCreationList /></Protected>} />
      <Route path="/settings/executive/form"          element={<Protected><ExecutiveCreationForm /></Protected>} />
      <Route path="/settings/executive/form/:id"      element={<Protected><ExecutiveCreationForm /></Protected>} />
      <Route path="/settings/consignee/list"          element={<Protected><ConsigneeCreationList /></Protected>} />
      <Route path="/settings/consignee/form"          element={<Protected><ConsigneeCreationForm /></Protected>} />
      <Route path="/settings/consignee/form/:id"      element={<Protected><ConsigneeCreationForm /></Protected>} />
      <Route path="/settings/pincode/list"            element={<Protected><PincodeCreationList /></Protected>} />
      <Route path="/settings/pincode/form"            element={<Protected><PincodeCreationForm /></Protected>} />
      <Route path="/settings/pincode/form/:id"        element={<Protected><PincodeCreationForm /></Protected>} />
      <Route path="/settings/courier/list"            element={<Protected><CourierCreationList /></Protected>} />
      <Route path="/settings/courier/form"            element={<Protected><CourierCreationForm /></Protected>} />
      <Route path="/settings/courier/form/:id"        element={<Protected><CourierCreationForm /></Protected>} />

      {/* ── Fallback ── */}
      <Route path="*" element={<Navigate to="/" replace />} />

    </Routes>
  );
}

export default function App() {
  const basename = import.meta.env.BASE_URL === "/" ? undefined : import.meta.env.BASE_URL;

  return (
    <AuthProvider>
      <BrowserRouter
        basename={basename}
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
