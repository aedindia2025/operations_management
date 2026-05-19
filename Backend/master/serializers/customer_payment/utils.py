"""
utils.py
Utility helpers that mirror the PHP helper functions used in the original code.
"""
from datetime import date
import os
import re


# ─── Indian number format  (mirrors PHP indian_format()) ──────────────────────

def indian_format(value) -> str:
    """
    Format a number in Indian numbering style.
    e.g.  1234567.89  →  "12,34,567"   (no decimals for integer-rounded values)
    """
    try:
        num = round(float(value))
    except (TypeError, ValueError):
        return str(value)

    is_negative = num < 0
    num = abs(num)

    s = str(num)
    last_three = s[-3:]
    rest = s[:-3]

    if rest:
        last_three = "," + last_three

    # Indian grouping: every 2 digits for the rest
    rest = re.sub(r"\B(?=(\d{2})+(?!\d))", ",", rest)
    result = rest + last_three
    return ("-" + result) if is_negative else result


# ─── Financial year  (mirrors PHP getFinancialYeardate()) ─────────────────────

def get_financial_year(d: date | None = None) -> str:
    """
    Returns the Indian financial year string for a given date.
    e.g.  date(2024, 7, 15)  →  "2024-25"
          date(2024, 1, 15)  →  "2023-24"
    """
    if d is None:
        d = date.today()
    if d.month >= 4:
        return f"{d.year}-{str(d.year + 1)[2:]}"
    return f"{d.year - 1}-{str(d.year)[2:]}"


# ─── Date display  (mirrors PHP disdate()) ────────────────────────────────────

def disdate(d) -> str:
    """
    Convert a date object or ISO string (YYYY-MM-DD) to DD-MM-YYYY.
    """
    if not d:
        return ""
    if isinstance(d, date):
        return d.strftime("%d-%m-%Y")
    # string
    parts = str(d).split("-")
    if len(parts) == 3:
        return "-".join(reversed(parts))
    return str(d)


# ─── Safe PDF filename  (mirrors PHP name logic) ──────────────────────────────

def make_payment_pdf_name(my_inv_no: str) -> str:
    """
    Reproduce the PHP logic:
        $parts = explode('/', $myinv_no);
        $myinv_no_value = end($parts);
        $tem_name = "Payment-" . $myinv_no_value . '.pdf';
    """
    parts = my_inv_no.split("/")
    last_part = parts[-1] if parts else my_inv_no
    return f"Payment-{last_part}.pdf"


# ─── Upload path ──────────────────────────────────────────────────────────────

PAYMENT_UPLOAD_DIR = "uploads/payment"


def payment_upload_path(filename: str) -> str:
    return os.path.join(PAYMENT_UPLOAD_DIR, filename)