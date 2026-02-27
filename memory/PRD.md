# Hönsgården - Product Requirements Document

## Projektöversikt
Hönsgården är en komplett hönsgårdshanteringsapp för iOS, Android och webb. Appen hjälper användare att spåra äggproduktion, hantera hönor, få AI-drivna insikter och prenumerera på premium-funktioner.

## Tech Stack
- **Frontend**: React Native (Expo SDK 54), Expo Router, Zustand
- **Backend**: FastAPI, Python
- **Databas**: MongoDB Atlas
- **Betalningar**: 
  - iOS: RevenueCat (App Store IAP)
  - Android: Stripe (Webbbetalning)
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

### Premium/Prenumerationer ✅ (2024-02-27)
- **iOS**: RevenueCat In-App Purchase integration
- **Android/Webb**: Stripe webbbetalning
- Premium-skärm med planer (månatlig/årlig)
- PremiumGateModal för gated features
- Paywall-skärm med plattformsspecifik logik
- Prenumerationshantering (iOS: App Store, Android: Google Play)
- "Tack"-meddelande efter köp

### RevenueCat Integration ✅ (2024-02-27)
- A1: Paywall använder RevenueCatPaywall för iOS
- A2: PremiumGateModal navigerar till /paywall
- A3: Hantera prenumeration via getManagementURL()
- A4: identifyUser() anropas efter login
- A5: API-nycklar via miljövariabler (ej hårdkodade)

### Google Play/App Store Compliance ✅ (2024-02-27)
- B1: Radera konto-funktion implementerad
- B2: Onödiga Android-permissions borttagna
- B3: NSPhotoLibraryAddUsageDescription tillagt
- B4: Privacy/Terms-länkar i appen

### Säkerhet & CORS ✅ (2024-02-27)
- CORS: Explicit origin-lista istället för "*"
- Stripe: Ingen fallback testnyckel
- API_URL: Varning om ej konfigurerad
- cookies.txt borttagen från repo

### Hemskärm
- Äggregistrering för dagen
- Dagens statistik
- Väder-widget högst upp (klickbar för mer info)
- Insikter och tips

### Hönor
- Lista alla hönor
- Lägg till/redigera hönor
- Hälsologg (Premium)
- Produktivitetsvarningar

### Statistik
- Daglig/veckovis/månadsvis äggproduktion
- Grafer och trender
- PDF-export (Premium)

## Konfiguration

### Miljövariabler (Backend)
```
MONGO_URL=...
STRIPE_API_KEY=...
STRIPE_PUBLISHABLE_KEY=...
STRIPE_PRICE_MONTHLY=...
STRIPE_PRICE_YEARLY=...
RESEND_API_KEY=...
```

### Miljövariabler (Frontend)
```
EXPO_PUBLIC_BACKEND_URL=...
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=...
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=...
```

## DNS-konfiguration för honsgarden.se
```
CNAME  @    → production-ready-71.emergentagent.com
CNAME  www  → production-ready-71.emergentagent.com
```

## Återstående uppgifter

### P0 - Kritiskt
- [ ] Verifiera Stripe-betalningsflöde end-to-end
- [ ] Trigga ny EAS-build för mobilapp

### P1 - Viktigt
- [ ] Verifiera RevenueCat-integration på riktig iOS-enhet
- [ ] Testa radera konto-funktionen

### P2 - Önskvärt
- [ ] Affiliate-produktlänkar
- [ ] Refaktorera backend till separata routers

## Changelog

### 2024-02-27
- Implementerade fullständig RevenueCat-integration för iOS
- Fixade Premium-flödet: iOS använder IAP, Android använder Stripe
- La till "Radera konto"-funktion (Google Play-krav)
- Fixade CORS med explicit origin-lista
- Tog bort hårdkodad RevenueCat testnyckel
- La till väder-widget högst upp i hemskärmen
- La till Privacy/Terms-länkar i appen
- Fixade Android permissions
- La till NSPhotoLibraryAddUsageDescription för iOS
