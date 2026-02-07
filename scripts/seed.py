#!/usr/bin/env python3
"""Seed the database with realistic test data.

Run: python scripts/seed.py
"""

import os
import sys
from dotenv import load_dotenv

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

STUDENTS = [
    {
        "mcgill_email": "maya.patel@mcgill.ca",
        "first_name": "Maya",
        "last_name": "Patel",
        "phone": "555-1110",
        "address": "346 Rue Milton",
        "latitude": 45.5078,
        "longitude": -73.5795,
        "skills": ["tech_help", "shopping"],
        "languages": ["english", "french"],
        "hours_completed": 12,
    },
    {
        "mcgill_email": "julien.roy@mcgill.ca",
        "first_name": "Julien",
        "last_name": "Roy",
        "phone": "555-1111",
        "address": "210 Rue Prince Arthur",
        "latitude": 45.5152,
        "longitude": -73.5738,
        "skills": ["companionship", "meal_prep"],
        "languages": ["french", "english"],
        "hours_completed": 6,
    },
    {
        "mcgill_email": "lina.ahmed@mcgill.ca",
        "first_name": "Lina",
        "last_name": "Ahmed",
        "phone": "555-1112",
        "address": "845 Ave du Parc",
        "latitude": 45.5105,
        "longitude": -73.5764,
        "skills": ["errands", "translation"],
        "languages": ["english", "arabic", "french"],
        "hours_completed": 9,
    },
    {
        "mcgill_email": "sam.chen@mcgill.ca",
        "first_name": "Sam",
        "last_name": "Chen",
        "phone": "555-1113",
        "address": "845 Sherbrooke St W",
        "latitude": 45.5048,
        "longitude": -73.5772,
        "skills": ["tutoring", "tech_help"],
        "languages": ["english", "mandarin"],
        "hours_completed": 15,
    },
    {
        "mcgill_email": "noah.kim@mcgill.ca",
        "first_name": "Noah",
        "last_name": "Kim",
        "phone": "555-1114",
        "address": "365 Rue Milton",
        "latitude": 45.5074,
        "longitude": -73.5802,
        "skills": ["gardening", "light_cleaning"],
        "languages": ["english", "korean"],
        "hours_completed": 3,
    },
    {
        "mcgill_email": "claire.ng@mcgill.ca",
        "first_name": "Claire",
        "last_name": "Ng",
        "phone": "555-1115",
        "address": "322 Rue St-Urbain",
        "latitude": 45.5075,
        "longitude": -73.5800,
        "skills": ["shopping", "companionship"],
        "languages": ["english", "french"],
        "hours_completed": 8,
    },
    {
        "mcgill_email": "mateo.garcia@mcgill.ca",
        "first_name": "Mateo",
        "last_name": "Garcia",
        "phone": "555-1116",
        "address": "505 Rue Saint-Denis",
        "latitude": 45.5182,
        "longitude": -73.5675,
        "skills": ["errands", "walking"],
        "languages": ["spanish", "english"],
        "hours_completed": 5,
    },
    {
        "mcgill_email": "aisha.khan@mcgill.ca",
        "first_name": "Aisha",
        "last_name": "Khan",
        "phone": "555-1117",
        "address": "112 Ave des Pins",
        "latitude": 45.5124,
        "longitude": -73.5790,
        "skills": ["meal_prep", "shopping"],
        "languages": ["english", "urdu", "french"],
        "hours_completed": 7,
    },
    {
        "mcgill_email": "olivia.martin@mcgill.ca",
        "first_name": "Olivia",
        "last_name": "Martin",
        "phone": "555-1118",
        "address": "4109 Rue St-Denis",
        "latitude": 45.5200,
        "longitude": -73.5800,
        "skills": ["tech_help", "administrative"],
        "languages": ["english", "french"],
        "hours_completed": 11,
    },
    {
        "mcgill_email": "eva.schmidt@mcgill.ca",
        "first_name": "Eva",
        "last_name": "Schmidt",
        "phone": "555-1119",
        "address": "225 Rue Jeanne-Mance",
        "latitude": 45.5070,
        "longitude": -73.5755,
        "skills": ["companionship", "walking"],
        "languages": ["english", "german", "french"],
        "hours_completed": 2,
    },
]

