# HÖNSGÅRDEN - KOMPLETT APPSPECIFIKATION

## Senast uppdaterad: 25 Feb 2026

---

# 1. ÖVERSIKT

**Hönsgården** är en digital assistent för hobbyhönsägare. Appen hjälper användare att:
- Registrera och följa äggproduktion
- Hantera sina hönor och tuppar
- Följa ekonomin (kostnader och intäkter)
- Få AI-baserade råd och insikter

**Plattformar:**
- Webbapp (React + Vite)
- iOS-app (Expo/React Native)
- Android-app (Expo/React Native)

**Backend:** FastAPI + MongoDB

---

# 2. AUTENTISERING & KONTON

## 2.1 Inloggningsmetoder

### E-post/Lösenord (Primär)
- Registrering med namn, e-post, lösenord (minst 6 tecken)
- Obligatorisk GDPR-checkbox för användarvillkor
- Frivillig checkbox för nyhetsbrev/marknadsföring
- E-postverifiering med välkomstmail

### Google Sign-In
- Webb: Emergent OAuth redirect
- Mobil: Native Google Sign-In SDK

### Apple Sign-In (Endast iOS)
- Native Apple Sign-In för iOS-appen

## 2.2 Lösenordsåterställning
- "Glömt lösenord"-funktion
- Skickar återställningslänk via e-post (giltig 1 timme)
- Sida: `/reset-password?token=xxx`

## 2.3 Sessioner
- JWT-liknande session tokens
- Giltig i 7 dagar
- Sparas i httpOnly cookie + kan skickas som Bearer token

## 2.4 Admin-användare
- Konfigureras via miljövariabel `ADMIN_EMAILS`
- Får tillgång till admin-panel

---

# 3. PRENUMERATIONER & PREMIUM

## 3.1 Prismodell

| Plan | Pris | Fakturering |
|------|------|-------------|
| Månatlig | 19 kr | Varje månad |
| Årlig | 149 kr | En gång per år (spara 35%) |
| Gratis provperiod | 0 kr | 7 dagar för nya användare |

## 3.2 Betalningsflöde

### Webb (Stripe)
1. Användare klickar "Uppgradera" → `/premium`
2. Väljer plan (månad/år)
3. Omdirigeras till Stripe Checkout
4. Efter betalning → `/checkout/success`
5. Premium aktiveras automatiskt

### Mobil (Web-redirect - NY STRATEGI)
1. Användare klickar på låst funktion
2. **PremiumGateModal** visas med alla funktioner och priser
3. CTA: "Prenumerera via honsgarden.se"
4. Öppnar `https://honsgarden.se/premium` i webbläsare
5. Användare loggar in på webben med samma konto
6. Betalar via Stripe
7. Premium synkas automatiskt via delad databas

### Backup: In-App Purchases (RevenueCat)
- Kod finns kvar men är inaktiverad
- Kan aktiveras om App Store kräver det

## 3.3 Premium-funktioner (låsta för gratisanvändare)

| Funktion | Gratis | Premium |
|----------|--------|---------|
| Äggregistrering | ✅ (3 mån historik) | ✅ (obegränsad) |
| Hönshantering | ✅ (max 5 höns) | ✅ (obegränsad) |
| Flockar | ✅ (1 flock) | ✅ (obegränsad) |
| Grundläggande statistik | ✅ | ✅ |
| **AI Dagsrapport** | 🔒 | ✅ |
| **7-dagars äggprognos** | 🔒 | ✅ |
| **AI-rådgivare "Agda"** | 🔒 | ✅ |
| **Vädertips** | 🔒 | ✅ |
| **Hälsologg** | 🔒 | ✅ |
| **Kläckningsmodul** | 🔒 | ✅ |
| **Foderhantering** | 🔒 | ✅ |
| **Avancerad statistik** | 🔒 | ✅ |
| **Ekonomiinsikter** | 🔒 | ✅ |

## 3.4 Premium-gating UI

