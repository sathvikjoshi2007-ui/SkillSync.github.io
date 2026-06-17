"""Console setup helpers for Windows-friendly UTF-8 output."""

import sys


def configure_utf8_output():
    """Allow emoji and box-drawing output on Windows consoles."""
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
