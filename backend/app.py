import os
from datetime import date, datetime
from decimal import Decimal

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask.json.provider import DefaultJSONProvider
from werkzeug.security import generate_password_hash, check_password_hash

from db import execute_query, create_student, create_senior, get_senior_by_id, get_all_students
from matching import MatchingEngine

try:
    import googlemaps
except Exception:
    googlemaps = None

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


def geocode_address(address):
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        return None, None, "Missing GOOGLE_MAPS_API_KEY"
    if googlemaps is None:
        return None, None, "googlemaps library not installed"

    client = googlemaps.Client(key=api_key)
    try:
        results = client.geocode(address)
    except Exception as exc:
        return None, None, f"Geocoding error: {exc}"

    if not results:
        return None, None, "No geocoding results"

    location = results[0].get("geometry", {}).get("location", {})
    lat = location.get("lat")
    lng = location.get("lng")
    if lat is None or lng is None:
        return None, None, "Geocoding returned no coordinates"
    return lat, lng, None


def serialize_row(row):
    if row is None:
        return None
    return {k: row.get(k) for k in row.keys()}


def serialize_rows(rows):
    return [serialize_row(r) for r in (rows or [])]


def ensure_auth_schema():
    execute_query(
        """
        CREATE TABLE IF NOT EXISTS users (
            user_id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role VARCHAR(20) NOT NULL,
            student_id INT REFERENCES students(student_id) ON DELETE SET NULL,
            senior_id INT REFERENCES seniors(senior_id) ON DELETE SET NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """,
        commit=True,
    )
    execute_query(
        """
        CREATE TABLE IF NOT EXISTS auth_tokens (
            token TEXT PRIMARY KEY,
            user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW()
        );
        """,
        commit=True,
    )
    execute_query(
        """
        CREATE TABLE IF NOT EXISTS senior_tasks (
            task_id SERIAL PRIMARY KEY,
            senior_id INT REFERENCES seniors(senior_id) ON DELETE CASCADE,
            task_text TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'open',
            created_at TIMESTAMP DEFAULT NOW()
        );
        """,
        commit=True,
    )
    execute_query(
        """
        CREATE TABLE IF NOT EXISTS matches (
            match_id SERIAL PRIMARY KEY,
            student_id INT REFERENCES students(student_id) ON DELETE CASCADE,
            senior_id INT REFERENCES seniors(senior_id) ON DELETE CASCADE,
            status VARCHAR(20) DEFAULT 'selected',
            created_at TIMESTAMP DEFAULT NOW()
        );
        """,
        commit=True,
    )
    existing_admin = execute_query(
        "SELECT user_id FROM users WHERE email = %s;",
        ("admin@mail.mcgill.ca",),
        fetch_one=True,
    )
    if not existing_admin:
        password_hash = generate_password_hash("admin123", method="pbkdf2:sha256")
        execute_query(
            """
            INSERT INTO users (email, password_hash, role)
            VALUES (%s, %s, 'admin');
            """,
            ("admin@mail.mcgill.ca", password_hash),
            commit=True,
        )


# Ensure auth tables exist even when app is imported (e.g., flask run)
ensure_auth_schema()


def get_bearer_token():
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return None


def get_current_user():
    token = get_bearer_token()
    if not token:
        return None
    return execute_query(
        """
        SELECT u.user_id, u.email, u.role, u.student_id, u.senior_id
        FROM auth_tokens t
        JOIN users u ON t.user_id = u.user_id
        WHERE t.token = %s;
        """,
        (token,),
        fetch_one=True,
    )


def create_auth_token(user_id):
    token = os.urandom(24).hex()
    execute_query(
        "INSERT INTO auth_tokens (token, user_id) VALUES (%s, %s);",
        (token, user_id),
        commit=True,
    )
    return token


def update_senior_needs_from_tasks(senior_id):
    tasks = execute_query(
        """
        SELECT task_text
        FROM senior_tasks
        WHERE senior_id = %s AND status = 'open'
        ORDER BY task_id;
        """,
        (senior_id,),
        fetch_all=True,
    )
    needs = [t["task_text"] for t in (tasks or [])]
    execute_query(
        "UPDATE seniors SET needs = %s WHERE senior_id = %s;",
        (needs, senior_id),
        commit=True,
    )


