import copy
import re
import threading
from contextlib import contextmanager
from pathlib import Path

from django.conf import settings
from django.db import connections


_state = threading.local()
TOKEN_SEPARATOR = ":"


def normalize_company_code(value):
    return str(value or "").strip().upper().replace(" ", "-")


def make_tenant_token(company_code, actor_token):
    code = normalize_company_code(company_code)
    token = str(actor_token or "").strip()
    if not code or not token:
        return token
    return f"{code}{TOKEN_SEPARATOR}{token}"


def split_tenant_token(token):
    token = str(token or "").strip()
    if TOKEN_SEPARATOR not in token:
        return "", token
    company_code, actor_token = token.split(TOKEN_SEPARATOR, 1)
    return normalize_company_code(company_code), actor_token.strip()


def tenant_database_name(company):
    explicit_name = str(getattr(company, "db_name", "") or "").strip()
    if explicit_name:
        return _safe_database_name(explicit_name)
    return _safe_database_name(settings.DATABASES["master"]["NAME"])


def _safe_database_name(db_name):
    if not re.match(r"^[A-Za-z0-9_]+$", db_name or ""):
        raise ValueError("Database name may contain only letters, numbers, and underscore.")
    return db_name


def tenant_database_settings(company):
    db_settings = copy.deepcopy(settings.DATABASES["master"])
    db_settings["NAME"] = tenant_database_name(company)
    db_settings["HOST"] = str(getattr(company, "db_host", "") or db_settings.get("HOST") or "")
    db_settings["PORT"] = str(getattr(company, "db_port", "") or db_settings.get("PORT") or "")
    db_settings["USER"] = str(getattr(company, "db_user", "") or db_settings.get("USER") or "")
    password = str(getattr(company, "db_password", "") or "")
    if password:
        db_settings["PASSWORD"] = password
    return db_settings


def register_tenant_database(company):
    alias = f"tenant_{normalize_company_code(company.company_code).lower().replace('-', '_')}"
    connections.databases[alias] = tenant_database_settings(company)
    return alias


def _copy_database_settings(source):
    return copy.deepcopy(source)


@contextmanager
def use_default_database(db_settings):
    default = connections["default"]
    previous = _copy_database_settings(default.settings_dict)
    default.close()
    default.settings_dict = _copy_database_settings(db_settings)
    try:
        yield
    finally:
        default.close()
        default.settings_dict = previous


@contextmanager
def use_company_database(company):
    yield_settings = tenant_database_settings(company)
    with use_default_database(yield_settings):
        yield


def _split_sql_statements(sql):
    statements = []
    current = []
    quote = ""
    escaped = False
    for char in sql:
        current.append(char)
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = ""
            continue
        if char in ("'", '"', "`"):
            quote = char
            continue
        if char == ";":
            statement = "".join(current).strip()
            if statement:
                statements.append(statement[:-1].strip())
            current = []
    tail = "".join(current).strip()
    if tail:
        statements.append(tail)
    return statements


def _split_mysql_script_statements(sql):
    statements = []
    current = []
    delimiter = ";"
    quote = ""
    escaped = False

    for raw_line in sql.splitlines(keepends=True):
        stripped_line = raw_line.strip()
        if not quote and stripped_line.upper().startswith("DELIMITER "):
            tail = "".join(current).strip()
            if tail:
                statements.append(tail)
                current = []
            delimiter = stripped_line.split(None, 1)[1]
            continue

        current.append(raw_line)
        index = 0
        while index < len(raw_line):
            char = raw_line[index]
            if quote:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == quote:
                    quote = ""
                index += 1
                continue
            if char in ("'", '"', "`"):
                quote = char
                index += 1
                continue
            if delimiter and raw_line.startswith(delimiter, index):
                current[-1] = raw_line[:index]
                statement = "".join(current).strip()
                if statement:
                    statements.append(statement)
                current = []
                remainder = raw_line[index + len(delimiter) :]
                if remainder.strip():
                    current.append(remainder)
                break
            index += 1

    tail = "".join(current).strip()
    if tail:
        statements.append(tail)
    return statements


