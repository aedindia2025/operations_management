import uuid

from django.db import connection, transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


def _rows(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _uid() -> str:
    return uuid.uuid4().hex[:18]


def _limit(value, default: int, upper: int) -> int:
    try:
        return max(1, min(int(value), upper))
    except (TypeError, ValueError):
        return default


def _request_user_unique_id(request) -> str:
    query_id = str(request.query_params.get("user_id", "") or "").strip()
    if query_id:
        return query_id

    user = getattr(request, "user", None)
    value = str(getattr(user, "unique_id", "") or "").strip()
    if value:
        return value

    body = getattr(request, "data", {}) or {}
    value = str(body.get("user_id", "") or "").strip()
    if value:
        return value

    auth_header = str(request.headers.get("Authorization", "") or "").strip()
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if token:
            return token
    return ""


def _ensure_chat_tables():
    with connection.cursor() as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS user_chat_messages (
                id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                unique_id VARCHAR(50) NOT NULL,
                sender_user_id VARCHAR(50) NOT NULL,
                recipient_user_id VARCHAR(50) NOT NULL,
                message_text TEXT NOT NULL,
                is_read TINYINT(1) NOT NULL DEFAULT 0,
                read_at DATETIME NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                KEY idx_chat_sender_recipient_created (sender_user_id, recipient_user_id, created_at),
                KEY idx_chat_recipient_read_created (recipient_user_id, is_read, created_at),
                KEY idx_chat_pair_created (sender_user_id, recipient_user_id, id),
                UNIQUE KEY uq_user_chat_unique_id (unique_id)
            )
            """
        )


def _user_exists(unique_id: str) -> bool:
    if not unique_id:
        return False
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT 1
            FROM `user`
            WHERE unique_id = %s
              AND is_delete = 0
              AND is_active = 1
            LIMIT 1
            """,
            [unique_id],
        )
        return cursor.fetchone() is not None


class ChatUserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _ensure_chat_tables()
        current_user_id = _request_user_unique_id(request)
        if not current_user_id:
            return Response({"status": False, "message": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        search = str(request.query_params.get("search", "") or "").strip()
        limit = _limit(request.query_params.get("limit"), default=250, upper=500)

        where = ["u.is_delete = 0", "u.is_active = 1", "u.unique_id <> %s"]
        params: list[object] = [current_user_id]
        if search:
            like = f"%{search}%"
            where.append(
                "("
                "COALESCE(u.staff_name, '') LIKE %s OR "
                "COALESCE(u.user_name, '') LIKE %s OR "
                "COALESCE(u.staff_id, '') LIKE %s OR "
                "COALESCE(u.email_id, '') LIKE %s"
                ")"
            )
            params.extend([like, like, like, like])

        params.append(limit)
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT
                    u.unique_id,
                    COALESCE(u.staff_name, '') AS staff_name,
                    COALESCE(u.user_name, '') AS user_name,
                    COALESCE(u.staff_id, '') AS staff_id,
                    COALESCE(u.email_id, '') AS email_id,
                    COALESCE(u.mobile_no, '') AS mobile_no,
                    COALESCE(ut.user_type, '') AS user_type
                FROM `user` u
                LEFT JOIN user_type ut
                  ON ut.unique_id = u.user_type_unique_id
                 AND ut.is_delete = 0
                WHERE {" AND ".join(where)}
                ORDER BY COALESCE(NULLIF(u.staff_name, ''), NULLIF(u.user_name, ''), u.staff_id) ASC, u.s_no DESC
                LIMIT %s
                """,
                params,
            )
            users = _rows(cursor)
        return Response({"status": True, "data": users})


class ChatConversationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _ensure_chat_tables()
        current_user_id = _request_user_unique_id(request)
        if not current_user_id:
            return Response({"status": False, "message": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        limit = _limit(request.query_params.get("limit"), default=25, upper=100)

        conversation_sql = """
            SELECT
                convo.other_user_id,
                COALESCE(u.staff_name, '') AS staff_name,
                COALESCE(u.user_name, '') AS user_name,
                COALESCE(u.staff_id, '') AS staff_id,
                COALESCE(u.email_id, '') AS email_id,
                COALESCE(u.mobile_no, '') AS mobile_no,
                COALESCE(ut.user_type, '') AS user_type,
                COALESCE(last_msg.message_text, '') AS last_message,
                COALESCE(last_msg.sender_user_id, '') AS last_sender_user_id,
                DATE_FORMAT(last_msg.created_at, '%%d-%%m-%%Y %%H:%%i') AS last_message_at,
                COALESCE(unread.unread_count, 0) AS unread_count
            FROM (
                SELECT
                    CASE
                        WHEN m.sender_user_id = %s THEN m.recipient_user_id
                        ELSE m.sender_user_id
                    END AS other_user_id,
                    MAX(m.id) AS last_message_id
                FROM user_chat_messages m
                WHERE m.sender_user_id = %s
                   OR m.recipient_user_id = %s
                GROUP BY
                    CASE
                        WHEN m.sender_user_id = %s THEN m.recipient_user_id
                        ELSE m.sender_user_id
                    END
            ) convo
            JOIN user_chat_messages last_msg
              ON last_msg.id = convo.last_message_id
            LEFT JOIN `user` u
              ON u.unique_id = convo.other_user_id
             AND u.is_delete = 0
            LEFT JOIN user_type ut
              ON ut.unique_id = u.user_type_unique_id
             AND ut.is_delete = 0
            LEFT JOIN (
                SELECT sender_user_id AS other_user_id, COUNT(*) AS unread_count
                FROM user_chat_messages
                WHERE recipient_user_id = %s
                  AND is_read = 0
                GROUP BY sender_user_id
            ) unread
              ON unread.other_user_id = convo.other_user_id
            ORDER BY last_msg.created_at DESC, last_msg.id DESC
            LIMIT %s
        """

        with connection.cursor() as cursor:
            cursor.execute(
                conversation_sql,
                [
                    current_user_id,
                    current_user_id,
                    current_user_id,
                    current_user_id,
                    current_user_id,
                    limit,
                ],
            )
            conversations = _rows(cursor)

            cursor.execute(
                """
                SELECT COUNT(*) AS unread_count
                FROM user_chat_messages
                WHERE recipient_user_id = %s
                  AND is_read = 0
                """,
                [current_user_id],
            )
            unread_total_row = _rows(cursor)

        unread_count = int((unread_total_row[0] if unread_total_row else {}).get("unread_count") or 0)
        return Response({"status": True, "data": conversations, "unread_count": unread_count})


class ChatMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        _ensure_chat_tables()
        current_user_id = _request_user_unique_id(request)
        other_user_id = str(request.query_params.get("other_user_id", "") or "").strip()
        if not current_user_id:
            return Response({"status": False, "message": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not other_user_id:
            return Response({"status": False, "message": "other_user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        limit = _limit(request.query_params.get("limit"), default=200, upper=500)

        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE user_chat_messages
                    SET is_read = 1,
                        read_at = NOW()
                    WHERE sender_user_id = %s
                      AND recipient_user_id = %s
                      AND is_read = 0
                    """,
                    [other_user_id, current_user_id],
                )
                cursor.execute(
                    """
                    SELECT
                        unique_id,
                        sender_user_id,
                        recipient_user_id,
                        message_text,
                        is_read,
                        DATE_FORMAT(created_at, '%%d-%%m-%%Y %%H:%%i') AS created_at,
                        DATE_FORMAT(read_at, '%%d-%%m-%%Y %%H:%%i') AS read_at
                    FROM user_chat_messages
                    WHERE (
                        sender_user_id = %s AND recipient_user_id = %s
                    ) OR (
                        sender_user_id = %s AND recipient_user_id = %s
                    )
                    ORDER BY id DESC
                    LIMIT %s
                    """,
                    [current_user_id, other_user_id, other_user_id, current_user_id, limit],
                )
                messages = list(reversed(_rows(cursor)))

        return Response({"status": True, "data": messages})

    def post(self, request):
        _ensure_chat_tables()
        current_user_id = _request_user_unique_id(request)
        recipient_user_id = str(request.data.get("recipient_user_id", "") or "").strip()
        message_text = str(request.data.get("message_text", "") or "").strip()

        if not current_user_id:
            return Response({"status": False, "message": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not recipient_user_id:
            return Response({"status": False, "message": "recipient_user_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        if recipient_user_id == current_user_id:
            return Response({"status": False, "message": "You cannot send messages to yourself."}, status=status.HTTP_400_BAD_REQUEST)
        if not message_text:
            return Response({"status": False, "message": "message_text is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not _user_exists(recipient_user_id):
            return Response({"status": False, "message": "Recipient not found."}, status=status.HTTP_404_NOT_FOUND)

        message_id = _uid()
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO user_chat_messages
                        (unique_id, sender_user_id, recipient_user_id, message_text, is_read, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, 0, NOW(), NOW())
                    """,
                    [message_id, current_user_id, recipient_user_id, message_text],
                )
                cursor.execute(
                    """
                    SELECT
                        unique_id,
                        sender_user_id,
                        recipient_user_id,
                        message_text,
                        is_read,
                        DATE_FORMAT(created_at, '%%d-%%m-%%Y %%H:%%i') AS created_at,
                        DATE_FORMAT(read_at, '%%d-%%m-%%Y %%H:%%i') AS read_at
                    FROM user_chat_messages
                    WHERE unique_id = %s
                    LIMIT 1
                    """,
                    [message_id],
                )
                rows = _rows(cursor)

        return Response({"status": True, "data": rows[0] if rows else None})
