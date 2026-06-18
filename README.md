# JobTrackr — Job Market Analytics SaaS

A production-ready SaaS web app that scrapes public job boards, processes the data, and surfaces analytics to help developers track market demand in real time.

**Live demo:** https://jobtrackr-jet.vercel.app

---

## What it does

- Scrapes remote developer jobs every 6 hours using a headless browser
- Computes a **demand score** (0–100) for each job based on salary, tech stack, and recency
- Lets users filter, save, and track jobs they care about
- Provides aggregated analytics — top tags, salary ranges, score distribution
- Full subscription billing with a 7-day free trial

---

## Tech stack

| Layer | Technologies |
|---|---|
| Backend | Python 3.11, FastAPI, PostgreSQL, SQLAlchemy (async), Alembic |
| Scraping | Playwright (headless Chromium), APScheduler |
| Auth | JWT (access + refresh tokens in httpOnly cookies), bcrypt |
| Billing | Stripe Checkout, Stripe Customer Portal, webhooks |
| Frontend | Next.js 14 (App Router), React, Tailwind CSS |
| Deploy | Railway (backend + PostgreSQL), Vercel (frontend) |

---

## Features

### Backend
- `POST /auth/register` — register with automatic 7-day Pro trial
- `POST /auth/login` — login, tokens set as httpOnly cookies
- `POST /auth/refresh` — silent token refresh
- `GET /jobs` — paginated feed, filterable by tag / min score / date range
- `GET /jobs/{id}` — single job detail
- `POST /watchlist/{job_id}` — save a job (auth required)
- `DELETE /watchlist/{job_id}` — remove from watchlist
- `GET /analytics` — top tags, avg salary, score distribution (Pro only)
- `POST /billing/checkout` — Stripe Checkout session
- `POST /billing/portal` — Stripe Customer Portal
- `POST /billing/webhook` — handles `subscription.updated` / `subscription.deleted`

### Demand score formula
```
base 50
+ 10  if salary_max > $100k
+ 15  if "python" in tags
+ 10  if "react" in tags
+ 15  if posted within 24h
- 10  if no salary listed
```

### Frontend
- Dark mode by default
- Responsive (mobile + desktop)
- Loading skeletons for all async data
- Optimistic UI updates for watchlist
- Toast notifications for all actions
- Route-level auth protection

### Subscription plans
| Plan | Price | Features |
|---|---|---|
| Free | $0 | 10 jobs/day, no analytics |
| Pro | $19/mo | Unlimited + full analytics |
| Enterprise | $49/mo | Pro + API access |

---

## Project structure

```
jobtrackr/
├── backend/
│   ├── app/
│   │   ├── api/          # route handlers
│   │   ├── core/         # config, JWT, dependencies
│   │   ├── db/           # models, async session
│   │   ├── migrations/   # alembic
│   │   ├── schemas/      # pydantic schemas
│   │   └── services/     # scraper, stripe, calculation engine
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
└── frontend/
    ├── app/
    │   ├── (auth)/       # login, register
    │   └── (app)/        # dashboard, jobs, watchlist, analytics, settings
    ├── components/
    ├── lib/              # api client, auth context, utils
    └── package.json
```

---

## Running locally

### Backend

```bash
cd backend
cp .env.example .env      # fill in your values
pip install -r requirements.txt
playwright install chromium
alembic upgrade head
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

### Environment variables (backend)

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/jobtrackr
SECRET_KEY=your-secret-key-min-32-chars
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
FRONTEND_URL=http://localhost:3000
ENVIRONMENT=development
```

---

## Deployment

- **Backend** — Railway (Dockerfile-based, PostgreSQL add-on)
- **Frontend** — Vercel (Next.js auto-detected, root directory: `frontend`)
- **Migrations** — run `alembic upgrade head` from Railway console after first deploy
- **Stripe webhooks** — point to `https://your-backend.railway.app/billing/webhook`
