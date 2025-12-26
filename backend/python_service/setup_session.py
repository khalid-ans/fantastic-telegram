from telethon import TelegramClient
from dotenv import load_dotenv
import os
import asyncio

# Load env variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

API_ID = os.getenv('API_ID')
API_HASH = os.getenv('API_HASH')
SESSION_NAME = os.path.join(os.path.dirname(__file__), 'analytics_session')

async def main():
    if not API_ID or not API_HASH:
        print("❌ Error: API_ID or API_HASH not found in .env")
        return

    print(f"🔐 Logging in with API_ID: {API_ID}")
    client = TelegramClient(SESSION_NAME, int(API_ID), API_HASH)
    
    await client.start()
    
    me = await client.get_me()
    print(f"✅ Successfully logged in as: {me.first_name} (@{me.username})")
    print(f"📄 Session file saved at: {SESSION_NAME}.session")
    
    await client.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
