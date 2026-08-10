import re
import uuid
from pathlib import Path

import pandas as pd
from flask import Blueprint, current_app, g, jsonify, request, send_file
from sqlalchemy import func

from extensions import db, limiter
from idempotency import idempotent
from models import Statement, Transaction
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


def _resolve_column(df: pd.DataFrame, name: str) -> str | None:
    """Find a column by exact name first, then case-insensitively."""
    if name in df.columns:
        return name
    lowered = {str(c).strip().lower(): c for c in df.columns}
    return lowered.get(name.lower())


def _persist(df: pd.DataFrame, token: str, filename: str) -> Statement:
    """Store the parsed rows so they can be queried later. Additive to the
    original stateless behaviour: the JSON summary is unchanged."""
    desc_col = _resolve_column(df, "Description")
    date_col = _resolve_column(df, "Date")

    dates = None
    if date_col is not None:
        dates = pd.to_datetime(df[date_col], errors="coerce").dt.date

    amounts = df["Amount"]
    income = float(amounts[amounts > 0].sum())
    expenses = float(amounts[amounts < 0].sum())

    valid_dates = [d for d in dates if pd.notna(d)] if dates is not None else []

    statement = Statement(
        user_id=g.user.id,
        token=token,
        filename=filename[:255],
        row_count=int(len(df)),
        total_income=round(income, 2),
        total_expenses=round(expenses, 2),
        period_start=min(valid_dates) if valid_dates else None,
        period_end=max(valid_dates) if valid_dates else None,
    )
    db.session.add(statement)
    db.session.flush()  # assign statement.id without committing yet

    descriptions = df[desc_col].astype(str) if desc_col is not None else None
    rows = []
    for pos in range(len(df)):
        amount = float(amounts.iloc[pos])
        date = dates.iloc[pos] if dates is not None else None
        rows.append(
            {
                "user_id": g.user.id,
                "statement_id": statement.id,
                "date": date if (date is not None and pd.notna(date)) else None,
                "description": (
                    descriptions.iloc[pos][:512] if descriptions is not None else ""
                ),
                "category": str(df["Category"].iloc[pos])[:64],
                "amount": amount,
                "kind": "income" if amount >= 0 else "expense",
            }
        )

    if rows:
        db.session.bulk_insert_mappings(Transaction, rows)
    db.session.commit()
    return statement


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

        try:
            statement = _persist(df, token, file.filename)
        except Exception:
            db.session.rollback()
            current_app.logger.exception(
                "persist_failed", extra={"user_id": g.user.id, "token": token}
            )
            return jsonify({"error": "Could not store analysis"}), 500
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
            "statement": statement.to_dict(),
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
        # Upload storage is ephemeral on Render, so rebuild the workbook from
        # the persisted rows rather than 404-ing after a restart.
        statement = Statement.query.filter_by(user_id=g.user.id, token=token).first()
        if statement is None:
            return jsonify({"error": "Not found"}), 404
        totals = (
            db.session.query(Transaction.category, func.sum(Transaction.amount))
            .filter(Transaction.statement_id == statement.id)
            .group_by(Transaction.category)
            .all()
        )
        if not totals:
            return jsonify({"error": "Not found"}), 404
        frame = pd.DataFrame(
            [{"Category": c, "Total": round(float(v), 2)} for c, v in totals]
        ).set_index("Category")
        frame.to_excel(path)
    return send_file(path, as_attachment=True, download_name="summary.xlsx")
