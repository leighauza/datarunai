import os
import uuid
from supabase import create_client

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

supabase = create_client(url, key) if url and key else None

def create_session(name: str, industry: str, business_type: str) -> str:
    session_id = str(uuid.uuid4())
    if supabase:
        supabase.table("demo_sessions").insert({
            "id": session_id,
            "name": name,
            "industry": industry,
            "business_type": business_type
        }).execute()
    return session_id

def log_message(session_id: str, bot: str, role: str, message: str):
    if supabase:
        supabase.table("conversations").insert({
            "session_id": session_id,
            "bot": bot,
            "role": role,
            "message": message
        }).execute()
