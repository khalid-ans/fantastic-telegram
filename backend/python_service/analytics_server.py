from fastapi import FastAPI, HTTPException, Body
from telethon import TelegramClient, functions, types
import uvicorn
import os
import asyncio
from dotenv import load_dotenv

# Load env variables initially
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Global State
API_ID = os.getenv('API_ID')
API_HASH = os.getenv('API_HASH')
SESSION_NAME = os.path.join(os.path.dirname(__file__), 'analytics_session')

app = FastAPI()
client = None

async def init_client():
    global client, API_ID, API_HASH
    # Reload env to catch updates
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'), override=True)
    API_ID = os.getenv('API_ID')
    API_HASH = os.getenv('API_HASH')

    if API_ID and API_HASH:
        try:
            client = TelegramClient(SESSION_NAME, int(API_ID), API_HASH)
            await client.connect()
            print(f"✅ Telethon Client Initialized with ID: {API_ID}")
        except Exception as e:
            print(f"❌ Failed to init client: {e}")

@app.on_event("startup")
async def startup_event():
    await init_client()

@app.on_event("shutdown")
async def shutdown_event():
    if client:
        await client.disconnect()

@app.get("/")
async def health_check():
    authorized = False
    if client:
        if not client.is_connected():
            await client.connect()
        authorized = await client.is_user_authorized()
    
    return {
        "status": "running", 
        "service": "analytics-telethon",
        "configured": bool(API_ID and API_HASH),
        "authorized": authorized
    }

# --- Auth Endpoints ---

@app.post("/auth/setup")
async def setup_credentials(data: dict = Body(...)):
    """
    Update API ID/Hash dynamically (called after Node updates .env)
    """
    global API_ID, API_HASH, client
    
    new_api_id = data.get("api_id")
    new_api_hash = data.get("api_hash")
    
    if not new_api_id or not new_api_hash:
         raise HTTPException(status_code=400, detail="Missing api_id or api_hash")

    # Update globals
    API_ID = new_api_id
    API_HASH = new_api_hash
    
    # Re-init client
    if client:
        await client.disconnect()
    
    try:
        client = TelegramClient(SESSION_NAME, int(API_ID), API_HASH)
        await client.connect()
        return {"status": "success", "message": "Credentials updated and client initialized"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize client: {str(e)}")


@app.post("/auth/request-code")
async def request_code(data: dict = Body(...)):
    if not client:
        await init_client()
        if not client:
             raise HTTPException(status_code=400, detail="Client not configured. Please set API credentials first.")

    phone = data.get("phone")
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number required")

    try:
        if not client.is_connected():
            await client.connect()
            
        # Send code
        sent = await client.send_code_request(phone)
        return {"phone_code_hash": sent.phone_code_hash}
    except Exception as e:
        print(f"Error requesting code: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/auth/sign-in")
async def sign_in_route(data: dict = Body(...)):
    if not client:
        raise HTTPException(status_code=400, detail="Client not configured")

    phone = data.get("phone")
    code = data.get("code")
    phone_code_hash = data.get("phone_code_hash")
    
    if not phone or not code or not phone_code_hash:
        raise HTTPException(status_code=400, detail="Missing phone, code, or hash")

    try:
        user = await client.sign_in(phone=phone, code=code, phone_code_hash=phone_code_hash)
        return {"status": "success", "user": {"id": user.id, "username": user.username}}
    except Exception as e:
        print(f"Error signing in: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/auth/logout")
async def logout():
    if not client:
         return {"status": "ignored", "detail": "No client"}
    
    try:
        if not client.is_connected():
            await client.connect()
        
        await client.log_out()
        return {"status": "success", "message": "Logged out"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analytics")
async def get_analytics(chat_id: str, message_id: int):
    """
    Fetch analytics for a specific message.
    """
    try:
        if not client:
             raise HTTPException(status_code=503, detail="Client not initialized")

        if not client.is_connected():
            await client.connect()
            
        if not await client.is_user_authorized():
             raise HTTPException(status_code=401, detail="Userbot not authorized. Please log in.")

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
        error_msg = str(e)
        print(f"❌ Error fetching analytics: {error_msg}")
        if "Cannot find any entity" in error_msg:
             raise HTTPException(status_code=404, detail="Channel/Group not found or not accessible")
        raise HTTPException(status_code=500, detail=error_msg)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
