from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import pandas as pd

app = Flask(__name__)
CORS(app)

# Ensure uploads folder exists
UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Health check
@app.route("/", methods=["GET"])
def home():
    return "API is running"

@app.route("/health", methods=["GET"])
def health():
    return "OK", 200


# -------- ANALYZE --------
@app.route("/api/analyze", methods=["POST"])
def analyze_file():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]

        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(filepath)

        # Read Excel
        df = pd.read_excel(filepath)

        # Simple analysis (group by Category)
        if "Category" not in df.columns or "Amount" not in df.columns:
            return jsonify({"error": "Excel must contain Category and Amount columns"}), 400

        summary = df.groupby("Category")["Amount"].sum()

        # Save summary
        summary_path = os.path.join(UPLOAD_FOLDER, "summary.xlsx")
        summary.to_excel(summary_path)

        return jsonify(summary.to_dict())

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500


# -------- DOWNLOAD --------
@app.route("/download", methods=["GET"])
def download():
    path = os.path.join(UPLOAD_FOLDER, "summary.xlsx")
    if not os.path.exists(path):
        return "No summary file", 404
    return send_file(path, as_attachment=True)


# -------- SAMPLE --------
@app.route("/download-sample", methods=["GET"])
def sample():
    sample_path = os.path.join(UPLOAD_FOLDER, "sample.xlsx")

    if not os.path.exists(sample_path):
        data = {
            "Date": ["2026-01-01", "2026-01-02"],
            "Description": ["Food", "Transport"],
            "Amount": [-100, -50],
            "Category": ["Food", "Transport"],
        }
        pd.DataFrame(data).to_excel(sample_path, index=False)

    return send_file(sample_path, as_attachment=True)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)