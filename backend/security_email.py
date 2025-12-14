import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USERNAME)

def send_security_alert_email(user_email, user_name, locked_until, ip_address=None):
    """
    שולח התראת אבטחה למשתמש על ניסיונות התחברות כושלים
    """
    try:
        # יצירת תוכן המייל
        subject = "התראת אבטחה - חשבונך ננעל זמנית"

        # HTML content
        html_content = f"""
        <!DOCTYPE html>
        <html dir="rtl" lang="he">
        <head>
            <meta charset="UTF-8">
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    direction: rtl;
                    text-align: right;
                    background-color: #f5f5f5;
                    padding: 20px;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 15px;
                    overflow: hidden;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                }}
                .header {{
                    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                    color: white;
                    padding: 30px 20px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 24px;
                }}
                .content {{
                    padding: 30px 25px;
                }}
                .warning-box {{
                    background: #fff3cd;
                    border: 2px solid #ffc107;
                    border-radius: 10px;
                    padding: 15px;
                    margin: 20px 0;
                }}
                .info-box {{
                    background: #f8f9fa;
                    border-radius: 10px;
                    padding: 15px;
                    margin: 20px 0;
                }}
                .info-row {{
                    display: flex;
                    justify-content: space-between;
                    margin: 10px 0;
                    padding: 8px 0;
                    border-bottom: 1px solid #e0e0e0;
                }}
                .info-label {{
                    font-weight: bold;
                    color: #555;
                }}
                .info-value {{
                    color: #333;
                }}
                .footer {{
                    background: #f8f9fa;
                    padding: 20px;
                    text-align: center;
                    color: #666;
                    font-size: 14px;
                }}
                .icon {{
                    font-size: 48px;
                    margin-bottom: 10px;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="icon">🔒</div>
                    <h1>התראת אבטחה</h1>
                    <p>זוהו ניסיונות התחברות חשודים לחשבונך</p>
                </div>

                <div class="content">
                    <p>שלום {user_name},</p>

                    <div class="warning-box">
                        <strong>⚠️ חשבונך ננעל זמנית</strong>
                        <p>זיהינו מספר ניסיונות התחברות כושלים לחשבונך. כאמצעי זהירות, החשבון ננעל זמנית.</p>
                    </div>

                    <div class="info-box">
                        <div class="info-row">
                            <span class="info-label">דוא"ל:</span>
                            <span class="info-value">{user_email}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">זמן הנעילה:</span>
                            <span class="info-value">{datetime.now().strftime('%d/%m/%Y %H:%M')}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">משוחרר ב:</span>
                            <span class="info-value">{locked_until.strftime('%d/%m/%Y %H:%M')}</span>
                        </div>
                        {f'<div class="info-row"><span class="info-label">כתובת IP:</span><span class="info-value">{ip_address}</span></div>' if ip_address else ''}
                    </div>

                    <h3>מה לעשות עכשיו?</h3>
                    <ul>
                        <li>אם זה היית את - החשבון יפתח אוטומטית בזמן המצוין למעלה</li>
                        <li>אם זה לא היית את - מומלץ לשנות את הסיסמה מיד לאחר הפתיחה</li>
                        <li>במקרה של חשד להתקפה - צור קשר עם התמיכה שלנו</li>
                    </ul>

                    <p><strong>טיפ אבטחה:</strong> השתמש בסיסמה חזקה המכילה אותיות גדולות וקטנות, מספרים וסימנים מיוחדים.</p>
                </div>

                <div class="footer">
                    <p>מייל זה נשלח אוטומטית ממערכת Save the Day</p>
                    <p>אם לא ביקשת זאת, אנא התעלם ממייל זה</p>
                    <p>&copy; 2025 Save the Day. כל הזכויות שמורות.</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Plain text fallback
        text_content = f"""
        התראת אבטחה - חשבונך ננעל זמנית

        שלום {user_name},

        זיהינו מספר ניסיונות התחברות כושלים לחשבונך.
        כאמצעי זהירות, החשבון ננעל זמנית.

        פרטים:
        - דוא"ל: {user_email}
        - זמן הנעילה: {datetime.now().strftime('%d/%m/%Y %H:%M')}
        - משוחרר ב: {locked_until.strftime('%d/%m/%Y %H:%M')}
        {f'- כתובת IP: {ip_address}' if ip_address else ''}

        מה לעשות?
        - אם זה היית את - החשבון יפתח אוטומטית בזמן המצוין למעלה
        - אם זה לא היית את - שנה את הסיסמה מיד

        Save the Day Team
        """

        # יצירת המייל
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = FROM_EMAIL
        msg['To'] = user_email

        # הוספת תוכן
        part1 = MIMEText(text_content, 'plain', 'utf-8')
        part2 = MIMEText(html_content, 'html', 'utf-8')
        msg.attach(part1)
        msg.attach(part2)

        # שליחת המייל
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)

        print(f"Security alert email sent to {user_email}")
        return True

    except Exception as e:
        print(f"Error sending security alert email: {e}")
        return False
