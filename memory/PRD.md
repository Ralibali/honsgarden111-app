# Hönsgården - Product Requirements Document

## Projektöversikt
Hönsgården är en komplett hönsgårdshanteringsapp för iOS, Android och webb. Appen hjälper användare att spåra äggproduktion, hantera hönor, få AI-drivna insikter och prenumerera på premium-funktioner.

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

## Implementerade funktioner

### Autentisering ✅
- Email/lösenord registrering med 6-siffrig verifiering
- Inloggning med felhantering
- Glömt lösenord-flöde med email-kod
- GDPR & nyhetsbrev-samtycke
- Session-baserad auth med cookies
- identifyUser() och logoutUser() koppling till RevenueCat

### P0 Auth Fix - KLAR ✅ (2025-02-27)
- **Borttagen `default_user` fallback** - Alla user-protected endpoints kräver nu auth
- **401 på alla skyddade endpoints** - `/api/coop`, `/api/eggs`, `/api/hens`, `/api/transactions`, `/api/statistics/*`, `/api/ai/*`
- **Frontend 401-hantering** - `apiFetch` helper i appStore.ts och premiumStore.ts som:
  - Detekterar 401-svar
  - Rensar auth state (setUser(null))
  - Triggar redirect till login-sidan
- **Ingen data-korruption** - Inga writes/reads för "default_user"
- **Test-matris verifierad**:
  - Ej inloggad → `/api/premium/status` ger {is_premium: false}
  - Ej inloggad → `/api/coop` ger 401
  - AI endpoints ger 401 om ej inloggad

### Premium/Prenumerationer ✅
- **iOS & Android**: RevenueCat In-App Purchase integration
- **Webb**: Stripe webbbetalning
- Premium-skärm med planer (månatlig/årlig)
- PremiumGateModal för gated features (navigerar till /paywall)
- Paywall-skärm med plattformsspecifik logik (native → RevenueCat, web → Stripe)
- Prenumerationshantering (iOS: App Store, Android: Google Play, Web: Stripe)
- **Dynamisk prissättning**:
  - Native: Priser från RevenueCat/Store
  - Webb: 19 kr/mån, 149 kr/år via Stripe

### RevenueCat Integration ✅
- Paywall använder RevenueCatPaywall för **både iOS OCH Android**
- PremiumGateModal navigerar till `/paywall` (ingen webblänk i native)
- Hantera prenumeration via getManagementURL()
- identifyUser() anropas efter login, logoutUser() vid logout
- API-nycklar via miljövariabler (ej hårdkodade)
- **Backend IAP-verifiering via RevenueCat API** (ej stub längre)

### Google Play/App Store Compliance ✅
- **Radera konto-funktion** implementerad
- Android permissions: Endast CAMERA (EXTERNAL_STORAGE borttagna)
- NSPhotoLibraryAddUsageDescription tillagd för iOS
- Privacy/Terms-länkar i login-modal OCH Settings-skärmen

### Säkerhet ✅
- CORS: Explicit origin-lista
- **Stripe: Fail hard i production** om API-nyckel saknas
- API_URL: Varning om ej konfigurerad
- cookies.txt: Borttagen från repo

## Konfiguration

### Miljövariabler (Backend)
```
MONGO_URL=...
STRIPE_API_KEY=...          # Krävs i produktion - servern startar ej utan!
STRIPE_PUBLISHABLE_KEY=...
STRIPE_PRICE_MONTHLY=...
STRIPE_PRICE_YEARLY=...
RESEND_API_KEY=...
REVENUECAT_API_KEY=...      # För server-side IAP-verifiering
ENVIRONMENT=production      # Sätts för att aktivera produktionskrav
```

### Miljövariabler (Frontend)
```
EXPO_PUBLIC_BACKEND_URL=...
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=...
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=...
```

## DNS-konfiguration för honsgarden.se

**OBS:** Sätt DNS efter du klickat Deploy!

