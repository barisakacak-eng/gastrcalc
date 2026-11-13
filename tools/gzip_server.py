"""Kleiner Datei-Server, der Text-Dateien gzip-komprimiert ausliefert – so wie GitHub Pages es tut.
Nur zum Messen (tools/startmessung.py --url http://127.0.0.1:<port>/index.html). Aufruf: python3 tools/gzip_server.py 9061"""
import gzip, http.server, os, pathlib, sys

APP = pathlib.Path(__file__).resolve().parent.parent
TEXT = (".js", ".mjs", ".css", ".html", ".svg", ".json", ".webmanifest", ".txt")
_merk = {}


class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

    def do_GET(self):
        pfad = self.translate_path(self.path)
        if os.path.isdir(pfad): pfad = os.path.join(pfad, "index.html")
        if pfad.endswith(TEXT) and os.path.isfile(pfad) and "gzip" in self.headers.get("Accept-Encoding", ""):
            st = os.stat(pfad); key = (pfad, st.st_mtime_ns)
            if key not in _merk: _merk[key] = gzip.compress(pathlib.Path(pfad).read_bytes(), 6)
            daten = _merk[key]
            self.send_response(200)
            self.send_header("Content-Type", self.guess_type(pfad))
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Content-Length", str(len(daten)))
            self.end_headers(); self.wfile.write(daten); return
        return super().do_GET()


if __name__ == "__main__":
    os.chdir(APP)
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 9061
    http.server.ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
