"""Datawork: interactive data cleaning workspace for Petrus MDM.

Usage in notebooks:
    import datawork
    datawork.setup()  # adds backend to sys.path, loads .env
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

_setup_done = False


def setup() -> None:
    """Add backend src to sys.path and load .env for Supabase credentials.

    Can be called multiple times safely (idempotent).
    """
    global _setup_done
    if _setup_done:
        return

    # Resolve backend src path
    backend_src = os.environ.get("PETRUS_BACKEND_SRC")
    if backend_src:
        backend_src_path = Path(backend_src)
    else:
        # Default: relative to this file
        # datawork/src/datawork/__init__.py -> petrusweb/backend/src
        backend_src_path = Path(__file__).resolve().parents[3] / "backend" / "src"

    if backend_src_path.exists() and str(backend_src_path) not in sys.path:
        sys.path.insert(0, str(backend_src_path))

    # Load backend .env
    try:
        from dotenv import load_dotenv
        env_path = backend_src_path.parent / ".env"
        if env_path.exists():
            load_dotenv(env_path)
    except ImportError:
        pass

    _setup_done = True