SENIORS = [
    {
        "email": "helen.dupont@example.com",
        "first_name": "Helen",
        "last_name": "Dupont",
        "phone": "555-2201",
        "address": "78 Rue Hutchison",
        "latitude": 45.5096,
        "longitude": -73.5798,
        "needs": ["grocery", "companionship"],
        "languages": ["french", "english"],
    },
    {
        "email": "robert.miller@example.com",
        "first_name": "Robert",
        "last_name": "Miller",
        "phone": "555-2202",
        "address": "512 Ave du Parc",
        "latitude": 45.5102,
        "longitude": -73.5768,
        "needs": ["walking", "medication_pickup"],
        "languages": ["english"],
    },
    {
        "email": "fatima.elhadi@example.com",
        "first_name": "Fatima",
        "last_name": "Elhadi",
        "phone": "555-2203",
        "address": "344 Rue Prince Arthur",
        "latitude": 45.5158,
        "longitude": -73.5715,
        "needs": ["translation", "shopping"],
        "languages": ["arabic", "french"],
    },
    {
        "email": "lucas.tremblay@example.com",
        "first_name": "Lucas",
        "last_name": "Tremblay",
        "phone": "555-2204",
        "address": "129 Ave des Pins",
        "latitude": 45.5128,
        "longitude": -73.5785,
        "needs": ["tech_help", "light_housekeeping"],
        "languages": ["french", "english"],
    },
    {
        "email": "sofia.rossi@example.com",
        "first_name": "Sofia",
        "last_name": "Rossi",
        "phone": "555-2205",
        "address": "4050 Rue St-Denis",
        "latitude": 45.5192,
        "longitude": -73.5792,
        "needs": ["companionship", "meal_prep"],
        "languages": ["italian", "english"],
    },
    {
        "email": "jean.dupuis@example.com",
        "first_name": "Jean",
        "last_name": "Dupuis",
        "phone": "555-2206",
        "address": "889 Sherbrooke St W",
        "latitude": 45.5042,
        "longitude": -73.5768,
        "needs": ["errands", "walking"],
        "languages": ["french", "english"],
    },
]

SESSIONS = [
    {
        "student_email": "maya.patel@mcgill.ca",
        "senior_email": "helen.dupont@example.com",
        "session_time": "NOW() - INTERVAL '10 days'",
        "duration_minutes": 60,
        "status": "completed",
        "latitude": 45.5090,
        "longitude": -73.5791,
        "notes": "seed: Grocery run and check-in",
    },
    {
        "student_email": "sam.chen@mcgill.ca",
        "senior_email": "lucas.tremblay@example.com",
        "session_time": "NOW() - INTERVAL '7 days'",
        "duration_minutes": 45,
        "status": "completed",
        "latitude": 45.5126,
        "longitude": -73.5782,
        "notes": "seed: Set up email and phone",
    },
    {
        "student_email": "julien.roy@mcgill.ca",
        "senior_email": "sofia.rossi@example.com",
        "session_time": "NOW() - INTERVAL '5 days'",
        "duration_minutes": 90,
        "status": "completed",
        "latitude": 45.5190,
        "longitude": -73.5798,
        "notes": "seed: Meal prep and companionship",
    },
    {
        "student_email": "lina.ahmed@mcgill.ca",
        "senior_email": "fatima.elhadi@example.com",
        "session_time": "NOW() - INTERVAL '3 days'",
        "duration_minutes": 50,
        "status": "completed",
        "latitude": 45.5150,
        "longitude": -73.5723,
        "notes": "seed: Translation for appointment",
    },
    {
        "student_email": "noah.kim@mcgill.ca",
        "senior_email": "robert.miller@example.com",
        "session_time": "NOW() - INTERVAL '2 days'",
        "duration_minutes": 40,
        "status": "completed",
        "latitude": 45.5100,
        "longitude": -73.5772,
        "notes": "seed: Walk and medication pickup",
    },
]


