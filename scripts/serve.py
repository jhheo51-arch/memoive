"""Loopback-only MEMOIVE preview. Serve an explicit public asset list, never .env."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_FILES = frozenset({
    'index.html', 'self-test.html', 'app.js', 'cloud-sync.js', 'config.js', 'link-reader.js',
    'data-tools.js', 'case-studies.js', 'storage-guard.js', 'accessibility.js',
    'self-test.js', 'study-tools.js', 'sw.js', 'styles.css', 'refinement.css',
    'mobile-safety.css', 'self-test.css', 'manifest.webmanifest', 'icon.svg',
    'insight-tools.js', 'insight-contract.js', 'insight-context.js',
})


class AppHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        route = unquote(urlsplit(self.path).path)
        name = 'index.html' if route == '/' else route.removeprefix('/')
        if name not in PUBLIC_FILES or (Path(self.directory) / name).is_symlink():
            self.send_error(404, 'Not found')
            return None
        self.path = '/' + name
        return super().send_head()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()

    def log_message(self, format, *args):
        pass  # Avoid logging URLs, which may include private shared text.


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=4182)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(AppHandler, directory=str(ROOT)))
    print(f'MEMOIVE preview: http://127.0.0.1:{server.server_port}/ (Ctrl+C to stop)', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
