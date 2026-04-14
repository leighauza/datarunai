import re
import json
import uuid
from flask import Blueprint, request, jsonify
from services.claude import get_claude_response
from services.supabase import log_message, log_order, log_reservation
from services.google_calendar import create_reservation_event

chat_bp = Blueprint("chat", __name__)

VALID_BOTS = ["store", "restaurant"]

ORDER_TAG       = re.compile(r'\[ORDER_CONFIRMED\](.*?)\[/ORDER_CONFIRMED\]', re.DOTALL)
RESERVATION_TAG = re.compile(r'\[RESERVATION_CONFIRMED\](.*?)\[/RESERVATION_CONFIRMED\]', re.DOTALL)


def extract_tag(pattern, text):
    """Extract JSON payload from a special tag, return (clean_text, parsed_dict or None)."""
    match = pattern.search(text)
    if not match:
        return text, None
    payload = match.group(1).strip()
    clean   = pattern.sub('', text).strip()
    try:
        return clean, json.loads(payload)
    except json.JSONDecodeError as e:
        print(f"[Chat] Failed to parse tag JSON: {e}\nPayload: {payload}")
        return clean, None


@chat_bp.route("/chat/<bot>", methods=["POST"])
def chat(bot):
    if bot not in VALID_BOTS:
        return jsonify({"error": "Invalid bot"}), 400

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Always have a session_id — generate one if frontend didn't send one
    session_id  = data.get("session_id") or str(uuid.uuid4())
    messages    = data.get("messages", [])
    user_message = data.get("message", "").strip()

    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    # Add user message to history
    messages.append({"role": "user", "content": user_message})

    # Log user message
    log_message(session_id, bot, "user", user_message)

    # Get Claude response
    raw_reply = get_claude_response(bot, messages)

    # ── Detect order confirmation (store + restaurant) ───────────────────────
    reply, order_data = extract_tag(ORDER_TAG, raw_reply)
    if order_data:
        print(f"[Chat] Order confirmed for bot={bot}, session={session_id}")
        log_order(session_id, bot, order_data)

    # ── Detect reservation confirmation (restaurant only) ────────────────────
    reply, reservation_data = extract_tag(RESERVATION_TAG, reply)
    if reservation_data:
        print(f"[Chat] Reservation confirmed for session={session_id}")
        calendar_event_id = create_reservation_event(reservation_data)
        log_reservation(session_id, reservation_data, calendar_event_id)

    # Log assistant reply (cleaned, no tags)
    log_message(session_id, bot, "assistant", reply)

    # Add cleaned reply to history
    messages.append({"role": "assistant", "content": reply})

    return jsonify({
        "reply": reply,
        "messages": messages,
        "session_id": session_id,
        "order_confirmed":       order_data is not None,
        "reservation_confirmed": reservation_data is not None
    })