def run_sql(conn, sql, params=None):
    cur = conn.cursor()
    cur.execute(sql, params)
    cur.close()


def seed_students(conn):
    for s in STUDENTS:
        run_sql(
            conn,
            """
            INSERT INTO students
                (mcgill_email, first_name, last_name, phone, address, latitude, longitude, skills, languages, hours_completed)
            VALUES
                (%(mcgill_email)s, %(first_name)s, %(last_name)s, %(phone)s, %(address)s, %(latitude)s, %(longitude)s,
                 %(skills)s, %(languages)s, %(hours_completed)s)
            ON CONFLICT (mcgill_email) DO NOTHING;
            """,
            s,
        )


def seed_seniors(conn):
    for s in SENIORS:
        run_sql(
            conn,
            """
            INSERT INTO seniors
                (email, first_name, last_name, phone, address, latitude, longitude, needs, languages)
            VALUES
                (%(email)s, %(first_name)s, %(last_name)s, %(phone)s, %(address)s, %(latitude)s, %(longitude)s,
                 %(needs)s, %(languages)s)
            ON CONFLICT (email) DO NOTHING;
            """,
            s,
        )


def seed_sessions(conn):
    for s in SESSIONS:
        run_sql(
            conn,
            f"""
            INSERT INTO sessions
                (student_id, senior_id, session_time, duration_minutes, status, latitude, longitude, notes)
            VALUES
                (
                    (SELECT student_id FROM students WHERE mcgill_email = %(student_email)s),
                    (SELECT senior_id FROM seniors WHERE email = %(senior_email)s),
                    {s['session_time']},
                    %(duration_minutes)s,
                    %(status)s,
                    %(latitude)s,
                    %(longitude)s,
                    %(notes)s
                );
            """,
            s,
        )


def delete_seeded_data(conn):
    run_sql(conn, "DELETE FROM sessions WHERE notes LIKE 'seed:%';")
    run_sql(conn, "DELETE FROM students WHERE mcgill_email = ANY(%s);", ([s["mcgill_email"] for s in STUDENTS],))
    run_sql(conn, "DELETE FROM seniors WHERE email = ANY(%s);", ([s["email"] for s in SENIORS],))


def verify(conn):
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM students;")
    print("students count:", cur.fetchone()[0])
    cur.execute("SELECT COUNT(*) FROM seniors;")
    print("seniors count:", cur.fetchone()[0])
    cur.execute("SELECT COUNT(*) FROM sessions;")
    print("sessions count:", cur.fetchone()[0])

    cur.execute(
        """
        SELECT mcgill_email, skills, languages, latitude, longitude
        FROM students
        ORDER BY student_id
        LIMIT 10;
        """
    )
    print("Sample students:")
    for row in cur.fetchall():
        print(row)

    cur.execute(
        """
        SELECT email, needs, languages, latitude, longitude
        FROM seniors
        ORDER BY senior_id
        LIMIT 10;
        """
    )
    print("Sample seniors:")
    for row in cur.fetchall():
        print(row)

    cur.execute(
        """
        SELECT s.mcgill_email, sr.email AS senior_email, se.session_time, se.status, se.notes
        FROM sessions se
        LEFT JOIN students s ON se.student_id = s.student_id
        LEFT JOIN seniors sr ON se.senior_id = sr.senior_id
        WHERE se.status = 'completed'
        ORDER BY se.session_time DESC
        LIMIT 10;
        """
    )
    print("Completed sessions:")
    for row in cur.fetchall():
        print(row)

    cur.close()


def main():
    dsn = dict(host=PG['host'], port=PG['port'], dbname=PG['dbname'], user=PG['user'], password=PG['password'])
    try:
        conn = psycopg2.connect(**dsn)
        conn.autocommit = True
        print("Connected to DB. Seeding data...")

        delete_seeded_data(conn)
        seed_students(conn)
        seed_seniors(conn)
        seed_sessions(conn)

        verify(conn)
        conn.close()
        print("Done.")
        return 0
    except Exception as e:
        print("Error while seeding data:", e)
        import traceback

        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
