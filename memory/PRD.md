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

### Premium/Prenumerationer ✅
- **iOS & Android**: RevenueCat In-App Purchase integration
- **Webb**: Stripe webbbetalning
- Premium-skärm med planer (månatlig/årlig)
- PremiumGateModal för gated features (navigerar till /paywall)
- Paywall-skärm med plattformsspecifik logik (native → RevenueCat, web → Stripe)
- Prenumerationshantering (iOS: App Store, Android: Google Play, Web: Stripe)
- "Tack"-meddelande efter köp: "🎉 Välkommen till Premium!"

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

Exempel efter deployment:
```
CNAME  @    → production-ready-71.emergentagent.com
CNAME  www  → production-ready-71.emergentagent.com
```

## Återstående uppgifter

### P0 - Kritiskt
- [ ] Deploya appen
- [ ] Sätta DNS för honsgarden.se
- [ ] Lägg till RevenueCat API-nycklar i EAS secrets

### P1 - Viktigt
- [ ] Testa IAP end-to-end på iOS/Android
- [ ] Sätt upp RevenueCat webhooks för realtidsuppdateringar

### P2 - Önskvärt
- [ ] Affiliate-produktlänkar
- [ ] Refaktorera backend till separata routers

## Changelog

### 2024-02-27 (Senaste)
**A) IAP-verifiering fixat:**
- Backend verifierar nu köp via RevenueCat API
- Fallback finns för utveckling (med varning)

**B) Stripe fail hard:**
- Servern startar INTE i production utan STRIPE_API_KEY

**C) Settings Terms/Privacy:**
- Länkar till Integritetspolicy och Användarvillkor i Settings

**D) Kommentarer uppdaterade:**
- paywall.tsx: Korrigerad kommentar (Web only, inte Android)

### Tidigare ändringar
- RevenueCat för iOS OCH Android
- Radera konto-funktion
- CORS explicit allowlist
- Hårdkodad RevenueCat-nyckel borttagen
- Väder-widget högst upp
- i18n-fix för saknade översättningar
