# 💸 SplitWise Clone

A full-stack expense splitting application with an Apple-inspired dark mode UI, Three.js animations, and real-time balance calculations.

![Stack](https://img.shields.io/badge/React-18-blue) ![Stack](https://img.shields.io/badge/Node.js-Express-green) ![Stack](https://img.shields.io/badge/MongoDB-Mongoose-darkgreen) ![Stack](https://img.shields.io/badge/Three.js-R3F-black)

---

## ✨ Features

- **Authentication** — JWT-based register/login with secure password hashing
- **Groups** — Create expense groups (Trip, Home, Friends, Work, Couple, Other)
- **Expenses** — Add expenses with equal/exact/percentage splits
- **Balance Tracking** — Real-time balance calculation with debt simplification algorithm
- **Settlements** — Record payments between members to settle debts
- **Dashboard** — Analytics with monthly spending charts, category breakdowns, animated counters
- **Three.js Animations** — Floating particle systems, glowing wireframe orbs, orbital ring animations
- **Apple Dark UI** — Glassmorphism, staggered card animations, shimmer loading skeletons, toast notifications
- **Mobile First** — Fully responsive design optimized for iPhone screen sizes

---

## 🛠 Tech Stack

| Layer     | Technology                                      |
|-----------|--------------------------------------------------|
| Frontend  | React 18, React Router, Axios, Three.js (R3F)   |
| Backend   | Node.js, Express, Mongoose, JWT, bcryptjs        |
| Database  | MongoDB                                          |
| Styling   | Vanilla CSS (Apple dark design system)           |

---

## 📦 Project Structure

```
SplitWiseClone/
├── server/                    # Backend API
│   ├── models/                # Mongoose schemas (User, Group, Expense, Settlement)
│   ├── routes/                # Express routes (auth, groups, expenses, users, settlements)
│   ├── middleware/            # JWT auth middleware
│   ├── server.js              # Express app entry
│   ├── .env                   # Server environment variables
│   └── package.json
├── client/                    # React frontend
│   ├── public/                # Static assets
│   └── src/
│       ├── components/        # Sidebar, SharedComponents, Three.js scenes
│       ├── context/           # AuthContext, ToastContext
│       ├── pages/             # Login, Register, Dashboard, Groups, GroupDetail, Activity
│       ├── utils/             # API client, constants
│       ├── App.js             # Router + route guards
│       ├── index.js           # Entry point
│       └── index.css          # Apple dark design system (all styles)
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ & npm
- **MongoDB** (local or Atlas cloud instance)

### 1. Clone the repo

```bash
git clone <repo-url>
cd SplitWiseClone
```

### 2. Setup the Server

```bash
cd server
npm install
```

Edit `.env` with your configuration:

```env
MONGO_URI=mongodb://localhost:27017/splitwise_clone
JWT_SECRET=your_super_secret_key_here
PORT=5000
```

Start the server:

```bash
npm run dev     # development with nodemon
# or
npm start       # production
```

### 3. Setup the Client

```bash
cd client
npm install
```

Edit `.env` if needed:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

Start the client:

```bash
npm start
```

The app will open at **http://localhost:3000**

---

## 🔑 Environment Variables

### Server (`server/.env`)

| Variable     | Description                  | Default                                    |
|-------------|------------------------------|--------------------------------------------|
| `MONGO_URI` | MongoDB connection string    | `mongodb://localhost:27017/splitwise_clone` |
| `JWT_SECRET`| Secret key for JWT signing   | (required, set your own)                   |
| `PORT`      | Server port                  | `5000`                                     |

### Client (`client/.env`)

| Variable             | Description       | Default                         |
|---------------------|-------------------|---------------------------------|
| `REACT_APP_API_URL` | Backend API URL   | `http://localhost:5000/api`     |

---

## 🎨 Design System

- **Dark mode only** — Apple-inspired with `#000000` base, glassmorphism cards
- **Typography** — Inter (Google Fonts) with `-apple-system` fallback
- **Colors** — iOS system colors (Blue `#0a84ff`, Green `#30d158`, Red `#ff453a`, Purple `#bf5af2`)
- **Animations** — Page transitions (fade + slide up), staggered card entrance (80ms delay), modal scale-in with blur backdrop, shimmer loading skeletons, animated number counters

---

## 📱 API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Sign in
- `GET  /api/auth/me` — Get current user

### Groups
- `POST   /api/groups` — Create group
- `GET    /api/groups` — List user's groups
- `GET    /api/groups/:id` — Get group with balances
- `POST   /api/groups/:id/members` — Add member
- `DELETE /api/groups/:id` — Delete group

### Expenses
- `POST   /api/expenses` — Add expense
- `GET    /api/expenses/group/:groupId` — Group expenses
- `GET    /api/expenses/recent` — Recent activity
- `DELETE /api/expenses/:id` — Delete expense

### Settlements
- `POST /api/settlements` — Record settlement
- `GET  /api/settlements/group/:groupId` — Group settlements

### Users
- `GET /api/users/search?q=` — Search users
- `GET /api/users/dashboard` — Dashboard analytics
- `PUT /api/users/profile` — Update profile

---

## 📄 License

MIT
