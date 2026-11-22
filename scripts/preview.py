"""Preview the lab and its sibling personal website on one loopback address."""
import argparse
import io
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

LAB = Path(__file__).resolve().parents[1]
PERSONAL = LAB.parent / "bzbarrett.github.io"
PERSONAL_URL = "https://bzbarrett.github.io/"
LAB_URL = "https://grind-lab-core.github.io/grind-lab-website/"


class Preview(SimpleHTTPRequestHandler):
    def send_head(self):
        path = unquote(urlsplit(self.path).path)
        if path == "/personal":
            self.send_response(301)
            self.send_header("Location", "/personal/")
            self.end_headers()
            return None

        personal = path.startswith("/personal/")
        root = PERSONAL if personal else LAB
        relative = path[len("/personal/"):] if personal else path.lstrip("/")
        if path.endswith("/"):
            relative += "index.html"
        parts = Path(relative).parts
        if not parts or any(part.startswith(".") for part in parts):
            return self.send_error(404)
        if parts[0] not in {"assets", "css", "js", "images", "data"} and not (len(parts) == 1 and relative.endswith(".html")):
            return self.send_error(404)
        target = (root / relative).resolve()
        if root not in target.parents or not target.is_file():
            return self.send_error(404)

        if target.suffix == ".html":
            html = target.read_text(encoding="utf-8")
            if (PERSONAL / "index.html").is_file():
                html = html.replace(f'href="{PERSONAL_URL}', 'href="/personal/')
                html = html.replace(f'href="{LAB_URL}', 'href="/')
            body = html.encode("utf-8")
            stream, size = io.BytesIO(body), len(body)
        else:
            stream, size = target.open("rb"), target.stat().st_size

        self.send_response(200)
        self.send_header("Content-Type", self.guess_type(str(target)))
        self.send_header("Content-Length", str(size))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        return stream


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=5500)
    port = parser.parse_args().port
    with ThreadingHTTPServer(("127.0.0.1", port), Preview) as server:
        print(f"GRIND Lab: http://127.0.0.1:{port}/", flush=True)
        if (PERSONAL / "index.html").is_file():
            print(f"Bing Zhou: http://127.0.0.1:{port}/personal/", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
