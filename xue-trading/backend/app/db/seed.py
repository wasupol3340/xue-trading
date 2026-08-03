"""Seed an initial superuser. Run: python -m app.db.seed"""
import asyncio

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal, init_db
from app.models.user import User

DEFAULT_EMAIL = "master@xuetrading.ai"
DEFAULT_PASSWORD = "xue-admin-2026"


async def main() -> None:
    await init_db()
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(User).where(User.email == DEFAULT_EMAIL))
        if existing.scalar_one_or_none():
            print("Superuser already exists.")
            return
        user = User(
            email=DEFAULT_EMAIL,
            full_name="XUE Master",
            hashed_password=hash_password(DEFAULT_PASSWORD),
            is_superuser=True,
        )
        db.add(user)
        await db.commit()
        print(f"Created superuser {DEFAULT_EMAIL} / {DEFAULT_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(main())
