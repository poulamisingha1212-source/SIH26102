"""
Config loader for the multi-agent risk engine.

Reads model/config.yaml once and caches the result.  Falls back to an
empty dict if PyYAML is not installed or the file is missing — every
consumer supplies its own sensible defaults.
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_cache: dict | None = None


def get_config() -> dict[str, Any]:
    """Return the parsed config.yaml, loading it on first call."""
    global _cache
    if _cache is not None:
        return _cache

    config_path = Path(__file__).parent / 'config.yaml'
    if not config_path.exists():
        logger.warning("model/config.yaml not found — using built-in defaults.")
        _cache = {}
        return _cache

    try:
        import yaml  # type: ignore[import]
        with open(config_path, 'r', encoding='utf-8') as f:
            _cache = yaml.safe_load(f) or {}
    except ImportError:
        logger.warning(
            "PyYAML not installed; model/config.yaml ignored. "
            "Install 'pyyaml' to enable config-file tuning."
        )
        _cache = {}
    except Exception as exc:
        logger.error("Failed to load model/config.yaml: %s", exc)
        _cache = {}

    return _cache
