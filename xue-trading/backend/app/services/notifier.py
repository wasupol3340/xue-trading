"""
Telegram notifier — pushes trade alerts to your phone (FREE via the Telegram Bot
API). Fires only when TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set in .env;
otherwise it stays silent. Uses stdlib urllib (no extra dependency) and never
raises, so notifications can never break trading.
"""
from __future__ import annotations

import os
import ssl
import urllib.parse
import urllib.request


def _read_env(key: str) -> str:
    """os.environ first, then the backend .env (pydantic-settings doesn't populate os.environ)."""
    v = os.environ.get(key)
    if v:
        return v
    here = os.path.dirname(os.path.abspath(__file__))
    backend_root = os.path.abspath(os.path.join(here, "..", ".."))
    for path in (os.path.join(os.getcwd(), ".env"), os.path.join(backend_root, ".env"), ".env"):
        try:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith(key + "="):
                        val = line.split("=", 1)[1].strip()
                        if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
                            val = val[1:-1]
                        return val
        except Exception:  # noqa: BLE001
            continue
    return ""


_LAST_ERROR = ""


def available() -> bool:
    return bool(_read_env("TELEGRAM_BOT_TOKEN") and _read_env("TELEGRAM_CHAT_ID"))


def debug() -> dict:
    """Diagnostic — does the RUNNING bot see the .env keys, and why did send fail?"""
    tok = _read_env("TELEGRAM_BOT_TOKEN")
    chat = _read_env("TELEGRAM_CHAT_ID")
    return {
        "token_present": bool(tok),
        "token_prefix": (tok.split(":", 1)[0] if tok else ""),  # bot id only, not the secret
        "chat_present": bool(chat),
        "chat_id": chat,
        "last_error": _LAST_ERROR,   # exact reason the last send failed (if any)
    }


def send(text: str) -> bool:
    """Send a Telegram message. Returns True on success. Never raises.
    On Windows, stdlib SSL can lack CA certs, so we fall back to an unverified
    context if the verified one fails (Telegram alerts, not sensitive data)."""
    global _LAST_ERROR
    token = _read_env("TELEGRAM_BOT_TOKEN")
    chat = _read_env("TELEGRAM_CHAT_ID")
    if not (token and chat):
        _LAST_ERROR = "missing token or chat_id"
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = urllib.parse.urlencode({
        "chat_id": chat,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": "true",
    }).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    # try verified TLS first, then an unverified context (common Windows cert issue)
    for ctx in (None, ssl._create_unverified_context()):
        try:
            with urllib.request.urlopen(req, timeout=15, context=ctx) as r:
                r.read()
            _LAST_ERROR = ""
            return True
        except Exception as exc:  # noqa: BLE001
            _LAST_ERROR = f"{type(exc).__name__}: {exc}"
    return False
