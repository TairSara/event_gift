import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from datetime import datetime

# Import Gmail API service
from gmail_api_service import send_email_gmail_api

load_dotenv()

# פרטי חשבון Gmail
SENDER_EMAIL = os.getenv("SENDER_EMAIL", "savedayevents@gmail.com")

# צבעי העיצוב של האתר - גוון חום וכחול יוקרתי
PRIMARY_COLOR = "#8B6F47"  # חום זהב יוקרתי
SECONDARY_COLOR = "#2C5F7F"  # כחול עמוק
ACCENT_COLOR = "#B8986E"  # חום בהיר
TEXT_COLOR = "#2D2D2D"
BACKGROUND_COLOR = "#FAF8F5"  # רקע שמנת


def get_email_template(title: str, content: str, logo_cid: str = "logo") -> str:
    """
    תבנית HTML מעוצבת לאימיילים
    """
    return f"""
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: {BACKGROUND_COLOR};
                margin: 0;
                padding: 0;
                direction: rtl;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: white;
                border-radius: 20px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                overflow: hidden;
            }}
            .header {{
                background: linear-gradient(135deg, {SECONDARY_COLOR} 0%, {PRIMARY_COLOR} 100%);
                padding: 50px 20px;
                text-align: center;
                border-bottom: 3px solid {ACCENT_COLOR};
            }}
            .logo {{
                max-width: 150px;
                height: auto;
                margin-bottom: 20px;
            }}
            .header h1 {{
                color: white;
                margin: 0;
                font-size: 28px;
                font-weight: bold;
            }}
            .content {{
                padding: 40px 30px;
                color: {TEXT_COLOR};
                line-height: 1.8;
                font-size: 16px;
            }}
            .content h2 {{
                color: {SECONDARY_COLOR};
                font-size: 26px;
                margin-bottom: 25px;
                font-weight: 600;
                letter-spacing: 0.5px;
            }}
            .code-box {{
                background: linear-gradient(135deg, {BACKGROUND_COLOR} 0%, #FFFFFF 100%);
                border: 2px solid {ACCENT_COLOR};
                border-radius: 12px;
                padding: 30px;
                text-align: center;
                margin: 30px 0;
                box-shadow: 0 2px 10px rgba(139, 111, 71, 0.1);
            }}
            .code {{
                font-size: 36px;
                font-weight: bold;
                color: {PRIMARY_COLOR};
                letter-spacing: 8px;
                font-family: 'Georgia', serif;
            }}
            .button {{
                display: inline-block;
                background: linear-gradient(135deg, {PRIMARY_COLOR} 0%, {ACCENT_COLOR} 100%);
                color: white;
                padding: 16px 45px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                margin: 25px 0;
                box-shadow: 0 4px 15px rgba(139, 111, 71, 0.25);
                letter-spacing: 0.5px;
            }}
            .footer {{
                background-color: #f8f9fa;
                padding: 30px 20px;
                text-align: center;
                color: #6c757d;
                font-size: 14px;
                border-top: 1px solid #e9ecef;
            }}
            .footer p {{
                margin: 5px 0;
            }}
            .social-links {{
                margin: 15px 0;
            }}
            .social-links a {{
                color: {PRIMARY_COLOR};
                text-decoration: none;
                margin: 0 15px;
                font-weight: 500;
            }}
            .divider {{
                height: 1px;
                background: linear-gradient(to right, transparent, {ACCENT_COLOR}, transparent);
                margin: 30px 0;
            }}
            .highlight-box {{
                background: linear-gradient(135deg, {BACKGROUND_COLOR} 0%, #FFFFFF 100%);
                border-right: 4px solid {PRIMARY_COLOR};
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="cid:{logo_cid}" alt="SaveDay Events Logo" class="logo">
                <h1>{title}</h1>
            </div>
            <div class="content">
                {content}
            </div>
            <div class="footer">
                <div class="divider"></div>
                <p><strong>SaveDay Events</strong></p>
                <p>האתר המושלם לניהול אירועים ומתנות</p>
                <p>📧 savedayevents@gmail.com</p>
                <div class="social-links">
                    <a href="#">פייסבוק</a> |
                    <a href="#">אינסטגרם</a> |
                    <a href="#">וואטסאפ</a>
                </div>
                <p style="margin-top: 20px; font-size: 12px; color: #999;">
                    קיבלת מייל זה כי נרשמת לאתר SaveDay Events
                </p>
            </div>
        </div>
    </body>
    </html>
    """


