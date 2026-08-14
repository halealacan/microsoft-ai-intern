# 🎓 AI Study Assistant

AI Study Assistant is an AI-powered study platform designed to help students learn, practice, and interact with their study materials.

The application combines an interactive AI chat, automatically generated quizzes, and PDF-based study tools in a modern web interface.

The project uses **Google Gemini 3.5 Flash** as the AI model, **FastAPI** for the backend, and **React + Vite** for the frontend.

---

## ✨ Features

### 💬 AI Study Chat

Students can ask questions about programming, university courses, or other academic topics and receive detailed AI-generated explanations.

- Streaming AI responses
- Conversation history
- Code examples
- Academic explanations
- User-friendly API error handling

### 🧠 Interactive Quiz

Generate interactive multiple-choice quizzes for any topic.

The quiz system provides:

- AI-generated questions
- Multiple-choice answers
- Interactive answer selection
- Automatic scoring
- Success percentage
- Explanations for correct answers
- Detailed result review

### 📄 PDF Study

Upload study materials in PDF format and use AI to study directly from the document.

Supported features:

- PDF upload
- AI-powered PDF analysis
- Automatic PDF summarization
- Quiz generation directly from PDF content

Quiz questions generated from a PDF are based on the uploaded document.

---

## 🛠️ Tech Stack

### Frontend

- React
- Vite
- JavaScript
- Lucide React
- Modern responsive dark UI

### Backend

- Python
- FastAPI
- Uvicorn
- Pydantic
- python-dotenv
- python-multipart

### AI

- Google Gemini API
- Gemini 3.5 Flash

---

## 🏗️ Architecture

```text
User
  │
  ▼
React + Vite Frontend
  │
  ▼
FastAPI Backend
  │
  ▼
Google Gemini API
  │
  ├── AI Chat
  ├── Quiz Generation
  ├── PDF Analysis
  ├── PDF Summarization
  └── PDF Quiz Generation
```

---

## 📁 Project Structure

```text
AI_Study_Assistant/
│
├── backend/
│   ├── main.py
│   ├── ai_service.py
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatHeader.jsx
│   │   │   ├── ChatMessage.jsx
│   │   │   ├── InputArea.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── QuizView.jsx
│   │   │   └── PdfStudyView.jsx
│   │   │
│   │   └── App.jsx
│   │
│   └── package.json
│
└── README.md
```

---

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd AI_Study_Assistant
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install the required Python packages:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the `backend` directory:

```env
GOOGLE_API_KEY=your_google_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash
```

Start the backend:

```bash
python main.py
```

The FastAPI server will run locally.

FastAPI also provides Swagger documentation through the `/docs` endpoint.

### 3. Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local address displayed by Vite in your browser.

---

## 🔌 API Endpoints

| Endpoint | Purpose |
|---|---|
| `POST /api/chat` | AI chat |
| `POST /api/chat/stream` | Streaming AI responses |
| `POST /api/quiz` | Generate an interactive quiz |
| `POST /api/pdf/upload` | Upload a PDF |
| `POST /api/pdf/summarize` | Summarize an uploaded PDF |
| `POST /api/pdf/quiz` | Generate a quiz from PDF content |
| `GET /api/health` | Check API/model status |

---

## 🔐 API Key Security

The Gemini API key is stored in a local `.env` file.

**Never upload your `.env` file or API key to GitHub.**

Example:

```env
GOOGLE_API_KEY=your_api_key_here
```

Make sure `.env` is included in `.gitignore`.

---

## 🚀 Future Improvements

Possible future improvements include:

- Improved Markdown rendering
- Study progress tracking
- Quiz history
- PDF question-answering
- Multi-language interface
- Improved mobile responsiveness
- Personalized study recommendations

---

## 🎯 Project Goal

The goal of AI Study Assistant is to combine generative AI with practical study tools in a single application.

Instead of functioning only as a chatbot, the platform allows students to interact with AI, test their knowledge through quizzes, and transform PDF study materials into summaries and interactive learning activities.

---

## 👩‍💻 Author

Developed as an AI-powered educational assistant project.
