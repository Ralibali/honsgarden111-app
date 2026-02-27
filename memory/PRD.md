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

### Premium/Prenumerationer ✅ (2024-02-27)
- **iOS & Android**: RevenueCat In-App Purchase integration
- **Webb**: Stripe webbbetalning
- Premium-skärm med planer (månatlig/årlig)
- PremiumGateModal för gated features (navigerar till /paywall)
- Paywall-skärm med plattformsspecifik logik (native → RevenueCat, web → Stripe)
- Prenumerationshantering (iOS: App Store, Android: Google Play, Web: Stripe)
- "Tack"-meddelande efter köp: "🎉 Välkommen till Premium!"

### RevenueCat Integration ✅ (2024-02-27)
- A1: Paywall använder RevenueCatPaywall för **både iOS OCH Android**
- A2: PremiumGateModal navigerar till `/paywall` (ingen webblänk i native)
- A3: Hantera prenumeration via getManagementURL()
- A4: identifyUser() anropas efter login, logoutUser() vid logout
- A5: API-nycklar via miljövariabler (ej hårdkodade)

### Google Play/App Store Compliance ✅ (2024-02-27)
- B1: **Radera konto-funktion** implementerad (Backend: DELETE /api/auth/delete-account, Frontend: Settings)
- B2: Android permissions: Endast CAMERA kvar (EXTERNAL_STORAGE borttagna)
- B3: NSPhotoLibraryAddUsageDescription tillagd för iOS
- B4: Privacy/Terms-länkar i login-modalen och premium-skärmen

### Säkerhet ✅ (2024-02-27)
- CORS: Explicit origin-lista (honsgarden.se, www, preview)
- Stripe: Ingen fallback testnyckel
- API_URL: Varning om ej konfigurerad
- cookies.txt: Borttagen från repo + .gitignore

### Hemskärm
- Äggregistrering för dagen
- Dagens statistik
- Väder-widget högst upp (klickbar för mer info)
- Insikter och tips

## Konfiguration

### Miljövariabler (Backend)
```
MONGO_URL=...
STRIPE_API_KEY=...          # Ingen fallback!
STRIPE_PUBLISHABLE_KEY=...
STRIPE_PRICE_MONTHLY=...
STRIPE_PRICE_YEARLY=...
RESEND_API_KEY=...
```

### Miljövariabler (Frontend)
```
EXPO_PUBLIC_BACKEND_URL=...
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=...      # Krävs för iOS
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=...  # Krävs för Android
```

### EAS Secrets (Production)
Lägg till följande i EAS:
- `EXPO_PUBLIC_BACKEND_URL`
- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`

## DNS-konfiguration för honsgarden.se
```
CNAME  @    → production-ready-71.emergentagent.com
CNAME  www  → production-ready-71.emergentagent.com
```

## Återstående uppgifter

### P0 - Kritiskt
- [ ] Verifiera Stripe-betalningsflöde end-to-end
- [ ] Trigga ny EAS-build för mobilapp
- [ ] Lägg till RevenueCat API-nycklar i EAS secrets

### P1 - Viktigt
- [ ] Verifiera RevenueCat-integration på riktig iOS/Android-enhet
- [ ] Implementera RevenueCat webhooks för backend-verifiering
- [ ] Testa radera konto-funktionen

### P2 - Önskvärt
- [ ] Affiliate-produktlänkar
- [ ] Refaktorera backend till separata routers

## Changelog

### 2024-02-27
- **RevenueCat för iOS OCH Android**: Både iOS och Android använder nu RevenueCat IAP
- Fixade Premium-flödet: native → RevenueCat, web → Stripe
- La till "Radera konto"-funktion (Google Play-krav)
- Fixade CORS med explicit origin-lista
- Tog bort hårdkodad RevenueCat testnyckel
- La till väder-widget högst upp i hemskärmen
- La till Privacy/Terms-länkar i login + premium
- Fixade Android permissions (endast CAMERA kvar)
- La till NSPhotoLibraryAddUsageDescription för iOS
- identifyUser()/logoutUser() kopplat till authStore

## Verifieringschecklista

| Punkt | Beskrivning | Status |
|-------|-------------|--------|
| 0.1 | Web-subscribe borttaget från iOS/Android | ✅ |
| 0.2 | cookies.txt borttagen + .gitignore | ✅ |
| 0.3 | RevenueCat hårdkodad nyckel borttagen | ✅ |
| 0.4 | Android EXTERNAL_STORAGE borttagna | ✅ |
| 1.1 | identifyUser() efter login | ✅ |
| 1.2 | Backend IAP verify (stub) | ⚠️ Rekommenderas webhooks |
| 1.3 | CORS allowlist | ✅ |
| 2.1 | Account deletion | ✅ |
| 2.2 | Terms/Privacy länkar | ✅ |
| 2.3 | iOS PhotoLibraryAddUsageDescription | ✅ |
| 3.1 | API_URL fallback varning | ✅ |
| 3.2 | Stripe testkey fallback borttagen | ✅ |