def send_email_with_logo(to_email: str, subject: str, html_content: str, logo_path: Optional[str] = None):
    """
    שולח אימייל עם לוגו מוטמע באמצעות Gmail API
    """
    try:
        # Use Gmail API to send email
        return send_email_gmail_api(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            logo_path=logo_path,
            from_email=SENDER_EMAIL
        )

    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        import traceback
        traceback.print_exc()
        return False


def send_welcome_email(to_email: str, full_name: Optional[str] = None):
    """
    שולח מייל ברוכים הבאים למשתמש חדש
    """
    display_name = full_name if full_name else "משתמש יקר"

    content = f"""
        <h2>שלום {display_name}</h2>
        <p style="font-size: 18px; color: #555; margin-bottom: 25px;">
            ברוכים הבאים ל-<strong>SaveDay Events</strong>
        </p>
        <p style="line-height: 1.9;">
            אנו שמחים לקבל אותך לחוויה הדיגיטלית המושלמת לניהול אירועים ומתנות.
            הצטרפותך מעידה על הערכה לאיכות ושירות ברמה הגבוהה ביותר.
        </p>
        <div class="highlight-box">
            <p style="margin: 0; font-weight: 500;">האפשרויות העומדות לרשותך:</p>
        </div>
        <ul style="text-align: right; line-height: 2.2; color: #555;">
            <li>ניהול רשימות מתנות מתקדם ואלגנטי</li>
            <li>תכנון אירועים יוקרתיים בפרטי פרטים</li>
            <li>מעקב מדויק אחר מתנות ואירועים</li>
            <li>חוויית שימוש מושלמת בכל מכשיר</li>
        </ul>
        <div class="divider"></div>
        <p style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:5173" class="button">התחל לחוות את החוויה</a>
        </p>
        <p style="color: #888; font-size: 14px; margin-top: 35px; line-height: 1.8;">
            לשירותך בכל עת, אנו זמינים לכל שאלה או בקשה.
        </p>
    """

    subject = "ברוכים הבאים ל-SaveDay Events"
    html = get_email_template(subject, content)

    # נתיב ללוגו
    logo_path = Path(__file__).parent.parent / "frontend" / "public" / "images" / "logo.png"

    # שלח את המייל (גם אם אין לוגו)
    if not logo_path.exists():
        logo_path = None

    return send_email_with_logo(to_email, subject, html, str(logo_path) if logo_path else None)


def send_reset_code_email(to_email: str, reset_code: str):
    """
    שולח מייל עם קוד איפוס סיסמה
    """
    content = f"""
        <h2>בקשה לאיפוס סיסמה</h2>
        <p style="font-size: 16px; line-height: 1.9; color: #555;">
            קיבלנו בקשה לאיפוס הסיסמה של החשבון שלך ב-SaveDay Events.
            להלן קוד האימות האישי שלך:
        </p>
        <div class="code-box">
            <p style="margin: 0 0 15px 0; color: #888; font-size: 14px;">קוד אימות חד-פעמי</p>
            <div class="code">{reset_code}</div>
            <p style="margin: 15px 0 0 0; color: #999; font-size: 13px;">תוקף הקוד: 15 דקות</p>
        </div>
        <div class="highlight-box">
            <p style="margin: 0; font-size: 15px; color: #666; line-height: 1.8;">
                <strong>הערה חשובה:</strong><br>
                הקוד בעל תוקף מוגבל ומיועד לשימוש חד-פעמי בלבד.
                מטעמי אבטחה, אנא אל תשתף קוד זה עם אף אחד.
            </p>
        </div>
        <div class="divider"></div>
        <p style="font-size: 14px; color: #888; line-height: 1.8;">
            לא ביקשת לאפס את הסיסמה? אין צורך בפעולה נוספת מצדך.
            החשבון שלך נותר מאובטח באופן מלא.
        </p>
    """

    subject = "קוד איפוס סיסמה - SaveDay Events"
    html = get_email_template(subject, content)

    logo_path = Path(__file__).parent.parent / "frontend" / "public" / "images" / "logo.png"

    # שלח את המייל (גם אם אין לוגו)
    if not logo_path.exists():
        logo_path = None

    return send_email_with_logo(to_email, subject, html, str(logo_path) if logo_path else None)


