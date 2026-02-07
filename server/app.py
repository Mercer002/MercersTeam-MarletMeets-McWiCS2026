#!/usr/bin/env python3
"""Minimal API server for MarletMeets.

Run:
  python server/app.py
"""

import os
import sys
from decimal import Decimal
from datetime import date, datetime

from dotenv import load_dotenv
from flask import Flask, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from flask_cors import CORS

load_dotenv()

PG = {
    "host": os.getenv("PG_HOST", "localhost"),
    "port": os.getenv("PG_PORT", "5432"),
    "dbname": os.getenv("PG_DB", "postgres"),
    "user": os.getenv("PG_USER", "postgres"),
    "password": os.getenv("PG_PASSWORD", ""),
}

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

try:
    from matching import MatchingEngine
except Exception:
    MatchingEngine = None


def get_conn():
    return psycopg2.connect(**PG)


def serialize_value(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def serialize_row(row):
    return {k: serialize_value(v) for k, v in row.items()}


def fetch_all(query, params=None):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            return [serialize_row(r) for r in cur.fetchall()]


def fetch_one(query, params=None):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            row = cur.fetchone()
            return serialize_row(row) if row else None


@app.get("/api/dashboard")
def dashboard():
    totals = fetch_one(
        """
        SELECT
            (SELECT COUNT(*) FROM students) AS total_students,
            (SELECT COUNT(*) FROM seniors) AS total_seniors,
            (SELECT COUNT(*) FROM sessions) AS total_sessions;
        """
    )

    recent_sessions = fetch_all(
        """
        SELECT
            se.session_id,
            se.student_id,
            se.senior_id,
            se.session_time,
            se.duration_minutes,
            se.status,
            se.latitude,
            se.longitude,
            se.notes,
            s.first_name AS student_first_name,
            s.last_name AS student_last_name,
            sr.first_name AS senior_first_name,
            sr.last_name AS senior_last_name
        FROM sessions se
        LEFT JOIN students s ON se.student_id = s.student_id
        LEFT JOIN seniors sr ON se.senior_id = sr.senior_id
        ORDER BY se.session_time DESC NULLS LAST
        LIMIT 8;
        """
    )

    students = fetch_all(
        """
        SELECT student_id, first_name, last_name, latitude, longitude
        FROM students
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY student_id;
        """
    )

    seniors = fetch_all(
        """
        SELECT senior_id, first_name, last_name, latitude, longitude
        FROM seniors
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY senior_id;
        """
    )

    return jsonify(
        {
            "totals": totals,
            "recent_sessions": recent_sessions,
            "students": students,
            "seniors": seniors,
        }
    )


@app.get("/api/seniors")
def list_seniors():
    seniors = fetch_all(
        """
        SELECT senior_id, first_name, last_name, needs, languages, latitude, longitude
        FROM seniors
        ORDER BY senior_id;
        """
    )
    return jsonify({"seniors": seniors})


@app.get("/api/matches/<int:senior_id>")
def match_senior(senior_id):
    if MatchingEngine is None:
        return jsonify({"error": "Matching engine not available."}), 500

    senior = fetch_one(
        """
        SELECT senior_id, first_name, last_name, needs, languages, latitude, longitude
        FROM seniors
        WHERE senior_id = %s;
        """,
        (senior_id,),
    )
    if not senior:
        return jsonify({"error": "Senior not found."}), 404

    students = fetch_all(
        """
        SELECT student_id, first_name, last_name, skills, languages, latitude, longitude
        FROM students
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY student_id;
        """
    )
    if not students:
        return jsonify({"senior": senior, "matches": []})

    engine = MatchingEngine()
    matches = engine.find_matches(senior, students, limit=3)
    return jsonify({"senior": senior, "matches": matches})


@app.post("/api/sessions")
def create_session():
    from flask import request

    payload = request.get_json(silent=True) or {}
    student_id = payload.get("student_id")
    senior_id = payload.get("senior_id")

    if not student_id or not senior_id:
        return jsonify({"error": "student_id and senior_id are required."}), 400

    duration_minutes = payload.get("duration_minutes", 60)
    status = payload.get("status", "scheduled")
    notes = payload.get("notes")

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT latitude, longitude
                FROM seniors
                WHERE senior_id = %s;
                """,
                (senior_id,),
            )
            senior_coords = cur.fetchone()
            if not senior_coords:
                return jsonify({"error": "Senior not found."}), 404

            latitude = payload.get("latitude", senior_coords[0])
            longitude = payload.get("longitude", senior_coords[1])

            cur.execute(
                """
                INSERT INTO sessions
                    (student_id, senior_id, session_time, duration_minutes, status, latitude, longitude, notes)
                VALUES
                    (%s, %s, NOW(), %s, %s, %s, %s, %s)
                RETURNING session_id;
                """,
                (student_id, senior_id, duration_minutes, status, latitude, longitude, notes),
            )
            session_id = cur.fetchone()[0]
            conn.commit()

    return jsonify({"session_id": session_id, "status": status})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
