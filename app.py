from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import pandas as pd
import jwt
import datetime
from functools import wraps

app = Flask(__name__)
CORS(app)

SECRET_KEY = "supersecretkey"

# Ensure uploads folder exists
UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# -------- AUTH DECORATOR --------
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")

        if not token:
            return jsonify({"error": "Token missing"}), 401

        try:
            jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        except:
            return jsonify({"error": "Invalid or expired token"}), 401

        return f(*args, **kwargs)

    return decorated


# -------- HOME --------
@app.route("/", methods=["GET"])
def home():
    return "API is running"


# -------- LOGIN --------
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()

    username = data.get("username")
    password = data.get("password")

    # Demo user
    if username == "admin" and password == "1234":
        token = jwt.encode({
            "user": username,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
        }, SECRET_KEY, algorithm="HS256")

        return jsonify({"token": token})

    return jsonify({"error": "Invalid credentials"}), 401


# -------- ANALYZE --------
@app.route("/api/analyze", methods=["POST"])
@token_required
def analyze_file():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]

        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(filepath)

        df = pd.read_excel(filepath)

        if "Category" not in df.columns or "Amount" not in df.columns:
            return jsonify({"error": "Excel must contain Category and Amount columns"}), 400

        summary = df.groupby("Category")["Amount"].sum()

        summary_path = os.path.join(UPLOAD_FOLDER, "summary.xlsx")
        summary.to_excel(summary_path)

        return jsonify(summary.to_dict())

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500


# -------- DOWNLOAD --------
@app.route("/download", methods=["GET"])
@token_required
def download():
    path = os.path.join(UPLOAD_FOLDER, "summary.xlsx")
    if not os.path.exists(path):
        return "No summary file", 404
    return send_file(path, as_attachment=True)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)