#!/usr/bin/env python3
"""Simple HTTP server for the live webinar room on port 8000"""

import http.server
import socketserver
import os

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving live webinar room at http://0.0.0.0:{PORT}")
        print(f"Access from mobile: http://192.168.1.242:{PORT}")
        httpd.serve_forever()