När icke-premium användare klickar på låsta funktioner:
- **Webb:** Omdirigeras till `/premium`-sidan
- **Mobil:** Visar **PremiumGateModal** med:
  - Feature-namn som triggade modalen
  - Lista med alla 8 premium-funktioner
  - Pris-kort (19 kr/mån, 149 kr/år)
  - "Spara 35%" badge på årlig
  - "7 dagars gratis provperiod"-info
  - CTA: "Prenumerera via honsgarden.se"
  - "Kanske senare"-knapp

---

# 4. HUVUDFUNKTIONER

## 4.1 Äggregistrering

### Daglig registrering
- Välj datum och antal ägg
- Kan kopplas till specifik höna
- Anteckningar möjligt
- Snabbknapp på dashboard för +1 ägg

### Ägghistorik
- Lista över alla registreringar
- Filtrera på datum, höna
- Redigera/radera poster
- **Gratis:** Senaste 3 månadernas data
- **Premium:** All historik

### API-endpoints:
```
POST /api/eggs - Registrera ägg
GET /api/eggs - Hämta ägglista (med pagination)
PUT /api/eggs/{id} - Uppdatera post
DELETE /api/eggs/{id} - Radera post
```

## 4.2 Hönshantering

### Hönaprofil
- Namn (obligatoriskt)
- Ras (valfritt)
- Färg (valfritt)
- Födelsedatum (valfritt)
- Typ: Höna eller Tupp
- Status: Aktiv, Såld, Avliden
- Senast sedd (för varningar)
- Anteckningar

### Flockar
- Gruppera höns i flockar
- Namn och beskrivning
- **Gratis:** Max 1 flock
- **Premium:** Obegränsade flockar

### API-endpoints:
```
POST /api/hens - Lägg till höna
GET /api/hens - Hämta alla höns
GET /api/hens/{id} - Hämta specifik höna
PUT /api/hens/{id} - Uppdatera höna
DELETE /api/hens/{id} - Radera höna

POST /api/flocks - Skapa flock
GET /api/flocks - Hämta flockar
PUT /api/flocks/{id} - Uppdatera flock
DELETE /api/flocks/{id} - Radera flock
```

## 4.3 Hälsologg (PREMIUM)

### Loggtyper
- `sick` - Sjuk
- `molting` - Ruggning
- `vet_visit` - Veterinärbesök
- `vaccination` - Vaccinering
- `deworming` - Avmaskning
- `injury` - Skada
- `recovered` - Återhämtad
- `note` - Anteckning

### Funktioner
- Logga hälsohändelser per höna
- Historik per höna
- Varningar vid sjukdomsmönster

### API-endpoints:
```
POST /api/health-logs - Skapa logg
GET /api/health-logs - Hämta loggar
GET /api/health-logs/hen/{hen_id} - Per höna
```

## 4.4 Ekonomi

### Transaktionstyper
**Kostnader:**
- `feed` - Foder
- `equipment` - Utrustning
- `medicine` - Medicin
- `other_cost` - Övrigt

**Intäkter:**
- `egg_sale` - Äggförsäljning
- `hen_sale` - Hönsförsäljning
- `other_income` - Övriga intäkter

### Funktioner
- Registrera inkomster och utgifter
- Beräkna vinst/förlust
- Månadssammanfattning
- Kostnad per ägg

### API-endpoints:
```
POST /api/transactions - Skapa transaktion
GET /api/transactions - Hämta alla
GET /api/economy/summary - Sammanfattning
```

## 4.5 Foderhantering (PREMIUM)

### Fodertyper
- `layer_feed` - Värpfoder
- `grower_feed` - Tillväxtfoder
- `starter_feed` - Startfoder
- `scratch_grain` - Korn/vete
- `treats` - Godis
- `supplements` - Tillskott
- `other` - Övrigt

### Funktioner
- Registrera foderköp (kostnad, mängd)
- Registrera foderkonsumtion
- Lagersaldo per fodertyp
- Varning vid lågt lager

