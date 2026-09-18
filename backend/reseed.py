from database import engine, Base

# Drop all tables and recreate them
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

print("Tables dropped and recreated.")
print("Loading the real PTR 2025 dataset (tigers, captures, camera stations)...")
print()

# import_real_data.py --fresh wipes rows and reimports from data/PTR_Tiger_IDs_2025
import subprocess
import sys

raise SystemExit(subprocess.run([sys.executable, "import_real_data.py", "--fresh"]).returncode)
