# 📡 MERN Telegram Broadcaster & Analytics Pro

A production-ready, full-stack application for managing, scheduling, and analyzing Telegram broadcasts. Built with a MERN stack (MongoDB, Express, React, Node.js) and a specialized Python microservice for deep analytics.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Dashboard+Preview)

## 🚀 Key Features

-   **Broadcast Management**: Send text messages, images, and polls (quizzes) to multiple channels/groups instantly or on a schedule.
-   **Smart Quiz Builder**: Auto-parse questions from Word documents (.docx) to generate Telegram polls with custom scheduling (IST/UTC support).
-   **Hybrid Architecture**: 
    -   **Node.js** handles campaign management, file parsing, and bot API interactions.
    -   **Python (Telethon)** acts as a specialized microservice for fetching advanced engagement metrics (views, forwards, reactions) that the standard Bot API cannot access.
-   **Advanced Analytics**: Real-time tracking of message performance with a visual dashboard.
-   **Production Auth**: Secure API credential management and phone-based login for the analytics service.
-   **Robust Queuing**: Uses Redis (BullMQ) for reliable message delivery and job scheduling.

## 🛠 Tech Stack

-   **Frontend**: React (Vite), TailwindCSS, TanStack Query, Framer Motion
-   **Backend**: Node.js, Express, Mongoose, BullMQ
-   **Analytics Service**: Python, FastAPI, Telethon (MTProto)
-   **Database**: MongoDB
-   **Queue/Cache**: Redis (Memurai for Windows)

---

## ⚙️ Prerequisites

Ensure you have the following installed:
-   [Node.js](https://nodejs.org/) (v16+)
-   [Python](https://www.python.org/) (v3.8+)
-   [MongoDB](https://www.mongodb.com/) (Local or Atlas)
-   [Redis](https://redis.io/) (Or [Memurai](https://www.memurai.com/) for Windows)

---

## 📦 Installation

### 1. Clone the Repository
\`\`\`bash
git clone https://github.com/your-username/mern-broadcaster.git
cd mern-broadcaster
\`\`\`

### 2. Backend Setup
\`\`\`bash
cd backend
npm install
\`\`\`
*Create a `.env` file in `backend/` based on your configuration (PORT, MONGO_URI, etc.).*

### 3. Frontend Setup
\`\`\`bash
cd frontend
npm install
\`\`\`

### 4. Python Analytics Service Setup
\`\`\`bash
cd backend/python_service
pip install -r requirements.txt
\`\`\`

---

## 🚀 Running the Project

You need to run these 4 services simultaneously. You can use separate terminal tabs.

### Terminal 1: Redis (Database)
Ensure your Redis server is running.
\`\`\`powershell
# Windows (if using Memurai)
memurai.exe
\`\`\`

### Terminal 2: Node.js Backend
\`\`\`bash
cd backend
npm run dev
# Runs on http://localhost:5000
\`\`\`

### Terminal 3: Python Analytics Service
\`\`\`bash
cd backend/python_service
python analytics_server.py
# Runs on http://localhost:8000
\`\`\`

### Terminal 4: Frontend UI
\`\`\`bash
cd frontend
npm run dev
# Accessible at http://localhost:5173
\`\`\`

---

## 🔐 First Time Setup (Authentication)

1.  Open the App at `http://localhost:5173`.
2.  Navigate to **Settings**.
3.  Enter your **App ID**, **App Hash** (from my.telegram.org), and **Bot Token**.
4.  Go to **Login** via the sidebar.
5.  Enter your **Phone Number** to authenticate the Python Analytics Service.
    *   This creates a session file that allows the app to fetch view counts and reaction data on your behalf.

---

## 📝 Usage

1.  **Folders**: Create folders and add Telegram Chat IDs (Channels/Groups) to them.
2.  **Quiz Builder**: Upload a `.docx` file with questions to auto-generate quizzes.
3.  **Send**: Compose a message or select a quiz, choose target folders, and hit Send or Schedule.
4.  **Analytics**: Visit the Data Tracking page to sync and view real-time engagement stats.

## 📄 License
MIT
