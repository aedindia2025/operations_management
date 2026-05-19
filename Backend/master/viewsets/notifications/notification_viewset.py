from django.db import connection
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from master.viewsets.Payment_Transaction_Form.payment_viewset import _get_request_user_id


def _rows(cursor):
    cols = [col[0] for col in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]


def _ensure_payment_notification_table():
    with connection.cursor() as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS payment_transaction_notifications (
                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                unique_id VARCHAR(50) NOT NULL,
                recipient_user_id VARCHAR(50) NOT NULL,
                bill_no VARCHAR(100) NOT NULL,
                notification_type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                source_module VARCHAR(100) NOT NULL DEFAULT 'payment_transaction',
                source_path VARCHAR(255) NOT NULL DEFAULT '',
                is_read TINYINT(1) NOT NULL DEFAULT 0,
                created_by VARCHAR(50) NOT NULL DEFAULT '',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                read_at DATETIME NULL,
                KEY idx_payment_notification_recipient (recipient_user_id, is_read, created_at),
                KEY idx_payment_notification_bill (bill_no),
                UNIQUE KEY uq_payment_notification_unique_id (unique_id)
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS payment_transaction_notification_reads (
                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                notification_unique_id VARCHAR(50) NOT NULL,
                user_id VARCHAR(50) NOT NULL,
                read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_payment_notification_read (notification_unique_id, user_id),
                KEY idx_payment_notification_read_user (user_id, read_at)
            )
            """
        )


class PaymentNotificationView(APIView):
    def get(self, request):
        _ensure_payment_notification_table()
        user_id = str(request.query_params.get("user_id", "") or _get_request_user_id(request)).strip()
        user_type = str(request.query_params.get("user_type", "") or "").strip()
        if not user_id:
            return Response({"status": False, "message": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not user_type:
            return Response({"status": False, "message": "user_type is required."}, status=status.HTTP_400_BAD_REQUEST)

        limit = request.query_params.get("limit", "10").strip()
        try:
            limit_value = max(1, min(int(limit), 50))
        except ValueError:
            limit_value = 10

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    n.unique_id,
                    n.recipient_user_id,
                    n.bill_no,
                    n.notification_type,
                    n.title,
                    n.message,
                    n.source_module,
                    n.source_path,
                    CASE WHEN r.id IS NULL THEN 0 ELSE 1 END AS is_read,
                    COALESCE(n.created_by, '') AS created_by,
                    DATE_FORMAT(n.created_at, '%%d-%%m-%%Y %%H:%%i') AS created_at,
                    DATE_FORMAT(r.read_at, '%%d-%%m-%%Y %%H:%%i') AS read_at
                FROM payment_transaction_notifications n
                LEFT JOIN payment_transaction_notification_reads r
                  ON r.notification_unique_id = n.unique_id
                 AND r.user_id = %s
                WHERE n.recipient_user_id = %s
                  AND n.notification_type IN ('payment_completed', 'consignee_updated')
                ORDER BY CASE WHEN r.id IS NULL THEN 0 ELSE 1 END ASC, n.created_at DESC, n.id DESC
                LIMIT %s
                """,
                [user_id, user_type, limit_value],
            )
            notifications = _rows(cursor)

            cursor.execute(
                """
                SELECT COUNT(*) AS unread_count
                FROM payment_transaction_notifications n
                LEFT JOIN payment_transaction_notification_reads r
                  ON r.notification_unique_id = n.unique_id
                 AND r.user_id = %s
                WHERE n.recipient_user_id = %s
                  AND n.notification_type IN ('payment_completed', 'consignee_updated')
                  AND r.id IS NULL
                """,
                [user_id, user_type],
            )
            unread_row = _rows(cursor)
        unread_count = int((unread_row[0] if unread_row else {}).get("unread_count") or 0)
        return Response({"status": True, "data": notifications, "unread_count": unread_count})

    def post(self, request):
        _ensure_payment_notification_table()
        action = str(request.data.get("action", "") or "").strip().lower()
        user_id = str(request.data.get("user_id", "") or _get_request_user_id(request)).strip()
        user_type = str(request.data.get("user_type", "") or "").strip()
        if not user_id:
            return Response({"status": False, "message": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        if action == "mark_read":
            notification_id = str(request.data.get("notification_id", "") or "").strip()
            if not notification_id:
                return Response({"status": False, "message": "notification_id is required."}, status=status.HTTP_400_BAD_REQUEST)

            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO payment_transaction_notification_reads
                        (notification_unique_id, user_id, read_at)
                    VALUES (%s, %s, NOW())
                    ON DUPLICATE KEY UPDATE read_at = VALUES(read_at)
                    """,
                    [notification_id, user_id],
                )

            return Response({"status": True, "message": "Notification marked as read."})

        if action == "mark_all_read":
            if not user_type:
                return Response({"status": False, "message": "user_type is required."}, status=status.HTTP_400_BAD_REQUEST)
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO payment_transaction_notification_reads
                        (notification_unique_id, user_id, read_at)
                    SELECT n.unique_id, %s, NOW()
                    FROM payment_transaction_notifications n
                    LEFT JOIN payment_transaction_notification_reads r
                      ON r.notification_unique_id = n.unique_id
                     AND r.user_id = %s
                    WHERE n.recipient_user_id = %s
                      AND n.notification_type IN ('payment_completed', 'consignee_updated')
                      AND r.id IS NULL
                    """,
                    [user_id, user_id, user_type],
                )

            return Response({"status": True, "message": "All notifications marked as read."})

        if action == "mark_read_by_bill":
            bill_no = str(request.data.get("bill_no", "") or "").strip()
            if not bill_no:
                return Response({"status": False, "message": "bill_no is required."}, status=status.HTTP_400_BAD_REQUEST)

            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO payment_transaction_notification_reads
                        (notification_unique_id, user_id, read_at)
                    SELECT n.unique_id, %s, NOW()
                    FROM payment_transaction_notifications n
                    LEFT JOIN payment_transaction_notification_reads r
                      ON r.notification_unique_id = n.unique_id
                     AND r.user_id = %s
                    WHERE n.bill_no = %s
                      AND n.notification_type = 'payment_completed'
                      AND r.id IS NULL
                    """,
                    [user_id, user_id, bill_no],
                )

            return Response({"status": True, "message": "Bill notification marked as read."})

        return Response({"status": False, "message": "Invalid action."}, status=status.HTTP_400_BAD_REQUEST)
