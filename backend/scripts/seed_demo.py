from __future__ import annotations

# ruff: noqa: E402
import sys
from collections.abc import Sequence
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.seeds.demo_seed import main as seed_main


def main(argv: Sequence[str] | None = None) -> int:
    return seed_main(argv)


if __name__ == "__main__":
    raise SystemExit(main())
