# Hönsgården - Product Requirements Document

## Senaste uppdatering: 26 Feb 2026 (Session 2 - Slutförd)

---

## NYLIGEN GENOMFÖRT (26 Feb 2026 - Session 2 Slutförd - Del 2)

### 1. Förbättrad Felhantering vid Login ✅
- Lagt till Alert.alert för att visa tydligt felmeddelande när login misslyckas
- Användaren ser nu alltid en popup med "Fel vid inloggning" om lösenordet/e-post är fel

### 2. Förbättrad Onboarding-guide ✅
- **Swipe-funktion**: Nu kan man svep mellan slides med fingret
- **Inga externa bilder**: Ersatt med ikoner (ägg, hjärta, graf, stjärnor)
- **Klickbara dots**: Man kan trycka på dots för att hoppa till en slide
- **Swipe-hint**: Text som visar "Svep för att bläddra →"

### 3. EAS Deployment Fix ✅
- Tog bort tomma strängar i `eas.json` submit-konfiguration som blockerade deployment

---

## GENOMFÖRT (26 Feb 2026 - Session 2 - Del 1)

### 1. Trend-analys ✅ (NY)
**Ny backend-endpoint: `/api/statistics/trend-analysis`**

Jämför senaste 30 dagar med föregående 30 dagar:
- **Äggproduktion** (förändring i %)
- **Värpfrekvens** (förändring i %)
- **Kostnader** (förändring i %)
- **Försäljning** (förändring i %)
- **Vinst** (förändring i %)
- **Overall trend**: "improving" / "declining" / "stable"
- **Trend-meddelande** på svenska
- **Automatiska insikter** baserade på data

### 2. Trend-analys Frontend ✅ (NY)
- Trend-banner med färgkodad status (grön/röd/gul)
- Period-jämförelse med nuvarande vs tidigare äggantal
- Förändringsindikatorer för alla nyckeltal
- Lista med automatiska insikter

### 3. Stripe Token-fix ✅ (Issue #2)
- `premium.html` uppdaterad för att skicka auth token med checkout
- Hämtar token från `localStorage` och lägger i `Authorization` header
- Skickar även `user_id` i request body för säker koppling

### 4. Mobilappens registrerings-UI ✅ (Issue #1 - VERIFIERAT)
- UI för 6-siffrig verifieringskod finns redan i `login.tsx`
- `authMode === 'register-verify'` visar kod-input
- Inkluderar "Skicka ny kod"-knapp med cooldown

### 5. EAS/Expo Byggkonfiguration ✅ (Issue #3)
- Tog bort `expo-apple-authentication` (ej längre använd)
- Tog bort `usesAppleSignIn: true` från app.json
- Uppdaterade eas.json med förbättrad konfiguration
- Auto-increment för produktionsbyggen

### 6. Glömt Lösenord ✅ (Issue #4 - VERIFIERAT)
- Gamla webbappen har korrekt `/api/auth/forgot-password` endpoint
- Fristående reset-password.html finns och fungerar

---

## GENOMFÖRT (26 Feb 2026 - Session 2)

### 1. Avancerade Statistiska Insikter ✅
**Ny backend-endpoint: `/api/statistics/advanced-insights`**

Returnerar detaljerad data om:
- **Foderkonvertering** (kg foder per dussin ägg)
- **Värpfrekvens** (% av höns som värper dagligen)
- **Kostnad per ägg**
- **Vinst per ägg**
- **Foderkostnad per ägg**
- **Ägg per höna (månad/år)**
- **Bästa värpdag** (vilken veckodag ger mest ägg)
- **Produktivitetspoäng** (0-100)

### 2. Uppdaterad Statistik-sida (Frontend) ✅
- Ny sektion "Avancerade insikter" tillagd
- Produktivitetspoäng-visare med färgkodning
- Rutnät med alla nyckeltal
- Premium-lås för icke-premium användare

### 3. Syntax-fix i login.tsx ✅
- Åtgärdade `<View style={styles.divider}>` fel (saknades stängning)

---

## TIDIGARE GENOMFÖRT (26 Feb 2026 - Session 1)

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
