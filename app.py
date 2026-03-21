from flask import Flask, render_template, request, send_file
from analyzer import analyze
import os

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/", methods=["GET", "POST"])
def index():
    summary_table = None
    download_link = None

    if request.method == "POST":
        # Check if file was uploaded
        if "file" not in request.files:
            return "No file part"
        file = request.files["file"]
        if file.filename == "":
            return "No file selected"
        
        # Save uploaded file
        filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(filepath)

        # Run analyzer
        summary = analyze(filepath)

        # The analyzer already saves summary.xlsx, we will serve it
        download_link = "summary.xlsx"

        # Convert summary to HTML table for browser display
        summary_table = summary.to_frame().to_html(classes="table table-striped")

    return render_template("index.html", table=summary_table, download_link=download_link)

@app.route("/download")
def download_file():
    path = "summary.xlsx"
    return send_file(path, as_attachment=True)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)