# Hönsgården - PRD (Product Requirements Document)

## Projektöversikt
En digital assistent för hönsgårdsägare som hjälper dem att hålla koll på äggproduktion, ekonomi och individuella hönaprofiler.

**Live URL:** https://egg-tracker-pro.preview.emergentagent.com/api/web/

## Plattformar
- **Webbapp**: React (produktion)
- **Mobilapp**: Expo/React Native (under utveckling - ngrok-problem)
- **Backend**: FastAPI + MongoDB

## Kärnfunktioner

### ✅ Implementerade funktioner

#### Webbapp
1. **Landningssida**
   - "Hönsgården" branding med hero-bild på kvinna med höns
   - Google-inloggning (OAuth via Emergent Auth)
   - Funktionsöversikt och prissättning
   - Responsiv design

2. **Dashboard**
   - Statistik för idag (antal höns, ägg)
   - **Snabbregistrera ägg med höna-val** ✨
   - Månadsöversikt (ägg, kostnader, försäljning, netto)
   - Premium-banner

3. **Ägglogg**
   - Registrera ägg med datum
   - **Välj vilken höna som la äggen** ✨
   - Historik grupperad per dag med höna-badges

4. **Hönsprofiler**
   - CRUD för hönor (lägg till, redigera, ta bort)
   - Namn, ras, färg, födelsedatum, anteckningar
   - **Visa antal ägg per höna** ✨

5. **Statistik** ✨ NY!
   - Flikar: "Översikt" och "Per höna"
   - **Månadens topplista med ranking** 🏆
   - Trendanalys (upp/ner jämfört med förra månaden)
   - "X% över/under snittet"
   - Lista över hönor utan ägg denna månad

6. **Ekonomi**
   - Registrera kostnader och försäljning
   - Kategorier (foder, utrustning, medicin, äggförsäljning, etc.)
   - Transaktionshistorik och netto-beräkning

7. **Premium-sida**
   - Stripe-betalning (månad: 19 kr, år: 149 kr)
   - Checkout-flöde med statusverifiering
   - Premium-förmåner visas efter köp

8. **Inställningar**
   - Google-profilinfo
   - Hönsgårdens namn
   - Logga ut

### 🔄 Nästa steg

#### P0 (Kritisk)
- [x] Stripe-betalningsflöde - **KLAR** (backend + frontend)
- [ ] Testa live Stripe-betalning med riktigt kort

#### P1 (Hög prioritet)
- [ ] PDF-export av statistik
- [ ] Koppla hönaprofiler i mobilappen

#### P2 (Medium prioritet)
- [ ] Påminnelser (push-notifikationer)
- [ ] Hälsospårning per höna

## Teknisk arkitektur

```
/app
├── backend/
│   ├── server.py          # FastAPI (928 rader)
│   ├── webapp_dist/       # Byggd React-app
│   └── .env               # MONGO_URL, STRIPE_*
├── webapp/                # React webbapp
│   └── src/pages/         # 8 sidor + Layout
└── frontend/              # Expo mobilapp
```

## API Endpoints

### Auth
- `POST /api/auth/session` - Byt session_id mot user data
- `GET /api/auth/me` - Hämta inloggad användare
- `POST /api/auth/logout` - Logga ut

### Data
- `GET/POST /api/hens` - Hönor
- `GET/POST /api/eggs` - Äggregistreringar (med hen_id)
- `GET/POST /api/transactions` - Ekonomi
- `GET/PUT /api/coop` - Hönsgårdsinställningar

### Statistik
- `GET /api/statistics/today`
- `GET /api/statistics/month/{year}/{month}`
- `GET /api/statistics/year/{year}`
- `GET /api/statistics/summary`

### Premium
- `GET /api/premium/status`
- `POST /api/checkout/create`
- `GET /api/checkout/status/{session_id}`
- `POST /api/webhook/stripe`

## Stripe-konfiguration
- Publishable Key: `pk_live_51IQzC3HzffTezY82...`
- Price ID (Månad): `price_1T3joGHzffTezY82dRQc7GTO`
- Price ID (År): `price_1T3jwRHzffTezY829aWQVXZr`

## Ändringslogg

### 2024-12-23 (Session 2)
- ✅ Bytt hero-bild till kvinna med höns
- ✅ Implementerat höna-val vid äggregistrering
- ✅ Lagt till "Per höna"-statistik med topplista och trendanalys
- ✅ Förbättrad Hens-sida med äggstatistik
- ✅ Alla backend-tester (27/27) passerade
- ✅ Frontend fungerar med responsiv design

### 2024-12-22 (Session 1)
- Grundläggande webbapp skapad
- Google OAuth integrerat
- Stripe-integration för premium
- CRUD för hönor, ägg, transaktioner

## Testdata
- 3 hönor registrerade (Greta, Saga, + 1 till)
- Äggdata med hen_id koppling fungerar

## Kända problem
- Mobilappens ngrok-tunnel är instabil (miljöproblem)
