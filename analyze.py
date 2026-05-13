import re
import uuid
from pathlib import Path

import pandas as pd
from flask import Blueprint, current_app, g, jsonify, request, send_file

from extensions import limiter
from idempotency import idempotent
from security import auth_required

bp = Blueprint("analyze", __name__, url_prefix="/api")

TOKEN_RE = re.compile(r"^[0-9a-f]{32}$")

CATEGORY_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("Income", ("salary", "dividend", "interest", "refund", "payroll")),
    ("Transport", ("uber", "lyft", "transport", "metro", "taxi", "fuel", "gas station")),
    ("Groceries", ("supermarket", "grocery", "market", "tesco", "walmart", "aldi", "lidl")),
    ("Food", ("restaurant", "cafe", "coffee", "starbucks", "mcdonald", "doordash", "ubereats")),
    ("Bills", ("electricity", "water", "internet", "utility", "bill")),
    ("Rent", ("rent", "mortgage", "landlord")),
    ("Subscriptions", ("netflix", "spotify", "subscription", "prime")),
]


def _categorize(description: str) -> str:
    desc = (description or "").lower()
    for category, keywords in CATEGORY_RULES:
        if any(k in desc for k in keywords):
            return category
    return "Other"


def _allowed_ext(filename: str) -> bool:
    if "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in current_app.config["ALLOWED_EXTENSIONS"]


def _user_dir() -> Path:
    base = Path(current_app.config["UPLOAD_FOLDER"]) / f"user_{g.user.id}"
    base.mkdir(parents=True, exist_ok=True)
    return base


def _read_dataframe(path: Path, ext: str) -> pd.DataFrame:
    if ext == "csv":
        try:
            return pd.read_csv(path, encoding="utf-8")
        except UnicodeDecodeError:
            return pd.read_csv(path, encoding="latin1")
    return pd.read_excel(path, engine="openpyxl")


@bp.post("/analyze")
@auth_required
@idempotent
@limiter.limit("30 per hour")
def analyze():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400
    if not _allowed_ext(file.filename):
        return jsonify({"error": "Unsupported file type; use .xlsx or .csv"}), 415

    ext = file.filename.rsplit(".", 1)[1].lower()
    token = uuid.uuid4().hex
    user_dir = _user_dir()
    src = user_dir / f"upload_{token}.{ext}"

    file.save(src)

    try:
        try:
            df = _read_dataframe(src, ext)
        except Exception:
            current_app.logger.exception(
                "parse_failed", extra={"user_id": g.user.id, "token": token}
            )
            return jsonify({"error": "Could not parse file"}), 400

        if len(df) > current_app.config["MAX_ROWS"]:
            return jsonify({"error": "File has too many rows"}), 413

        if "Amount" not in df.columns:
            return jsonify({"error": "File must contain an 'Amount' column"}), 400

        if "Category" not in df.columns:
            if "Description" not in df.columns:
                return jsonify(
                    {"error": "File must contain 'Category' or 'Description' with 'Amount'"}
                ), 400
            df["Category"] = df["Description"].astype(str).apply(_categorize)

        df["Amount"] = pd.to_numeric(df["Amount"], errors="coerce")
        df = df.dropna(subset=["Amount"])
        if df.empty:
            return jsonify({"error": "No valid numeric rows in 'Amount'"}), 400

        summary = df.groupby("Category", as_index=True)["Amount"].sum().round(2)

        summary_path = user_dir / f"summary_{token}.xlsx"
        summary.to_frame("Total").to_excel(summary_path)
    finally:
        src.unlink(missing_ok=True)

    current_app.logger.info(
        "analyze_done",
        extra={"user_id": g.user.id, "token": token, "rows": int(len(df))},
    )
    return jsonify(
        {
            "token": token,
            "summary": {k: float(v) for k, v in summary.to_dict().items()},
            "total_transactions": int(len(df)),
        }
    )


@bp.get("/download/<token>")
@auth_required
@limiter.limit("60 per hour")
def download(token: str):
    if not TOKEN_RE.match(token):
        return jsonify({"error": "Invalid token"}), 400
    path = _user_dir() / f"summary_{token}.xlsx"
    if not path.is_file():
        return jsonify({"error": "Not found"}), 404
    return send_file(path, as_attachment=True, download_name="summary.xlsx")
