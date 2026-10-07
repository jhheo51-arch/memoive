"""Loopback-only MEMOIVE preview. Serve an explicit public asset list, never .env."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
FRONTEND_JS = {
    'accessibility.js', 'analytics-tools.js', 'analytics-ui.js', 'app.js', 'auto-summary.js',
    'case-studies.js', 'cloud-sync.js', 'config.js', 'creator-scroll.js', 'data-tools.js',
    'detail-navigation.js', 'evidence-tools.js', 'evidence-ui.js', 'insight-context.js',
    'insight-contract.js', 'insight-tools.js', 'link-reader.js', 'record-delete.js',
    'record-original.js', 'record-ownership.js', 'reuse-tools.js', 'reuse-ui.js',
    'six-part-analysis.js', 'storage-guard.js', 'study-tools.js', 'thought-writing.js',
    'writing-paths.js',
}
FRONTEND_CSS = {
    'analytics.css', 'mobile-safety.css', 'refinement.css', 'reuse.css',
    'six-part-analysis.css', 'styles.css', 'thought-writing.css', 'writing-paths.css',
}
PUBLIC_FILES = frozenset({
    'index.html', 'sw.js', 'manifest.webmanifest', 'assets/icon.svg',
    'tools/self-test/index.html', 'tools/self-test/self-test.css', 'tools/self-test/self-test.js',
    *(f'frontend/js/{name}' for name in FRONTEND_JS),
    *(f'frontend/css/{name}' for name in FRONTEND_CSS),
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
