from django.db import connections
import json

conn = connections['default']
with conn.cursor() as cur:
    cur.execute(
        """
        SELECT unique_id, po_num, invoice_no, dc_number, ac_team_verifiy_status, material_qc,
               doc_approval_sts, dispatch_status, is_delete, approved_by, material_qc_approved
        FROM invoice_creation_main
        WHERE po_num = %s
           OR unique_id IN (SELECT form_main_unique_id FROM po_form WHERE po_num = %s)
        LIMIT 10
        """,
        ['PO-COE-2603-0003', 'PO-COE-2603-0003'],
    )
    rows = cur.fetchall()
    cols = [col[0] for col in cur.description]
    print(json.dumps([dict(zip(cols, row)) for row in rows], default=str, indent=2))
