# Hönsgården - Product Requirements Document

## Senaste uppdatering: 26 Feb 2026

---

## NYLIGEN GENOMFÖRT (26 Feb 2026)

### 1. Autentisering - Endast E-post/Lösenord ✅
**Google Sign-In har tagits bort.** Enklare och säkrare.

**Registrering med e-postverifiering:**
- Steg 1: Fyll i namn, e-post, lösenord + godkänn villkor
- Steg 2: Ange 6-siffrig kod från e-post
- Steg 3: Konto skapat! (+ 7 dagars gratis Premium)

**Backend endpoints:**
- `POST /api/auth/register` - Startar registrering, skickar kod
- `POST /api/auth/verify-registration` - Verifierar kod, skapar konto
- `POST /api/auth/resend-verification` - Skickar ny kod

### 2. Lösenordsåterställning ✅
- `GET /api/reset-password` - Fristående webbsida
- 3-stegs flöde: E-post → Kod → Nytt lösenord

### 3. Registreringssida för webb ✅
- `GET /api/register` - Fristående webbsida
- Visar "7 dagars gratis Premium!" badge
- Checkboxar för villkor och nyhetsbrev

---

## Alla sidor & URLs

| Sida | URL |
|------|-----|
| **Registrering** | `/api/register` |
| **Återställ lösenord** | `/api/reset-password` |
| Premium-sida | `/api/premium-page` |
| Checkout Success | `/api/checkout-success` |
| Integritetspolicy | `/api/privacy` |
| Användarvillkor | `/api/terms` |
| Webb-app | `/api/web` |

---

## Autentiseringsflöden

### Registrering (nytt)
```
Användare → /api/register
    ↓
Fyller i: namn, e-post, lösenord
    ↓
Backend skickar 6-siffrig kod via e-post
    ↓
Användare anger koden
    ↓
Konto skapas + 7 dagars Premium trial
    ↓
Automatisk inloggning → /api/web
```

### Återställ lösenord
```
Användare → /api/reset-password
    ↓
Anger e-post
    ↓
Backend skickar 6-siffrig kod
    ↓
Anger kod + nytt lösenord
    ↓
Lösenord ändrat → /api/web
```

---

## Teknisk Stack
- **Backend**: FastAPI, MongoDB Atlas
- **Mobil**: Expo (SDK 54), React Native
- **E-post**: Resend (noreply@honsgarden.se)
- **Betalningar**: Stripe
- **AI**: OpenAI via emergentintegrations

---

## Kommande uppgifter

### P1 - Att göra
- [ ] Länka "Glömt lösenord?" i webb-appen till `/api/reset-password`
- [ ] Länka "Skapa konto" i webb-appen till `/api/register`
- [ ] Bygg mobilappen via EAS

### P2 - Framtida
- [ ] Uppdatera mobilappens registreringsflöde med verifiering

---

## Testanvändare
- E-post: testuser@test.com
- Lösenord: test123
