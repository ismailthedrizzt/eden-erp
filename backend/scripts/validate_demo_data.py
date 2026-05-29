from __future__ import annotations

# ruff: noqa: E402
import argparse
import asyncio
import json
import sys
from collections.abc import Sequence
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.seeds.demo_data.common import DEMO_TENANT_ID
from app.seeds.demo_seed import validate_demo_data


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate Eden ERP demo/pilot data.")
    parser.add_argument("--tenant-id", default=DEMO_TENANT_ID)
    parser.add_argument("--strict", action="store_true")
    return parser.parse_args(argv)


async def async_main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    result = await validate_demo_data(str(args.tenant_id))
    print(json.dumps(result, indent=2, ensure_ascii=False, default=str))
    if args.strict and result.get("status") not in {"pass", "not_configured"}:
        return 1
    return 0


def main(argv: Sequence[str] | None = None) -> int:
    return asyncio.run(async_main(argv))


if __name__ == "__main__":
    raise SystemExit(main())
