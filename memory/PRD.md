# Hönsgården - Product Requirements Document

## Original Problem Statement
En digital assistent för hönsgårdsägare som hjälper till att hantera höns, äggproduktion, ekonomi, foder och hälsa. Applikationen finns tillgänglig som webbapp och mobilapp (iOS/Android via Expo).

## User Personas
1. **Hobby-hönsägare** - Privatpersoner som har 3-15 höns i trädgården
2. **Småskalig producent** - Säljer ägg till grannar/lokala marknader

## Core Requirements
- Äggregistrering med snabbknappar (+1, +2, +3, +5, +10) och valfri hönavalare
- Flockhantering med flera flockar och hönor
- Hälsospårning per höna
- Ekonomiuppföljning (kostnader, intäkter)
- Produktivitetsanalys per höna
- Foderhantering (Etapp 4) - Lager, förbrukning, inköp
- Dela statistik på sociala medier
- Premium-funktioner för avancerade användare

## Tech Stack
- **Backend**: FastAPI (Python), MongoDB
- **Frontend Web**: React, Vite, TypeScript
- **Frontend Mobile**: React Native, Expo, Playfair Display + Inter fonts
- **Payments**: Stripe
- **Auth**: Google OAuth2

## Pricing
- **Gratis**: 30 dagars datahistorik (all data sparas, bara 30 dagar visas)
- **Premium Månatlig**: 19 kr/mån
- **Premium Årlig**: 149 kr/år (12,42 kr/mån)

---

## Completed Features (February 2026)

### Tidigare etapper (Done)
- [x] **Etapp 1**: Flockhantering + Hälsologg per höna
- [x] **Etapp 2**: Produktivitetsanalys + Datavarningar
- [x] **Etapp 3**: Kläckningsmodul för Premium

### Session 1 - P0/P1 (Done)
- [x] **Fix vit skärm på webappen** - Vite base path uppdaterad till /api/web/
- [x] **Förena äggregistrerings-UI** - +1,+2,+3,+5,+10 snabbknappar + fritext + höna-väljare
- [x] **Feature toggles bug** - Fixat credentials i API-anrop
- [x] **Insikter-sektion förbättrad** - Scrollbar rad med stora siffror
- [x] **Data holdback Premium-funktion** - 30 dagars visning för gratis, all data sparas

### Session 2 - Nya funktioner (Done)
- [x] **Typsnitt i mobilappen** - Playfair Display (rubriker) + Inter (brödtext) via expo-font
- [x] **Etapp 4: Foderhantering** - Komplett modul för båda plattformar:
  - Lagerhantering med lågt-lager-varningar
  - Registrering av förbrukning och inköp
  - Statistik (kg/dag, g/höna/dag, kostnad)
  - 7 fodertyper stöds
- [x] **Dela statistik-funktion** - Mobil: Share API för att dela äggproduktion
- [x] **Quick Actions på Dashboard** - Genvägar till Foder, Kläckning, Dela, Statistik
- [x] **Feature-parity audit** - Feed-sida och routing tillagd på webappen

---

## P2 - Future/Backlog

### High Priority
- [ ] **Push-notiser** - Påminnelser för kläckning, hälsokontroller
- [ ] **Hatching på webben** - Kläckningsmodul finns bara på mobil

### Medium Priority
- [ ] **Dela statistik på webben** - Web Share API eller sociala knappar
- [ ] **Förbättrad Analytics** - Grafer och trender

### Low Priority
- [ ] Inga fler etapper planerade

---

## API Endpoints

### Core
- `GET/POST /api/eggs` - Äggregistreringar
- `GET/POST /api/hens` - Hönor
- `GET/POST /api/flocks` - Flockar

### Feed Management (NEW - Etapp 4)
- `GET/POST /api/feed` - Foderregistreringar
- `DELETE /api/feed/{id}` - Ta bort registrering
- `GET /api/feed/inventory` - Lagerstatus + varningar
- `PUT /api/feed/inventory/{type}` - Uppdatera lagertrösklar
- `GET /api/feed/statistics?days=30` - Foderstatistik

### Premium/Account
- `GET /api/account/data-limits` - Visa gömd data för gratis-användare
- `GET /api/premium/status` - Premiumstatus
- `GET/PUT /api/feature-preferences` - Anpassningsbara funktioner

### Statistics
- `GET /api/statistics/today` - Dagens statistik
- `GET /api/statistics/summary` - Månads/total sammanfattning
- `GET /api/insights` - Insikter

---

## Database Schema

### feed_records (NEW)
```json
{
  "id": "uuid",
  "user_id": "string",
  "date": "YYYY-MM-DD",
  "feed_type": "layer_feed|grower_feed|starter_feed|scratch_grain|treats|supplements|other",
  "amount_kg": 1.5,
  "cost": 150,
  "is_purchase": true,
  "brand": "Granngården",
  "notes": "optional"
}
```

### feed_inventory (NEW)
```json
{
  "user_id": "string",
  "feed_type": "layer_feed",
  "current_stock_kg": 15.5,
  "low_stock_threshold_kg": 5.0,
  "brand": "Granngården"
}
```

---

## Architecture Notes

### Web App Routing
- Webappen serveras från `/api/web/`
- Vite base path: `/api/web/`
- Assets: `/api/web/assets/`

### Data Holdback Logic
- All data sparas alltid för alla användare
- Gratis-användare kan endast SE senaste 30 dagarna
- Vid Premium-uppgradering låses all historisk data upp direkt
- `hidden_data.months_of_history` visar hur mycket gömd data som finns

### Font Configuration (Mobile)
- Fonts loaded via expo-font + @expo-google-fonts
- Playfair Display: headings, titles, logo
- Inter: body text, UI elements
- Font config exported from `/app/frontend/src/config/fonts.ts`

---

## Feature Parity Status (Webb vs Mobil)

| Feature | Mobile | Web |
|---------|--------|-----|
| Dashboard | ✅ | ✅ |
| Eggs | ✅ | ✅ |
| Hens | ✅ | ✅ |
| Finance | ✅ | ✅ |
| Statistics | ✅ | ✅ |
| Settings | ✅ | ✅ |
| Feed (Etapp 4) | ✅ | ✅ |
| Share Stats | ✅ | ❌ |
| Hatching | ✅ | ❌ |
| Quick Actions | ✅ | ❌ |

---

## Files Modified This Session
- `/app/frontend/app/_layout.tsx` - Font loading
- `/app/frontend/app/(tabs)/index.tsx` - Quick Actions, Share, Insights
- `/app/frontend/app/feed.tsx` - NEW: Feed management screen
- `/app/frontend/src/config/fonts.ts` - NEW: Font configuration
- `/app/backend/server.py` - Feed API endpoints
- `/app/honsgarden-web/frontend/src/pages/Feed.tsx` - NEW: Web feed page
- `/app/honsgarden-web/frontend/src/pages/Feed.css` - NEW: Web feed styles
- `/app/honsgarden-web/frontend/src/App.tsx` - Feed route

---

## Known Issues / Technical Debt
- ESLint parser stöder inte TypeScript syntax (varningar, ej runtime-fel)
- Shadow props deprecated warnings i Expo (web)
- react-native-svg version mismatch (15.15.3 vs expected 15.12.1)