### API-endpoints:
```
POST /api/feed - Registrera foder
GET /api/feed - Hämta historik
GET /api/feed/inventory - Lagerstatus
```

## 4.6 Kläckning/Inkubation (PREMIUM)

### Funktioner
- Starta kläckningsprojekt
- Ange antal ägg, startdatum
- Automatisk beräkning av kläckdatum (21 dagar)
- Koppling till ruvande höna eller inkubator
- Påminnelser: 3 dagar före, 1 dag före, kläckdagen
- Logga resultat (antal kläckta)

### Status
- `incubating` - Pågår
- `hatched` - Kläckt
- `failed` - Misslyckad
- `cancelled` - Avbruten

### API-endpoints:
```
POST /api/hatching - Starta kläckning
GET /api/hatching - Hämta alla
PUT /api/hatching/{id} - Uppdatera
DELETE /api/hatching/{id} - Radera
```

---

# 5. AI-FUNKTIONER (PREMIUM)

## 5.1 AI Dagsrapport

- Personlig daglig rapport genererad av AI
- Innehåller:
  - Hälsning med användarens namn
  - Sammanfattning av dagens produktion
  - Observationer och uppmuntran
  - Praktiskt tips
  - Signatur från "Agda"
- Genereras med OpenAI GPT-4o

### API:
```
GET /api/ai/daily-report
```

**Gratisanvändare:** Får en "blurred preview" med antal ägg och höns, men inte den fulla AI-genererade texten.

## 5.2 7-dagars Äggprognos

- Förutsäger äggproduktion nästa 7 dagar
- Baserat på historisk data (senaste 30 dagarna)
- Visar förväntade ägg per dag
- Konfidensgrad baserad på datamängd

### API:
```
GET /api/ai/egg-forecast
```

**Gratisanvändare:** Ser att prognosen finns men inte detaljerna.

## 5.3 AI-rådgivare "Agda"

- Personlig rådgivare för hönsskötsel
- Svarar på frågor baserat på användarens flock
- Har djup kunskap om:
  - Stallmiljö
  - Foder och vatten
  - Vanliga sjukdomar
  - Tuppar
  - Väder och säsong
  - Äggläggning

### Kunskapsbas (inbyggd i backend):
- 0.3-0.4 m² per fågel inomhus
- Sittpinnar: 4-5 cm diameter
- Kalciumtillskott viktigt
- Information om sjukdomar (kvalster, koccidios, etc.)
- Tips för olika väderförhållanden

### API:
```
POST /api/ai/advisor?question=...
```

---

# 6. VÄDERINTEGRATION

## 6.1 Funktioner
- Visar aktuellt väder baserat på plats
- Temperatur, beskrivning, ikon
- **Premium:** Väderanpassade tips för hönsskötsel

### Tips-exempel:
- Kallt väder: "Se till att vattnet inte fryser"
- Varmt väder: "Extra vatten och skugga"
- Regn: "Kontrollera att ströbädden är torr"

### API:
```
GET /api/weather?lat=...&lon=...
```

---

# 7. STATISTIK

## 7.1 Dashboard-statistik
- Ägg idag
- Ägg denna vecka
- Ägg denna månad
- Totalt antal ägg
- Antal aktiva höns/tuppar
- Produktivitetssnitt (ägg per höna per vecka)

## 7.2 Grafer och diagram
- Äggproduktion över tid (linje/stapel)
- Produktion per höna
- Ekonomisk utveckling
- **Premium:** Mer detaljerade analyser

### API-endpoints:
```
GET /api/statistics/today
GET /api/statistics/summary
GET /api/eggs/monthly-totals
```

---

# 8. GDPR & JURIDIK

## 8.1 Vid registrering
- **Obligatoriskt:** Checkbox för användarvillkor (GDPR-krav)
- **Frivilligt:** Checkbox för marknadsföring/nyhetsbrev

## 8.2 Sparade samtycken
Databasen lagrar:
- `accepted_terms: true/false`
- `accepted_terms_at: timestamp`
- `accepted_marketing: true/false`
- `accepted_marketing_at: timestamp`

