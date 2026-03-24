from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from functools import wraps
import os
import datetime
import bcrypt
import jwt
import logging
import pandas as pd

# ----------------- CONFIG -----------------
app = Flask(__name__)
CORS(app)

# Logging
logging.basicConfig(level=logging.INFO)

# PostgreSQL config
DB_USER = "sylvia"
DB_PASSWORD = "sly"
DB_NAME = "bankanalyzer"
DB_HOST = "localhost"

app.config['SQLALCHEMY_DATABASE_URI'] = f'postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:5432/{DB_NAME}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# JWT secret
SECRET_KEY = "supersecretkey"

# Upload folder
UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Init DB
db = SQLAlchemy(app)

# ----------------- MODEL -----------------
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.LargeBinary, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# ----------------- AUTH -----------------
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")

        if not token:
            return jsonify({"error": "Token missing"}), 401

        try:
            jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)

    return decorated

# ----------------- ROUTES -----------------

@app.route("/")
def home():
    return "API is running 🚀"

# -------- REGISTER --------
@app.route("/api/register", methods=["POST"])
def register():
    try:
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return jsonify({"error": "Username and password required"}), 400

        if User.query.filter_by(username=username).first():
            return jsonify({"error": "Username already exists"}), 400

        hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

        new_user = User(username=username, password_hash=hashed)
        db.session.add(new_user)
        db.session.commit()

        logging.info(f"User registered: {username}")

        return jsonify({"message": "User registered successfully"}), 201

    except Exception as e:
        logging.exception("REGISTER ERROR")
        return jsonify({"error": str(e)}), 500

# -------- LOGIN --------
@app.route("/api/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")

        user = User.query.filter_by(username=username).first()

        if user and bcrypt.checkpw(password.encode("utf-8"), user.password_hash):
            token = jwt.encode({
                "user": username,
                "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
            }, SECRET_KEY, algorithm="HS256")

            logging.info(f"User logged in: {username}")

            return jsonify({"token": token})

        return jsonify({"error": "Invalid credentials"}), 401

    except Exception as e:
        logging.exception("LOGIN ERROR")
        return jsonify({"error": str(e)}), 500

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

        logging.info("File analyzed successfully")

        return jsonify(summary.to_dict())

    except Exception as e:
        logging.exception("ANALYZE ERROR")
        return jsonify({"error": str(e)}), 500

# -------- DOWNLOAD --------
@app.route("/download", methods=["GET"])
@token_required
def download():
    try:
        path = os.path.join(UPLOAD_FOLDER, "summary.xlsx")

        if not os.path.exists(path):
            return jsonify({"error": "No summary file"}), 404

        return send_file(path, as_attachment=True)

    except Exception as e:
        logging.exception("DOWNLOAD ERROR")
        return jsonify({"error": str(e)}), 500

# ----------------- RUN -----------------
if __name__ == "__main__":
    try:
        with app.app_context():
            db.create_all()
        logging.info("✅ Database connected successfully")
    except Exception as e:
        logging.exception("❌ Database connection failed")

    app.run(host="0.0.0.0", port=10000)