def _clean_schema_sql(sql):
    sql = re.sub(r"DEFINER=`[^`]+`@`[^`]+`", "", sql)
    return sql


def _clean_routine_sql(sql):
    sql = re.sub(r"DEFINER=`[^`]+`@`[^`]+`", "", sql)
    sql = re.sub(r"^CREATE\s+", "CREATE ", sql, flags=re.IGNORECASE)
    return sql


def _routine_drop_statement(statement):
    match = re.search(
        r"\bCREATE\s+(?:OR\s+REPLACE\s+)?(?:DEFINER\s*=\s*`?[^`\s]+`?@`?[^`\s]+`?\s+)?"
        r"(FUNCTION|PROCEDURE)\s+`?([A-Za-z0-9_]+)`?",
        statement,
        flags=re.IGNORECASE,
    )
    if not match:
        return None
    routine_type, routine_name = match.groups()
    return f"DROP {routine_type.upper()} IF EXISTS `{routine_name}`"


def _is_create_view_statement(statement):
    normalized = statement.lstrip().upper()
    return normalized.startswith("CREATE") and " VIEW " in normalized


def _is_view_statement(statement):
    normalized = statement.lstrip().upper()
    return (
        normalized.startswith("DROP VIEW")
        or _is_create_view_statement(statement)
        or " CREATE VIEW " in normalized
    )


def create_database_if_missing(db_name):
    with connections["master"].cursor() as cursor:
        cursor.execute(
            f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci"
        )


def copy_master_routines_to_tenant(cursor):
    master_db = settings.DATABASES["master"]["NAME"]
    with connections["master"].cursor() as master_cursor:
        for routine_type in ("FUNCTION", "PROCEDURE"):
            master_cursor.execute(
                """
                SELECT ROUTINE_NAME
                FROM information_schema.ROUTINES
                WHERE ROUTINE_SCHEMA = %s AND ROUTINE_TYPE = %s
                ORDER BY ROUTINE_NAME
                """,
                [master_db, routine_type],
            )
            routine_names = [row[0] for row in master_cursor.fetchall()]

            for routine_name in routine_names:
                master_cursor.execute(f"SHOW CREATE {routine_type} `{master_db}`.`{routine_name}`")
                row = master_cursor.fetchone()
                create_sql = _clean_routine_sql(row[2])
                cursor.execute(f"DROP {routine_type} IF EXISTS `{routine_name}`")
                cursor.execute(create_sql)


def load_routine_sql_files(cursor):
    for routine_path in getattr(settings, "TENANT_ROUTINE_SQL_PATHS", []):
        path = Path(routine_path)
        if not path.exists():
            raise FileNotFoundError(f"Tenant routine SQL file not found: {path}")

        sql = _clean_routine_sql(path.read_text(encoding="utf-8"))
        for statement in _split_mysql_script_statements(sql):
            drop_statement = _routine_drop_statement(statement)
            if drop_statement:
                cursor.execute(drop_statement)
            cursor.execute(statement)


def copy_master_triggers_to_tenant(cursor):
    master_db = settings.DATABASES["master"]["NAME"]
    with connections["master"].cursor() as master_cursor:
        master_cursor.execute(
            """
            SELECT TRIGGER_NAME
            FROM information_schema.TRIGGERS
            WHERE TRIGGER_SCHEMA = %s
            ORDER BY TRIGGER_NAME
            """,
            [master_db],
        )
        trigger_names = [row[0] for row in master_cursor.fetchall()]

        for trigger_name in trigger_names:
            master_cursor.execute(f"SHOW CREATE TRIGGER `{master_db}`.`{trigger_name}`")
            row = master_cursor.fetchone()
            create_sql = _clean_routine_sql(row[2])
            cursor.execute(f"DROP TRIGGER IF EXISTS `{trigger_name}`")
            cursor.execute(create_sql)


