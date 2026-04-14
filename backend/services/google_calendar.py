import os
import json
from datetime import datetime, timedelta

try:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False
    print("[Google Calendar] google-auth packages not installed")

SCOPES = ["https://www.googleapis.com/auth/calendar"]
CALENDAR_ID = os.environ.get("GOOGLE_CALENDAR_ID", "primary")


def _get_service():
    if not GOOGLE_AVAILABLE:
        return None

    creds_json = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
    if not creds_json:
        print("[Google Calendar] GOOGLE_SERVICE_ACCOUNT_JSON not set")
        return None

    try:
        creds_info = json.loads(creds_json)
        creds = service_account.Credentials.from_service_account_info(
            creds_info, scopes=SCOPES
        )
        return build("calendar", "v3", credentials=creds)
    except Exception as e:
        print(f"[Google Calendar] Failed to build service: {e}")
        return None


def create_reservation_event(reservation: dict):
    """
    Creates a Google Calendar event for a restaurant reservation.
    Returns the event ID if successful, None otherwise.
    """
    service = _get_service()
    if not service:
        return None

    try:
        date_str = reservation.get("date", "")
        time_str = reservation.get("time", "")
        name     = reservation.get("customer_name", "Guest")
        party    = reservation.get("party_size", 1)
        contact  = reservation.get("contact", "")
        notes    = reservation.get("notes", "")

        # Parse datetime — expects "YYYY-MM-DD" and "HH:MM" or "H:MM AM/PM"
        try:
            dt_str = f"{date_str} {time_str}"
            try:
                start_dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M")
            except ValueError:
                start_dt = datetime.strptime(dt_str, "%Y-%m-%d %I:%M %p")
        except Exception:
            print(f"[Google Calendar] Could not parse date/time: {date_str} {time_str}")
            return None

        end_dt = start_dt + timedelta(hours=2)

        event = {
            "summary": f"Reservation — {name} ({party} pax)",
            "description": f"Contact: {contact}\nParty size: {party}\nNotes: {notes}\n\nBooked via DataRunAI",
            "start": {
                "dateTime": start_dt.isoformat(),
                "timeZone": "Asia/Manila"
            },
            "end": {
                "dateTime": end_dt.isoformat(),
                "timeZone": "Asia/Manila"
            },
            "colorId": "3"  # sage green
        }

        created = service.events().insert(calendarId=CALENDAR_ID, body=event).execute()
        event_id = created.get("id")
        print(f"[Google Calendar] Event created: {event_id}")
        return event_id

    except Exception as e:
        print(f"[Google Calendar] Error creating event: {e}")
        return None
