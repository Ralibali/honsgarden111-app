# Hönsgården - Product Requirements Document

## Projektöversikt
Hönsgården är en digital assistent för hönsägare. Appen hjälper användare att:
- Logga ägg dagligen
- Hålla koll på sina höns (hälsa, produktivitet)
- Få AI-drivna tips och analyser
- Se statistik och trender
- Tävla mot andra hönsägare via ranking

## Tech Stack
- **Backend**: FastAPI + MongoDB
- **Frontend**: React (Vite) + TypeScript
- **AI**: OpenAI GPT-4o-mini
- **Hosting**: Render (standalone deployment)

---

## Sprint 1 - KLART ✅

### Implementerade funktioner:
1. **Streak-system** - 10 dagars streak = 7 premium-dagar
2. **Agdas Inbox** - AI-genererat dagligt kort (1/dag)
3. **"Hej"-hantering** - Agda svarar direkt utan AI vid hälsning
4. **AI-cache** - Alla AI-svar cachas i MongoDB
5. **Statistik + AI-insikter**
6. **Höna-personlighet** - Viral funktion med OpenAI Vision

---

## Sprint 2 - KLART ✅

### Implementerade funktioner:
1. **Din hönsgård idag** - AI-prognos och tips
2. **Hälsoscore (0-100)** - Baserat på produktionstrend och hälsa
3. **PWA** - Installera som app på mobilen
4. **Dashboard-förbättringar**

---

## Sprint 3A - KLART ✅

### Implementerade funktioner:

1. **Ranking + Tävlingsmekanik**
   - `GET /api/ranking/summary`
   - Visar "topp X%" baserat på ägg/dag
   - Nivåer: 🏆 Topp 5%, 🥇 Topp 10%, 🥈 Topp 25%, 🥉 Topp 50%
   - Visar "nästa nivå" och hur många ägg/dag som krävs
   - `GET /api/ranking/coach` - AI-tips för att nå nästa nivå (cachad 24h)

2. **Veckomål (Quests)**
   - `GET /api/challenges/week`
   - `POST /api/challenges/progress`
   - 3 veckomål: Logga ägg 5 dagar, Hälsocheck, Besök statistik
   - Progress-bar för varje mål
   - Badge vid alla mål klara

---

## Kommande (Sprint 3B)

### Planerat:
- **Community Q&A** - Viral delning med content gating
- **AI första svar** - Agda svarar automatiskt på nya frågor
- **Public preview** - Frågor kan ses utan konto (gated)

---

## API-kostnadskontroll

| Funktion | Max anrop |
|----------|-----------|
| Agdas Inbox | 1/user/dag |
| Farm Today | 1/user/dag |
| Stats Insights | 1/user/dag |
| Ranking Coach | 1/user/dag |
| Agda Chat | Per fråga |

Alla AI-svar cachas i MongoDB.

---

## Miljövariabler (Render)

```
MONGO_URL=mongodb+srv://...
DB_NAME=honsgarden
OPENAI_API_KEY=sk-proj-...
STRIPE_API_KEY=sk_live_...
```

---

## Changelog

### 2024-03-03
- Sprint 1 implementerat
- Sprint 2 implementerat
- Sprint 3A implementerat (Ranking + Veckomål)
