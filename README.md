# ⚡ VoiceCraft — AI-Powered Soft Skills Training Platform

An AI-powered training platform for IT professionals to master communication skills through debates, self-introductions, corporate pitching, and public speaking — all with real-time Gemini AI feedback and gamification.

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| AI Engine | Google Gemini API |
| Database | MongoDB |
| Real-time | Socket.io |
| Auth | Google OAuth 2.0 + JWT |
| Voice Input | Web Speech API |
| Deployment | Docker + docker-compose |

## 📦 Project Structure

```
SAAS/
├── frontend/          # React + Vite application
│   ├── src/
│   │   ├── components/   # Reusable components (Navbar)
│   │   ├── context/      # Auth context provider
│   │   ├── hooks/        # Custom hooks (Speech Recognition)
│   │   ├── pages/        # Page components
│   │   │   ├── Landing/
│   │   │   ├── Login/
│   │   │   ├── Dashboard/
│   │   │   ├── Debate/
│   │   │   ├── Intro/
│   │   │   ├── Pitch/
│   │   │   ├── Social/
│   │   │   ├── Leaderboard/
│   │   │   └── Pricing/
│   │   └── services/     # API client
│   ├── Dockerfile
│   └── nginx.conf
├── backend/           # Node.js + Express API
│   ├── src/
│   │   ├── models/       # Mongoose models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Gemini AI & Gamification
│   │   ├── middleware/   # Auth middleware
│   │   ├── socket/       # Socket.io handlers
│   │   └── server.js     # Entry point
│   ├── Dockerfile
│   └── .env.example
└── docker-compose.yml
```

## 🎮 Three Training Modules

### Module 1: Debate Arena
- **Free**: 1-on-1 AI debates with real-time arguments and counter-arguments
- **Premium**: Team debate rooms via WebSocket with AI moderation
- AI evaluates: Grammar, Arguments, Confidence
- Post-debate corrections and suggestions

### Module 2: Self Intro & Pitching
- **Self Intro** (Free): Scenario-based formal/informal intro practice
- **Pitching** (Free): Corporate pitch practice with 5-dimensional scoring
- AI provides improved versions and detailed feedback

### Module 3: Social & Public Speaking (Premium)
- **Build Connections**: AI-assigned networking challenges
- **Public Speaking**: Speaking challenges with AI evaluation
- Scoring: Approach, Initiation, Completion, Engagement

## 🎯 Gamification
- **XP System**: Earn XP for every activity
- **Levels**: Level up based on XP accumulation
- **Streaks**: Daily streaks for consistent practice
- **Badges**: 15+ achievement badges across all modules
- **Leaderboard**: Compete with peers

## 🛠️ Setup & Running

### Prerequisites
- Node.js 18+
- MongoDB (local or docker)
- Google Gemini API key

### Local Development

1. **Backend:**
```bash
cd backend
cp .env.example .env
# Add your GEMINI_API_KEY to .env
npm install
npm run dev
```

2. **Frontend:**
```bash
cd frontend
npm install
npm run dev
```

3. Open http://localhost:5173

### Docker Deployment

```bash
# Set environment variables
export GEMINI_API_KEY=your_gemini_api_key
export JWT_SECRET=your_jwt_secret

# Build and run
docker-compose up --build

# Access at http://localhost:3000
```

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Google Gemini API Key | ✅ |
| `JWT_SECRET` | JWT signing secret | ✅ |
| `MONGODB_URI` | MongoDB connection string | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | For OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Secret | For OAuth |
| `CLIENT_URL` | Frontend URL for CORS | ✅ |

## 🎤 Voice Interaction
Users interact via **microphone input** using the Web Speech API. The browser captures speech, converts it to text, and sends it to the Gemini AI for processing. AI responses are displayed as text.

## 📝 License
MIT
