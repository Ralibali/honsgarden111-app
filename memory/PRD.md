# Hönsgården - Product Requirements Document

## Projektöversikt
Hönsgården är en komplett hönsgårdshanteringsapp för iOS, Android och webb. Appen hjälper användare att spåra äggproduktion, hantera hönor och tuppar, få AI-drivna insikter och prenumerera på premium-funktioner.

## Nyligen Slutförda Uppgifter (2025-02-27)

### 7-dagars Gratis Trial Premium ✅
- Nya användare får automatiskt 7 dagars gratis Premium vid registrering
- `expires_at` sätts korrekt i subscription
- Plan märks som "trial"

### Referral-system ("Bjud in vänner") ✅
- **Varje användare får en unik 8-teckens referral-kod**
- **Vid registrering med referral-kod:**
  - Ny användare får 7 dagars trial (standard)
  - Den som refererade får +7 dagars Premium (utökas på befintlig tid)
- **Nya endpoints:**
  - `GET /api/referral/info` - Hämta din kod och statistik
  - `GET /api/referral/list` - Se lista över värvade vänner
- **Ny UI-sida:** `/invite` - Bjud in vänner med delning och statistik
- **Knapp i Settings:** "Bjud in vänner – få 7 dagars Premium!"

### Native Admin-panel ✅
- Flyttad från webb till native app
- Tre flikar: Användare, Premium, Feedback
- Sök, radera användare, hantera feedback-status
- Knapp i Settings: "Admin Panel" (endast för admins)

### AI-förbättringar ✅
- `used_fallback` och `ai_provider_ok` flaggor i alla AI-responses
- Stockholm-tid för alla datumhanteringar
- Förbättrad 7-dagars prognos med insikter (trend, bästa dag, datakvalitet)
- Smartare "höna värper inte"-varningar (skippar om användaren inte trackar per höna)

### Magic Link ✅
- `POST /api/auth/magic-link` - Skapa länk (skickas via email)
- `GET /api/auth/magic/consume` - Konsumera länk, skapa session
- Rate limiting: 3/min, 10/h
- TTL: 10 minuter
- Knapp i Settings: "Logga in på webben"

### "Kom ihåg mig" ✅
- Checkbox på webbens login-sida
- `remember_token` cookie (90 dagar, hashad i DB)
- Rotation vid användning för säkerhet

### Premium-synk ✅
- `GET /api/premium/status` returnerar nu:
  - `source`: "stripe" | "revenuecat" | null
  - `last_verified_at`: ISO timestamp
  - `expires_at`: Används för att verifiera aktiv status

## Konfiguration

### Miljövariabler (Backend)
```
MONGO_URL=...
DB_NAME=honsgarden
STRIPE_API_KEY=...
RESEND_API_KEY=...
REVENUECAT_API_KEY=...
EMERGENT_LLM_KEY=...
APP_URL=https://honsgarden.se
```

### Miljövariabler för Production Deployment
**VIKTIGT:** Lägg till dessa i Emergent Env Variables för production:
```
MONGO_URL = mongodb+srv://honsgarden_main:...@honsgarden.yatzdav.mongodb.net/...
DB_NAME = honsgarden
```

## DNS-inställningar för honsgarden.se

```
www.honsgarden.se  CNAME  [deployment-url].emergent.host
honsgarden.se      ALIAS  [deployment-url].emergent.host
```

## API-endpoints

### Referral
- `GET /api/referral/info` - Hämta kod och statistik
- `GET /api/referral/list` - Lista värvade vänner

### Magic Link
- `POST /api/auth/magic-link` - Skapa länk (kräver auth)
- `GET /api/auth/magic/consume` - Konsumera länk (publik)

### Premium
- `GET /api/premium/status` - Status med source och last_verified_at

## Frontend-sidor

- `/admin` - Native admin-panel
- `/invite` - Bjud in vänner
- `/magic` - Magic link redirect (webb)

## Återstående uppgifter

### P0 - Kritiskt
- [ ] Konfigurera production environment variables i Emergent
- [ ] Verifiera deployment fungerar med rätt databas

### P1 - Viktigt
- [ ] DNS-setup för honsgarden.se
- [ ] Ny EAS Build med alla fixar
- [ ] Testa referral-flödet end-to-end

### P2 - Backlog
- [ ] Fixa i18n-kraschen på webb
- [ ] Affiliate-produktlänkar
