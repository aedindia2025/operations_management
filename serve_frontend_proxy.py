from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib import request as urlrequest
from urllib.error import HTTPError
import os


DIST_DIR = Path(r"R:\otm\frontend\dist")
BACKEND = "http://127.0.0.1:7000"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST_DIR), **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/"):
            return self.proxy()
        target = DIST_DIR / self.path.lstrip("/")
        if self.path == "/" or not target.exists():
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/"):
            return self.proxy()
        self.send_error(404)

    def do_PUT(self):
        if self.path.startswith("/api/"):
            return self.proxy()
        self.send_error(404)

    def do_PATCH(self):
        if self.path.startswith("/api/"):
            return self.proxy()
        self.send_error(404)

    def do_DELETE(self):
        if self.path.startswith("/api/"):
            return self.proxy()
        self.send_error(404)

    def proxy(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        body = self.rfile.read(length) if length else None
        headers = {key: value for key, value in self.headers.items() if key.lower() != "host"}
        req = urlrequest.Request(
            f"{BACKEND}{self.path}",
            data=body,
            headers=headers,
            method=self.command,
        )
        try:
            with urlrequest.urlopen(req, timeout=300) as resp:
                self.send_response(resp.status)
                for key, value in resp.headers.items():
                    if key.lower() not in {"transfer-encoding", "connection"}:
                        self.send_header(key, value)
                self.end_headers()
                self.wfile.write(resp.read())
        except HTTPError as exc:
            self.send_response(exc.code)
            for key, value in exc.headers.items():
                if key.lower() not in {"transfer-encoding", "connection"}:
                    self.send_header(key, value)
            self.end_headers()
            self.wfile.write(exc.read())


if __name__ == "__main__":
    os.chdir(DIST_DIR)
    ThreadingHTTPServer(("0.0.0.0", 5173), Handler).serve_forever()
