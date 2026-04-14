from flask import Blueprint, request, jsonify
from services.claude import get_claude_response
from services.supabase import log_message

chat_bp = Blueprint("chat", __name__)

VALID_BOTS = ["store", "restaurant"]

@chat_bp.route("/chat/<bot>", methods=["POST"])
def chat(bot):
    if bot not in VALID_BOTS:
        return jsonify({"error": "Invalid bot"}), 400

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    session_id = data.get("session_id")
    messages = data.get("messages", [])
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    # Add new user message to history
    messages.append({"role": "user", "content": user_message})

    # Log user message to Supabase
    if session_id:
        log_message(session_id, bot, "user", user_message)

    # Get Claude response
    reply = get_claude_response(bot, messages)

    # Log assistant reply to Supabase
    if session_id:
        log_message(session_id, bot, "assistant", reply)

    # Add reply to history and return
    messages.append({"role": "assistant", "content": reply})

    return jsonify({
        "reply": reply,
        "messages": messages
    })
