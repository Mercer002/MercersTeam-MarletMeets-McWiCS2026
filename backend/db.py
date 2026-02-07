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