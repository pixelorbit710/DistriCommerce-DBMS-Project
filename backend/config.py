import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Database Mode:
# Default to distributed SQLite multi-database with distinct regional nodes.
# If PostgreSQL environment variables or DATABASE_URL is supplied, PostgreSQL adapter is activated.
DATABASE_URL = os.getenv("DATABASE_URL")
PG_HOST = os.getenv("PG_HOST")
PG_PORT = os.getenv("PG_PORT", "5432")
PG_DATABASE = os.getenv("PG_DATABASE")
PG_USER = os.getenv("PG_USER")
PG_PASSWORD = os.getenv("PG_PASSWORD")

USE_POSTGRES = bool(DATABASE_URL or (PG_HOST and PG_DATABASE and PG_USER))

# Regional DB file paths for SQLite multi-node simulation:
CENTRAL_DB_PATH = str(DATA_DIR / "central_coordinator.db")
PUNE_DB_PATH = str(DATA_DIR / "pune_site.db")
DELHI_DB_PATH = str(DATA_DIR / "delhi_site.db")
CHENNAI_DB_PATH = str(DATA_DIR / "chennai_site.db")

REGIONAL_DB_MAP = {
    "Pune": PUNE_DB_PATH,
    "Delhi": DELHI_DB_PATH,
    "Chennai": CHENNAI_DB_PATH,
}

REGIONS = ["Pune", "Delhi", "Chennai"]
PORT = int(os.getenv("PORT", 5000))
