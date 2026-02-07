import os
from datetime import date, datetime
from decimal import Decimal

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask.json.provider import DefaultJSONProvider

from db import execute_query, create_student, create_senior, get_senior_by_id, get_all_students
from matching import MatchingEngine

app = Flask(__name__)
CORS(app)

# Create a custom JSON provider that knows how to handle Decimals and Dates
class CustomJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)  # Convert Decimal to float
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()  # Convert Date to String
        return super().default(obj)

# Tell Flask to use our custom provider
app.json = CustomJSONProvider(app)


def serialize_row(row):
    if row is None:
        return None
    return {k: row.get(k) for k in row.keys()}


def serialize_rows(rows):
    return [serialize_row(r) for r in (rows or [])]

@app.route('/')
def home():
    return jsonify({"message": "MarletMeets API is running!"})


@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        db_test = execute_query("SELECT 1 as check_val", fetch_one=True)
        if db_test and db_test.get('check_val') == 1:
            return jsonify({
                "status": "healthy",
                "database": "connected",
                "service": "MarletMeets API"
            }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }), 500
    return jsonify({"status": "unhealthy"}), 500


@app.route('/api/students', methods=['POST'])
def register_student():
    data = request.get_json() or {}

    required_fields = ['email', 'first_name', 'last_name', 'phone', 'address']
    missing = [field for field in required_fields if not data.get(field)]

    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    data['email'] = data.get('email', '').strip().lower()

    try:
        existing = execute_query(
            "SELECT student_id FROM students WHERE mcgill_email = %s;",
            (data['email'],),
            fetch_one=True
        )
        if existing:
            return jsonify({"error": "Email already registered"}), 409

        new_student = create_student(data)
        return jsonify({
            "message": "Student registered successfully!",
            "student_id": new_student['student_id'],
            "student": serialize_row(new_student)
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/seniors', methods=['POST'])
def register_senior():
    data = request.get_json() or {}

    required_fields = ['email', 'first_name', 'last_name', 'phone', 'address']
    missing = [field for field in required_fields if not data.get(field)]

    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    data['email'] = data.get('email', '').strip().lower()

    try:
        existing = execute_query(
            "SELECT senior_id FROM seniors WHERE email = %s;",
            (data['email'],),
            fetch_one=True
        )
        if existing:
            return jsonify({"error": "Email already registered"}), 409

        new_senior = create_senior(data)
        return jsonify({
            "message": "Senior registered successfully!",
            "senior_id": new_senior['senior_id'],
            "senior": serialize_row(new_senior)
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/seniors', methods=['GET'])
def list_seniors():
    seniors = execute_query(
        """
        SELECT senior_id, first_name, last_name, needs, languages, latitude, longitude
        FROM seniors
        ORDER BY senior_id;
        """,
        fetch_all=True,
    )
    return jsonify({"seniors": serialize_rows(seniors)})


@app.route('/api/matches/<int:senior_id>', methods=['GET'])
def get_matches(senior_id):
    senior = get_senior_by_id(senior_id)
    if not senior:
        return jsonify({"error": "Senior not found"}), 404

    students = get_all_students()
    if not students:
        return jsonify({"message": "No students available"}), 200

    engine = MatchingEngine()
    matches = engine.find_matches(senior, students)

    return jsonify({
        "senior": serialize_row(senior),
        "matches": matches
    })


@app.route('/api/sessions', methods=['POST'])
def create_session_endpoint():
    data = request.get_json() or {}

    required_fields = ['senior_id', 'student_id']
    missing = [field for field in required_fields if not data.get(field)]

    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    try:
        senior_coords = execute_query(
            "SELECT latitude, longitude FROM seniors WHERE senior_id = %s;",
            (data['senior_id'],),
            fetch_one=True,
        )
        if not senior_coords:
            return jsonify({"error": "Senior not found"}), 404

        latitude = data.get('latitude', senior_coords.get('latitude'))
        longitude = data.get('longitude', senior_coords.get('longitude'))

        session = execute_query(
            """
            INSERT INTO sessions
                (student_id, senior_id, session_time, duration_minutes, status, latitude, longitude, notes)
            VALUES
                (%s, %s, NOW(), %s, %s, %s, %s, %s)
            RETURNING session_id, status;
            """,
            (
                data['student_id'],
                data['senior_id'],
                data.get('duration_minutes', 60),
                data.get('status', 'scheduled'),
                latitude,
                longitude,
                data.get('notes'),
            ),
            commit=True,
            fetch_one=True,
        )

        return jsonify({
            "message": "Session created successfully!",
            "session_id": session['session_id'],
            "status": session['status']
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/dashboard', methods=['GET'])
def dashboard():
    totals = execute_query(
        """
        SELECT
            (SELECT COUNT(*) FROM students) AS total_students,
            (SELECT COUNT(*) FROM seniors) AS total_seniors,
            (SELECT COUNT(*) FROM sessions) AS total_sessions;
        """,
        fetch_one=True,
    )

    recent_sessions = execute_query(
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
        """,
        fetch_all=True,
    )

    students = execute_query(
        """
        SELECT student_id, first_name, last_name, latitude, longitude
        FROM students
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY student_id;
        """,
        fetch_all=True,
    )

    seniors = execute_query(
        """
        SELECT senior_id, first_name, last_name, latitude, longitude
        FROM seniors
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        ORDER BY senior_id;
        """,
        fetch_all=True,
    )

    return jsonify({
        "totals": serialize_row(totals),
        "recent_sessions": serialize_rows(recent_sessions),
        "students": serialize_rows(students),
        "seniors": serialize_rows(seniors),
    })


if __name__ == '__main__':
    port = int(os.getenv("PORT", "5001"))
    app.run(debug=True, port=port)