## 8.3 Juridiska sidor (krävs för App Store)
- `/privacy` - Integritetspolicy
- `/terms` - Användarvillkor

## 8.4 Cookie-banner
- Visas vid första besök
- Val: "Endast nödvändiga" eller "Godkänn alla"
- Nödvändiga cookies för autentisering

## 8.5 Användarrättigheter (GDPR)
Användare har rätt att:
- Få tillgång till sin data
- Rätta felaktig data
- Radera sin data ("rätten att bli glömd")
- Exportera sin data
- Återkalla samtycke

---

# 9. ADMIN-PANEL

## 9.1 Åtkomst
- Endast för användare vars e-post finns i `ADMIN_EMAILS`
- Länk visas i sidomenyn för admin-användare

## 9.2 Funktioner

### Användarhantering
- Lista alla användare
- Sök på e-post
- Se kontostatus (gratis/premium/trial)
- Manuellt aktivera/avaktivera premium

### Statistik
- Totalt antal användare
- Antal premium-användare
- Antal trial-användare
- Registreringar över tid

### Feedback
- Läs användarfeedback
- Markera som läst/besvarad

### API-endpoints:
```
GET /api/admin/users - Lista användare
GET /api/admin/users/{id} - Specifik användare
POST /api/admin/users/{id}/set-premium - Sätt premium
GET /api/admin/stats - Statistik
GET /api/admin/feedback - Feedback
```

---

# 10. ANVÄNDARINSTÄLLNINGAR

## 10.1 Profilinställningar
- Namn
- E-post (ej redigerbar)
- Profilbild (från Google/Apple)
- Lösenordsbyte

## 10.2 Gårdsinställningar
- Gårdens namn
- Antal höns (räknas automatiskt)

## 10.3 Påminnelser
- Aktivera/avaktivera dagliga påminnelser
- Välj påminnelsetid (standard 18:00)

## 10.4 Funktionspreferenser
Användare kan dölja/visa:
- Flockhantering
- Hälsologg
- Foderhantering
- Väderdata
- Kläckningsmodul
- Produktivitetsvarningar
- Ekonomiinsikter

## 10.5 Språk
- Svenska (standard)
- Engelska

## 10.6 Tema
- Ljust
- Mörkt
- Systemstandard

### API-endpoints:
```
GET /api/settings - Hämta inställningar
PUT /api/settings - Uppdatera inställningar
GET /api/preferences - Funktionspreferenser
PUT /api/preferences - Uppdatera preferenser
```

---

# 11. FEEDBACK-SYSTEM

## 11.1 Feedbacktyper
- `feature` - Funktionsförslag
- `improvement` - Förbättringsförslag
- `bug` - Buggrapport
- `other` - Övrigt

## 11.2 Funktioner
- Skicka feedback från appen
- Valfri e-postadress för svar
- Admin får notifikation via e-post

### API:
```
POST /api/feedback
```

---

# 12. E-POSTMEDDELANDEN (via Resend)

## 12.1 Transaktionella mail

### Välkomstmail
Skickas vid registrering. Innehåller:
- Personlig hälsning
- Info om 7 dagars gratis Premium
- Lista med premium-funktioner
- Kom-igång-guide
- CTA: "Öppna Hönsgården"

### Lösenordsåterställning
- Länk giltig i 1 timme
- CTA: "Återställ lösenord"

### Feedback-notis (till admin)
- Skickas när användare skickar feedback

## 12.2 Avsändare
- Från: `noreply@honsgarden.se` (konfigurerbart)

---

# 13. DATABAS-SCHEMA (MongoDB)

## Collections

### users
```javascript
{
  id: "user_xxx",
  email: "user@example.com",
  password_hash: "...", // Endast för e-post-auth
  name: "Namn",
  picture: "url",
  auth_provider: "email" | "google" | "apple",
  google_id: "...",
  apple_id: "...",
  accepted_terms: true,
  accepted_terms_at: ISODate,
  accepted_marketing: false,
  reminder_enabled: true,
  reminder_time: "18:00",
  created_at: ISODate
}
```

