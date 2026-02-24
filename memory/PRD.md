# Hönsgården - Product Requirements Document

## Original Problem Statement
En digital assistent för hönsgårdsägare som hjälper till att hantera höns, äggproduktion, ekonomi och hälsa. Applikationen ska finnas tillgänglig som webbapp och mobilapp (iOS/Android via Expo).

## User Personas
1. **Hobby-hönsägare** - Privatpersoner som har 3-15 höns i trädgården
2. **Småskalig producent** - Säljer ägg till grannar/lokala marknader

## Core Requirements
- Äggregistrering med snabbknappar (+1, +2, +3, +5, +10) och valfri hönavalare
- Flockhantering med flera flockar och hönor
- Hälsospårning per höna
- Ekonomiuppföljning (kostnader, intäkter)
- Produktivitetsanalys per höna
- Premium-funktioner för avancerade användare

## Tech Stack
- **Backend**: FastAPI (Python), MongoDB
- **Frontend Web**: React, Vite, TypeScript
- **Frontend Mobile**: React Native, Expo
- **Payments**: Stripe
- **Auth**: Google OAuth2

## Pricing
- **Gratis**: 30 dagars datahistorik
- **Premium Månatlig**: 19 kr/mån
- **Premium Årlig**: 149 kr/år (12,42 kr/mån)

---

## Completed Features (February 2026)

### P0 - Critical (Done)
- [x] **Fix vit skärm på webappen** - Vite base path uppdaterad till /api/web/
- [x] **Förena äggregistrerings-UI** - Alla tre platser (Dashboard, Eggs-sida, Höna-profil) har nu +1,+2,+3,+5,+10 snabbknappar + fritext + höna-väljare

### P1 - High Priority (Done)
- [x] **Logga ut-knapp** - Finns redan i webappen
- [x] **Feature toggles bug** - Fixat credentials i API-anrop
- [x] **Insikter-sektion förbättrad** - Scrollbar rad med stora siffror och tydliga etiketter
- [x] **Data holdback Premium-funktion** - Gratis-användare ser 30 dagar, all data sparas i bakgrunden
- [x] **Stripe-priser uppdaterade** - 19 kr/mån, 149 kr/år

### Etapper (Completed Earlier)
- [x] **Etapp 1**: Flockhantering + Hälsologg per höna
- [x] **Etapp 2**: Produktivitetsanalys + Datgräns-varningar
- [x] **Etapp 3**: Kläckningsmodul för Premium

---

## P2 - Future/Backlog

### High Priority
- [ ] **Push-notiser** - Påminnelser för kläckning, hälsokontroller
- [ ] **Feature-parity audit** - Slutlig kontroll webb vs mobil
- [ ] **Typsnitt i mobilappen** - Ladda Playfair Display och Inter

### Medium Priority
- [ ] **Etapp 4: Foderhantering** - Spåra foderförbrukning och kostnader

### Low Priority
- [ ] Inga fler etapper planerade (Etapp 5 Väderdata borttagen)

---

## API Endpoints

### Core
- `GET /api/eggs` - Hämta äggregistreringar
- `POST /api/eggs` - Registrera ägg (med optional hen_id)
- `GET /api/hens` - Hämta hönor
- `GET /api/flocks` - Hämta flockar

### Premium/Account
- `GET /api/account/data-limits` - Visa gömd data för gratis-användare
- `GET /api/premium/status` - Premiumstatus
- `GET /api/feature-preferences` - Anpassningsbara funktioner

### Statistics
- `GET /api/statistics/today` - Dagens statistik
- `GET /api/statistics/summary` - Månads/total sammanfattning
- `GET /api/insights` - Insikter (kostnad/ägg, toppvärpare, produktivitet)

---

## Database Schema

### users
```json
{
  "email": "string",
  "name": "string",
  "feature_preferences": {
    "flock_management": true,
    "show_economy_insights": true
  }
}
```

### eggs
```json
{
  "date": "2026-02-24",
  "count": 5,
  "user_id": "string",
  "hen_id": "string (optional)"
}
```

### subscriptions
```json
{
  "user_id": "string",
  "plan": "monthly|yearly",
  "is_active": true,
  "expires_at": "datetime"
}
```

---

## Architecture Notes

### Web App Routing
- Webappen serveras från `/api/web/` (pga Kubernetes ingress)
- Vite base path konfigurerad till `/api/web/`
- Assets serveras från `/api/web/assets/`

### Data Holdback Logic
- All data sparas alltid för alla användare
- Gratis-användare kan endast SE senaste 30 dagarna
- Vid Premium-uppgradering låses all historisk data upp direkt
- API `/api/account/data-limits` returnerar `hidden_data.months_of_history`

---

## Known Issues / Technical Debt
- ESLint parser stöder inte TypeScript syntax (visar fel men påverkar ej runtime)
- Web och mobil har olika designspråk (bör harmoniseras)

---

## Test Files
- `/app/backend/tests/test_iteration2.py` - Backend API-tester
- `/app/test_reports/iteration_2.json` - Senaste testrapport
