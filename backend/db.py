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


def execute_query(query, params=None, fetch_one=False, commit=False):
    conn = get_db_connection()
    result = None
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            
            if commit:
                conn.commit()
                try:
                    result = cur.fetchone() 
                except psycopg2.ProgrammingError:
                    result = {"status": "success"}
            else:
                if fetch_one:
                    result = cur.fetchone()
                else:
                    result = cur.fetchall()
                    
    except Exception as e:
        conn.rollback()
        print(f"❌ Query Error: {e}")
        raise e
        
    finally:
        release_db_connection(conn)
        
    return result

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
