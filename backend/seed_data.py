# File: seed_data.py

from app.db.session import SessionLocal
from app.models.models import User, Role, Location, Team, Patient, FileUpload, UserAuditLog, EncryptionKey
from app.utils.security import hash_password
from hashlib import sha256

db = SessionLocal()

print("⚠️ Deleting existing data...")
# Delete in correct order (children first)
db.query(UserAuditLog).delete()
db.query(Patient).delete()
db.query(FileUpload).delete()
db.query(User).delete()
db.query(Role).delete()
db.query(Location).delete()
db.query(Team).delete()
db.query(EncryptionKey).delete()
db.commit()

print("✅ Seeding roles...")
roles = [
    Role(name="Admin", description="System administrator", level=100, permissions={}),
    Role(name="Manager", description="Manager with patient access", level=50, permissions={}),
    Role(name="User", description="Read-only user", level=10, permissions={})
]
db.bulk_save_objects(roles)
db.commit()

# Retrieve roles for reference
admin_role = db.query(Role).filter(Role.name == "Admin").first()
manager_role = db.query(Role).filter(Role.name == "Manager").first()

print("✅ Seeding locations...")
locations = [
    Location(code="US", name="United States", country="United States"),
    Location(code="IN", name="India", country="India"),
    Location(code="EU", name="Europe", country="European Union"),
    Location(code="AU", name="Australia", country="Australia"),
]
db.bulk_save_objects(locations)
db.commit()

# Retrieve locations for reference
us_location = db.query(Location).filter(Location.code == "US").first()
in_location = db.query(Location).filter(Location.code == "IN").first()

print("✅ Seeding teams...")
teams = [
    Team(code="AR", name="Accounts Receivable", description="Handles receivables"),
    Team(code="EPA", name="Environmental Protection Agency", description="Environmental compliance"),
    Team(code="PRI", name="Priority Team", description="Urgent response team"),
]
db.bulk_save_objects(teams)
db.commit()

# Retrieve teams for reference
ar_team = db.query(Team).filter(Team.code == "AR").first()
epa_team = db.query(Team).filter(Team.code == "EPA").first()

print("✅ Seeding users...")
admin_user = User(
    username="admin",
    email="admin@example.com",
    first_name="Admin",
    last_name="User",
    phone="1234567890",
    password_hash=hash_password("AdminPass123!"),
    salt="static",
    role_id=admin_role.id,
    location_id=us_location.id,
    team_id=ar_team.id,
    is_active=True,
    is_verified=True
)

manager_user = User(
    username="manager",
    email="manager@example.com",
    first_name="Manager",
    last_name="Smith",
    phone="9876543210",
    password_hash=hash_password("Manager123!"),
    salt="static",
    role_id=manager_role.id,
    location_id=in_location.id,
    team_id=epa_team.id,
    is_active=True,
    is_verified=True
)
db.add_all([admin_user, manager_user])
db.commit()

print("✅ Seeding encryption key...")
initial_key = "initial_key_placeholder"
hashed_key = sha256(initial_key.encode()).hexdigest()
enc_key = EncryptionKey(key_version="v1.0", key_hash=hashed_key, algorithm="AES-256", is_active=True)
db.add(enc_key)
db.commit()

print("🎉 Seeding complete. Database ready.")