def send_password_reset_success_email(to_email: str, full_name: Optional[str] = None):
    """
    שולח מייל אישור על איפוס סיסמה מוצלח
    """
    display_name = full_name if full_name else "משתמש יקר"

    content = f"""
        <h2>הסיסמה אופסה בהצלחה</h2>
        <p style="font-size: 16px; line-height: 1.9; color: #555;">
            שלום {display_name},
        </p>
        <p style="line-height: 1.9;">
            הסיסמה של החשבון שלך ב-SaveDay Events עודכנה בהצלחה.
            החשבון שלך מאובטח וזמין לשימוש.
        </p>
        <div class="highlight-box">
            <p style="margin: 0; font-size: 15px; font-weight: 500;">
                הפעולה בוצעה בהצלחה
            </p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #666;">
                ניתן כעת להתחבר לחשבון עם הסיסמה החדשה
            </p>
        </div>
        <p style="text-align: center; margin: 35px 0;">
            <a href="http://localhost:5173" class="button">התחבר לחשבון</a>
        </p>
        <div class="divider"></div>
        <p style="font-size: 14px; color: #888; line-height: 1.9;">
            לא ביצעת פעולה זו? אנא צור קשר עם שירות הלקוחות שלנו באופן מיידי.
        </p>
        <div style="margin-top: 25px; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #555; font-weight: 500;">
                המלצות אבטחה:
            </p>
            <ul style="text-align: right; font-size: 14px; color: #666; line-height: 2; margin: 0;">
                <li>השתמש בסיסמה חזקה ומורכבת</li>
                <li>אל תשתף את פרטי הגישה שלך</li>
                <li>היזהר ממסרים חשודים</li>
            </ul>
        </div>
    """

    subject = "הסיסמה שלך אופסה בהצלחה - SaveDay Events"
    html = get_email_template(subject, content)

    logo_path = Path(__file__).parent.parent / "frontend" / "public" / "images" / "logo.png"

    # שלח את המייל (גם אם אין לוגו)
    if not logo_path.exists():
        logo_path = None

    return send_email_with_logo(to_email, subject, html, str(logo_path) if logo_path else None)


def send_verification_code_email(to_email: str, verification_code: str) -> bool:
    """
    שולח מייל עם קוד אימות לאימות כתובת המייל
    """
    content = f"""
        <h2>אימות כתובת האימייל שלך</h2>
        <p style="font-size: 16px; line-height: 1.9; color: #555;">
            שלום,
        </p>
        <p style="line-height: 1.9;">
            תודה שנרשמת ל-SaveDay Events!
            כדי להשלים את תהליך ההרשמה ולוודא שהחשבון שייך לך, אנא אמת את כתובת המייל שלך.
        </p>
        <div class="highlight-box">
            <p style="margin: 0 0 15px 0; font-size: 15px; font-weight: 500;">
                קוד האימות שלך:
            </p>
            <div style="background: linear-gradient(135deg, {PRIMARY_COLOR}, {ACCENT_COLOR});
                        padding: 20px;
                        border-radius: 12px;
                        text-align: center;
                        margin: 15px 0;">
                <p style="margin: 0;
                          font-size: 42px;
                          font-weight: bold;
                          letter-spacing: 10px;
                          color: white;
                          font-family: 'Courier New', monospace;">
                    {verification_code}
                </p>
            </div>
            <p style="margin: 15px 0 0 0; font-size: 14px; color: #666;">
                הזן קוד זה בעמוד אימות המייל
            </p>
        </div>
        <div class="divider"></div>
        <p style="font-size: 14px; color: #888; line-height: 1.9;">
            הקוד תקף ל-15 דקות בלבד. אם לא ביקשת את הקוד הזה, אנא התעלם ממייל זה.
        </p>
        <div style="margin-top: 25px; padding: 15px; background-color: #f0f7ff; border-right: 4px solid {SECONDARY_COLOR}; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #555;">
                <strong>טיפ:</strong> לאחר האימות, תוכל להתחבר ולהתחיל ליצור הזמנות מעוצבות לאירועים שלך!
            </p>
        </div>
    """

    subject = "אמת את כתובת המייל שלך - SaveDay Events"
    html = get_email_template(subject, content)

    logo_path = Path(__file__).parent.parent / "frontend" / "public" / "images" / "logo.png"

    # שלח את המייל (גם אם אין לוגו)
    if not logo_path.exists():
        logo_path = None

    return send_email_with_logo(to_email, subject, html, str(logo_path) if logo_path else None)


