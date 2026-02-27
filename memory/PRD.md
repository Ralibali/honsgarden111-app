# Hönsgården - Product Requirements Document

## Projektöversikt
Hönsgården är en komplett hönsgårdshanteringsapp för iOS, Android och webb. Appen hjälper användare att spåra äggproduktion, hantera hönor och tuppar, få AI-drivna insikter och prenumerera på premium-funktioner.

## Tech Stack
- **Frontend**: React Native (Expo SDK 54), Expo Router, Zustand
- **Backend**: FastAPI, Python
- **Databas**: MongoDB Atlas
- **Betalningar**: 
  - iOS: RevenueCat (App Store IAP)
  - Android: RevenueCat (Google Play IAP)
  - Webb: Stripe
- **AI**: OpenAI via Emergent Integrations
- **Email**: Resend

## Nyligen Slutförda Uppgifter

### P0 Auth Fix - KOMPLETT ✅ (2025-02-27)
- Borttagen `default_user` fallback från alla Pydantic-modeller
- Alla user-protected endpoints returnerar nu 401 om ej autentiserad
- Frontend stores (appStore.ts, premiumStore.ts) har `apiFetch` helper med 401-hantering
- Testat: 18/18 backend-tester passerade

### P1 Features - KOMPLETT ✅ (2025-02-27)
**Tuppar-funktionen:**
- Typ-toggle (Höna 🐔 / Tupp 🐓) i Add/Edit-modalen
- `hen_type` sparas till backend och visas i listan
- Tuppar visar 🐓 emoji och "Tupp"-badge
- Rubriken visar separata räknare: "X hönor • Y tuppar"
- Knappen ändrad till "Lägg till höna/tupp"

**AI-funktioner:**
- "Dagens tips" (GET /api/ai/daily-tip) - fungerar för inloggade användare
- "Fråga Agda" (POST /api/ai/advisor) - fungerar för inloggade användare
- Preview-läge för icke-premium användare

**Prissättning:**
- Webb: 19 kr/mån och 149 kr/år (hårdkodat i paywall.tsx)
- Native: Dynamiska priser från RevenueCat/Store

## Konfiguration

### Miljövariabler (Backend)
```
MONGO_URL=...
STRIPE_API_KEY=...
STRIPE_PUBLISHABLE_KEY=...
STRIPE_PRICE_MONTHLY=...
STRIPE_PRICE_YEARLY=...
RESEND_API_KEY=...
REVENUECAT_API_KEY=...
ENVIRONMENT=production
```

### Miljövariabler (Frontend)
```
EXPO_PUBLIC_BACKEND_URL=...
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=...
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=...
```

## Endpoints som kräver auth (401)

| Endpoint | Metod | Beskrivning |
|----------|-------|-------------|
| /api/coop | GET/PUT | Hönsgårdsinställningar |
| /api/eggs | GET/POST | Äggregistrering |
| /api/hens | GET/POST | Höns/tupp-hantering |
| /api/transactions | GET/POST | Ekonomi |
| /api/statistics/* | GET | All statistik |
| /api/ai/* | GET/POST | Alla AI-funktioner |
| /api/health-logs | GET/POST | Hälsologg |

## Publika endpoints

| Endpoint | Metod | Beskrivning |
|----------|-------|-------------|
| /api/health | GET | Hälsokontroll |
| /api/premium/status | GET | Premium-status (is_premium: false om ej inloggad) |
| /api/auth/* | POST | Auth-endpoints |

## Återstående uppgifter

### P1 - Verifiering (Väntar på användaren)
- [ ] Verifiera "Glömt lösenord"-flödet (fix implementerad)
- [ ] Testa IAP end-to-end på iOS/Android med svenskt testkonto

### P2 - Deploy & Distribution
- [ ] Deploya appen
- [ ] Konfigurera DNS för honsgarden.se
- [ ] Skapa ny EAS Build med alla fixar
- [ ] Lägg till RevenueCat API-nycklar i EAS secrets

### P3 - Backlog
- [ ] Fixa i18n-kraschen på webb (rekurrent)
- [ ] Göra IAP-verifieringen mer robust
- [ ] Affiliate-produktlänkar
- [ ] Refaktorera backend till separata routers

## Changelog

### 2025-02-27 (Session 2)
**P1 Features KOMPLETT:**
- Implementerat Tuppar-funktionen i hens.tsx
  - Ny hen_type toggle (Höna/Tupp) med emojis
  - Sparar hen_type till backend
  - Visar rätt ikon och badge i listan
  - Uppdaterad rubrik och räknare
- Verifierat AI-funktioner fungerar för inloggade användare
- Verifierat prissättning: 19 kr/mån, 149 kr/år

### 2025-02-27 (Session 1)
**P0 Auth Fix KOMPLETT:**
- Borttagen `default_user` defaults från Pydantic-modeller
- Alla user-protected endpoints använder `require_user_id()`
- Frontend `apiFetch` helper med 401-hantering
- 100% av 18 tester passerade

### Tidigare ändringar
- RevenueCat för iOS OCH Android
- Radera konto-funktion
- Väder-widget
- Legal links i Settings och Login
