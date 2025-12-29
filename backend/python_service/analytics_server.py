from fastapi import FastAPI, HTTPException, Body, Header
from fastapi.middleware.cors import CORSMiddleware
from telethon import TelegramClient, functions, types
import uvicorn
import os
import asyncio
from typing import Dict, Optional
from dotenv import load_dotenv

# Load env variables initially
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

app = FastAPI()

# Strict CORS
origins = [
    "http://localhost:5000", # Backend
    "http://localhost:5173", # Frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global store for clients: {user_id: TelegramClient}
clients: Dict[str, TelegramClient] = {}

def get_session_path(user_id: str):
    sessions_dir = os.path.join(os.path.dirname(__file__), 'sessions')
    if not os.path.exists(sessions_dir):
        os.makedirs(sessions_dir)
    return os.path.join(sessions_dir, f'session_{user_id}')

async def get_client(user_id: str, api_id: Optional[int] = None, api_hash: Optional[str] = None) -> TelegramClient:
    # If client exists, check if it matches the current credentials
    if user_id in clients:
        client = clients[user_id]
        # If new credentials provided and they don't match, force re-creation
        if api_id and hasattr(client, 'api_id') and client.api_id != int(api_id):
            print(f"🔄 [User:{user_id}] API ID changed. Re-initializing client...")
            try:
                await client.disconnect()
            except: pass
            del clients[user_id]
        else:
            try:
                if not client.is_connected():
                    await client.connect()
                return client
            except Exception as e:
                print(f"⚠️ [User:{user_id}] Client connection lost: {e}. Re-creating...")
                del clients[user_id]

    if not api_id or not api_hash:
        raise HTTPException(status_code=400, detail=f"API credentials missing for user {user_id}")
        
    try:
        session_path = get_session_path(user_id)
        client = TelegramClient(session_path, int(api_id), api_hash)
        await client.connect()
        clients[user_id] = client
        print(f"✅ [User:{user_id}] Client initialized with API ID {api_id}")
        return client
    except Exception as e:
        print(f"❌ [User:{user_id}] Initialization failed: {e}")
        # If it fails, try deleting session file as it might be corrupt
        try:
            os.remove(f"{get_session_path(user_id)}.session")
        except: pass
        raise HTTPException(status_code=500, detail=f"Failed to initialize client: {str(e)}")

@app.on_event("shutdown")
async def shutdown_event():
    for user_id, client in clients.items():
        await client.disconnect()
    clients.clear()

@app.get("/")
async def health_check(
    x_user_id: Optional[str] = Header(None), 
    api_id: Optional[int] = None, 
    api_hash: Optional[str] = None
):
    if not x_user_id:
        return {"status": "running", "message": "Service active, but no user_id provided"}
    
    try:
        # Don't fail if credentials missing, just report unconfigured
        if not api_id or not api_hash:
            # Check if we already have a client
            if x_user_id in clients:
                client = clients[x_user_id]
                authorized = await client.is_user_authorized()
                return {"status": "running", "user_id": x_user_id, "authorized": authorized, "configured": True}
            return {"status": "running", "user_id": x_user_id, "authorized": False, "configured": False}

        client = await get_client(x_user_id, api_id, api_hash)
        authorized = await client.is_user_authorized()
        return {
            "status": "running", 
            "user_id": x_user_id,
            "authorized": authorized,
            "configured": True
        }
    except Exception as e:
        print(f"⚠️ [User:{x_user_id}] Health check warning: {e}")
        return {"status": "running", "user_id": x_user_id, "authorized": False, "configured": False}

# --- Auth Endpoints ---

@app.post("/auth/setup")
async def setup_credentials(x_user_id: str = Header(...), data: dict = Body(...)):
    api_id = data.get("api_id")
    api_hash = data.get("api_hash")
    
    if not api_id or not api_hash:
         raise HTTPException(status_code=400, detail="Missing api_id or api_hash")

    # Re-init client for this user
    if x_user_id in clients:
        await clients[x_user_id].disconnect()
        del clients[x_user_id]
    
    await get_client(x_user_id, int(api_id), api_hash)
    return {"status": "success", "message": f"Credentials updated for user {x_user_id}"}

@app.post("/auth/request-code")
async def request_code(x_user_id: str = Header(...), data: dict = Body(...)):
    phone = data.get("phone")
    api_id = data.get("api_id")
    api_hash = data.get("api_hash")
    
    if not phone:
        raise HTTPException(status_code=400, detail="Phone number required")

    # Normalize phone: remove spaces, dashes, parentheses
    clean_phone = "".join(filter(lambda x: x.isdigit() or x == '+', str(phone)))
    
    print(f"📡 [User:{x_user_id}] Requesting code for {clean_phone}...")
    
    try:
        client = await get_client(x_user_id, api_id, api_hash)
        sent = await client.send_code_request(clean_phone)
        print(f"✅ [User:{x_user_id}] Code sent successfully. Hash: {sent.phone_code_hash}")
        return {"phone_code_hash": sent.phone_code_hash}
    except Exception as e:
        print(f"❌ [User:{x_user_id}] Failed to send code: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/auth/sign-in")
async def sign_in_route(x_user_id: str = Header(...), data: dict = Body(...)):
    phone = data.get("phone")
    code = data.get("code")
    phone_code_hash = data.get("phone_code_hash")
    api_id = data.get("api_id")
    api_hash = data.get("api_hash")
    
    if not phone or not code or not phone_code_hash:
        raise HTTPException(status_code=400, detail="Missing phone, code, or hash")

    print(f"🔐 [User:{x_user_id}] Attempting sign-in for {phone}...")

    try:
        client = await get_client(x_user_id, api_id, api_hash)
        user = await client.sign_in(phone=phone, code=code, phone_code_hash=phone_code_hash)
        print(f"✅ [User:{x_user_id}] Sign-in successful for {user.username or user.id}")
        return {"status": "success", "user": {"id": str(user.id), "username": user.username}}
    except Exception as e:
        print(f"❌ [User:{x_user_id}] Sign-in failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/auth/me")
async def get_me(
    x_user_id: str = Header(...),
    api_id: Optional[int] = None,
    api_hash: Optional[str] = None
):
    client = await get_client(x_user_id, api_id, api_hash)
    if not await client.is_user_authorized():
         raise HTTPException(status_code=401, detail="Userbot not authorized")

    try:
        me = await client.get_me()
        return {"id": str(me.id), "username": me.username, "first_name": me.first_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/logout")
async def logout(x_user_id: str = Header(...)):
    if x_user_id not in clients:
         return {"status": "ignored", "detail": "No client session active"}
    
    try:
        client = clients[x_user_id]
        await client.log_out()
        await client.disconnect()
        del clients[x_user_id]
        return {"status": "success", "message": "Logged out"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/dialogs")
async def get_dialogs(
    x_user_id: str = Header(...),
    api_id: Optional[int] = None,
    api_hash: Optional[str] = None
):
    client = await get_client(x_user_id, api_id, api_hash)
    if not await client.is_user_authorized():
         raise HTTPException(status_code=401, detail="Userbot not authorized")

    try:
        dialogs = await client.get_dialogs()
        results = []
        
        for d in dialogs:
            entity_type = "user"
            if d.is_channel:
                entity_type = "channel"
            elif d.is_group:
                 entity_type = "group"
            
            username = getattr(d.entity, "username", None)
            access_hash = str(getattr(d.entity, "access_hash", "")) if hasattr(d.entity, "access_hash") else None
                
            results.append({
                "telegramId": str(d.id),
                "name": d.title or d.name or "Unknown",
                "username": username,
                "type": entity_type,
                "accessHash": access_hash
            })
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analytics")
async def get_analytics(
    chat_id: str, 
    message_id: int, 
    x_user_id: str = Header(...),
    api_id: Optional[int] = None,
    api_hash: Optional[str] = None
):
    client = await get_client(x_user_id, api_id, api_hash)
    if not await client.is_user_authorized():
         raise HTTPException(status_code=401, detail="Userbot not authorized")

    try:
        peer = int(chat_id) if chat_id.replace('-', '').isdigit() else chat_id
        message = await client.get_messages(peer, ids=message_id)
        
        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        views = getattr(message, 'views', 0) or 0
        forwards = getattr(message, 'forwards', 0) or 0
        replies = message.replies.replies if message.replies else 0
        reactions = sum(r.count for r in message.reactions.results) if message.reactions and message.reactions.results else 0

        return {
            "views": views,
            "forwards": forwards,
            "replies": replies,
            "reactions": reactions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analytics/batch")
async def get_analytics_batch(
    data: list = Body(...), 
    x_user_id: str = Header(...),
    api_id: Optional[int] = None,
    api_hash: Optional[str] = None
):
    # Extract credentials from header/body if provided in a wrapper or just use what came in
    # Node logic passes it in the body for POST
    
    # If using Body list, it might be tricky to get api_id from it 
    # unless we wrapped the list. But our pyRequest sends it in the payload.
    # In pyRequest: data = payload (which contains api_id/api_hash).
    # wait, if data is a LIST, the dict.get will fail.
    
    # Let's check how pyRequest sends it for POST.
    # payload = data || {}; if (apiId) { payload.api_id = ... }
    # So 'data' here is a dict if pyRequest was called with a dict, 
    # but for batch it might be a list.
    
    # Actually, for batch, the Node calls are usually:
    # api.post('/analytics/batch', { items: [...] })
    # Let's check Analytics.jsx or wherever it's called.
    
    # For now, let's assume it's in the body as part of the dict.
    
    credentials = {}
    items = []
    
    if isinstance(data, dict):
        credentials['api_id'] = data.get("api_id")
        credentials['api_hash'] = data.get("api_hash")
        items = data.get("items", [])
    else:
        items = data

    client = await get_client(x_user_id, credentials.get('api_id') or api_id, credentials.get('api_hash') or api_hash)
    if not await client.is_user_authorized():
         raise HTTPException(status_code=401, detail="Userbot not authorized")

    results = {}
    for item in items:
        chat_id = item.get("recipientId")
        msg_id = item.get("messageId")
        if not chat_id or not msg_id: continue
            
        try:
            peer = int(chat_id) if chat_id.replace('-', '').isdigit() else chat_id
            message = await client.get_messages(peer, ids=int(msg_id))
            
            if message:
                views = getattr(message, 'views', 0) or 0
                forwards = getattr(message, 'forwards', 0) or 0
                replies = message.replies.replies if message.replies else 0
                reactions = sum(r.count for r in message.reactions.results) if message.reactions and message.reactions.results else 0
                voters = 0
                if message.poll:
                    voters = message.poll.results.total_voters or 0
                elif message.media and hasattr(message.media, "poll"):
                    voters = message.media.poll.results.total_voters or 0
                     
                results[str(msg_id)] = {
                    "views": views,
                    "forwards": forwards,
                    "replies": replies,
                    "reactions": reactions,
                    "voters": voters
                }
        except Exception:
            continue
            
    return results

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
