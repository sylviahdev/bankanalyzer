"""Read-only query surface over persisted statements and transactions.

Everything here is scoped to `g.user.id` at the query level, so a user can only
ever read their own rows regardless of the identifiers they supply.
"""

import datetime

from flask import Blueprint, g, jsonify, request
from sqlalchemy import case, extract, func, nulls_last

from extensions import db, limiter
from models import Statement, Transaction
from security import auth_required

bp = Blueprint("data", __name__, url_prefix="/api")

MAX_PER_PAGE = 200
DEFAULT_PER_PAGE = 25
SORTABLE = {
    "date": Transaction.date,
    "amount": Transaction.amount,
    "description": Transaction.description,
    "category": Transaction.category,
}


def _parse_date(raw: str | None) -> datetime.date | None:
    if not raw:
        return None
    try:
        return datetime.date.fromisoformat(raw)
    except ValueError:
        return None


def _int_arg(name: str, default: int, low: int, high: int) -> int:
    try:
        value = int(request.args.get(name, default))
    except (TypeError, ValueError):
        return default
    return max(low, min(high, value))


def _base_query():
    """All of the current user's transactions, with the shared filters applied."""
    q = Transaction.query.filter(Transaction.user_id == g.user.id)

    statement_id = request.args.get("statement_id")
    if statement_id and statement_id.isdigit():
        q = q.filter(Transaction.statement_id == int(statement_id))

    category = request.args.get("category")
    if category and category != "all":
        q = q.filter(Transaction.category == category)

    kind = request.args.get("type")
    if kind in ("income", "expense"):
        q = q.filter(Transaction.kind == kind)

    search = (request.args.get("q") or "").strip()
    if search:
        q = q.filter(Transaction.description.ilike(f"%{search}%"))

    date_from = _parse_date(request.args.get("date_from"))
    if date_from:
        q = q.filter(Transaction.date >= date_from)

    date_to = _parse_date(request.args.get("date_to"))
    if date_to:
        q = q.filter(Transaction.date <= date_to)

    return q


@bp.get("/statements")
@auth_required
@limiter.limit("120 per hour")
def list_statements():
    rows = (
        Statement.query.filter_by(user_id=g.user.id)
        .order_by(Statement.created_at.desc())
        .all()
    )
    return jsonify({"statements": [s.to_dict() for s in rows]})


@bp.delete("/statements/<int:statement_id>")
@auth_required
@limiter.limit("60 per hour")
def delete_statement(statement_id: int):
    statement = Statement.query.filter_by(id=statement_id, user_id=g.user.id).first()
    if statement is None:
        return jsonify({"error": "Not found"}), 404
    # Bulk-delete the rows rather than loading the whole collection into memory;
    # a statement can hold up to MAX_ROWS transactions.
    Transaction.query.filter_by(statement_id=statement.id, user_id=g.user.id).delete(
        synchronize_session=False
    )
    db.session.delete(statement)
    db.session.commit()
    return jsonify({"message": "Statement deleted"})


@bp.get("/transactions")
@auth_required
@limiter.limit("300 per hour")
def list_transactions():
    page = _int_arg("page", 1, 1, 10_000)
    per_page = _int_arg("per_page", DEFAULT_PER_PAGE, 1, MAX_PER_PAGE)

    sort_key = request.args.get("sort", "date")
    column = SORTABLE.get(sort_key, Transaction.date)
    descending = request.args.get("order", "desc").lower() != "asc"
    ordering = column.desc() if descending else column.asc()

    query = _base_query()
    total = query.order_by(None).count()
    rows = (
        query.order_by(ordering, Transaction.id.desc())
        .limit(per_page)
        .offset((page - 1) * per_page)
        .all()
    )

    total_pages = (total + per_page - 1) // per_page
    return jsonify(
        {
            "transactions": [t.to_dict() for t in rows],
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1,
        }
    )


@bp.get("/categories")
@auth_required
@limiter.limit("120 per hour")
def list_categories():
    rows = (
        db.session.query(Transaction.category)
        .filter(Transaction.user_id == g.user.id)
        .distinct()
        .order_by(Transaction.category)
        .all()
    )
    return jsonify({"categories": [r[0] for r in rows]})


@bp.get("/analytics/summary")
@auth_required
@limiter.limit("120 per hour")
def analytics_summary():
    user_filter = Transaction.user_id == g.user.id
    statement_id = request.args.get("statement_id")
    filters = [user_filter]
    if statement_id and statement_id.isdigit():
        filters.append(Transaction.statement_id == int(statement_id))

    income_sum = func.coalesce(
        func.sum(case((Transaction.amount > 0, Transaction.amount), else_=0.0)), 0.0
    )
    expense_sum = func.coalesce(
        func.sum(case((Transaction.amount < 0, Transaction.amount), else_=0.0)), 0.0
    )

    income, expenses, count = (
        db.session.query(income_sum, expense_sum, func.count(Transaction.id))
        .filter(*filters)
        .one()
    )

    by_category = [
        {
            "category": category,
            "total": round(float(total), 2),
            "count": int(n),
            "expense_total": round(abs(float(spent)), 2),
        }
        for category, total, n, spent in db.session.query(
            Transaction.category,
            func.sum(Transaction.amount),
            func.count(Transaction.id),
            expense_sum,
        )
        .filter(*filters)
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount))
        .all()
    ]

    monthly = [
        {
            "month": f"{int(year):04d}-{int(month):02d}",
            "income": round(float(inc), 2),
            "expenses": round(abs(float(exp)), 2),
            "net": round(float(inc) + float(exp), 2),
        }
        for year, month, inc, exp in db.session.query(
            extract("year", Transaction.date),
            extract("month", Transaction.date),
            income_sum,
            expense_sum,
        )
        .filter(*filters, Transaction.date.isnot(None))
        .group_by(
            extract("year", Transaction.date), extract("month", Transaction.date)
        )
        .order_by(
            extract("year", Transaction.date), extract("month", Transaction.date)
        )
        .all()
    ]

    top_expenses = [
        t.to_dict()
        for t in Transaction.query.filter(*filters, Transaction.amount < 0)
        .order_by(Transaction.amount.asc())
        .limit(5)
        .all()
    ]

    recent = [
        t.to_dict()
        for t in Transaction.query.filter(*filters)
        .order_by(nulls_last(Transaction.date.desc()), Transaction.id.desc())
        .limit(8)
        .all()
    ]

    statement_count = (
        db.session.query(func.count(Statement.id))
        .filter(Statement.user_id == g.user.id)
        .scalar()
    )

    return jsonify(
        {
            "totals": {
                "income": round(float(income), 2),
                "expenses": round(abs(float(expenses)), 2),
                "net": round(float(income) + float(expenses), 2),
                "transaction_count": int(count),
                "statement_count": int(statement_count or 0),
            },
            "by_category": by_category,
            "monthly": monthly,
            "top_expenses": top_expenses,
            "recent_transactions": recent,
        }
    )
