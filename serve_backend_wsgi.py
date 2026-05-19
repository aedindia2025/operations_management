import os
import sys
from pathlib import Path
from socketserver import ThreadingMixIn
from wsgiref.simple_server import make_server
from wsgiref.simple_server import WSGIServer


sys.path.insert(0, str(Path(r"R:\otm\Backend")))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "otm_project.settings")

from django.core.wsgi import get_wsgi_application


application = get_wsgi_application()


class ThreadingWSGIServer(ThreadingMixIn, WSGIServer):
    daemon_threads = True


if __name__ == "__main__":
    server = make_server("0.0.0.0", 7000, application, server_class=ThreadingWSGIServer)
    print("Backend WSGI server listening on http://0.0.0.0:7000", flush=True)
    server.serve_forever()
