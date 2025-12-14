"""
שירות תזמון הודעות - רץ ברקע ובודק כל דקה אם יש הודעות שצריך לשלוח
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import time
import threading
from datetime import datetime, timedelta
from db import get_db_connection
from whatsapp_service import send_invitation_whatsapp


class MessageScheduler:
    def __init__(self):
        self.running = False
        self.thread = None

    def start(self):
        """
        התחלת שירות התזמון
        """
        if self.running:
            print("⚠️ Scheduler already running")
            return

        self.running = True
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.thread.start()
        print("✅ Message scheduler started")

    def stop(self):
        """
        עצירת שירות התזמון
        """
        self.running = False
        if self.thread:
            self.thread.join()
        print("⏹️ Message scheduler stopped")

    def _run_scheduler(self):
        """
        לולאת התזמון הראשית - רצה כל 60 שניות
        """
        while self.running:
            try:
                self._process_pending_messages()
            except Exception as e:
                print(f"❌ Scheduler error: {e}")

            # המתנה של דקה לפני בדיקה הבאה
            time.sleep(60)

    def _process_pending_messages(self):
        """
        בדיקה ושליחת הודעות ממתינות
        """
        conn = None
        try:
            conn = get_db_connection()
            cur = conn.cursor()

            # מציאת הודעות שצריך לשלוח (זמן שליחה עבר או הגיע)
            now = datetime.now()
            cur.execute("""
                SELECT sm.id, sm.event_id, sm.guest_id, sm.recipient_number,
                       sm.message_content, sm.message_type,
                       g.full_name, g.phone, g.email,
                       e.event_type, e.event_title, e.event_date, e.event_time,
                       e.event_location, e.additional_info
                FROM scheduled_messages sm
                JOIN guests g ON sm.guest_id = g.id
                JOIN events e ON sm.event_id = e.id
                WHERE sm.status = 'pending'
                  AND sm.scheduled_time <= %s
                ORDER BY sm.scheduled_time ASC
                LIMIT 50
            """, (now,))

            messages = cur.fetchall()

            if messages:
                print(f"📤 Processing {len(messages)} scheduled messages...")

            for msg in messages:
                msg_id = msg[0]
                event_id = msg[1]
                guest_id = msg[2]
                recipient = msg[3]
                message_content = msg[4]
                message_type = msg[5]

                # פרטי אורח
                guest_data = {
                    "id": guest_id,
                    "full_name": msg[6],
                    "phone": msg[7],
                    "email": msg[8]
                }

                # פרטי אירוע
                event_data = {
                    "id": event_id,
                    "event_type": msg[9],
                    "event_title": msg[10],
                    "event_date": msg[11].strftime("%d/%m/%Y") if msg[11] else "",
                    "event_time": msg[12].strftime("%H:%M") if msg[12] else "",
                    "event_location": msg[13] or "",
                    "additional_info": msg[14] or ""
                }

                try:
                    # שליחת ההודעה
                    if message_type == "whatsapp":
                        result = send_invitation_whatsapp(recipient, event_data, guest_data)

                        if result.get("success"):
                            # עדכון סטטוס ההודעה - נשלחה בהצלחה
                            cur.execute("""
                                UPDATE scheduled_messages
                                SET status = 'sent',
                                    sent_at = NOW()
                                WHERE id = %s
                            """, (msg_id,))

                            # עדכון סטטוס האורח
                            cur.execute("""
                                UPDATE guests
                                SET invitation_sent_at = NOW(),
                                    invitation_status = 'sent'
                                WHERE id = %s
                            """, (guest_id,))

                            conn.commit()
                            print(f"   ✅ Sent invitation to {guest_data['full_name']} ({recipient})")

                        else:
                            # שגיאה בשליחה
                            error_msg = result.get("error", "Unknown error")
                            cur.execute("""
                                UPDATE scheduled_messages
                                SET status = 'failed',
                                    error_message = %s
                                WHERE id = %s
                            """, (error_msg, msg_id))
                            conn.commit()
                            print(f"   ❌ Failed to send to {guest_data['full_name']}: {error_msg}")

                    else:
                        # SMS - לא ממומש כרגע
                        cur.execute("""
                            UPDATE scheduled_messages
                            SET status = 'failed',
                                error_message = 'SMS not implemented yet'
                            WHERE id = %s
                        """, (msg_id,))
                        conn.commit()

                except Exception as e:
                    print(f"   ❌ Error processing message {msg_id}: {e}")
                    cur.execute("""
                        UPDATE scheduled_messages
                        SET status = 'failed',
                            error_message = %s
                        WHERE id = %s
                    """, (str(e), msg_id))
                    conn.commit()

            cur.close()

        except Exception as e:
            print(f"❌ Error in process_pending_messages: {e}")
            if conn:
                conn.rollback()
        finally:
            if conn:
                conn.close()


# יצירת instance גלובלי של המתזמן
scheduler = MessageScheduler()


def start_scheduler():
    """
    פונקציה להתחלת המתזמן
    """
    scheduler.start()


def stop_scheduler():
    """
    פונקציה לעצירת המתזמן
    """
    scheduler.stop()