def send_admin_verification_code_email(to_email: str, admin_name: str, verification_code: str) -> bool:
    """
    שולח מייל עם קוד אימות להתחברות מנהל
    """
    content = f"""
        <h2 style="color: #d32f2f;">🔐 אימות התחברות מנהל</h2>
        <p style="font-size: 16px; line-height: 1.9; color: #555;">
            שלום {admin_name},
        </p>
        <p style="line-height: 1.9;">
            זוהתה ניסיון התחברות לחשבון המנהל שלך ב-SaveDay Events.
            לביטחונך, נדרש קוד אימות נוסף להשלמת ההתחברות.
        </p>
        <div class="highlight-box">
            <p style="margin: 0 0 15px 0; font-size: 15px; font-weight: 500;">
                קוד האימות שלך:
            </p>
            <div style="background: linear-gradient(135deg, #d32f2f, #f44336);
                        padding: 20px;
                        border-radius: 12px;
                        text-align: center;
                        margin: 15px 0;
                        box-shadow: 0 4px 12px rgba(211, 47, 47, 0.3);">
                <p style="margin: 0;
                          font-size: 42px;
                          font-weight: bold;
                          letter-spacing: 10px;
                          color: white;
                          font-family: 'Courier New', monospace;">
                    {verification_code}
                </p>
            </div>
            <p style="margin: 15px 0 0 0; font-size: 14px; color: #666;">
                הזן קוד זה בדף ההתחברות כדי להשלים את תהליך האימות
            </p>
        </div>
        <div style="margin-top: 25px; padding: 15px; background-color: #fff3e0; border-right: 4px solid #ff9800; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #e65100; font-weight: 600;">
                ⚠️ אזהרת אבטחה:
            </p>
            <p style="margin: 0; font-size: 14px; color: #555; line-height: 1.8;">
                הקוד תקף ל-<strong>15 דקות</strong> בלבד.
                אם לא ביקשת להתחבר כמנהל, <strong>אל תשתף קוד זה עם אף אחד</strong>
                ושנה את הסיסמה שלך באופן מיידי.
            </p>
        </div>
        <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 8px;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #555; font-weight: 500;">
                פרטי הניסיון:
            </p>
            <ul style="text-align: right; font-size: 13px; color: #666; line-height: 1.8; margin: 0;">
                <li>זמן: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</li>
                <li>סוג: התחברות מנהל</li>
            </ul>
        </div>
    """

    subject = "🔐 קוד אימות להתחברות מנהל - SaveDay Events"
    html = get_email_template(subject, content)

    logo_path = Path(__file__).parent.parent / "frontend" / "public" / "images" / "logo.png"

    # שלח את המייל (גם אם אין לוגו)
    if not logo_path.exists():
        logo_path = None

    return send_email_with_logo(to_email, subject, html, str(logo_path) if logo_path else None)
