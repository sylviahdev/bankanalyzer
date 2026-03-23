# app.py
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from functools import wraps
import os, datetime, bcrypt, jwt
import pandas as pd

# ----------------- CONFIG -----------------
app = Flask(__name__)
CORS(app)

# PostgreSQL database — update with your username/password
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://sylvia:mypassword@localhost:5432/bankanalyzer'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# JWT secret key
SECRET_KEY = "supersecretkey"

# Uploads folder
UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize SQLAlchemy
db = SQLAlchemy(app)

# ----------------- MODELS -----------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.LargeBinary, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# ----------------- AUTH DECORATOR -----------------
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

# ----------------- ROUTES -----------------

@app.route("/", methods=["GET"])
def home():
    return "API is running"

# -------- REGISTER --------
@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 400

    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    new_user = User(username=username, password_hash=hashed)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201

# -------- LOGIN --------
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password").encode('utf-8')

    user = User.query.filter_by(username=username).first()
    if user and bcrypt.checkpw(password, user.password_hash):
        token = jwt.encode({
            "user": username,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
        }, SECRET_KEY, algorithm="HS256")
        return jsonify({"token": token})

    return jsonify({"error": "Invalid credentials"}), 401

# -------- ANALYZE FILE --------
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

# -------- DOWNLOAD SUMMARY --------
@app.route("/download", methods=["GET"])
@token_required
def download():
    path = os.path.join(UPLOAD_FOLDER, "summary.xlsx")
    if not os.path.exists(path):
        return "No summary file", 404
    return send_file(path, as_attachment=True)

# ----------------- RUN -----------------
if __name__ == "__main__":
    with app.app_context():
        db.create_all()  # Create tables if not exist
    app.run(host="0.0.0.0", port=10000)