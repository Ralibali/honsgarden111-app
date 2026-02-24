# Hönsgården - PRD (Product Requirements Document)

## Projektöversikt
**Hönsgården** är en digital assistent för hönsgårdsägare som hjälper dem att hålla koll på äggproduktion, ekonomi och individuella hönaprofiler.

**Live URL:** https://flock-health-logs.preview.emergentagent.com/api/web/

## Vad appen erbjuder

### 🥚 Äggloggning
- Registrera ägg enkelt med snabbknappar (+1, +2, +3, +5, +10)
- **Välj vilken höna som la äggen**
- Se historik per dag och per höna
- Anteckningar för varje registrering

### 🐔 Hönsprofiler
- Döp dina hönor (t.ex. Greta, Saga, Malin)
- Lägg till ras, färg och födelsedatum
- **Se statistik per höna** - hur många ägg har varje höna lagt?
- Redigera och ta bort hönaprofiler

### 📊 Statistik
- Daglig, månatlig och årlig översikt
- **Topplista: Vilken höna lägger mest?** 🏆
- Trendanalys ("Greta lade 15% mer än förra månaden!")
- Stapeldiagram för daglig produktion

### 💰 Ekonomi
- Logga kostnader (foder, utrustning, medicin, övrigt)
- Logga försäljning (ägg, höns, övrigt)
- Se netto och vinst/förlust per månad
- Transaktionshistorik

### 📧 E-postpåminnelser (Premium)
- Daglig påminnelse att registrera ägg
- Välj tid (07:00, 12:00, 17:00, 18:00, 20:00)
- Snyggt formaterade HTML-mail
- Aktivera/inaktivera i inställningar

### ⭐ Premium
- **7 dagars GRATIS provperiod** för alla nya användare!
- Obegränsad statistikhistorik
- PDF-export av rapporter
- E-postpåminnelser
- Statistik per höna med trendanalys

## Prissättning
| Plan | Pris | Beskrivning |
|------|------|-------------|
| Gratis | 0 kr | Grundfunktioner |
| Provperiod | 0 kr | 7 dagar premium gratis |
| Månatlig | 19 kr/månad | Flexibelt, avsluta när som helst |
| Årlig | 149 kr/år | Spara 79 kr (över 30%!) |

## Teknisk arkitektur

```
/app
├── backend/
│   ├── server.py          # FastAPI (1000+ rader)
│   ├── webapp_dist/       # Byggd React-app
│   └── .env               # Secrets
├── webapp/                # React webbapp
│   └── src/
│       ├── pages/         # 9 sidor
│       ├── components/    # Layout
│       └── context/       # AuthContext
└── frontend/              # Expo mobilapp (under utveckling)
```

## API Endpoints

### Auth
- `POST /api/auth/session` - Google OAuth callback
- `GET /api/auth/me` - Aktuell användare
- `POST /api/auth/logout` - Logga ut

### Data
- `GET/POST /api/hens` - Hönor CRUD
- `GET/POST /api/eggs` - Äggregistreringar (med hen_id)
- `GET/POST /api/transactions` - Ekonomi
- `GET/PUT /api/coop` - Hönsgårdsinställningar

### Statistik
- `GET /api/statistics/today`
- `GET /api/statistics/month/{year}/{month}`
- `GET /api/statistics/summary`

### Premium & Betalning
- `GET /api/premium/status`
- `POST /api/checkout/create` - Stripe checkout
- `GET /api/checkout/status/{session_id}`

### E-postpåminnelser
- `GET /api/reminders/settings` - Hämta inställningar
- `PUT /api/reminders/settings` - Uppdatera inställningar
- `POST /api/reminders/send-test` - Skicka testmail
- `POST /api/reminders/send-all` - Trigger för cron

## Integrationer

| Tjänst | Användning | Status |
|--------|------------|--------|
| Google OAuth | Inloggning | ✅ Live |
| Stripe | Betalningar | ✅ Live |
| Resend | E-postpåminnelser | ✅ Live |
| MongoDB | Databas | ✅ Live |

## Ändringslogg

### 2026-02-23 (Session 3)
- ✅ Lagt till 7 dagars gratis provperiod för nya användare
- ✅ Implementerat e-postpåminnelser via Resend
- ✅ Uppdaterat Settings-sidan med påminnelse-toggle
- ✅ Premium-sidan visar trial-banner och dagar kvar

### 2026-02-23 (Session 2)
- ✅ Bytt hero-bild till kvinna med höns
- ✅ Implementerat höna-val vid äggregistrering
- ✅ Lagt till "Per höna"-statistik med topplista

### 2026-02-22 (Session 1)
- ✅ Grundläggande webbapp skapad
- ✅ Google OAuth integrerat
- ✅ Stripe-integration för premium

## Stripe-konfiguration
- **Publishable Key:** `pk_live_51IQzC3...`
- **Price ID (Månad):** `price_1T3joGHzffTezY82dRQc7GTO`
- **Price ID (År):** `price_1T3jwRHzffTezY829aWQVXZr`

## Kända problem
- Mobilappens ngrok-tunnel är instabil (miljöproblem, ej kodbug)

## Framtida utveckling
- [ ] PDF-export av statistik
- [ ] Mobilapp (React Native/Expo)
- [ ] Hälsospårning per höna
- [ ] AI-driven statistikanalys
