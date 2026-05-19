from django.db import models

from master.apps.state.statemodel import StateCreation
from master.apps.user_type.usertypemodel import UserType
from master.apps.user.usermodel import UserCreation
from master.apps.user_screen.userscreenmodel import UserScreen
from master.apps.user_permission.userpermissionmodel import UserPermission
from master.apps.tenant.tenantmodel import TenantCompany, TenantBranch
from master.apps.vendor_bill_creation.vendorbillcreationmodel import (
    VendorBillVendorCreation,
    BillSubmissionMainTable,
    BillSubmissionSub,
    BillSubmissionForm,
)
from master.apps.operation_approval.operationapprovalmodel import InvoiceCreation
from master.apps.signed_document_verification.signed_doc_verification_model import (
    DcIrDocDispatchDetails,
    InstallationDetails,
    InstallationDetailsSublist,
)

BillSubmissionMain = BillSubmissionMainTable


class PartialElcotEntryFinal(BillSubmissionSub):
    bg_num = models.CharField(max_length=100, blank=True, null=True)
    bg_date = models.DateField(blank=True, null=True)
    claim_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    ledger_name = models.CharField(max_length=255, blank=True, null=True)
    ledger_no = models.CharField(max_length=100, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "view_partial_elcot_entry_final"


class ViewPartialBill1(BillSubmissionSub):
    net_value = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    qty = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    claim_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    with_bg = models.CharField(max_length=20, blank=True, null=True)
    without_bg = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        managed = False
        db_table = "view_partial_bill_1"


class ViewBillSubmissionMain(BillSubmissionSub):
    class Meta:
        managed = False
        db_table = "view_bill_submission_main_table"


class ViewPaymentEntryList(BillSubmissionSub):
    payement_receive = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    class Meta:
        managed = False
        db_table = "view_payment_entry_list"


PaymentEntryView = ViewPaymentEntryList


