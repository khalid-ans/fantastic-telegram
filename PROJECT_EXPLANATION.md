# 📘 MERN Telegram Broadcaster - Technical Architecture Documentation

## 1. Project Overview
This is a **high-performance Telegram Broadcasting & Analytics System**. It allows users to manage multiple Telegram channels/groups, send bulk messages (text, media, polls), schedule campaigns, and track detailed engagement metrics (views, forwards, reactions) which are typically hard to get via standard APIs.

## 2. System Architecture (The "Why" & "How")
We use a **Hybrid Architecture** combining Node.js and Python.

*   **Frontend (React)**: User Interface for management.
*   **Backend (Node.js)**: Orchestrates everything, handles API requests, manages the database, and schedules jobs.
*   **Message Queue (Redis + BullMQ)**: Guarantees that thousands of messages are sent reliably without crashing the server. If the server restarts, the queue remembers what's left.
*   **Microservice (Python)**: Used specifically for **MTProto** (Telegram Client Protocol) operations that require a real user session logic which is often more stable or feature-rich in Python's `Telethon` library compared to Node.js alternatives for specific analytics tasks.

---

## 3. Frontend Components (Client-Side)
*Location: `/frontend/src`*

### **Core Pages**
1.  **`Dashboard.jsx`**
    *   **Purpose**: The landing page showing high-level stats (Total Sent, Pending, Failed).
    *   **Why**: Gives immediate insight into system health.
2.  **`FolderManager.jsx`**
    *   **Purpose**: Creates "Folders" that group multiple Telegram Channels/Groups together.
    *   **Why**: Instead of selecting 50 groups one by one every time, the user selects 1 Folder. It simplifies bulk sending.
3.  **`SendMessage.jsx`**
    *   **Purpose**: The main workspace. Users draft messages, attach media, select Folders, and choose "Send Now" or "Schedule".
    *   **Features**: Includes a **TimePicker** for scheduling and file upload logic.
4.  **`QuizBuilder.jsx`**
    *   **Purpose**: A specialized tool to upload `.docx` files containing questions.
    *   **Why**: It uses `wordFileParser.js` to automatically extract questions, options, and answers, converting them into Telegram Poll objects. Saves hours of manual data entry.
5.  **`History.jsx`**
    *   **Purpose**: Shows a log of all past broadcasts with their status (Completed, Failed, Pending).
    *   **Why**: Audit trail. Users need to know if a message actually went through.
6.  **`DataTracking.jsx`**
    *   **Purpose**: The Analytics Table. It shows specific engagement metrics (Views, Forwards, Reactions) for sent messages.
    *   **Feature**: Includes "Sync" to fetch fresh data and "Export to CSV" for reporting.
7.  **`Settings.jsx`**
    *   **Purpose**: Manages API Credentials (API ID, Hash, Bot Token).
    *   **Why**: Makes the app portable. Different clients can input their own credentials without touching the code.
8.  **`Login.jsx`**
    *   **Purpose**: Handles Phone Number authentication with Telegram. Uses OTP flow.

### **Key Utilities**
*   **`Sidebar.jsx`**: Navigation menu.
*   **`wordFileParser.js`**: Regex-based logic to strip text from Word documents and format it into JSON for quizzes.

---

## 4. Backend Components (Server-Side)
*Location: `/backend`*

### **Core Services**
1.  **`server.js`**
    *   **Purpose**: The entry point. Connects to MongoDB, starts the Express server, and initializes the Background Workers.
2.  **`telegramService.js` (Crucial)**
    *   **Purpose**: The "Brain" of Telegram operations.
    *   **Library**: Uses `gramjs` (Node.js version of MTProto).
    *   **Functions**:
        *   `sendBroadcast`: logic to send text/media/polls.
        *   `fetchDialogs`: syncs joined channels/groups from Telegram.
        *   `deleteMessages`: handles message deletion/expiry.
        *   **Why**: We need a dedicated service wrapper to handle rate limits, session management, and error retries (e.g., handling `FLOOD_WAIT` errors).
3.  **`taskProcessor.js`**
    *   **Purpose**: Logic that actually executes a task when the Queue says "Go".
    *   **Why**: Decouples "Scheduling" from "Execution". The API just adds a job to the queue; this processor runs it later.
4.  **`analyticsService.js`**
    *   **Purpose**: Aggregates data for the Analytics page and handles CSV export logic.
5.  **`debug_db.js` / `reset_session.js`**:
    *   **Purpose**: Maintenance scripts created during development to fix database inconsistencies or clear broken sessions.

### **Queues (Redis + BullMQ)**
*Location: `/backend/queues`*
1.  **`broadcastQueue.js`**: Defines the connection to Redis.
2.  **`worker.js`**: A background process that listens for new jobs. It runs independently of the API routes. If the user closes the browser, this worker keeps running to send scheduled messages.

---

## 5. Python Microservice
*Location: `/backend/python_service`*

1.  **`analytics_server.py`**
    *   **Purpose**: A lightweight FastAPI server.
    *   **Why**: While Node.js handles sending well, Python's `Telethon` library is often more robust for **scraping deep analytics** (like specific reaction counts or view history) from the MTProto API.
    *   **Flow**: Node.js asks Python: "Get me stats for Message ID 123", Python fetches it from Telegram and returns JSON.

---

## 6. Database Schema (MongoDB)
*Location: `/backend/models`*

1.  **`Entity`**: Represents a Telegram User, Group, or Channel. Stores `telegramId` and `accessHash` (needed to talk to the API).
2.  **`Folder`**: A customized grouping of Entities.
3.  **`Task`**: Represents a Broadcast Job. Stores:
    *   Content (Text/Poll)
    *   Status (Pending/Completed)
    *   `sentMessages` array: Log of every message sent (Message ID + Recipient ID) for tracking/deletion later.
4.  **`Settings`**: Stores the encrypted Session String and API Credentials.

---

## 7. Why This Tech Stack?

1.  **React**: Fast, reactive UI. Essential for real-time dashboards.
2.  **Node.js**: Excellent for I/O heavy operations (handling thousands of concurrent network requests to Telegram).
3.  **Redis (BullMQ)**: **Reliability**. If we just used `setTimeout`, restarting the server would delete all scheduled posts. Redis saves them to disk.
4.  **MongoDB**: Flexible schema. Telegram data structures vary (messages, polls, media), and NoSQL handles this variation better than SQL.
5.  **Python**: Strategic use for specific API capabilities where Node.js libraries might lack features.

---
**Summary for Mentor**:
"This is a distributed scheduling system. We don't just 'blast' messages; we queue them, process them in the background, and use a specialized microservice for analytics to ensure the main application remains responsive."
