#!/usr/bin/env python3
"""Minimal API server for MarletMeets.

Run:
  python server/app.py
"""

import os
from decimal import Decimal
from datetime import date, datetime

from dotenv import load_dotenv
from flask import Flask, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor

load_dotenv()

PG = {
    "host": os.getenv("PG_HOST", "localhost"),
    "port": os.getenv("PG_PORT", "5432"),
    "dbname": os.getenv("PG_DB", "postgres"),
    "user": os.getenv("PG_USER", "postgres"),
    "password": os.getenv("PG_PASSWORD", ""),
}

app = Flask(__name__)


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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
