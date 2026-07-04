# 🌍 Duffy – The Ultimate Language Learning Ecosystem

🔗 **Live Website:** [https://duffy.onrender.com/](https://duffy.onrender.com/)

**Duffy** is a comprehensive, AI-powered web-based language learning platform. It seamlessly bridges the gap between traditional rote memorization (flashcards) and real-world immersive practice. Whether you are a solo learner mastering Japanese, a teacher managing a Spanish 101 classroom, or someone looking to practice conversational English with native speakers—Duffy is your all-in-one hub.

---

## 💡 What is Duffy?

Duffy goes beyond a typical language app by combining spaced repetition, cutting-edge generative AI, and vibrant social gamification into a single platform:

- 🌐 **Find Language Partners**: Connect with learners worldwide based on shared domain interests and target languages.
- 🤖 **Immersive AI Roleplay**: Practice real-life scenarios (e.g., ordering coffee, passing immigration) with AI personas that dynamically adapt to your proficiency level.
- 🎙️ **Real-Time Voice Analysis**: Speak directly into your browser and get instant, dynamic pronunciation and fluency feedback.
- 🎓 **B2B Educational Tools**: Teachers can create classrooms, manage rosters, and assign tasks to students.
- 🏆 **Gamified Progression**: Earn XP, build streaks, and climb the Leaderboard.

---

## ✨ Features (V2 Updates)

Over several phases, Duffy has evolved into a massive, production-ready application. Key features include:

### 🧠 Core Learning Engine
- **Custom Flashcards**: Create, study, and manage decks using an intelligent Spaced Repetition System.
- **AI Grammar Coach**: Instantly check your grammar, get context-aware translations, and receive natural phrasing suggestions powered by Gemini AI.

### 🎭 AI Immersion & Voice
- **Scenario Roleplay**: Engage in highly-contextualized text-based or voice-based roleplays with specialized AI agents.
- **Web Speech API Integration**: Completely free, in-browser neural voice recognition. Speak your responses and let Duffy instantly transcribe and analyze them.
- **Dynamic Pronunciation Dashboard**: Analyzes your spoken transcript, identifies mispronounced words, generates mock grading, and provides Text-To-Speech (TTS) corrections.

### 🎮 Social & Gamification
- **Leaderboard & XP System**: Compete globally. Earn points by completing lessons, adding flashcards, or chatting with the AI.
- **Friends Hub**: Send, accept, and decline friend requests. View online status, see mutual languages, and easily challenge friends.
- **Activity Feed**: A real-time timeline showcasing major milestones from the Duffy community.

### 🏢 B2B & Enterprise Architecture
- **Teacher Hub**: A dedicated dashboard for `TEACHER` and `ADMIN` roles.
- **Classroom Management**: Generate 6-digit `joinCodes` for students. Monitor deep-dive roster analytics, individual student progress, and assignments.
- **Role-Based Access Control (RBAC)**: Secure routing and backend middleware protecting Premium and Admin routes.

### 💎 Premium Ecosystem
- **Tiered Subscriptions**: Beautiful pricing dashboards for Free, Premium, and Pro users.
- **Granular Settings**: A comprehensive Command Center to manage profile details, privacy toggles (e.g., hide online status, hide activity feed), and billing.

---

## 🛠 Tech Stack

| Area         | Technology         |
|--------------|--------------------|
| Frontend     | Vite, React, TailwindCSS, DaisyUI, Lucide React |
| Backend      | Node.js, Express.js |
| Database     | MongoDB, Mongoose |
| AI Engine    | Google Gemini API  |
| Voice/Speech | Web Speech API (SpeechRecognition & SpeechSynthesis) |
| Video Chat   | Stream (getstream.io) |

---

## 🙌 Credits

Shoutout to **Codesistency** on YouTube for their original tutorial which helped establish the initial full-stack flow. The app has since been completely re-architected and expanded with custom AI, Gamification, and B2B logic!

---

## 🚀 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/duffy.git
   cd duffy
   ```

2. **Setup Backend:**
   ```bash
   cd backend
   npm install
   # Create a .env file with your MongoDB URI, JWT Secret, and Gemini API Key
   npm run dev
   ```

3. **Setup Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Open your browser:** Navigate to `http://localhost:5173`
