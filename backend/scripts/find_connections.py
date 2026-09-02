import sqlite3
from pathlib import Path

backend = Path(__file__).resolve().parent.parent
for db in backend.glob("**/*.db"):
    if "pytest" in str(db):
        continue
    try:
        c = sqlite3.connect(db)
        tables = [t[0] for t in c.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
        if "github_connections" in tables:
            rows = c.execute("SELECT clerk_user_id, github_login, scope FROM github_connections").fetchall()
            print(db, "rows:", rows)
    except Exception as e:
        print(db, e)
