"""Backward-compatible alias. The real implementation lives in mt5_client.py."""
from app.services.mt5_client import client as bridge

__all__ = ["bridge"]
