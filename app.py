from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from analyzer import analyze  # your existing analyzer function
import os
import pandas as pd

# Initialize app
app = Flask(__name__)
CORS(app)  # allow requests from any frontend

# Folders
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Sample file path
SAMPLE_FILE = "sample_bank_statement.xlsx"

# Make sure sample file exists (generated previously)
if not os.path.exists(SAMPLE_FILE):
    sample_data = {
        "Date": ["2026-03-01", "2026-03-05", "2026-03-10", "2026-03-15"],
        "Description": ["Salary", "Groceries", "Electricity Bill", "Dining"],
        "Amount": [5000, -150, -75, -60],
        "Category": ["Income", "Food", "Utilities", "Food"]
    }
    pd.DataFrame(sample_data).to_excel(SAMPLE_FILE, index=False)

# ------------------------------
# API to analyze uploaded file
# ------------------------------
@app.route("/api/analyze", methods=["POST"])
def analyze_file():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file part"}), 400
        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(filepath)

        summary = analyze(filepath)
        summary.to_excel("summary.xlsx")

        return jsonify(summary.to_dict()), 200

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500

# ------------------------------
# Endpoint to download Excel
# ------------------------------
@app.route("/download")
def download_file():
    try:
        if os.path.exists("summary.xlsx"):
            return send_file("summary.xlsx", as_attachment=True)
        else:
            return jsonify({"error": "No summary file available"}), 404
    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500

# ------------------------------
# Endpoint to download sample file
# ------------------------------
@app.route("/download-sample")
def download_sample():
    try:
        return send_file(SAMPLE_FILE, as_attachment=True)
    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500

# ------------------------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)