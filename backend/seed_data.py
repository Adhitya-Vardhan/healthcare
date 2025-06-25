# File: seed_data.py
from app.db.session import SessionLocal
from app.models.models import User, Role, Location, Team, Patient, FileUpload, UserAuditLog, EncryptionKey, EncryptionAuditLog
from app.utils.security import hash_password
from hashlib import sha256
from datetime import datetime

db = SessionLocal()

print("⚠️ Deleting existing data...")
# Delete in correct order (children first)
db.query(EncryptionAuditLog).delete()
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
user_role = db.query(Role).filter(Role.name == "User").first()

print("✅ Seeding locations...")
locations = [
    Location(code="US", name="United States", country="United States"),
    Location(code="IN", name="India", country="India"),
    Location(code="EU", name="Europe", country="European Union"),
    Location(code="AU", name="Australia", country="Australia"),
    Location(code="CA", name="Canada", country="Canada"),
    Location(code="UK", name="United Kingdom", country="United Kingdom"),
]
db.bulk_save_objects(locations)
db.commit()

# Retrieve locations for reference
us_location = db.query(Location).filter(Location.code == "US").first()
in_location = db.query(Location).filter(Location.code == "IN").first()
eu_location = db.query(Location).filter(Location.code == "EU").first()
au_location = db.query(Location).filter(Location.code == "AU").first()
ca_location = db.query(Location).filter(Location.code == "CA").first()
uk_location = db.query(Location).filter(Location.code == "UK").first()

print("✅ Seeding teams...")
teams = [
    Team(code="AR", name="Accounts Receivable", description="Handles receivables"),
    Team(code="EPA", name="Environmental Protection Agency", description="Environmental compliance"),
    Team(code="PRI", name="Priority Team", description="Urgent response team"),
    Team(code="HR", name="Human Resources", description="Employee management and support"),
    Team(code="IT", name="Information Technology", description="Technical support and infrastructure"),
    Team(code="FIN", name="Finance", description="Financial operations and planning"),
    Team(code="MKT", name="Marketing", description="Marketing and promotional activities"),
    Team(code="OPS", name="Operations", description="Daily operations and logistics"),
]
db.bulk_save_objects(teams)
db.commit()

# Retrieve teams for reference
ar_team = db.query(Team).filter(Team.code == "AR").first()
epa_team = db.query(Team).filter(Team.code == "EPA").first()
pri_team = db.query(Team).filter(Team.code == "PRI").first()
hr_team = db.query(Team).filter(Team.code == "HR").first()
it_team = db.query(Team).filter(Team.code == "IT").first()
fin_team = db.query(Team).filter(Team.code == "FIN").first()
mkt_team = db.query(Team).filter(Team.code == "MKT").first()
ops_team = db.query(Team).filter(Team.code == "OPS").first()

print("✅ Seeding users...")

# Admin users
admin_users = [
    User(
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
        is_verified=True,
        must_change_password=False,
        created_at=datetime.utcnow()
    ),
    User(
        username="superadmin",
        email="superadmin@example.com",
        first_name="Super",
        last_name="Admin",
        phone="5551234567",
        password_hash=hash_password("SuperAdmin123!"),
        salt="static",
        role_id=admin_role.id,
        location_id=uk_location.id,
        team_id=it_team.id,
        is_active=True,
        is_verified=True,
        must_change_password=False,
        created_at=datetime.utcnow()
    )
]