def score_seniors_for_student(student, seniors):
    engine = MatchingEngine()
    scored = []
    for senior in seniors:
        score = engine.calculate_score(senior, student)
        scored.append(
            {
                "senior_id": senior.get("senior_id"),
                "first_name": senior.get("first_name"),
                "last_name": senior.get("last_name"),
                "total_score": score.get("total_score"),
                "distance_km": score.get("distance_km"),
                "common_skills": score.get("common_skills"),
                "needs": senior.get("needs", []),
            }
        )
    scored.sort(key=lambda x: x["total_score"], reverse=True)
    return scored

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


@app.route('/api/auth/signup/student', methods=['POST'])
def signup_student():
    data = request.get_json() or {}
    required_fields = ['email', 'password', 'first_name', 'last_name', 'phone', 'address']
    missing = [field for field in required_fields if not data.get(field)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    email = data.get('email', '').strip().lower()
    existing = execute_query("SELECT user_id FROM users WHERE email = %s;", (email,), fetch_one=True)
    if existing:
        return jsonify({"error": "Email already registered"}), 409

    if data.get("latitude") is None or data.get("longitude") is None:
        lat, lng, geo_err = geocode_address(data.get("address"))
        if lat is not None and lng is not None:
            data["latitude"] = lat
            data["longitude"] = lng
        elif geo_err:
            return jsonify({"error": f"Geocoding failed: {geo_err}"}), 400

    student = create_student({
        "first_name": data.get("first_name"),
        "last_name": data.get("last_name"),
        "email": email,
        "phone": data.get("phone"),
        "address": data.get("address"),
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
        "skills": [],
        "languages": [],
    })
    if not student:
        return jsonify({"error": "Failed to create student."}), 500

    password_hash = generate_password_hash(data.get("password"), method="pbkdf2:sha256")
    user = execute_query(
        """
        INSERT INTO users (email, password_hash, role, student_id)
        VALUES (%s, %s, 'student', %s)
        RETURNING user_id, email, role, student_id, senior_id;
        """,
        (email, password_hash, student["student_id"]),
        commit=True,
        fetch_one=True,
    )
    if not user:
        return jsonify({"error": "Failed to create user."}), 500

    token = create_auth_token(user["user_id"])
    return jsonify({"token": token, "user": serialize_row(user)}), 201


@app.route('/api/auth/signup/senior', methods=['POST'])
def signup_senior():
    data = request.get_json() or {}
    required_fields = ['email', 'password', 'first_name', 'last_name', 'phone', 'address']
    missing = [field for field in required_fields if not data.get(field)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    email = data.get('email', '').strip().lower()
    existing = execute_query("SELECT user_id FROM users WHERE email = %s;", (email,), fetch_one=True)
    if existing:
        return jsonify({"error": "Email already registered"}), 409

    if data.get("latitude") is None or data.get("longitude") is None:
        lat, lng, geo_err = geocode_address(data.get("address"))
        if lat is not None and lng is not None:
            data["latitude"] = lat
            data["longitude"] = lng
        elif geo_err:
            return jsonify({"error": f"Geocoding failed: {geo_err}"}), 400

    senior = create_senior({
        "first_name": data.get("first_name"),
        "last_name": data.get("last_name"),
        "email": email,
        "phone": data.get("phone"),
        "address": data.get("address"),
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
        "needs": [],
        "languages": [],
    })
    if not senior:
        return jsonify({"error": "Failed to create senior."}), 500

    password_hash = generate_password_hash(data.get("password"), method="pbkdf2:sha256")
    user = execute_query(
        """
        INSERT INTO users (email, password_hash, role, senior_id)
        VALUES (%s, %s, 'senior', %s)
        RETURNING user_id, email, role, student_id, senior_id;
        """,
        (email, password_hash, senior["senior_id"]),
        commit=True,
        fetch_one=True,
    )
    if not user:
        return jsonify({"error": "Failed to create user."}), 500

    token = create_auth_token(user["user_id"])
    return jsonify({"token": token, "user": serialize_row(user)}), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    user = execute_query(
        "SELECT user_id, email, role, password_hash, student_id, senior_id FROM users WHERE email = %s;",
        (email,),
        fetch_one=True,
    )
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid credentials."}), 401

    token = create_auth_token(user["user_id"])
    user.pop("password_hash", None)
    return jsonify({"token": token, "user": serialize_row(user)}), 200


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    token = get_bearer_token()
    if not token:
        return jsonify({"error": "Missing token."}), 400
    execute_query("DELETE FROM auth_tokens WHERE token = %s;", (token,), commit=True)
    return jsonify({"message": "Logged out."}), 200


@app.route('/api/student/profile', methods=['GET', 'POST'])
def student_profile():
    user = get_current_user()
    if not user or user.get("role") != "student":
        return jsonify({"error": "Unauthorized."}), 401

    if request.method == 'GET':
        profile = execute_query(
            "SELECT student_id, first_name, last_name, skills, languages FROM students WHERE student_id = %s;",
            (user["student_id"],),
            fetch_one=True,
        )
        return jsonify({"student": serialize_row(profile)})

    data = request.get_json() or {}
    skills = data.get("skills", [])
    languages = data.get("languages", [])
    execute_query(
        "UPDATE students SET skills = %s, languages = %s WHERE student_id = %s;",
        (skills, languages, user["student_id"]),
        commit=True,
    )
    profile = execute_query(
        "SELECT student_id, first_name, last_name, skills, languages FROM students WHERE student_id = %s;",
        (user["student_id"],),
        fetch_one=True,
    )
    return jsonify({"student": serialize_row(profile)}), 200


@app.route('/api/student/matches', methods=['GET'])
def student_matches():
    user = get_current_user()
    if not user or user.get("role") != "student":
        return jsonify({"error": "Unauthorized."}), 401

    student = execute_query(
        "SELECT * FROM students WHERE student_id = %s;",
        (user["student_id"],),
        fetch_one=True,
    )
    seniors = execute_query("SELECT * FROM seniors;", fetch_all=True)
    matches = score_seniors_for_student(student, seniors or [])
    return jsonify({"matches": matches})


@app.route('/api/student/selection', methods=['GET'])
def student_selection():
    user = get_current_user()
    if not user or user.get("role") != "student":
        return jsonify({"error": "Unauthorized."}), 401

    selections = execute_query(
        """
        SELECT m.match_id, m.senior_id, m.status, m.created_at,
               s.first_name, s.last_name, s.phone, s.latitude, s.longitude, s.address
        FROM matches m
        JOIN seniors s ON m.senior_id = s.senior_id
        WHERE m.student_id = %s AND m.status = 'selected'
        ORDER BY m.created_at DESC
        """,
        (user["student_id"],),
        fetch_all=True,
    )
    student = execute_query(
        "SELECT phone, latitude, longitude, address FROM students WHERE student_id = %s;",
        (user["student_id"],),
        fetch_one=True,
    )
    if student and (student.get("latitude") is None or student.get("longitude") is None):
        lat, lng, geo_err = geocode_address(student.get("address"))
        if lat is not None and lng is not None:
            execute_query(
                "UPDATE students SET latitude = %s, longitude = %s WHERE student_id = %s;",
                (lat, lng, user["student_id"]),
                commit=True,
            )
            student["latitude"] = lat
            student["longitude"] = lng

    if selections:
        for sel in selections:
            if sel.get("latitude") is None or sel.get("longitude") is None:
                lat, lng, geo_err = geocode_address(sel.get("address"))
                if lat is not None and lng is not None:
                    execute_query(
                        "UPDATE seniors SET latitude = %s, longitude = %s WHERE senior_id = %s;",
                        (lat, lng, sel.get("senior_id")),
                        commit=True,
                    )
                    sel["latitude"] = lat
                    sel["longitude"] = lng
    return jsonify({
        "selections": serialize_rows(selections),
        "student_phone": student.get("phone") if student else None,
        "student_address": student.get("address") if student else None,
        "student_location": {
            "latitude": student.get("latitude"),
            "longitude": student.get("longitude"),
        } if student else None,
    })


@app.route('/api/student/select', methods=['POST'])
def student_select():
    user = get_current_user()
    if not user or user.get("role") != "student":
        return jsonify({"error": "Unauthorized."}), 401

    data = request.get_json() or {}
    senior_id = data.get("senior_id")
    if not senior_id:
        return jsonify({"error": "senior_id is required."}), 400

    # Ensure student has coordinates
    student_coords = execute_query(
        "SELECT student_id, address, latitude, longitude FROM students WHERE student_id = %s;",
        (user["student_id"],),
        fetch_one=True,
    )
    if student_coords and (student_coords.get("latitude") is None or student_coords.get("longitude") is None):
        lat, lng, geo_err = geocode_address(student_coords.get("address"))
        if lat is not None and lng is not None:
            execute_query(
                "UPDATE students SET latitude = %s, longitude = %s WHERE student_id = %s;",
                (lat, lng, user["student_id"]),
                commit=True,
            )

    # Ensure senior has coordinates
    senior_coords = execute_query(
        "SELECT senior_id, address, latitude, longitude FROM seniors WHERE senior_id = %s;",
        (senior_id,),
        fetch_one=True,
    )
    if senior_coords and (senior_coords.get("latitude") is None or senior_coords.get("longitude") is None):
        lat, lng, geo_err = geocode_address(senior_coords.get("address"))
        if lat is not None and lng is not None:
            execute_query(
                "UPDATE seniors SET latitude = %s, longitude = %s WHERE senior_id = %s;",
                (lat, lng, senior_id),
                commit=True,
            )

    existing = execute_query(
        "SELECT match_id FROM matches WHERE student_id = %s AND senior_id = %s AND status = 'selected';",
        (user["student_id"], senior_id),
        fetch_one=True,
    )
    if existing:
        return jsonify({"message": "Already selected."}), 200

    execute_query(
        """
        INSERT INTO matches (student_id, senior_id, status)
        VALUES (%s, %s, 'selected');
        """,
        (user["student_id"], senior_id),
        commit=True,
    )

    senior = execute_query(
        "SELECT senior_id, first_name, last_name, phone FROM seniors WHERE senior_id = %s;",
        (senior_id,),
        fetch_one=True,
    )
    student = execute_query(
        "SELECT student_id, first_name, last_name, phone FROM students WHERE student_id = %s;",
        (user["student_id"],),
        fetch_one=True,
    )
    return jsonify({
        "message": "Senior selected.",
        "senior": serialize_row(senior),
        "student": serialize_row(student),
    }), 201


@app.route('/api/student/select/<int:senior_id>', methods=['DELETE'])
def student_deselect(senior_id):
    user = get_current_user()
    if not user or user.get("role") != "student":
        return jsonify({"error": "Unauthorized."}), 401

    execute_query(
        "DELETE FROM matches WHERE student_id = %s AND senior_id = %s;",
        (user["student_id"], senior_id),
        commit=True,
    )
    return jsonify({"message": "Senior deselected."}), 200


@app.route('/api/student/map-data', methods=['GET'])
def student_map_data():
    user = get_current_user()
    if not user or user.get("role") != "student":
        return jsonify({"error": "Unauthorized."}), 401

    student = execute_query(
        "SELECT student_id, first_name, last_name, address, latitude, longitude FROM students WHERE student_id = %s;",
        (user["student_id"],),
        fetch_one=True,
    )

    seniors = execute_query(
        """
        SELECT s.senior_id, s.first_name, s.last_name, s.address, s.latitude, s.longitude
        FROM matches m
        JOIN seniors s ON m.senior_id = s.senior_id
        WHERE m.student_id = %s AND m.status = 'selected'
        ORDER BY m.created_at DESC;
        """,
        (user["student_id"],),
        fetch_all=True,
    )

    # Attempt server-side geocode if coordinates are missing
    if student and (student.get("latitude") is None or student.get("longitude") is None):
        lat, lng, geo_err = geocode_address(student.get("address"))
        if lat is not None and lng is not None:
            execute_query(
                "UPDATE students SET latitude = %s, longitude = %s WHERE student_id = %s;",
                (lat, lng, user["student_id"]),
                commit=True,
            )
            student["latitude"] = lat
            student["longitude"] = lng

    for senior in seniors or []:
        if senior.get("latitude") is None or senior.get("longitude") is None:
            lat, lng, geo_err = geocode_address(senior.get("address"))
            if lat is not None and lng is not None:
                execute_query(
                    "UPDATE seniors SET latitude = %s, longitude = %s WHERE senior_id = %s;",
                    (lat, lng, senior.get("senior_id")),
                    commit=True,
                )
                senior["latitude"] = lat
                senior["longitude"] = lng

    return jsonify({
        "student": serialize_row(student),
        "seniors": serialize_rows(seniors),
    })


@app.route('/api/senior/tasks', methods=['GET', 'POST'])
def senior_tasks():
    user = get_current_user()
    if not user or user.get("role") != "senior":
        return jsonify({"error": "Unauthorized."}), 401

    if request.method == 'GET':
        tasks = execute_query(
            "SELECT task_id, task_text, status FROM senior_tasks WHERE senior_id = %s ORDER BY task_id;",
            (user["senior_id"],),
            fetch_all=True,
        )
        return jsonify({"tasks": serialize_rows(tasks)})

    data = request.get_json() or {}
    task_text = (data.get("task_text") or "").strip()
    if not task_text:
        return jsonify({"error": "Task text is required."}), 400

    task = execute_query(
        """
        INSERT INTO senior_tasks (senior_id, task_text)
        VALUES (%s, %s)
        RETURNING task_id, task_text, status;
        """,
        (user["senior_id"], task_text),
        commit=True,
        fetch_one=True,
    )
    update_senior_needs_from_tasks(user["senior_id"])
    return jsonify({"task": serialize_row(task)}), 201


@app.route('/api/senior/tasks/<int:task_id>', methods=['PUT', 'DELETE'])
def update_senior_task(task_id):
    user = get_current_user()
    if not user or user.get("role") != "senior":
        return jsonify({"error": "Unauthorized."}), 401

    if request.method == 'DELETE':
        execute_query(
            "DELETE FROM senior_tasks WHERE task_id = %s AND senior_id = %s;",
            (task_id, user["senior_id"]),
            commit=True,
        )
        update_senior_needs_from_tasks(user["senior_id"])
        return jsonify({"message": "Task deleted."}), 200

    data = request.get_json() or {}
    status = data.get("status")
    task_text = data.get("task_text")
    if not status and not task_text:
        return jsonify({"error": "Nothing to update."}), 400

    execute_query(
        """
        UPDATE senior_tasks
        SET task_text = COALESCE(%s, task_text),
            status = COALESCE(%s, status)
        WHERE task_id = %s AND senior_id = %s;
        """,
        (task_text, status, task_id, user["senior_id"]),
        commit=True,
    )
    update_senior_needs_from_tasks(user["senior_id"])
    task = execute_query(
        "SELECT task_id, task_text, status FROM senior_tasks WHERE task_id = %s;",
        (task_id,),
        fetch_one=True,
    )
    return jsonify({"task": serialize_row(task)}), 200


@app.route('/api/senior/notifications', methods=['GET'])
def senior_notifications():
    user = get_current_user()
    if not user or user.get("role") != "senior":
        return jsonify({"error": "Unauthorized."}), 401

    notifications = execute_query(
        """
        SELECT m.match_id, m.created_at, st.first_name, st.last_name, st.phone AS student_phone
        FROM matches m
        JOIN students st ON m.student_id = st.student_id
        WHERE m.senior_id = %s AND m.status = 'selected'
        ORDER BY m.created_at DESC;
        """,
        (user["senior_id"],),
        fetch_all=True,
    )
    senior = execute_query(
        "SELECT phone FROM seniors WHERE senior_id = %s;",
        (user["senior_id"],),
        fetch_one=True,
    )
    return jsonify({"notifications": serialize_rows(notifications), "senior_phone": senior.get("phone") if senior else None})


@app.route('/api/admin/overview', methods=['GET'])
def admin_overview():
    user = get_current_user()
    if not user or user.get("role") != "admin":
        return jsonify({"error": "Unauthorized."}), 401

    students = execute_query("SELECT * FROM students;", fetch_all=True)
    seniors = execute_query("SELECT * FROM seniors;", fetch_all=True)
    tasks = execute_query("SELECT * FROM senior_tasks;", fetch_all=True)
    sessions = execute_query("SELECT * FROM sessions;", fetch_all=True)
    matches = execute_query("SELECT * FROM matches;", fetch_all=True)
    users = execute_query("SELECT user_id, email, role, student_id, senior_id FROM users;", fetch_all=True)
    return jsonify({
        "students": serialize_rows(students),
        "seniors": serialize_rows(seniors),
        "tasks": serialize_rows(tasks),
        "sessions": serialize_rows(sessions),
        "matches": serialize_rows(matches),
        "users": serialize_rows(users),
    })


@app.route('/api/admin/backfill-geocode', methods=['POST'])
def admin_backfill_geocode():
    user = get_current_user()
    if not user or user.get("role") != "admin":
        return jsonify({"error": "Unauthorized."}), 401

    updated_students = 0
    updated_seniors = 0

    students = execute_query(
        "SELECT student_id, address, latitude, longitude FROM students;",
        fetch_all=True,
    )
    for student in students or []:
        if student.get("latitude") is None or student.get("longitude") is None:
            lat, lng, geo_err = geocode_address(student.get("address"))
            if lat is not None and lng is not None:
                execute_query(
                    "UPDATE students SET latitude = %s, longitude = %s WHERE student_id = %s;",
                    (lat, lng, student.get("student_id")),
                    commit=True,
                )
                updated_students += 1

    seniors = execute_query(
        "SELECT senior_id, address, latitude, longitude FROM seniors;",
        fetch_all=True,
    )
    for senior in seniors or []:
        if senior.get("latitude") is None or senior.get("longitude") is None:
            lat, lng, geo_err = geocode_address(senior.get("address"))
            if lat is not None and lng is not None:
                execute_query(
                    "UPDATE seniors SET latitude = %s, longitude = %s WHERE senior_id = %s;",
                    (lat, lng, senior.get("senior_id")),
                    commit=True,
                )
                updated_seniors += 1

    return jsonify({
        "updated_students": updated_students,
        "updated_seniors": updated_seniors,
    }), 200


@app.route('/api/students', methods=['POST'])
def register_student():
    data = request.get_json() or {}

    required_fields = ['email', 'first_name', 'last_name', 'phone', 'address']
    missing = [field for field in required_fields if not data.get(field)]

    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    data['email'] = data.get('email', '').strip().lower()

    try:
        if data.get("latitude") is None or data.get("longitude") is None:
            lat, lng, geo_err = geocode_address(data.get("address"))
            if lat is not None and lng is not None:
                data["latitude"] = lat
                data["longitude"] = lng
            elif geo_err:
                return jsonify({"error": f"Geocoding failed: {geo_err}"}), 400

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
        if data.get("latitude") is None or data.get("longitude") is None:
            lat, lng, geo_err = geocode_address(data.get("address"))
            if lat is not None and lng is not None:
                data["latitude"] = lat
                data["longitude"] = lng
            elif geo_err:
                return jsonify({"error": f"Geocoding failed: {geo_err}"}), 400

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


@app.route('/api/senior/profile', methods=['GET', 'POST'])
def senior_profile():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    if user.get("role") != "senior":
        return jsonify({"error": "Forbidden"}), 403
    senior_id = user.get("senior_id")
    if not senior_id:
        return jsonify({"error": "Senior profile not linked"}), 400

    if request.method == 'GET':
        senior = execute_query(
            "SELECT senior_id, first_name, last_name, email, phone, address, languages FROM seniors WHERE senior_id = %s;",
            (senior_id,),
            fetch_one=True,
        )
        return jsonify({"senior": serialize_row(senior)})

    data = request.get_json() or {}
    languages = data.get("languages")
    if languages is None:
        return jsonify({"error": "Missing languages"}), 400
    if not isinstance(languages, list):
        return jsonify({"error": "Languages must be a list"}), 400

    execute_query(
        "UPDATE seniors SET languages = %s WHERE senior_id = %s;",
        (languages, senior_id),
        commit=True,
    )
    senior = execute_query(
        "SELECT senior_id, first_name, last_name, email, phone, address, languages FROM seniors WHERE senior_id = %s;",
        (senior_id,),
        fetch_one=True,
    )
    return jsonify({"message": "Profile updated", "senior": serialize_row(senior)})


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
            (SELECT COUNT(*) FROM sessions) AS total_sessions,
            (SELECT COALESCE(SUM(duration_minutes), 0) FROM sessions) AS total_minutes;
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
    ensure_auth_schema()
    port = int(os.getenv("PORT", "5001"))
    app.run(debug=True, port=port)
