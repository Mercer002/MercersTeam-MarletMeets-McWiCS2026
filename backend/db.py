import os
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

# Initialize Connection Pool
try:
    connection_pool = psycopg2.pool.ThreadedConnectionPool(
        1,
        20,
        user=os.getenv("PG_USER"),
        password=os.getenv("PG_PASSWORD"),
        host=os.getenv("PG_HOST"),
        port=os.getenv("PG_PORT"),
        database=os.getenv("PG_DB")
    )
    if connection_pool:
        print("✅ PostgreSQL connection pool created successfully")

except (Exception, psycopg2.DatabaseError) as error:
    print("❌ Error while connecting to PostgreSQL", error)


def get_db_connection():
    return connection_pool.getconn()


def release_db_connection(conn):
    connection_pool.putconn(conn)

def execute_query(query, params=None, commit=False, fetch_one=False, fetch_all=False):
    conn = get_db_connection()
    if not conn:
        return None
    
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute(query, params)
        
        # 1. Capture results FIRST (if requested)
        result = None
        if fetch_one:
            result = cursor.fetchone()
        elif fetch_all:
            result = cursor.fetchall()
            
        # 2. Commit the changes SECOND
        if commit:
            conn.commit()
            
        return result
        
    except Exception as e:
        print(f"❌ Database Error: {e}")
        return None
    finally:
        if cursor:
            cursor.close()
        if conn:
            connection_pool.putconn(conn)

def create_student(data):
    query = """
    INSERT INTO students (
        first_name, last_name, mcgill_email, phone, 
        address, latitude, longitude, 
        skills, languages
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    RETURNING student_id, first_name, mcgill_email;
    """
    
    # We use .get() to safely extract data (avoids crashes if fields are missing)
    params = (
        data.get('first_name'),
        data.get('last_name'),
        data.get('email'),
        data.get('phone'),
        data.get('address'),
        data.get('latitude'),
        data.get('longitude'),
        data.get('skills', []),    # Default to empty list [] if missing
        data.get('languages', [])  # Default to empty list [] if missing
    )
    
    result = execute_query(query, params, commit=True, fetch_one=True)
    return result

def create_senior(data):
    query = """
    INSERT INTO seniors (
        first_name, 
        last_name, 
        email, 
        phone, 
        address, 
        latitude, 
        longitude, 
        needs, 
        languages
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    RETURNING senior_id, first_name, email;
    """
    
    params = (
        data.get('first_name'),
        data.get('last_name'),
        data.get('email'),
        data.get('phone'),
        data.get('address'),
        data.get('latitude'),
        data.get('longitude'),
        data.get('needs', []),     # Seniors have 'needs', not 'skills'
        data.get('languages', [])
    )
    
    result = execute_query(query, params, commit=True, fetch_one=True)
    return result

def create_session(data):
    query = """
    INSERT INTO sessions (
        senior_id, 
        student_id, 
        task_type, 
        description,
        status
    )
    VALUES (%s, %s, %s, %s, 'scheduled')
    RETURNING session_id, status;
    """
    
    params = (
        data.get('senior_id'),
        data.get('student_id'),
        data.get('task_type'),
        data.get('description')
    )
    
    result = execute_query(query, params, commit=True, fetch_one=True)
    return result

def get_senior_by_id(senior_id):
    query = "SELECT * FROM seniors WHERE senior_id = %s;"
    result = execute_query(query, (senior_id,), fetch_one=True)
    return result

def get_all_students():
    query = "SELECT * FROM students;"
    return execute_query(query, fetch_all=True)

def get_dashboard_data():
    # 1. Totals (The Counters)
    query_totals = """
    SELECT
        (SELECT COUNT(*) FROM students) AS total_students,
        (SELECT COUNT(*) FROM seniors) AS total_seniors,
        (SELECT COUNT(*) FROM sessions) AS total_sessions;
    """
    totals = execute_query(query_totals, fetch_one=True)

    # 2. Recent Sessions (For the Activity Feed)
    # Note: We use 'description' because that is what we named the column in Ticket 4.3
    # We join with students/seniors to get their names.
    query_recent = """
    SELECT
        s.session_id,
        s.status,
        s.task_type,
        s.description,
        s.session_time,
        st.first_name AS student_first_name,
        st.last_name AS student_last_name,
        sn.first_name AS senior_first_name,
        sn.last_name AS senior_last_name
    FROM sessions s
    LEFT JOIN students st ON s.student_id = st.student_id
    LEFT JOIN seniors sn ON s.senior_id = sn.senior_id
    ORDER BY s.created_at DESC
    LIMIT 5;
    """
    recent_sessions = execute_query(query_recent, fetch_all=True)

    # 3. Map Data (Students & Seniors with location)
    students = execute_query(
        "SELECT student_id, first_name, last_name, latitude, longitude FROM students WHERE latitude IS NOT NULL;", 
        fetch_all=True
    )
    
    seniors = execute_query(
        "SELECT senior_id, first_name, last_name, latitude, longitude FROM seniors WHERE latitude IS NOT NULL;", 
        fetch_all=True
    )
    
    # 4. Map Lines (Active Sessions)
    # We fetch the coordinates of both people to draw the green lines
    query_map_sessions = """
    SELECT 
        s.session_id,
        st.latitude as student_lat, st.longitude as student_lng,
        sn.latitude as senior_lat, sn.longitude as senior_lng
    FROM sessions s
    JOIN students st ON s.student_id = st.student_id
    JOIN seniors sn ON s.senior_id = sn.senior_id
    WHERE s.status IN ('scheduled', 'active');
    """
    map_sessions = execute_query(query_map_sessions, fetch_all=True)
    
    return {
        "totals": totals,
        "recent_sessions": recent_sessions,
        "students": students,
        "seniors": seniors,
        "sessions": map_sessions 
    }