```
CNAME  @    → [din-deployment-url].emergentagent.com
CNAME  www  → [din-deployment-url].emergentagent.com
```

## Återstående uppgifter

### P0 - Kritiskt (KLART ✅)
- [x] Fixa `default_user`-buggen
- [x] Alla endpoints kräver auth (401)
- [x] Frontend hanterar 401 → redirect till login
- [x] Priser 19 kr/149 kr visas korrekt

### P1 - Viktigt
- [ ] Verifiera "Glömt lösenord"-flödet (fix implementerad, behöver testas)
- [ ] Deploya appen
- [ ] Sätta DNS för honsgarden.se
- [ ] Lägg till RevenueCat API-nycklar i EAS secrets
- [ ] Testa IAP end-to-end på iOS/Android
- [ ] Sätt upp RevenueCat webhooks för realtidsuppdateringar
- [ ] Slutför "Tuppar"-funktionen (hen_type toggle i hens.tsx)

### P2 - Önskvärt
- [ ] Fixa i18n-kraschen på webb (rekursiv)
- [ ] Göra IAP-verifieringen mer robust
- [ ] Affiliate-produktlänkar
- [ ] Refaktorera backend till separata routers

## Changelog

### 2025-02-27 (Senaste)
**P0 Auth Fix KOMPLETT:**
- Borttagen `default_user` defaults från Pydantic-modeller (CoopSettings, Hen, EggRecord, Transaction)
- Alla user-protected endpoints använder nu `require_user_id()` som kastar 401
- Frontend stores (appStore.ts, premiumStore.ts) har `apiFetch` helper med 401-hantering
- Testat och verifierat via testing agent - 100% av 18 tester passerade

**Prissättning:**
- Webb-paywall visar 19 kr/mån och 149 kr/år med "Priser i SEK via Stripe webbkassa"
- Native använder RevenueCat dynamiska priser

### 2024-02-27 (Tidigare)
**A) IAP-verifiering fixat:**
- Backend verifierar nu köp via RevenueCat API
- Fallback finns för utveckling (med varning)

**B) Stripe fail hard:**
- Servern startar INTE i production utan STRIPE_API_KEY

**C) Settings Terms/Privacy:**
- Länkar till Integritetspolicy och Användarvillkor i Settings

### Tidigare ändringar
- RevenueCat för iOS OCH Android
- Radera konto-funktion
- CORS explicit allowlist
- Hårdkodad RevenueCat-nyckel borttagen
- Väder-widget högst upp
- i18n-fix för saknade översättningar

## Endpoints som kräver auth (401)

| Endpoint | Metod | Beskrivning |
|----------|-------|-------------|
| /api/coop | GET/PUT | Hönsgårdsinställningar |
| /api/eggs | GET/POST | Äggregistrering |
| /api/eggs/{id} | GET/PUT/DELETE | Enskild äggpost |
| /api/hens | GET/POST | Hönshantering |
| /api/hens/{id} | GET/PUT/DELETE | Enskild höna |
| /api/transactions | GET/POST | Ekonomi |
| /api/statistics/* | GET | All statistik |
| /api/ai/* | GET/POST | Alla AI-funktioner |
| /api/health-logs | GET/POST | Hälsologg |
| /api/hatching/* | GET/POST | Kläckning |
| /api/flocks/* | GET/POST | Flockar |
| /api/checkout/create | POST | Skapa betalning |
| /api/auth/delete-account | DELETE | Radera konto |

## Publika endpoints (ingen auth krävs)

| Endpoint | Metod | Beskrivning |
|----------|-------|-------------|
| /api/health | GET | Hälsokontroll |
| /api/premium/status | GET | Premium-status (returnerar is_premium: false om ej inloggad) |
| /api/auth/login | POST | Inloggning |
| /api/auth/register | POST | Registrering |
| /api/auth/forgot-password | POST | Glömt lösenord |
