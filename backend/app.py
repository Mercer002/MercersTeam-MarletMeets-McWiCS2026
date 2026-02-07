from flask import Flask, jsonify, request
from flask_cors import CORS
from db import execute_query, create_student

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return jsonify({"message": "MarletMeets API is running!"})

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        # Simple query to verify DB connection
        db_test = execute_query("SELECT 1 as check_val", fetch_one=True)
        
        if db_test and db_test['check_val'] == 1:
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

@app.route('/api/students', methods=['POST'])
def register_student():
    data = request.get_json()
    
    # 1. Validation: Check for required fields
    required_fields = ['email', 'first_name', 'last_name', 'latitude', 'longitude']
    missing = [field for field in required_fields if field not in data]
    
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    # 2. Save to DB
    try:
        new_student = create_student(data)
        return jsonify({
            "message": "Student registered successfully!", 
            "student_id": new_student['student_id'],
            "student": new_student
        }), 201
        
    except Exception as e:
        if "duplicate key" in str(e):
            return jsonify({"error": "Email already registered"}), 409
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)