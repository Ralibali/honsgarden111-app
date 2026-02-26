# Hönsgården - Product Requirements Document

## Senaste uppdatering: 26 Feb 2026

---

## NYLIGEN GENOMFÖRT (26 Feb 2026)

### 1. Onboarding-guide med bilder ✅ (NY)
**Status: KOMPLETT**

4 skärmar med AI-genererade bilder och exempelresultat:
1. **Välkommen** (grön) - Äggregistrering, exempel: "24 ägg"
2. **Lär känna din flock** (amber) - Hönsprofiler, exempel: "12 hönor"
3. **Se dina resultat** (blå) - Statistik, exempel: "+23%"
4. **Träffa Agda** (lila/PREMIUM) - AI-rådgivare, exempel: "28 ägg prognos"

Funktioner:
- Visas automatiskt för nya användare
- "Hoppa över"-knapp i hörnet
- "Nästa" / "Kom igång!"-knappar
- Dot-navigation för progress
- Premium-badge på AI-skärmen
- "Visa introduktion"-knapp i Inställningar

### 2. Premium-webbsida med Stripe ✅
- URL: `/api/premium-page`
- Inloggningskrav före checkout
- Success-sida efter betalning

### 3. Integritetspolicy & Användarvillkor ✅
- `/api/privacy` - GDPR-kompatibel
- `/api/terms` - Fullständiga villkor

### 4. Lösenordsåterställning med kod ✅
- 6-siffrig kod via e-post
- 60 sek cooldown för ny kod

---

## Alla sidor & URLs

| Sida | URL |
|------|-----|
| Premium-sida | `/api/premium-page` |
| Checkout Success | `/api/checkout-success` |
| Integritetspolicy | `/api/privacy` |
| Användarvillkor | `/api/terms` |
| Webb-app | `/api/web` |

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

---

## Testrapporter
- `/app/test_reports/iteration_11.json` - Backend (lösenord)
- `/app/test_reports/iteration_12.json` - Frontend (premium)
- `/app/test_reports/iteration_13.json` - Onboarding (100%)

## Testanvändare
- E-post: testuser@test.com
- Lösenord: test123
