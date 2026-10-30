# 🚀 Project Run Guide — Tel K. Ganesan Platform

Project ab **do alag folders** mein hai:

- **`frontend/`** — Next.js 16 website (saare pages, components, CSS)
- **`backend/`** — Node.js + Express + MongoDB (Mongoose) API

Website ka data (articles, settings, navigation, footer) backend API se aata hai. Form
submissions (Connect, Newsletter) bhi backend mein jaate hain, aur wahi emails bhejta hai.

---

## ⚙️ Pehli baar setup

```bash
npm install            # root: sirf dono apps ek saath chalane wala tool
npm run install:all    # backend + frontend dependencies
```

Phir dono `.env` files banayein:

- `backend/.env` — `backend/.env.example` copy karein (MongoDB URI, SMTP, `INTERNAL_API_KEY`, `APP_SECRET`)
- `frontend/.env` — `frontend/.env.example` copy karein (`BACKEND_URL`, wahi `INTERNAL_API_KEY`)

> `INTERNAL_API_KEY` dono files mein **same** hona chahiye.

---

## ⚡ Project Run Kaise Karein

Root folder (`E:\git\tkg2026`) mein:

```bash
npm run dev
```

Yeh dono ek saath start karta hai:

- 🌐 **Website (frontend)**: [http://localhost:3000](http://localhost:3000)
- ⚙️ **API (backend)**: [http://127.0.0.1:4000/api/health](http://127.0.0.1:4000/api/health)

Alag-alag chalana ho to do terminal mein:

```bash
npm run dev:backend
npm run dev:frontend
```

---

## 📁 Folder Structure

```
tkg2026/
├── frontend/                     <-- WEBSITE (Next.js)
│   ├── public/                   <-- Images, icons
│   ├── src/app/(frontend)/       <-- Pages, layout, routing, form server actions
│   ├── src/frontend/components/  <-- React UI components + CSS modules
│   ├── src/lib/api.ts            <-- Backend API client (data yahin se aata hai)
│   ├── src/lib/forms.ts          <-- Form submissions -> backend
│   └── .env
│
├── backend/                      <-- API (Node.js + Express + MongoDB)
│   ├── src/server.ts             <-- Server start
│   ├── src/app.ts                <-- Express app + routes list
│   ├── src/routes/               <-- API routes (content, forms, assets, health, cron)
│   ├── src/models/               <-- Mongoose models (MongoDB collections)
│   ├── src/data/                 <-- Query engine (where/sort/limit), populate, write rules
│   ├── src/lib/                  <-- Inquiry, newsletter, email, evidence-gate logic
│   ├── src/jobs/                 <-- Email delivery + SLA reminder jobs
│   ├── scripts/                  <-- Seed, worker, redirects import, smoke tests
│   ├── media/                    <-- Uploaded images (local)
│   └── .env
│
├── docs/                         <-- Documentation
└── deploy/                       <-- nginx + deploy script
```

---

## 🛠️ Useful Commands

| Command | Kaam |
|---|---|
| `npm run dev` | Frontend + Backend dono dev mode mein |
| `npm run build` | Dono ka production build |
| `npm run typecheck` | Dono ka TypeScript check |
| `npm run test` | Backend integration tests + frontend form tests |
| `npm --prefix frontend run lint` | Website ka ESLint check |
| `npm --prefix backend run worker:delivery` | Email delivery / SLA worker |

---

## 🔐 Admin Panel (WordPress jaisa)

URL: [http://localhost:3000/admin](http://localhost:3000/admin)

Purane Payload accounts usi email + password se login karte hain (password format same rakha gaya hai).

| Menu | Kaam |
|---|---|
| Dashboard | At a Glance, recent inquiries, overdue / failed email alerts |
| Posts | Articles likhna (rich text editor, featured image, tags, SEO score), draft / publish |
| Media | Images / PDF upload (drag & drop), alt text, rights status |
| Pages, Enterprises, Film & Culture, Impact, Downloads | Baaki content |
| Inquiries, Subscribers | Leads ka status, notes; newsletter subscribers |
| Claims, Evidence sources | Evidence register |
| Users, Profile | Staff accounts + roles, apna password |
| Settings | General, Menus, Footer, Inquiry routes, Redirects |
| Tools | Activity log, Email delivery log |

Roles: Administrator, Editor (sirf draft), Publisher (publish), Evidence Reviewer, Route Owner
(sirf apne routes ki inquiries), QA (read-only). Publish karne se pehle evidence gate check hota hai —
unverified claim / unresolved authorship wala content publish nahi hota, admin ke liye bhi.
