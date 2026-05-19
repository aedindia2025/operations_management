from django.db import models


class DeliveryDispatchList(models.Model):
    """
    Maps to MySQL table: dispatch_list
    Handles delivery dispatch records with confirmation tracking.
    """

    # Primary / identity
    unique_id           = models.CharField(max_length=100, primary_key=True)
    dc_number           = models.CharField(max_length=100, blank=True, null=True)
    dc_date             = models.DateField(blank=True, null=True)

    # PO / Invoice linkage
    po_form_unique_id   = models.CharField(max_length=100, blank=True, null=True)
    invoice_no          = models.CharField(max_length=100, blank=True, null=True)
    invoice_date        = models.DateField(blank=True, null=True)
    invoice_auto_id     = models.CharField(max_length=100, blank=True, null=True)
    po_date             = models.CharField(max_length=20, blank=True, null=True)   # stored as dd-mm-yyyy

    # Consignee
    consignee           = models.CharField(max_length=255, blank=True, null=True)
    consignee_unique_id = models.CharField(max_length=100, blank=True, null=True)

    # Dispatch / delivery info
    dispatch_date       = models.DateField(blank=True, null=True)
    delivery_date       = models.DateField(blank=True, null=True)
    mode_of_delivery    = models.CharField(max_length=10, blank=True, null=True)
    # '1' = Hand  |  '2' = Courier
    name_of_courier     = models.CharField(max_length=255, blank=True, null=True)
    pod_no              = models.CharField(max_length=100, blank=True, null=True)
    delivery_proof      = models.TextField(blank=True, null=True)   # comma-separated file names
    file_name           = models.TextField(blank=True, null=True)

    # Status
    # '2' = Dispatched/Pending  |  '3' = Confirmed  |  '5' = Not Delivered
    status              = models.CharField(max_length=10, blank=True, null=True)

    # Delivery confirmation fields
    rec_person_name     = models.CharField(max_length=255, blank=True, null=True)
    rec_contact_no      = models.CharField(max_length=15, blank=True, null=True)
    pro_rec_date        = models.DateField(blank=True, null=True)
    deliv_remarks       = models.TextField(blank=True, null=True)
    delv_conf_date      = models.DateField(blank=True, null=True)
    delv_conf_person    = models.CharField(max_length=100, blank=True, null=True)   # staff_id FK (logical)

    # Soft-delete
    is_delete           = models.IntegerField(default=0)

    class Meta:
        db_table = "dispatch_list"
        managed  = False   # table already exists in MySQL

    def __str__(self):
        return f"{self.dc_number} | {self.invoice_no}"


class DeliveryDcNumStatus(models.Model):
    """
    Maps to MySQL table: dc_num_status
    Tracks overall delivery-confirmation status per DC number.
    """

    dc_number           = models.CharField(max_length=100, primary_key=True)
    delv_conf_status    = models.CharField(max_length=10, blank=True, null=True)
    delv_conf_date      = models.DateField(blank=True, null=True)

    class Meta:
        db_table = "dc_num_status"
        managed  = False

    def __str__(self):
        return self.dc_number
