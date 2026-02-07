#!/usr/bin/env python3
"""Create students, seniors, sessions tables, add indexes, and insert sample data.

Run: python scripts/schema_and_seed.py
"""

import os
from dotenv import load_dotenv
import sys

load_dotenv()

try:
    import psycopg2
except Exception:
    print("psycopg2 not installed. Install requirements.txt into a venv and activate it.")
    raise

PG = {
    "host": os.getenv("PG_HOST", "localhost"),
    "port": os.getenv("PG_PORT", "5432"),
    "dbname": os.getenv("PG_DB", "postgres"),
    "user": os.getenv("PG_USER", "postgres"),
    "password": os.getenv("PG_PASSWORD", ""),
}


SCHEMA_SQL = [
    # students
    """
    CREATE TABLE IF NOT EXISTS students (
        student_id SERIAL PRIMARY KEY,
        mcgill_email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        address VARCHAR(255),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        skills TEXT[],
        languages TEXT[],
        hours_completed INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
    );
    """,
    # seniors
    """
    CREATE TABLE IF NOT EXISTS seniors (
        senior_id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        address VARCHAR(255),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        needs TEXT[],
        languages TEXT[],
        created_at TIMESTAMP DEFAULT NOW()
    );
    """,
    # sessions
    """
    DROP TABLE IF EXISTS sessions;
    CREATE TABLE sessions (
        session_id SERIAL PRIMARY KEY,
        student_id INT REFERENCES students(student_id) ON DELETE SET NULL,
        senior_id INT REFERENCES seniors(senior_id) ON DELETE SET NULL,
        task_type VARCHAR(50) NOT NULL,    -- NEW: e.g., 'Groceries', 'Tech Help'
        description TEXT,                  -- NEW: Details about the task
        status VARCHAR(50) DEFAULT 'scheduled',
        session_time TIMESTAMP,            -- Can be null for now
        duration_minutes INT,
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        created_at TIMESTAMP DEFAULT NOW()
    );
    """,
    # Indexes for lat/lng lookups
    "CREATE INDEX IF NOT EXISTS idx_students_lat_lon ON students (latitude, longitude);",
    "CREATE INDEX IF NOT EXISTS idx_students_lat ON students (latitude);",
    "CREATE INDEX IF NOT EXISTS idx_students_lon ON students (longitude);",
    "CREATE INDEX IF NOT EXISTS idx_seniors_lat_lon ON seniors (latitude, longitude);",
    "CREATE INDEX IF NOT EXISTS idx_seniors_lat ON seniors (latitude);",
    "CREATE INDEX IF NOT EXISTS idx_seniors_lon ON seniors (longitude);",
    "CREATE INDEX IF NOT EXISTS idx_sessions_time ON sessions (session_time);",
    "CREATE INDEX IF NOT EXISTS idx_sessions_lat_lon ON sessions (latitude, longitude);",
]


SAMPLE_SQL = [
    # sample students
    """
    INSERT INTO students (mcgill_email, first_name, last_name, phone, address, latitude, longitude, skills, languages, hours_completed)
    VALUES
      ('alice@mcgill.ca', 'Alice', 'Smith', '555-0101', '123 Rue St', 45.4972, -73.5792, ARRAY['math','tutoring'], ARRAY['english','french'], 10),
      ('bob@mcgill.ca', 'Bob', 'Jones', '555-0202', '456 Ave Q', 45.4990, -73.5775, ARRAY['shopping','gardening'], ARRAY['english'], 4)
    ON CONFLICT (mcgill_email) DO NOTHING;
    """,
    # sample seniors
    """
    INSERT INTO seniors (email, first_name, last_name, phone, address, latitude, longitude, needs, languages)
    VALUES
      ('mrs.jones@example.com','Evelyn','Jones','555-1001','789 Old Rd',45.4985,-73.5760, ARRAY['grocery','companionship'], ARRAY['english']),
      ('mr.smith@example.com','George','Smith','555-1002','101 New St',45.4960,-73.5800, ARRAY['walking','meds'], ARRAY['english','french'])
    ON CONFLICT (email) DO NOTHING;
    """,
    # sample sessions
    """
    INSERT INTO sessions (
        student_id, 
        senior_id, 
        task_type,      -- NEW FIELD
        description,    -- REPLACES 'notes'
        status, 
        session_time, 
        duration_minutes, 
        latitude, 
        longitude
    )
    VALUES
    (1, 1, 'Groceries', 'Help carrying heavy bags from Metro', 'completed', NOW() - INTERVAL '2 days', 60, 45.5017, -73.5673),
    (2, 2, 'Tech Support', 'Fixing printer connection', 'scheduled', NOW() + INTERVAL '1 day', 45, 45.5088, -73.5540),
    (1, 3, 'Companionship', 'Afternoon tea and chat', 'pending', NOW() + INTERVAL '3 days', 90, 45.4949, -73.5779);
    """,
]


def run_sql(conn, sql):
    cur = conn.cursor()
    cur.execute(sql)
    cur.close()


def main():
    dsn = dict(host=PG['host'], port=PG['port'], dbname=PG['dbname'], user=PG['user'], password=PG['password'])
    try:
        conn = psycopg2.connect(**dsn)
        conn.autocommit = True
        print("Connected to DB. Creating schema...")

        for stmt in SCHEMA_SQL:
            run_sql(conn, stmt)

        print("Schema ensured. Inserting sample data...")

        for stmt in SAMPLE_SQL:
            run_sql(conn, stmt)

        # show counts
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM students;")
        print("students count:", cur.fetchone()[0])
        cur.execute("SELECT COUNT(*) FROM seniors;")
        print("seniors count:", cur.fetchone()[0])
        cur.execute("SELECT COUNT(*) FROM sessions;")
        print("sessions count:", cur.fetchone()[0])

        # show a sample join
        cur.execute(
            """
            SELECT s.mcgill_email, sr.email AS senior_email, se.session_time, se.status
            FROM sessions se
            LEFT JOIN students s ON se.student_id = s.student_id
            LEFT JOIN seniors sr ON se.senior_id = sr.senior_id
            ORDER BY se.session_time LIMIT 5;
            """
        )
        rows = cur.fetchall()
        print("Sample sessions:")
        for r in rows:
            print(r)
        cur.close()
        conn.close()
        print("Done.")
        return 0
    except Exception as e:
        print("Error while creating schema or inserting sample data:", e)
        import traceback

        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
