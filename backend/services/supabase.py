import os
import uuid
from supabase import create_client

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

try:
    supabase = create_client(url, key) if url and key else None
except Exception as e:
    print(f"[Supabase] Failed to initialize: {e}")
    supabase = None


def create_session(name: str, industry: str, business_type: str) -> str:
    session_id = str(uuid.uuid4())
    if not supabase:
        print("[Supabase] No client — skipping session create")
        return session_id
    try:
        supabase.table("demo_sessions").insert({
            "id": session_id,
            "name": name,
            "industry": industry,
            "business_type": business_type
        }).execute()
        print(f"[Supabase] Session created: {session_id}")
    except Exception as e:
        print(f"[Supabase] Error creating session: {e}")
    return session_id


def log_message(session_id: str, bot: str, role: str, message: str):
    if not supabase:
        return
    try:
        supabase.table("conversations").insert({
            "session_id": session_id,
            "bot": bot,
            "role": role,
            "message": message
        }).execute()
    except Exception as e:
        print(f"[Supabase] Error logging message: {e}")


def log_order(session_id: str, bot: str, order: dict):
    if not supabase:
        print("[Supabase] No client — skipping order log")
        return
    try:
        supabase.table("orders").insert({
            "session_id": session_id,
            "bot": bot,
            "customer_name": order.get("customer_name"),
            "contact": order.get("contact"),
            "items": order.get("items"),
            "delivery_address": order.get("delivery_address"),
            "payment_method": order.get("payment_method"),
            "subtotal": order.get("subtotal"),
            "status": "new"
        }).execute()
        print(f"[Supabase] Order logged for session: {session_id}")
    except Exception as e:
        print(f"[Supabase] Error logging order: {e}")


def log_reservation(session_id: str, reservation: dict, calendar_event_id: str = None):
    if not supabase:
        print("[Supabase] No client — skipping reservation log")
        return
    try:
        supabase.table("reservations").insert({
            "session_id": session_id,
            "customer_name": reservation.get("customer_name"),
            "contact": reservation.get("contact"),
            "date": reservation.get("date"),
            "time": reservation.get("time"),
            "party_size": reservation.get("party_size"),
            "notes": reservation.get("notes"),
            "calendar_event_id": calendar_event_id,
            "status": "confirmed"
        }).execute()
        print(f"[Supabase] Reservation logged for session: {session_id}")
    except Exception as e:
        print(f"[Supabase] Error logging reservation: {e}")
