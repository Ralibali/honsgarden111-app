# Hönsgården - Product Requirements Document

## Projektöversikt
Hönsgården är en digital assistent för hönsägare. Appen hjälper användare att:
- Logga ägg dagligen
- Hålla koll på sina höns (hälsa, produktivitet)
- Få AI-drivna tips och analyser
- Se statistik och trender

## Tech Stack
- **Backend**: FastAPI + MongoDB
- **Frontend**: React (Vite) + TypeScript
- **AI**: OpenAI GPT-4o-mini
- **Hosting**: Render (standalone deployment)

---

## Sprint 1 - KLART ✅ (2024-03-03)

### Implementerade funktioner:

1. **Streak-system**
   - `GET /api/me/streak` - Hämtar streak-data
   - `POST /api/me/streak/touch` - Uppdaterar streak
   - 10 dagars streak = 7 premium-dagar (belöning)
   - Triggas automatiskt vid äggloggning

2. **Agdas Inbox**
   - `GET /api/agda/inbox/today` - AI-genererat dagligt kort
   - 1 kort per dag, cachad i MongoDB
   - Anpassat efter säsong och flockstorlek

3. **"Hej"-hantering**
   - Agda svarar direkt på hälsningar utan AI-anrop
   - Sparar API-kostnader

4. **AI-cache**
   - Alla AI-svar cachas i MongoDB (`ai_cache` collection)
   - 24h TTL för de flesta funktioner

5. **Statistik + AI-insikter**
   - `GET /api/stats/eggs?days=30`
   - `GET /api/stats/insights` - AI-analys av äggproduktion

6. **Höna-personlighet (Viral funktion)**
   - `POST /api/hen/personality` - OpenAI Vision analyserar hönbilder
   - Returnerar personlighetstyp (Diva, Utforskare, Mysare, etc.)

---

## Sprint 2 - KLART ✅ (2024-03-03)

### Implementerade funktioner:

1. **Din hönsgård idag (AI Daily Overview)**
   - `GET /api/farm/today`
   - Visar äggprognos, temperatur, hälsoscore
   - AI-genererade tips och varningar
   - Cachad 24h

2. **Hälsoscore (0-100)**
   - `GET /api/flock/health`
   - Beräknas baserat på:
     - Äggproduktionstrend (+10/-15)
     - Sjukdomsloggar (-10 per)
     - Flockstorlek (+5)
   - Färgkodad (grön/gul/röd)

3. **PWA (Progressive Web App)**
   - `manifest.json` för hemskärmsinstallation
   - `service-worker.js` för offline-caching
   - iOS Safari-instruktioner för installation
   - Banner som visas 3 sekunder efter page load

4. **Dashboard-förbättringar**
   - "Din hönsgård idag"-kortet högst upp
   - Hälsoscore integrerad
   - PWA install-banner
   - Bättre visuell hierarki

---

## Kommande (Sprint 3)

### Planerat:
- **Affiliate (Adtraction)** - AI-rekommenderade produkter
- **Veckovis AI-rapport** - Sammanfattning av veckan
- **Desktop 2-kolumn layout**

---

## API-kostnadskontroll

| Funktion | Max anrop |
|----------|-----------|
| Agdas Inbox | 1/user/dag |
| Farm Today | 1/user/dag |
| Stats Insights | 1/user/dag |
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
- Sprint 1 + Sprint 2 implementerade
- Streak-system med premium-belöningar
- AI Daily Overview ("Din hönsgård idag")
- Hälsoscore
- PWA support
- Agdas Inbox