### subscriptions
```javascript
{
  user_id: "user_xxx",
  is_active: true,
  plan: "trial" | "monthly" | "yearly",
  expires_at: ISODate,
  stripe_session_id: "...",
  purchase_source: "stripe" | "iap",
  platform: "ios" | "android" | "web",
  cancelled_at: ISODate,
  cancellation_reason: "..."
}
```

### hens
```javascript
{
  id: "xxx",
  user_id: "user_xxx",
  name: "Agda",
  breed: "Orpington",
  color: "Brun",
  birth_date: "2024-01-01",
  hen_type: "hen" | "rooster",
  status: "active" | "sold" | "deceased",
  flock_id: "flock_xxx",
  notes: "...",
  created_at: ISODate
}
```

### egg_records
```javascript
{
  id: "xxx",
  user_id: "user_xxx",
  date: "2026-02-25",
  count: 3,
  hen_id: "hen_xxx", // Valfri
  notes: "..."
}
```

### transactions
```javascript
{
  id: "xxx",
  user_id: "user_xxx",
  date: "2026-02-25",
  type: "cost" | "sale",
  category: "feed" | "equipment" | "egg_sale" | ...,
  amount: 150.00,
  description: "Värpfoder 15 kg",
  quantity: 1
}
```

### health_logs
```javascript
{
  id: "xxx",
  user_id: "user_xxx",
  hen_id: "hen_xxx",
  date: "2026-02-25",
  type: "sick" | "vaccination" | ...,
  description: "..."
}
```

### hatching
```javascript
{
  id: "xxx",
  user_id: "user_xxx",
  start_date: "2026-02-25",
  expected_hatch_date: "2026-03-18",
  egg_count: 12,
  status: "incubating" | "hatched" | "failed",
  hatched_count: 10,
  hen_id: "hen_xxx", // Ruvande höna
  incubator_name: "Brinsea",
  notes: "..."
}
```

### flocks
```javascript
{
  id: "xxx",
  user_id: "user_xxx",
  name: "Bakomhuset-gänget",
  description: "..."
}
```

### feed_records
```javascript
{
  id: "xxx",
  user_id: "user_xxx",
  date: "2026-02-25",
  feed_type: "layer_feed" | ...,
  amount_kg: 15.0,
  cost: 249.00,
  is_purchase: true,
  brand: "Granngården"
}
```

### feedback
```javascript
{
  id: "xxx",
  user_id: "user_xxx",
  type: "feature" | "bug" | ...,
  message: "...",
  email: "...",
  status: "new" | "read" | "replied"
}
```

---

# 14. API-SAMMANFATTNING

## Autentisering
```
POST /api/auth/register - E-post registrering
POST /api/auth/login - E-post inloggning
POST /api/auth/logout - Logga ut
POST /api/auth/session - Google OAuth session
POST /api/auth/google/mobile - Mobil Google auth
POST /api/auth/apple/mobile - Mobil Apple auth
POST /api/auth/forgot-password - Begär återställning
POST /api/auth/reset-password - Återställ lösenord
GET /api/auth/me - Hämta inloggad användare
```

## Premium
```
GET /api/premium/status - Premium-status
POST /api/checkout/create - Skapa Stripe checkout
GET /api/checkout/status/{id} - Checkout-status
POST /api/subscription/cancel - Avbryt prenumeration
POST /api/iap/verify - Verifiera IAP (backup)
POST /api/iap/restore - Återställ IAP (backup)
```

## Data
```
POST/GET/PUT/DELETE /api/eggs - Äggregistrering
POST/GET/PUT/DELETE /api/hens - Hönshantering
POST/GET/PUT/DELETE /api/flocks - Flockar
POST/GET/PUT/DELETE /api/transactions - Ekonomi
POST/GET/PUT/DELETE /api/health-logs - Hälsologg (Premium)
POST/GET/PUT/DELETE /api/feed - Foder (Premium)
POST/GET/PUT/DELETE /api/hatching - Kläckning (Premium)
```