# Manager users
manager_users = [
    User(
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
    ),
    User(
        username="hr_manager",
        email="hr.manager@example.com",
        first_name="Sarah",
        last_name="Johnson",
        phone="5559876543",
        password_hash=hash_password("HRManager123!"),
        salt="static",
        role_id=manager_role.id,
        location_id=us_location.id,
        team_id=hr_team.id,
        is_active=True,
        is_verified=True
    ),
    User(
        username="it_manager",
        email="it.manager@example.com",
        first_name="Michael",
        last_name="Chen",
        phone="5558765432",
        password_hash=hash_password("ITManager123!"),
        salt="static",
        role_id=manager_role.id,
        location_id=ca_location.id,
        team_id=it_team.id,
        is_active=True,
        is_verified=True
    ),
    User(
        username="finance_manager",
        email="finance.manager@example.com",
        first_name="Emily",
        last_name="Davis",
        phone="5557654321",
        password_hash=hash_password("FinManager123!"),
        salt="static",
        role_id=manager_role.id,
        location_id=eu_location.id,
        team_id=fin_team.id,
        is_active=True,
        is_verified=True
    ),
    User(
        username="ops_manager",
        email="ops.manager@example.com",
        first_name="David",
        last_name="Wilson",
        phone="5556543210",
        password_hash=hash_password("OpsManager123!"),
        salt="static",
        role_id=manager_role.id,
        location_id=au_location.id,
        team_id=ops_team.id,
        is_active=True,
        is_verified=True
    ),
    User(
        username="marketing_manager",
        email="marketing.manager@example.com",
        first_name="Jessica",
        last_name="Brown",
        phone="5555432109",
        password_hash=hash_password("MktManager123!"),
        salt="static",
        role_id=manager_role.id,
        location_id=us_location.id,
        team_id=mkt_team.id,
        is_active=True,
        is_verified=True
    )
]

