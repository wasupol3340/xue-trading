"""
Standalone autonomous trading worker for the Windows MT5 host.

Use this when your FastAPI backend runs on Linux/Docker (which cannot execute
the Windows-only MetaTrader5 library). Run this file on a Windows VPS that has
the MT5 terminal installed and logged in:

    python -m app.worker

It connects to MT5, arms the AutoTrader, and runs the meeting + management
loops in-process — no web server required. Configure via the same .env.

Stop with Ctrl+C (it disarms cleanly; positions are left open unless you pass
--flatten).
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import signal

from app.core.config import settings
from app.services.autotrader import autotrader
from app.services.mt5_client import client

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("xue.worker")


async def main(flatten_on_exit: bool) -> None:
    log.info("Booting XUE worker · account=%s · symbol=%s", settings.MT5_ACCOUNT_TYPE, settings.SYMBOL)
    if not client.connect():
        log.error("Could not connect to MT5. Is the terminal running and logged in?")
        return

    result = await autotrader.start()
    if not result["ok"]:
        log.error("AutoTrader refused to arm: %s", result["message"])
        client.shutdown()
        return

    stop_event = asyncio.Event()

    def _handle(*_):
        log.info("Shutdown signal received.")
        stop_event.set()

    try:
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            try:
                loop.add_signal_handler(sig, _handle)
            except NotImplementedError:  # Windows
                signal.signal(sig, _handle)
    except Exception:  # noqa: BLE001
        pass

    log.info("Engine armed. Trading autonomously. Press Ctrl+C to stop.")
    await stop_event.wait()

    await autotrader.stop(flatten=flatten_on_exit)
    client.shutdown()
    log.info("Worker stopped.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--flatten", action="store_true", help="close all positions on exit")
    args = parser.parse_args()
    try:
        asyncio.run(main(args.flatten))
    except KeyboardInterrupt:
        pass
