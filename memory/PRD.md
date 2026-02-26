# Hönsgården - Product Requirements Document

## Senaste uppdatering: 26 Feb 2026

---

## NYLIGEN GENOMFÖRT (26 Feb 2026)

### 1. In-App Lösenordsåterställning med 6-siffrig kod ✅
**Status: KOMPLETT OCH TESTAD**

Backend-endpoints:
- `POST /api/auth/forgot-password` - Skickar 6-siffrig kod via e-post
- `POST /api/auth/verify-reset-code` - Verifierar kod
- `POST /api/auth/reset-password-with-code` - Sätter nytt lösenord

Frontend (login.tsx):
- 3-stegs UI: E-post → Kodinmatning → Nytt lösenord
- 60 sek cooldown för "Skicka ny kod"

### 2. Premium Tab i mobilappen ✅
**Status: KOMPLETT**

Ny tab med stjärnikon som visar:
- Priskort: 19 kr/mån och 149 kr/år
- 10 premium-funktioner med beskrivningar
- CTA-knapp → honsgarden.se/api/premium-page

### 3. Fristående Premium-webbsida ✅
**Status: KOMPLETT**

URL: `/api/premium-page`

Snygg landningssida med:
- Hero-sektion: "Lås upp hela Hönsgården"
- Interaktiva priskort (månadsvis/årlig)
- 7 dagars gratis provperiod-banner
- 10 premium-funktioner med ikoner
- FAQ-sektion (5 frågor)
- Stripe checkout-integration
- Mörkt tema som matchar appen

---

## Deployment-status

### EAS Build-konfiguration: ✅ REDO
- `eas.json` och `app.json` konfigurerade
- Alla ikoner på plats

### URLs:
- **Premium-sida**: `https://honsgarden.se/api/premium-page`
- **Webb-app**: `https://honsgarden.se/api/web`

---

## Komplett funktionslista

### Autentisering ✅
- E-post/lösenord registrering och inloggning
- Google Sign-In (webb)
- Apple Sign-In
- Lösenordsåterställning (6-siffrig kod)
- GDPR-samtycke

### Premium & Monetisering ✅
- Premium-sida med Stripe checkout
- Webb-redirect för mobilbetalning
- Premium-status i appen

### Kärnfunktioner ✅
- Äggdagbok
- Hönsprofiler med tuppar
- Flockhantering
- Ekonomispårning
- Statistik
- AI-rådgivare Agda
- AI Dagsrapport
- Äggprognos
- Väderintegration
- Hälsologg
- Kläckningsmodul
- Foderhantering

---

## Teknisk Stack
- **Backend**: FastAPI, MongoDB Atlas
- **Mobil**: Expo (SDK 54), React Native
- **E-post**: Resend
- **Betalningar**: Stripe
- **AI**: OpenAI via emergentintegrations

---

## Kommande uppgifter

### P1 - Hög prioritet
- [ ] Bygg appen via EAS
- [ ] Testa på fysisk enhet

### P2 - Framtida
- [ ] Google Sign-In native config
- [ ] Onboarding-guide
- [ ] Ta bort RevenueCat-kod

---

## Testrapporter
- `/app/test_reports/iteration_11.json` - Backend
- `/app/test_reports/iteration_12.json` - Frontend

## Testanvändare
- E-post: testuser@test.com
- Lösenord: test123