## AI (Premium)
```
GET /api/ai/daily-report - Dagsrapport
GET /api/ai/egg-forecast - 7-dagars prognos
POST /api/ai/advisor - Rådgivare Agda
```

## Övrigt
```
GET /api/weather - Väderdata
GET /api/statistics/today - Statistik
POST /api/feedback - Skicka feedback
GET/PUT /api/settings - Inställningar
GET/PUT /api/preferences - Preferenser
```

## Admin
```
GET /api/admin/users - Lista användare
POST /api/admin/users/{id}/set-premium - Sätt premium
GET /api/admin/stats - Statistik
GET /api/admin/feedback - Feedback
```

---

# 15. MILJÖVARIABLER (Backend)

```env
# Databas
MONGO_URL=mongodb://...
DB_NAME=honsgarden

# Stripe
STRIPE_API_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...

# E-post
RESEND_API_KEY=re_...
SENDER_EMAIL=noreply@honsgarden.se

# AI
EMERGENT_LLM_KEY=...

# Väder
WEATHER_API_KEY=... (OpenWeatherMap)

# App
APP_URL=https://honsgarden.se

# Admin
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

---

# 16. DESIGN & UI/UX

## Färger
- Primär: `#4CAF50` (grön)
- Sekundär: `#8BC34A` (ljusgrön)
- Accent: `#f59e0b` (gul/orange för premium)
- Bakgrund mörkt: `#0D0D0D`, `#1C1C1E`
- Text: `#FFF` (mörkt tema)

## Typografi
- Rubriker: Playfair Display (eller liknande serif)
- Brödtext: Inter (eller system sans-serif)

## Ikoner
- Ionicons (React Native)
- Lucide React (Webb)

## Teman
- Ljust tema
- Mörkt tema (standard)
- Automatiskt (följer system)

---

# 17. MOBILSPECIFIKT

## 17.1 PremiumGateModal
Fil: `/frontend/components/PremiumGateModal.tsx`

Visas när icke-premium användare försöker använda låsta funktioner.
- Animerad modal från botten
- Visar vilken funktion som triggade modalen
- Lista med alla premium-funktioner
- Pris-kort
- Haptic feedback

## 17.2 RevenueCat (Backup)
- Konfigurerad men inaktiverad
- API-nycklar i `/frontend/.env`
- Kan aktiveras om App Store kräver IAP

## 17.3 Deep linking
- Schema: `honsgarden://`
- Stöd för lösenordsåterställning via app

---

# 18. VIKTIGA FLÖDEN

## 18.1 Ny användare
1. Registrera (e-post/Google/Apple)
2. Godkänn användarvillkor (obligatoriskt)
3. Välj marknadsföring (frivilligt)
4. Får 7 dagars gratis Premium
5. Välkomstmail skickas
6. Omdirigeras till dashboard

## 18.2 Uppgradering till Premium
1. Användare ser låst funktion
2. Klickar på den → Modal visas
3. Väljer "Prenumerera via honsgarden.se"
4. Öppnas i webbläsare
5. Loggar in på webb (samma konto!)
6. Väljer plan → Stripe checkout
7. Betalar
8. Premium aktiveras
9. Tillbaka till appen - synkad via databas

## 18.3 Daglig användning
1. Öppna appen
2. Se dashboard med statistik
3. Registrera ägg (+1 snabbknapp)
4. Se AI-rapport (Premium)
5. Logga hälsohändelser vid behov
6. Kolla ekonomi

---

# 19. KONTAKTUPPGIFTER

- Support: support@honsgarden.se
- Webb: https://honsgarden.se

---

**SLUT PÅ SPECIFIKATION**

Detta dokument innehåller ALLT som behövs för att bygga en identisk webbsida som fungerar med samma backend och databas.
