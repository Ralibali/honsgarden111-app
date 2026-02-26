# Hönsgården - Product Requirements Document

## Senaste uppdatering: 26 Feb 2026

---

## NYLIGEN GENOMFÖRT (26 Feb 2026)

### 1. In-App Lösenordsåterställning med 6-siffrig kod ✅
- Backend: 3 endpoints för kod-baserat flöde
- Frontend: 3-stegs UI med 60 sek cooldown

### 2. Premium Tab i mobilappen ✅
- Ny tab med priskort och funktionslista

### 3. Fristående Premium-webbsida ✅
- URL: `/api/premium-page`
- Inloggningskrav före checkout
- Snygg landningssida med mörkt tema

### 4. Checkout Success-sida ✅
- URL: `/api/checkout-success?session_id=xxx`
- Visar "Välkommen till Premium!" vid lyckad betalning
- Listar upplåsta funktioner
- Hanterar fel gracefully

### 5. Integritetspolicy (GDPR) ✅
- URL: `/api/privacy`
- 10 sektioner (datainsamling, rättigheter, cookies, etc.)
- På svenska

### 6. Användarvillkor ✅
- URL: `/api/terms`
- 13 sektioner (prenumeration, ansvar, återbetalning, etc.)
- På svenska

---

## Alla sidor & URLs

| Sida | URL |
|------|-----|
| Premium-sida | `/api/premium-page` |
| Checkout Success | `/api/checkout-success` |
| Integritetspolicy | `/api/privacy` |
| Användarvillkor | `/api/terms` |
| Webb-app | `/api/web` |
| Login | `/api/web/login` |

---

## Betalningsflöde

1. Användare besöker `/api/premium-page`
2. Om inte inloggad → "Logga in för att prenumerera"-knapp
3. Efter inloggning → "Starta din prenumeration"-knapp
4. Klick → Stripe Checkout med vald plan
5. Efter betalning → `/api/checkout-success?session_id=xxx`
6. Success-sidan verifierar betalning och visar bekräftelse

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

## Testanvändare
- E-post: testuser@test.com
- Lösenord: test123
