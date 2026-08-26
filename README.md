# TED Upphandlingsbevakare (Tenders Electronic Daily Monitor)

En fullstack-applikation för att söka, bevaka och analysera offentliga upphandlingar från **EU:s officiella databas TED (Tenders Electronic Daily)**, förstärkt med **MiniMax-M3 LLM** för intelligent sökning, automatisk CPV-kategorisering, anbudsanalys och AI-copilot.

![TED Bevakare](https://img.shields.io/badge/TED-EU%20Procurement-blue)
![AI](https://img.shields.io/badge/AI-MiniMax--M3-purple)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20Tailwind-blue)
![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20SQLite-green)

---

## 🚀 Funktioner

- **🔍 TED Live-Sökning & Utforskning**:
  - Direktuppkoppling mot TED Search API v3 (`api.ted.europa.eu`).
  - Sökning på fritext, CPV-koder, geografi (Sverige, Norden, EU), typ av upphandling och datum.
  - Kort- och tabellvy med visuell deadline-nedräkning (grön/gul/röd).
  - Stöd för TED Expert Query syntax.

- **🧠 MiniMax Smart Sökassistent (NLP)**:
  - Skriv sökfraser på naturligt språk – MiniMax översätter automatiskt till optimerade CPV-koder, filter och TED-frågor.

- **💬 MiniMax AI Copilot (Interaktiv Chatt)**:
  - Kontextmedveten anbudsrådgivare som tolkar skall-krav, hjälper till att formulera frågor till upphandlaren och tar fram dispositionsutkast för anbud.

- **🔔 Automatiska Bevakningsprofiler & Bakgrundspollning**:
  - Skapa sparade bevakningar med egna filter.
  - Inbyggd bakgrundsmotor som automatiskt pollar TED och flaggar **nya upphandlingar** med olästa badges.
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

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Date-fns, React-Markdown.
- **Backend**: Node.js, Express, inbyggd SQLite (`node:sqlite`), Node-Cron, XLSX, Dotenv.
- **AI / LLM**: MiniMax-M3 (Anthropic-kompatibelt API).
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

### 3. Konfigurera miljövariabler
Kopiera `server/.env.example` till `server/.env` och ange din MiniMax API-nyckel:
```bash
cp server/.env.example server/.env
```
Fyll i:
```env
PORT=3001
MINIMAX_API_KEY=din_minimax_api_nyckel
MINIMAX_MODEL=MiniMax-M3
MINIMAX_BASE_URL=https://api.minimax.io/anthropic/v1
TED_API_URL=https://api.ted.europa.eu/v3/notices/search
```

### 4. Starta applikationen
```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

---

## 📄 Licens
MIT