def copy_master_events_to_tenant(cursor):
    master_db = settings.DATABASES["master"]["NAME"]
    with connections["master"].cursor() as master_cursor:
        master_cursor.execute(
            """
            SELECT EVENT_NAME
            FROM information_schema.EVENTS
            WHERE EVENT_SCHEMA = %s
            ORDER BY EVENT_NAME
            """,
            [master_db],
        )
        event_names = [row[0] for row in master_cursor.fetchall()]

        for event_name in event_names:
            master_cursor.execute(f"SHOW CREATE EVENT `{master_db}`.`{event_name}`")
            row = master_cursor.fetchone()
            create_sql = _clean_routine_sql(row[3])
            cursor.execute(f"DROP EVENT IF EXISTS `{event_name}`")
            cursor.execute(create_sql)


def load_schema_into_database(company):
    schema_path = Path(settings.TENANT_SCHEMA_SQL_PATH)
    if not schema_path.exists():
        raise FileNotFoundError(f"Tenant schema file not found: {schema_path}")

    alias = register_tenant_database(company)
    sql = _clean_schema_sql(schema_path.read_text(encoding="utf-8"))
    statements = _split_sql_statements(sql)
    copied_routines = False
    deferred_views = []
    with connections[alias].cursor() as cursor:
        for statement in statements:
            if statement:
                if not copied_routines and _is_view_statement(statement):
                    copy_master_routines_to_tenant(cursor)
                    load_routine_sql_files(cursor)
                    copied_routines = True
                try:
                    cursor.execute(statement)
                except Exception:
                    if _is_create_view_statement(statement):
                        deferred_views.append(statement)
                    else:
                        raise

        remaining = deferred_views
        while remaining:
            failed = []
            for statement in remaining:
                try:
                    cursor.execute(statement)
                except Exception as exc:
                    failed.append((statement, exc))

            if len(failed) == len(remaining):
                raise failed[0][1]
            remaining = [statement for statement, _exc in failed]

        if not copied_routines:
            copy_master_routines_to_tenant(cursor)
            load_routine_sql_files(cursor)
        copy_master_triggers_to_tenant(cursor)
        copy_master_events_to_tenant(cursor)
        ensure_tenant_registry_columns(cursor)


def ensure_tenant_registry_columns(cursor):
    columns = {
        "db_name": "varchar(100) NOT NULL DEFAULT ''",
        "db_host": "varchar(150) NOT NULL DEFAULT ''",
        "db_port": "varchar(10) NOT NULL DEFAULT ''",
        "db_user": "varchar(100) NOT NULL DEFAULT ''",
        "db_password": "varchar(255) NOT NULL DEFAULT ''",
    }
    cursor.execute("SHOW COLUMNS FROM `tenant_company`")
    existing = {row[0] for row in cursor.fetchall()}
    for column, definition in columns.items():
        if column not in existing:
            cursor.execute(f"ALTER TABLE `tenant_company` ADD COLUMN `{column}` {definition}")


def provision_company_database(company):
    db_name = tenant_database_name(company)
    create_database_if_missing(db_name)
    load_schema_into_database(company)
    return db_name


class TenantDatabaseMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from master.apps.tenant.tenantmodel import TenantCompany

        auth_header = request.headers.get("Authorization", "")
        token = auth_header.replace("Bearer", "", 1).strip() if auth_header.startswith("Bearer") else ""
        company_code, _actor_token = split_tenant_token(token)
        if not company_code:
            company_code = normalize_company_code(request.headers.get("X-Company-Code"))

        company = None
        if company_code:
            company = (
                TenantCompany.objects.using("master")
                .filter(company_code=company_code, is_delete=0, is_active=1)
                .first()
            )

        if not company:
            return self.get_response(request)

        request.tenant_company = company
        request.tenant_db_name = tenant_database_name(company)
        _state.company = company
        with use_company_database(company):
            try:
                return self.get_response(request)
            finally:
                _state.company = None
