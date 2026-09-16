"""Vercel serverless entrypoint.

The Python runtime detects the ASGI `app` object exported here and routes
requests to it. The repository root must be importable so `backend/` and
`model/` resolve inside the function bundle.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.main import app  # noqa: E402
