#!/usr/bin/env python3
"""Simple Postgres connection test.

Behavior:
- Loads DB credentials from environment (use `.env` file + python-dotenv)
- Connects to Postgres, creates a tiny test table, inserts and reads a row, then cleans up.

Exit codes:
- 0 on success
- non-zero with stack trace on failure
"""

import os
import sys
from dotenv import load_dotenv

try:
    import psycopg2
except Exception as e:
    print("Missing dependency psycopg2. Install with: pip install -r requirements.txt")
    raise


load_dotenv()

PG_HOST = os.getenv("PG_HOST", "localhost")
PG_PORT = os.getenv("PG_PORT", "5432")
PG_DB = os.getenv("PG_DB", "postgres")
PG_USER = os.getenv("PG_USER", "postgres")
PG_PASSWORD = os.getenv("PG_PASSWORD", "")


def main():
    conn = None
    try:
        conn = psycopg2.connect(
            host=PG_HOST,
            port=PG_PORT,
            dbname=PG_DB,
            user=PG_USER,
            password=PG_PASSWORD,
            connect_timeout=5,
        )
        conn.autocommit = True
        cur = conn.cursor()

        cur.execute(
            "CREATE TABLE IF NOT EXISTS db_connect_test (id SERIAL PRIMARY KEY, message TEXT);"
        )
        cur.execute(
            "INSERT INTO db_connect_test (message) VALUES (%s) RETURNING id;",
            ("hello from connect_db.py",),
        )
        inserted_id = cur.fetchone()[0]
        cur.execute("SELECT message FROM db_connect_test WHERE id=%s;", (inserted_id,))
        row = cur.fetchone()
        print("DB connection test succeeded. Inserted row:", row[0])

        # cleanup
        cur.execute("DELETE FROM db_connect_test WHERE id=%s;", (inserted_id,))
        cur.close()
        return 0
    except Exception as e:
        print("DB connection test failed:", str(e))
        # show a bit more detail for debugging
        import traceback

        traceback.print_exc()
        return 2
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass


if __name__ == "__main__":
    sys.exit(main())
