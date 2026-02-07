from flask import Flask, jsonify
from flask_cors import CORS
from db import execute_query

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

if __name__ == '__main__':
    app.run(debug=True, port=5000)