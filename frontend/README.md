# Duffy Frontend

React single-page application for the Duffy language learning platform, providing real-time chat, video calling, spaced-repetition flashcards, and AI-powered roleplay and language coaching.

## Tech Stack

- **Framework & Tooling:** React 19, Vite 6
- **Routing & State:** React Router v7, Zustand, TanStack Query v5
- **Styling & UI:** Tailwind CSS, DaisyUI, Lucide React, Recharts
- **Chat & Video SDKs:** Stream Chat (`stream-chat-react`), Stream Video (`@stream-io/video-react-sdk`)
- **HTTP Client:** Axios

## Environment Variables

Copy `.env.example` to `.env` in the `frontend` directory:

| Variable | Description |
|---|---|
| `VITE_STREAM_API_KEY` | Public Stream application key (matches `STREAM_API_KEY` in `backend/.env`). Safe for client bundles. |

## Available Scripts

Run these commands from the `frontend/` directory or with `--prefix frontend`:

- `npm run dev`: Starts Vite dev server with hot module replacement (HMR) at `http://localhost:5173`.
- `npm run build`: Compiles production assets into `frontend/dist/`.
- `npm run preview`: Serves the production build locally for verification.
- `npm run lint`: Runs ESLint over all source files.

## Project Structure

```
frontend/
├── public/              # Static assets and icons
├── src/
│   ├── components/      # Reusable UI components (AI sidebar, auth patterns, chat, layout)
│   ├── hooks/           # Custom TanStack Query mutation/query hooks
│   ├── lib/             # Axios instance and API service functions
│   ├── pages/           # Route views (Home, Dashboard, Roleplay, Friends, Decks, Classrooms)
│   ├── store/           # Zustand state stores (auth, learning, theme)
│   ├── App.jsx          # Route configuration and protected route guards
│   ├── index.css        # Tailwind directives and DaisyUI styles
│   └── main.jsx         # Application entry point with providers
├── index.html           # HTML template
├── tailwind.config.js   # Tailwind & DaisyUI theme configuration
└── vite.config.js       # Vite build configuration with proxy
```
