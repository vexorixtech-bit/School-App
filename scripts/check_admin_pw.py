import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
os.environ['DATABASE_URL'] = 'postgresql://postgres:Vignesh%401620@localhost:5432/school_erp'
from app.database import SessionLocal
from app.models.models import User
from app.auth.auth_handler import verify_password
db = SessionLocal()
u = db.query(User).filter(User.username == 'admin1').first()
print(f'admin1: created_at={u.created_at}')
for pw in ['admin','admin123','Admin','','password','admin1','12345678']:
    if verify_password(pw, u.password_hash):
        print(f'  FOUND PASSWORD: "{pw}"')
print(f'  hash: {u.password_hash}')
db.close()
