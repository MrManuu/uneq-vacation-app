"""Seed script — creates an initial admin user if no users exist."""
from app.auth import hash_password
from app.database import Base, engine, SessionLocal
from app.models import User, UserRole

Base.metadata.create_all(bind=engine)


def seed():
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            print("Database already has users, skipping seed.")
            return

        admin = User(
            email="admin@uneq.de",
            full_name="Admin",
            hashed_password=hash_password("admin1234"),
            role=UserRole.admin,
        )
        db.add(admin)
        db.commit()
        print("Created admin user: admin@uneq.de / admin1234")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
