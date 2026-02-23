# Hönsgården - PRD (Product Requirements Document)

## Projektöversikt
En digital assistent för hönsgårdsägare som hjälper dem att hålla koll på äggproduktion, ekonomi och individuella hönaprofiler.

## Plattformar
- **Webbapp**: React (https://egg-tracker-pro.preview.emergentagent.com/api/web/)
- **Mobilapp**: Expo/React Native (under utveckling)
- **Backend**: FastAPI + MongoDB

## Kärnfunktioner

### ✅ Implementerade funktioner

#### Webbapp
1. **Landningssida (Login.tsx)**
   - Hönsgården-branding med hero-bild på kvinna med höns
   - Google-inloggning (OAuth)
   - Funktionsöversikt (Äggdagbok, Statistik, Ekonomi, Hönsprofiler)
   - Prissättning (Gratis / Premium 149 kr/år)
   - Responsiv design (desktop, tablet, mobil)

2. **Dashboard**
   - Statistik för idag (antal höns, ägg idag)
   - Snabbregistrera ägg med valfri höna-val
   - Månadsöversikt (ägg, kostnader, försäljning, netto)
   - Totalt all time statistik
   - Premium-banner för icke-premium användare

3. **Ägglogg (Eggs.tsx)**
   - Registrera ägg med datum
   - **Välj vilken höna som la äggen** (ny funktion!)
   - Historik grupperad per dag
   - Visa vilken höna som la varje ägg

4. **Hönsprofiler (Hens.tsx)**
   - Lägg till/redigera/ta bort hönor
   - Namn, ras, färg, födelsedatum, anteckningar
   - Visa antal ägg per höna
   - Snygg kortvy med äggstatistik

5. **Ekonomi (Finance.tsx)**
   - Registrera kostnader (foder, utrustning, medicin, övrigt)
   - Registrera försäljning (ägg, höns, övrigt)
   - Transaktionshistorik
   - Netto-beräkning

6. **Statistik (Statistics.tsx)**
   - Månadsvy med navigering
   - Totalt ägg, snitt per dag, ägg per höna
   - Ekonomiöversikt
   - Stapeldiagram för daglig äggproduktion

7. **Inställningar (Settings.tsx)**
   - Användarinfo (Google-profil)
   - Hönsgårdens namn
   - Antal höns
   - Logga ut

#### Backend API
- Autentisering med Emergent Google OAuth
- CRUD för höns, ägg, transaktioner
- Statistik-endpoints (idag, månad, år, sammanfattning)
- Premium-status
- Stripe-integration för betalning

### 🔄 Under utveckling / Kommande

#### P0 (Kritisk)
- [ ] Stripe betalningsflöde (checkout → webhook → premium-aktivering)

#### P1 (Hög prioritet)
- [ ] PDF-export av statistik
- [ ] Koppla hönaprofiler i mobilappen till äggloggning

#### P2 (Medium prioritet)
- [ ] Påminnelser (lokala push-notifikationer i mobilappen)
- [ ] Hälsospårning per höna

#### Framtida
- [ ] AI-driven statistikanalys
- [ ] Integrerad hönsras-databas

## Teknisk arkitektur

```
/app
├── backend/
│   ├── server.py          # FastAPI: Alla endpoints
│   ├── webapp_dist/       # Byggd React-app
│   └── .env               # MONGO_URL, STRIPE_*
├── webapp/                # React webbapp
│   ├── src/
│   │   ├── pages/         # Login, Dashboard, Eggs, Hens, Finance, Statistics, Settings
│   │   ├── components/    # Layout
│   │   └── context/       # AuthContext
│   └── package.json
└── frontend/              # Expo mobilapp
```

## Datamodeller

### users
```json
{
  "user_id": "user_xxx",
  "email": "string",
  "name": "string",
  "picture": "string?",
  "created_at": "datetime"
}
```

### hens
```json
{
  "id": "uuid",
  "user_id": "string",
  "name": "string",
  "breed": "string?",
  "color": "string?",
  "birth_date": "string?",
  "notes": "string?",
  "is_active": "boolean"
}
```

### egg_records
```json
{
  "id": "uuid",
  "user_id": "string",
  "date": "YYYY-MM-DD",
  "count": "number",
  "hen_id": "string?",  // Ny: vilken höna som la äggen
  "notes": "string?"
}
```

### transactions
```json
{
  "id": "uuid",
  "user_id": "string",
  "date": "YYYY-MM-DD",
  "type": "cost | sale",
  "category": "feed | equipment | medicine | other_cost | egg_sale | hen_sale | other_income",
  "amount": "number",
  "description": "string?"
}
```

## Ändringslogg

### 2024-12-23
- Bytte hero-bild på landningssidan till kvinna med höns (pexels-photo-4911743)
- Implementerade höna-val vid äggregistrering (Eggs.tsx)
- Uppdaterade Dashboard med höna-picker för snabbregistrering
- Förbättrade Hens-sidan med äggstatistik per höna
- Lade till data-testid på alla interaktiva element
- Alla backend-tester (27/27) och frontend-tester passerade

## Stripe-konfiguration
- Publishable Key: `pk_live_51IQzC3HzffTezY82...`
- Price ID (Månad): `price_1T3joGHzffTezY82dRQc7GTO`
- Price ID (År): `price_1T3jwRHzffTezY829aWQVXZr`
