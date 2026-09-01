from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import imaplib
import email
from email.header import decode_header
from dotenv import load_dotenv
import os
import requests
from pydantic import BaseModel

app = FastAPI()

load_dotenv()

IMAP_SERVER = "imap.gmail.com"
EMAIL = "kingkir080305@gmail.com"
APP_PASSWORD = os.getenv("APP_PASSWORD")
BOT_TOKEN = os.getenv("BOT_TOKEN")
CHAT_ID = "5414335191"

#cors politics - выдают необходимые разрешения для отправки данных на клиент
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# pydantic class to get url
class VacancyRequest(BaseModel):
    url: str


email_id = -1

@app.get("/get-code")
async def get_code():
    global email_id
    
    try:
        mail = imaplib.IMAP4_SSL(IMAP_SERVER)
        mail.login(EMAIL, APP_PASSWORD)
        mail.select("INBOX")

        status, messages = mail.search(None, '(FROM "hh.ru")')
        email_ids = messages[0].split()

        latest_email = email_ids[email_id]

        status, msg_data = mail.fetch(latest_email, "(RFC822)")
        
        for response_part in msg_data:
            if isinstance(response_part, tuple):
                # Parse the raw bytes into an email Message object
                msg = email.message_from_bytes(response_part[1])

                subject, encoding = decode_header(msg["Subject"])[0]
                if isinstance(subject, bytes):
                    subject = subject.decode(encoding or "utf-8", errors="ignore")

                if subject == "Код подтверждения":
                    # Get code
                    if msg.is_multipart():
                        for part in msg.walk():
                            content_type = part.get_content_type()
                            content_disposition = str(part.get("Content-Disposition"))
                        
                            if content_type == "text/plain" and "attachment" not in content_disposition:
                                body = part.get_payload(decode=True).decode(errors="ignore")
                                index = body.find("<b>")
                                second_index = body.find("<b>", index + 1) + 3
                                code = body[second_index : second_index + 4]
                            
                                return JSONResponse(
                                    status_code=200,
                                    content={"success": True, "content": code}
                                )
                    else:
                        body = msg.get_payload(decode=True).decode(errors="ignore")
                        index = body.find("<b>")
                        second_index = body.find("<b>", index + 1) + 3
                        code = body[second_index : second_index + 4]
                        
                        email_id = -1
                        
                        return JSONResponse(
                            status_code=200,
                            content={"success": True, "content": code}
                        )
                
                else:
                    email_id -= 1

                    print(email_id)

                    return JSONResponse(
                            status_code=404,
                            content={"success": False, "error": "no code messages yet"}
                        )

        mail.close()
        mail.logout()
    
    except Exception as e:
        print(e)
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )
    

# sending message to telegram bot to notify user
@app.post("/send-vacancy")
async def send_vacancy(data: VacancyRequest):
    try:
        telegram_url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"

        text = f"📌 Собеседование:\n{data.url}"
    
        payload = {
            "chat_id": CHAT_ID,
            "text": text,
            "disable_web_page_preview": False
        }

        requests.post(telegram_url, data=payload)

        return {"status": 200}
    
    except Exception as e:
        print(e)
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )