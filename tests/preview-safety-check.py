"""Synthetic HTTP checks; never read actual .env files or call Gemini."""
from functools import partial
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from pathlib import Path
import runpy
import threading

preview = runpy.run_path(str(Path(__file__).resolve().parents[1] / 'scripts' / 'serve.py'))
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(preview['AppHandler'], directory=str(preview['ROOT'])))
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
checks = 0
try:
    for path, expected in [('/', 200), ('/frontend/js/app.js?v=test', 200), ('/tools/self-test/index.html', 200),
                           ('/frontend/js/insight-tools.js', 200), ('/frontend/js/insight-contract.js', 200), ('/frontend/js/insight-context.js', 200),
                           ('/.env', 404), ('/%2eenv', 404), ('/.env.example', 404),
                           ('/../.env', 404), ('/docs/', 404),
                           ('/app.js', 404), ('/self-test.html', 404),
                           ('/cloudflare-worker/src/index.js', 404), ('/scripts/serve.py', 404)]:
        for method in ('GET', 'HEAD'):
            connection = HTTPConnection('127.0.0.1', server.server_port, timeout=5)
            connection.request(method, path)
            response = connection.getresponse()
            assert response.status == expected, (method, path, response.status)
            assert response.getheader('Cache-Control') == 'no-store'
            response.read()
            connection.close()
            checks += 1
    print(f'PASS: {checks} local preview allowlist checks; no real credentials inspected.')
finally:
    server.shutdown()
    server.server_close()
    thread.join(timeout=5)
