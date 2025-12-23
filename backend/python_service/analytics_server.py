from fastapi import FastAPI, HTTPException
from telethon import TelegramClient
from dotenv import load_dotenv
import os
import uvicorn

# Load env from parent directory (backend/.env)
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

API_ID = os.getenv('API_ID')
API_HASH = os.getenv('API_HASH')
SESSION_NAME = os.path.join(os.path.dirname(__file__), 'analytics_session')

if not API_ID or not API_HASH:
    raise ValueError("API_ID and API_HASH not found in environment variables")

app = FastAPI()
client = TelegramClient(SESSION_NAME, int(API_ID), API_HASH)

@app.on_event("startup")
async def startup_event():
    print("🔄 Connecting to Telethon...")
    await client.connect()
    
    # Check if authorized
    if not await client.is_user_authorized():
        print("❌ Error: User not authorized. Please run 'setup_session.py' first.")
        # We don't exit here to allow server to stay up, but calls will fail
    else:
        print("✅ Telethon Client Connected & Authorized")

@app.on_event("shutdown")
async def shutdown_event():
    await client.disconnect()

@app.get("/")
async def health_check():
    return {"status": "running", "service": "analytics-telethon"}

@app.get("/analytics")
async def get_analytics(chat_id: str, message_id: int):
    """
    Fetch analytics for a specific message.
    chat_id can be numeric (-100...) or username.
    """
    try:
        if not client.is_connected():
            await client.connect()
            
        if not await client.is_user_authorized():
             raise HTTPException(status_code=401, detail="Userbot not authorized. Run setup_session.py.")

        # Resolve chat_id
        peer = None
        try:
            peer = int(chat_id)
        except ValueError:
            peer = chat_id 

        message = await client.get_messages(peer, ids=message_id)
        
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        # Extract analytics
        views = getattr(message, 'views', 0) or 0
        forwards = getattr(message, 'forwards', 0) or 0
        
        replies = 0
        if message.replies:
             replies = message.replies.replies or 0

        reactions = 0
        if message.reactions and message.reactions.results:
            reactions = sum(r.count for r in message.reactions.results)

        return {
            "views": views,
            "forwards": forwards,
            "replies": replies,
            "reactions": reactions
        }
    except Exception as e:
        print(f"❌ Error fetching analytics: {e}")
        error_msg = str(e)
        if "Cannot find any entity" in error_msg:
             raise HTTPException(status_code=404, detail="Channel/Group not found or not accessible")
        raise HTTPException(status_code=500, detail=error_msg)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
