# Google Calendar Clone - Full Stack Application

A high-fidelity clone of Google Calendar with complete frontend and backend implementation, featuring smooth animations, intuitive UI, and robust data management.

## 🎯 Features

### Core Functionality
- ✅ **Multiple Calendar Views**: Month, Week, and Day views with smooth transitions
- ✅ **Event Management**: Create, edit, and delete events with rich details
- ✅ **Visual Event Display**: Color-coded events with time-based positioning
- ✅ **Responsive Design**: Adapts to different screen sizes
- ✅ **Real-time Updates**: Instant UI updates after any operation
- ✅ **Persistent Storage**: Events saved to database/storage

### Advanced Features
- 🎨 **Color Coding**: 5 color themes for event categorization
- 📍 **Location Support**: Add and display event locations
- 📝 **Rich Descriptions**: Full text descriptions for events
- 🔍 **Smart Filtering**: View events by date, week, or month

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 18 with Hooks (Composition API equivalent to Vue 3)
- Lucide React for icons
- Tailwind CSS for styling
- Persistent Storage API for data persistence

**Backend:**
- Flask 3.x (Python web framework)
- SQLite for database
- Flask-CORS for cross-origin requests
- RESTful API architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────┐
│           Frontend (React)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │  Month   │  │   Week   │  │   Day    │ │
│  │   View   │  │   View   │  │   View   │ │
│  └──────────┘  └──────────┘  └──────────┘ │
│         │              │              │     │
│         └──────────────┴──────────────┘     │
│                    │                        │
│          ┌─────────▼─────────┐             │
│          │   Event Manager    │             │
│          │  (State & Logic)   │             │
│          └─────────┬─────────┘             │
└────────────────────┼───────────────────────┘
                     │
                     │ HTTP/REST
                     │
┌────────────────────▼───────────────────────┐
│           Backend (Flask)                   │
│  ┌──────────────────────────────────────┐  │
│  │         API Routes                    │  │
│  │  /api/events [GET, POST, PUT, DELETE] │  │
│  │  /api/events/<id> [GET, PUT, DELETE]  │  │
│  │  /api/events/date/<date> [GET]        │  │
│  │  /api/events/conflicts [POST]         │  │
│  └──────────────┬───────────────────────┘  │
│                 │                           │
│  ┌──────────────▼───────────────────────┐  │
│  │      Business Logic Layer            │  │
│  │  - Validation                        │  │
│  │  - Conflict Detection                │  │
│  │  - Data Transformation               │  │
│  └──────────────┬───────────────────────┘  │
│                 │                           │
│  ┌──────────────▼───────────────────────┐  │
│  │      Database Layer (SQLite)         │  │
│  │  - Events Table                      │  │
│  │  - Indexed Queries                   │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- pip (Python package manager)

### Backend Setup

1. **Move to backend directory:**
```bash
cd backend/
```

2. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install flask flask-cors
```

4. **Run the server:**
```bash
python app.py
```

The backend will start on `http://localhost:5000`

### Frontend Setup (React Version)

1. **Move to frontend folder:**
```bash
cd frontend/
```

2. **Install dependencies:**
```bash
npm i
```

3. **Run the app:**
```bash
npm start
```
The backend will start on `http://localhost:3000`
