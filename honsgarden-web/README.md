# 🐔 Hönsgården - Webbapp

Din digitala assistent för hönsgården. Håll koll på ägg, hönor och ekonomi – dag för dag.

## Funktioner

- 🥚 **Äggloggning** - Registrera ägg och välj vilken höna som la dem
- 🐔 **Hönsprofiler** - Döp dina hönor och följ deras produktion
- 📊 **Statistik** - Topplista, trendanalys och diagram
- 💰 **Ekonomi** - Kostnader, försäljning och netto
- 📧 **E-postpåminnelser** - Daglig påminnelse (Premium)
- ⭐ **Premium** - 7 dagars gratis provperiod!

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** FastAPI + Python
- **Databas:** MongoDB
- **Auth:** Google OAuth (Emergent)
- **Betalning:** Stripe
- **E-post:** Resend

## Struktur

```
/honsgarden-web
├── frontend/          # React webbapp
│   ├── src/
│   │   ├── pages/     # Alla sidor
│   │   ├── components/
│   │   └── context/
│   └── package.json
├── backend/           # FastAPI server
│   ├── server.py
│   ├── requirements.txt
│   └── .env
└── README.md
```

## Deployment

Projektet är förberett för deployment på Emergent-plattformen.

## Domän

Koppla ditt domän (t.ex. honsgarden.se) via Emergent's inställningar efter deployment.
