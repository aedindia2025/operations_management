"""
ASGI config for otm_project project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os
import sys
from pathlib import Path

import pymysql
from django.core.asgi import get_asgi_application

BASE_DIR = Path(__file__).resolve().parent.parent
LOCAL_DEPS = BASE_DIR / ".deps"
if LOCAL_DEPS.exists():
    sys.path.insert(0, str(LOCAL_DEPS))

pymysql.version_info = (2, 2, 1, "final", 0)
pymysql.__version__ = "2.2.1"
pymysql.install_as_MySQLdb()

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'otm_project.settings')

application = get_asgi_application()
