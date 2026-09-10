# 🚀 Project Run Guide — Tel K. Ganesan Platform

Yeh project **Next.js 16 + Payload CMS 3 (Full-Stack Unified Architecture)** par bana hai.

Isme frontend aur backend ko alag-alag 2 terminal me chalane ki jarurat nahi hoti (`cd backend` / `cd frontend` ki jarurat nahi hai). Ek hi command se Frontend aur Backend dono run hote hain.

---

## ⚡ Project Run Kaise Karein (Sirf 1 Step)

Apne project ke root folder (`E:\git\tkg2026`) me terminal kholein aur yeh command run karein:

```bash
npm run dev
```

Command run hote hi dono cheezein start ho jayengi:

- 🌐 **Frontend Website**: [http://localhost:3000](http://localhost:3000)
- ⚙️ **Backend CMS Admin**: [http://localhost:3000/admin](http://localhost:3000/admin)
- 🔌 **Backend REST/GraphQL APIs**: [http://localhost:3000/api](http://localhost:3000/api)

---

## 📁 Folder Structure (Frontend vs Backend Kahan Hai?)

```
tkg2026/
├── public/                 <-- Frontend Images, Icons & Media
│
├── src/
│   │
│   ├── [FRONTEND]
│   ├── app/(frontend)/     <-- Frontend Pages, Layout & Routing
│   ├── components/         <-- Frontend React UI Components & CSS Modules
│   │
│   ├── [BACKEND]
│   ├── app/(payload)/      <-- Backend CMS Admin Portal & API Handlers
│   ├── collections/        <-- Database Collections (Users, Pages, Media, etc.)
│   ├── access/             <-- Backend Access Control & Permissions
│   ├── jobs/               <-- Backend Background Jobs & Nodemailer Delivery
│   ├── payload.config.ts   <-- Backend Core CMS & Database Configuration
│   └── payload-types.ts    <-- Auto-generated TypeScript Database Types
│
├── .env                    <-- Environment Variables (MongoDB, Payload Secret)
└── package.json            <-- Project Dependencies & NPM Scripts
```

---

## 🛠️ Useful Commands

| Command | Kaam |
|---|---|
| `npm run dev` | Frontend + Backend CMS dono ko Dev mode me chalata hai |
| `npm run build` | Production build banata hai (TypeScript + Bundler check) |
| `npm run lint` | Code quality aur ESLint check karta hai |
