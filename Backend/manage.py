#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
BACKEND_SITE_PACKAGES = BASE_DIR / ".venv" / "Lib" / "site-packages"
LOCAL_DEPS = BASE_DIR / ".deps"

for dependency_path in (BACKEND_SITE_PACKAGES, LOCAL_DEPS):
    if dependency_path.exists():
        sys.path.insert(0, str(dependency_path))

import pymysql
pymysql.version_info = (2, 2, 1, "final", 0)
pymysql.__version__ = "2.2.1"
pymysql.install_as_MySQLdb()

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'otm_project.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django."
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
