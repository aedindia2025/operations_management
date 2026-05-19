from master.apps.purchase_order.purchaseordermodel import (
    PurchaseOrder,
    PurchaseOrderProduct,
    PurchaseOrderConsignee,
    PurchaseOrderAssign,
)

# Backward-compatible aliases for older import paths.
PoForm = PurchaseOrder
ProductDetailsSub = PurchaseOrderProduct
ConsigneeDetailsSub = PurchaseOrderConsignee
PoProductAssignDetails = PurchaseOrderAssign
