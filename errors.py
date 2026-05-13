import uuid

from flask import Flask, current_app, jsonify, request
from werkzeug.exceptions import HTTPException


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(HTTPException)
    def handle_http(e: HTTPException):
        return jsonify({"error": e.description}), e.code

    @app.errorhandler(413)
    def too_large(_e):
        return jsonify({"error": "Payload too large"}), 413

    @app.errorhandler(429)
    def rate_limited(_e):
        return jsonify({"error": "Too many requests"}), 429

    @app.errorhandler(Exception)
    def handle_unexpected(e: Exception):
        cid = uuid.uuid4().hex
        current_app.logger.exception(
            "unhandled_error",
            extra={"correlation_id": cid, "path": request.path, "method": request.method},
        )
        return (
            jsonify({"error": "Internal server error", "correlation_id": cid}),
            500,
        )
