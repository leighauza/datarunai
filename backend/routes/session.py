from flask import Blueprint, request, jsonify
from services.supabase import create_session

session_bp = Blueprint("session", __name__)

@session_bp.route("/session", methods=["POST"])
def session():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    name = data.get("name", "").strip()
    industry = data.get("industry", "").strip()
    business_type = data.get("business_type", "").strip()

    if not name:
        return jsonify({"error": "Name is required"}), 400

    session_id = create_session(name, industry, business_type)

    return jsonify({"session_id": session_id})
