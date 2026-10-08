"""
Development server for sample.html.

It does two jobs:
  1. Serves the package files, like `python3 -m http.server` would.
  2. Pretends to be the CRM's submission API (POST /api/startup-report), so
     "Submit for review", "Approve" and "Reject" can be tried end to end.

Run it from this folder:
    python3 dev-server.py          (port 8080)
    python3 dev-server.py 8765     (any other port)

Then open http://localhost:8080/sample.html

This is for local testing only. In production the CRM provides the real API.
"""

import json
import os
import sys
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

SUBMISSION_PATH = "/api/startup-report"  # must match "submission.url" in the sample JSON


class DevRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Make the browser check for a newer copy every time, so edits to the
        # JSON or code show up on the next reload.
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def do_GET(self):
        # Browsers ask for part of a video ("Range: bytes=…") to jump to a point in it.
        # The standard handler always sends the whole file, so seeking would not work.
        range_header = self.headers.get("Range", "")
        path = self.translate_path(self.path)
        if not range_header.startswith("bytes=") or not os.path.isfile(path):
            super().do_GET()
            return

        size = os.path.getsize(path)
        start_text, _, end_text = range_header[len("bytes="):].split(",")[0].partition("-")
        if start_text:
            start, end = int(start_text), int(end_text) if end_text else size - 1
        else:  # "bytes=-500" means the last 500 bytes
            start, end = max(0, size - int(end_text)), size - 1
        end = min(end, size - 1)
        if start > end:
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.end_headers()
            return

        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        with open(path, "rb") as file:
            file.seek(start)
            self.wfile.write(file.read(end - start + 1))

    def do_POST(self):
        if self.path.split("?")[0] != SUBMISSION_PATH:
            self.send_error(404, "Only POST " + SUBMISSION_PATH + " is supported by the dev server")
            return

        length = int(self.headers.get("Content-Length", 0))
        try:
            report = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            self.send_error(400, "Body is not valid JSON")
            return

        print(
            f"Received report '{report.get('formId')}' "
            f"with status '{report.get('reportStatus')}' "
            f"({len(report.get('values', {}))} values)",
            flush=True,
        )

        reply = json.dumps({
            "ok": True,
            "receivedAt": datetime.now(timezone.utc).isoformat(),
            "reportStatus": report.get("reportStatus"),
        }).encode("utf-8")

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(reply)))
        self.end_headers()
        self.wfile.write(reply)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    print(f"Serving on http://localhost:{port}/sample.html  (Ctrl+C to stop)", flush=True)
    ThreadingHTTPServer(("", port), DevRequestHandler).serve_forever()