# Regular users
regular_users = [
    # HR Team Users
    User(
        username="hr_specialist",
        email="hr.specialist@example.com",
        first_name="Anna",
        last_name="Martinez",
        phone="5554321098",
        password_hash=hash_password("HRUser123!"),
        salt="static",
        role_id=user_role.id,
        location_id=us_location.id,
        team_id=hr_team.id,
        is_active=True,
        is_verified=True
    ),
    User(
        username="hr_coordinator",
        email="hr.coordinator@example.com",
        first_name="James",
        last_name="Taylor",
        phone="5553210987",
        password_hash=hash_password("HRCoord123!"),
        salt="static",
        role_id=user_role.id,
        location_id=ca_location.id,
        team_id=hr_team.id,
        is_active=True,
        is_verified=True
    ),

    # IT Team Users
    User(
        username="developer1",
        email="dev1@example.com",
        first_name="Alex",
        last_name="Thompson",
        phone="5552109876",
        password_hash=hash_password("Dev123!"),
        salt="static",
        role_id=user_role.id,
        location_id=us_location.id,
        team_id=it_team.id,
        is_active=True,
        is_verified=True
    ),
    User(
        username="developer2",
        email="dev2@example.com",
        first_name="Priya",
        last_name="Sharma",
        phone="5551098765",
        password_hash=hash_password("Dev2123!"),
        salt="static",
        role_id=user_role.id,
        location_id=in_location.id,
        team_id=it_team.id,
        is_active=True,
        is_verified=True
    ),
    User(
        username="sysadmin",
        email="sysadmin@example.com",
        first_name="Robert",
        last_name="Lee",
        phone="5550987654",
        password_hash=hash_password("SysAdmin123!"),
        salt="static",
        role_id=user_role.id,
        location_id=uk_location.id,
        team_id=it_team.id,
        is_active=True,
        is_verified=True
    ),

    # Finance Team Users
    User(
        username="accountant1",
        email="accountant1@example.com",
        first_name="Lisa",
        last_name="Wang",
        phone="5559876543",
        password_hash=hash_password("Account123!"),
        salt="static",
        role_id=user_role.id,
        location_id=eu_location.id,
        team_id=fin_team.id,
        is_active=True,
        is_verified=True
    ),
    User(
        username="financial_analyst",
        email="analyst@example.com",
        first_name="Kevin",
        last_name="O'Connor",
        phone="5558765432",
        password_hash=hash_password("Analyst123!"),
        salt="static",
        role_id=user_role.id,
        location_id=us_location.id,
        team_id=fin_team.id,
        is_active=True,
        is_verified=True
    ),

    # AR Team Users
    User(
        username="ar_specialist",
        email="ar.specialist@example.com",
        first_name="Maria",
        last_name="Garcia",
        phone="5557654321",
        password_hash=hash_password("ARSpec123!"),
        salt="static",
        role_id=user_role.id,
        location_id=us_location.id,
        team_id=ar_team.id,
        is_active=True,
        is_verified=True
    ),
    User(
        username="collections",
        email="collections@example.com",
        first_name="Tom",
        last_name="Anderson",
        phone="5556543210",
        password_hash=hash_password("Collections123!"),
        salt="static",
        role_id=user_role.id,
        location_id=ca_location.id,
        team_id=ar_team.id,
        is_active=True,
        is_verified=True
    ),

    # Marketing Team Users
    User(
        username="marketing_coord",
        email="mkt.coord@example.com",
        first_name="Rachel",
        last_name="Green",
        phone="5555432109",
        password_hash=hash_password("MktCoord123!"),
        salt="static",
        role_id=user_role.id,
        location_id=us_location.id,
        team_id=mkt_team.id,
        is_active=True,
        is_verified=True
    ),
    User(
        username="content_creator",
        email="content@example.com",
        first_name="Sophie",
        last_name="Miller",
        phone="5554321098",
        password_hash=hash_password("Content123!"),
        salt="static",
        role_id=user_role.id,
        location_id=uk_location.id,
        team_id=mkt_team.id,
        is_active=True,
        is_verified=True
    ),

    # Operations Team Users
    User(
        username="ops_coordinator",
        email="ops.coord@example.com",
        first_name="Mark",
        last_name="Roberts",
        phone="5553210987",
        password_hash=hash_password("OpsCoord123!"),
        salt="static",
        role_id=user_role.id,
        location_id=au_location.id,
        team_id=ops_team.id,
        is_active=True,
        is_verified=True
    ),
    User(
        username="logistics",
        email="logistics@example.com",
        first_name="Amanda",
        last_name="Clark",
        phone="5552109876",
        password_hash=hash_password("Logistics123!"),
        salt="static",
        role_id=user_role.id,
        location_id=us_location.id,
        team_id=ops_team.id,
        is_active=True,
        is_verified=True
    ),

    # EPA Team Users
    User(
        username="env_specialist",
        email="env.specialist@example.com",
        first_name="Dr. John",
        last_name="Mitchell",
        phone="5551098765",
        password_hash=hash_password("EnvSpec123!"),
        salt="static",
        role_id=user_role.id,
        location_id=in_location.id,
        team_id=epa_team.id,
        is_active=True,
        is_verified=True
    ),
    User(
        username="compliance_officer",
        email="compliance@example.com",
        first_name="Linda",
        last_name="Phillips",
        phone="5550987654",
        password_hash=hash_password("Compliance123!"),
        salt="static",
        role_id=user_role.id,
        location_id=eu_location.id,
        team_id=epa_team.id,
        is_active=True,
        is_verified=True
    ),

    # Priority Team Users
    User(
        username="priority_resp1",
        email="priority1@example.com",
        first_name="Chris",
        last_name="Baker",
        phone="5559876543",
        password_hash=hash_password("Priority123!"),
        salt="static",
        role_id=user_role.id,
        location_id=us_location.id,
        team_id=pri_team.id,
        is_active=True,
        is_verified=True
    ),
    User(
        username="priority_resp2",
        email="priority2@example.com",
        first_name="Nicole",
        last_name="Adams",
        phone="5558765432",
        password_hash=hash_password("Priority2123!"),
        salt="static",
        role_id=user_role.id,
        location_id=ca_location.id,
        team_id=pri_team.id,
        is_active=True,
        is_verified=True
    )
]

# Add all users to database
all_users = admin_users + manager_users + regular_users
db.add_all(all_users)
db.commit()

print("✅ Seeding encryption key...")
initial_key = "initial_key_placeholder"
hashed_key = sha256(initial_key.encode()).hexdigest()
enc_key = EncryptionKey(key_version="v1.0", key_hash=hashed_key, algorithm="AES-256", is_active=True)
db.add(enc_key)
db.commit()

print("🎉 Seeding complete. Database ready.")
print(f"📊 Summary:")
print(f"   - Roles: 3")
print(f"   - Locations: 6") 
print(f"   - Teams: 8")
print(f"   - Admin Users: {len(admin_users)}")
print(f"   - Manager Users: {len(manager_users)}")
print(f"   - Regular Users: {len(regular_users)}")
print(f"   - Total Users: {len(all_users)}")
print(f"   - Encryption Keys: 1")