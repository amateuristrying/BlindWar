#!/usr/bin/env python3
"""
Static dev server that refuses to cache.

python -m http.server sends no cache headers at all, so browsers apply their
own heuristics and happily serve yesterday's index.html — which looks exactly
like "the change didn't work".
"""

import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        if '200' not in (args[1] if len(args) > 1 else ''):
            super().log_message(fmt, *args)


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    print(f'BlindWar dev server on http://0.0.0.0:{port} (no-store)')
    ThreadingHTTPServer(('0.0.0.0', port), NoCacheHandler).serve_forever()
