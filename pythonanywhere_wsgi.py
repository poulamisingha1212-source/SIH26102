"""PythonAnywhere WSGI entrypoint for the FastAPI application."""

import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

os.environ.setdefault("ENVIRONMENT", "production")

from a2wsgi import ASGIMiddleware
from backend.main import app

application = ASGIMiddleware(app)