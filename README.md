# TED Upphandlingsbevakare (Tenders Electronic Daily Monitor)

En fullstack-applikation för att söka, bevaka och analysera offentliga upphandlingar från **EU:s officiella databas TED (Tenders Electronic Daily)**, förstärkt med **MiniMax-M3 LLM** och **Supabase** för fleranvändarstöd och Single Sign-On (SSO).

![TED Bevakare](https://img.shields.io/badge/TED-EU%20Procurement-blue)
![AI](https://img.shields.io/badge/AI-MiniMax--M3-purple)
![Supabase](https://img.shields.io/badge/Database-Supabase%20Postgres%20%2B%20Auth-emerald)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20Tailwind-blue)
![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green)

---

## 🚀 Funktioner

- **🔐 Fleranvändarstöd & Single Sign-On (SSO)**:
  - Inloggning via **Google SSO**, **GitHub SSO** eller e-post och lösenord.
  - Varje användare har sina egna privata bevakningar, träffar, sparade anbud (pipeline) och företagsprofil.
  - Row Level Security (RLS) i Supabase PostgreSQL säkerställer strikt dataseparation.

- **🔍 TED Live-Sökning & Utforskning**:
  - Direktuppkoppling mot TED Search API v3 (`api.ted.europa.eu`).
  - Sökning på fritext, CPV-koder, geografi (Sverige, Norden, EU), typ av upphandling och datum.
  - Kort- och tabellvy med visuell deadline-nedräkning.
  - Stöd för TED Expert Query syntax.

- **🧠 MiniMax Smart Sökassistent (NLP)**:
  - Skriv sökfraser på naturligt språk – MiniMax översätter automatiskt till optimerade CPV-koder, filter och TED-frågor.

- **💬 MiniMax AI Copilot (Interaktiv Chatt)**:
  - Kontextmedveten anbudsrådgivare som tolkar skall-krav, hjälper till att formulera frågor till upphandlaren och tar fram dispositionsutkast för anbud.

- **🔔 Automatiska Bevakningsprofiler & Bakgrundspollning**:
  - Skapa sparade bevakningar med egna filter.
  - Inbyggd bakgrundsmotor som automatiskt pollar TED och flaggar **nya upphandlingar** med olästa badges.
  - Skicka sammanfattningsmail **dagligen eller veckovis** med alla nya relevanta upphandlingar samt länkar för att öppna bevakningen eller avregistrera den.
  - Export av träffar till **Excel (XLSX)**, CSV och JSON.

- **📋 Anbudspipeline (Kanban-tavla)**:
  - Hantera anbudsprocessen: `Bevakad` ➔ `Granskas` ➔ `Beslut` ➔ `Under arbete` ➔ `Inlämnat` ➔ `Vunnen 🏆 / Förlorad ❌`.
  - Interna deadlines, ansvarig person, prioriteringar och interna anteckningar.

- **🎯 Djupgående AI-Analys & Matchningsgrad**:
  - Matchningsbetyg (0–100%) mot företagets profil, skall-krav, affärsmöjligheter, risker, vinnande anbudsstrategi och frågor till upphandlaren.

- **🏷️ CPV-Katalog & Företagsprofil**:
  - Sökbart register över EU:s CPV-koder med svenska benämningar.
  - Konfigurerbar företagsprofil för anpassad AI-matchning.

---

## 🛠️ Teknisk Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Date-fns, React-Markdown, `@supabase/supabase-js`.
- **Backend**: Node.js, Express, `@supabase/supabase-js`, inbyggd SQLite fallback, Node-Cron, Mailtrap Email API, XLSX, Dotenv.
- **AI / LLM**: MiniMax-M3 (Anthropic-kompatibelt API).
- **Databas & Auth**: Supabase (PostgreSQL med RLS & Auth SSO).
- **Datakälla**: Publications Office of the European Union – TED API v3.

---

## 📦 Installation & Kom igång

### 1. Klona repot
```bash
git clone https://github.com/matsromblad/ted-upphandlingsbevakare.git
cd ted-upphandlingsbevakare
```

### 2. Installera beroenden
```bash
npm run install:all
```

### 3. Sätt upp Supabase Databas
1. Skapa ett gratis projekt på [supabase.com](https://supabase.com).
2. Öppna **SQL Editor** i Supabase och kör skriptet från [`supabase/schema.sql`](supabase/schema.sql).
3. Under **Authentication -> Providers** i Supabase kan du aktivera **Google** och **GitHub** för SSO.

### 4. Konfigurera miljövariabler
Kopiera `server/.env.example` till `server/.env` och fyll i dina nycklar:
```env
PORT=3001
MINIMAX_API_KEY=din_minimax_api_nyckel
MINIMAX_MODEL=MiniMax-M3
MINIMAX_BASE_URL=https://api.minimax.io/anthropic/v1
TED_API_URL=https://api.ted.europa.eu/v3/notices/search
APP_BASE_URL=http://localhost:5173
API_BASE_URL=http://localhost:3001

# Mailtrap Email API för bevakningar
MAILTRAP_API_URL=https://send.api.mailtrap.io/api/send
MAILTRAP_API_TOKEN=<YOUR_API_TOKEN>
MAILTRAP_FROM_EMAIL=hello@demomailtrap.co
MAILTRAP_FROM_NAME=Mailtrap Test
MAILTRAP_CATEGORY=Watchlist Digest

# Supabase
SUPABASE_URL=https://ditt-projekt.supabase.co
SUPABASE_ANON_KEY=din_anon_key
SUPABASE_SERVICE_ROLE_KEY=din_service_role_key

# Frontend
VITE_SUPABASE_URL=https://ditt-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=din_anon_key
```

### 5. Starta applikationen
```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

---

## 📄 Licens
MIT
