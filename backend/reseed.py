from database import engine, Base, seed_database, Tiger, Capture, Alert, ReviewQueue, TriageRun
from sqlalchemy.orm import Session

# Drop all tables and recreate them
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

print("Tables dropped and recreated.")
seed_database()
