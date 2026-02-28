# Hönsgården - Product Requirements Document

## Projektöversikt
Hönsgården är en komplett hönsgårdshanteringsapp för iOS, Android och webb. Appen hjälper användare att spåra äggproduktion, hantera hönor och tuppar, få AI-drivna insikter och prenumerera på premium-funktioner.

## Nyligen Slutförda Uppgifter (2025-12-19)

### Session 7: Kritiska Bugfixar + Lantligt Tema (2025-12-19)

#### 🎯 UX & Premium-strategi Optimering ✅ (STOR UPPDATERING - Session 7d)

**Övergripande principer implementerade:**
- ✅ Handling före analys
- ✅ Kärnfunktion före Premium
- ✅ Visa värde innan låsning
- ✅ Premium som naturlig uppgradering - inte spärr

**Statistik-fliken:**
- Trend-analys visar nu partiell insikt: "Produktionen har ökat med 12%..."
- Länk till fördjupning istället för helt låst block
- Produktivitetspoäng visas öppet (0-100) med progress bar
- Premium låser endast detaljerad analys

**Ekonomi-fliken:**
- "Lägg till kostnad" och "Lägg till försäljning" - FLYTTAT HÖGST UPP
- Break-even och Intäkt per ägg - ÖPPET för alla
- Kontextuell Premium-prompt: Visar endast vid 20+ ägg
- Smart prompt baserat på vinst/förlust

**Hönor-fliken:**
- Förbättrad empty state med onboarding
- Tips: "Med registrerade hönor kan du spåra vilka som värper bäst..."

**Ägglogg:**
- Tidsfilter (7/30 dagar) - FLYTTAT ÖVER "Lägg till ägg"

**Premium-strategi:**
- Kontextuella triggers baserat på användardata
- Inga stora låsta block högt upp
- Premium visar djup - inte att gratis saknar funktion

#### 📱 Startsida Omdesignad ✅ (STOR UX-FÖRBÄTTRING - Session 7c)
Helt ny layoutstruktur för maximal användarvänlighet:

**Ny ordning (uppifrån och ner):**
1. **🥚 Äggregistrering (Hero)** - Stort grönt kort med snabbknappar (+1, +3, +6, Mer)
2. **📊 Snabbstatistik** - 3 kort på rad: Ägg idag, Höns, Produktivitet
3. **⚠️ Produktivitetsvarningar** - Om höns inte värpt
4. **📋 Dagens sysslor** - Klickbart kort med progress
5. **⚡ Snabbåtgärder** - Grid med 4 knappar (Foder, Kläckning, Community, Dela)
6. **📈 Månadsöversikt** - Ägg, Kostnader, Försäljning, Nettoresultat
7. **🏆 Veckans bästa höna** - Om data finns
8. **🌤️ Väder** - Kompakt kort (nedflyttat)
9. **👥 Community-jämförelse** - Ranking vs andra
10. **🤖 AI & Premium** - Längst ner (ej säljdrivet överst)
11. **⭐ Premium Banner** - Endast för gratisanvändare

**Borttaget/förenklat:**
- Duplicerade snabbåtgärder
- Insights-karusell (för komplex)
- Community-förhandsgranskning (tog fokus)
- All-time statistik-kort (onödigt)
- Data limits banner (störande)

#### 📋 Dagens Sysslor UX-fix ✅ (BUGGFIX)
- Tog bort automatisk popup vid appstart
- Kortet "Dagens sysslor" finns på startsidan och öppnar modalen när användaren klickar på det
- Tog bort toggle för "Visa automatiskt vid start" eftersom den inte längre behövs

#### 🔐 Admin & Auth Fixar ✅ (BUGGFIX - Session 7b)
- **Admin-panel**: Lagt till fallback-färger för att förhindra svart skärm
- **Admin-knapp i settings**: Döljs nu för icke-admins (auth headers tillagda)
- **Settings-sidan**: `getAuthHeaders()` tillagd för alla API-anrop
- **Premium-status**: Sparas nu till AsyncStorage vid appstart för att överleva omstarter
- **AI-modaler**: Lagt till fallback-färger för text och bakgrund

#### 🌾 Lantligt Tema ✅ (NY FUNKTION)
- **themeStore.ts**: Ny `ruralTheme` med varma, jordnära färger
  - Bakgrund: #F5F0E6 (varm havremjölk)
  - Text: #3D2E1C (mörk brun jord)
  - Accent: #7B6B3C (ockra/jord)
  - Borders: #D4C4A8 (halm/vete)
- **settings.tsx**: 4 tema-val nu tillgängliga: Ljust, Mörkt, Lantligt, System
- Leaf-ikon för lantligt tema

#### 🌤️ Vädermodal ✅ (BUGGFIX)
- Väderikonen var tidigare inte klickbar
- Ny komplett vädermodal implementerad med:
  - Temperatur och väderikon
  - Luftfuktighet och vindhastighet
  - Premium-tips för betalande användare
  - Uppgraderings-prompt för gratis-användare

#### 🔐 Autentiserings-fix ✅ (KRITISK BUGGFIX)
- **index.tsx**: Alla API-anrop (`loadCommunityPosts`, `loadDailyChores`, `loadWeather`, etc.) använder nu `getAuthHeaders()`
- **authStore.ts**: `verifyRegistration` sparar nu `session_token` korrekt
- Dessa fixar löser "vita modaler" för AI-funktioner och premium-insikter

#### 🛡️ Admin-panel fix ✅ (BUGGFIX)
- **admin.tsx**: SafeAreaView tillagd för alla return-statements
- Förhindrar vit skärm på iOS-enheter
- Bättre loading-indikator med "Kontrollerar admin-behörighet..."

#### 📊 Community-text förbättring ✅ (UX-FIX)
- Ändrade förvirrande "Du slår" till "av användare" för percentil-visning
- Mer intuitivt för användaren att förstå sin ranking

## Nyligen Slutförda Uppgifter (2025-02-28)

### Session 6: Slutförande av UX-plan + Nya Funktioner (2025-02-28)

#### 🏆 Veckans Bästa Höna ✅ (NY FUNKTION)
- **Backend**: `/api/statistics/summary` returnerar nu `best_hen_week` med:
  - `id`: Hönans ID
  - `name`: Hönans namn
  - `eggs_this_week`: Antal ägg senaste 7 dagarna
- **Frontend**: Guldigt kort på startsidan med trophy-ikon
- Klickbart kort navigerar till Höns-fliken
- Visas endast när data finns (kräver ägg med hen_id)

#### 👥 Community Comparison ✅ (NY FUNKTION)
- **Backend**: `/api/statistics/summary` returnerar nu `community_comparison` med:
  - `your_eggs_this_month`: Dina ägg denna månad
  - `community_avg`: Genomsnitt för alla användare
  - `total_users`: Antal användare totalt
  - `your_rank`: Din placering (1 = bäst)
  - `percentile`: Vilken procent du tillhör
  - `vs_avg_percent`: Hur mycket bättre/sämre än snittet
- **Frontend**: "Jämfört med andra"-kort på startsidan
- Visas endast när `total_users > 1`

#### 🎁 Gratis AI-rapport (1/vecka) ✅ (NY FUNKTION)
- **Backend**: `/api/ai/daily-report` ändrad
- Icke-premium användare får 1 gratis AI-rapport per vecka
- `free_ai_usage` collection spårar användning
- Returnerar `free_report_available` och `days_until_free`
- Premium-användare får obegränsad tillgång

#### 🔧 i18n SSR-fix ✅
- Fixade `window is not defined` fel på webben
- AsyncStorage-initiering skippas i SSR-miljö
- `authStore.ts` uppdaterad med window-check

### Session 5: Omfattande UX-förbättringar (2025-02-28)

#### 🥚 One-Tap Äggregistrering ✅
- **Ägg idag-kortet** är nu interaktivt med Pressable
- **Kort tryck** = registrerar +1 ägg direkt med pop-animation och haptic feedback
- **Långt tryck** = öppnar modal för fler alternativ
- **TAP +1 badge** visar användaren hur funktionen fungerar
- **Undo-toast** visas i 5 sekunder efter registrering med möjlighet att ångra

#### 🔥 Streak-räknare ✅
- Beräknas i backend `/api/statistics/summary`
- Visar antal dagar i rad med äggregistrering
- Visas som badge på äggkortet: "🔥 X dagar"

#### 📊 Förbättrade Statistik-grafer ✅
- Bättre bar heights (synliga även för små värden)
- **Trend-pilar** (↑ ↓) jämför med föregående dag
- **"Bästa dagen"-badge** med trophy-ikon
- Förbättrad styling med bakgrundsfärg på bars

#### 📋 Förbättrad Ägglogg (eggs.tsx) ✅
- **7/30-dagars filter** med toggle-knappar
- **Trend-indikator** på varje dag (↑ ↓)
- **Swipe-to-edit/delete** på varje post
- Förkortade veckodagsformat (t.ex. "Fre 27 feb")
- Svep-tips: "← Svep för att redigera"

#### 🐔 Förbättrad Höns UX (hens.tsx) ✅
- **Mjukare varningsfärg** för "Ej sedd på länge" (ljusare orange)
- **Ny CTA-text**: "Markera som sedd idag" (istället för bara "Sedd")
- **Produktivitets-indikator** (grön/gul/röd prick) baserad på status

#### 🏥 Hen Health Score (0-100) ✅ (NY FUNKTION)
- **Backend endpoints**:
  - `GET /api/hens/{hen_id}/health-score` - individuell höna
  - `GET /api/hens/health-scores` - alla aktiva hönor
- **Beräkningsmodell**:
  - Äggproduktion (30p max)
  - Aktivitet/Senast sedd (25p max)
  - Hälsohistorik (25p max)
  - Konsistens (20p max)
- **Status-nivåer**: Utmärkt (80+), Bra (60+), Medelbra (40+), Sämre (20+), Kritiskt (<20)
- **Frontend**: Badge på varje hönkort + detaljerad modal vid klick

#### 💰 Ekonomi-insikter (finance.tsx) ✅
- **Intäkt per ägg** (genomsnittlig försäljning per ägg)
- **Break-even pris per ägg** (kostnader / sålda ägg)
- **Största kostnadskategori** denna månad
- **Nettoresultat** med färgkodning (grön för vinst, röd för förlust)
- Vinst/Förlust-badge med trend-ikon

### Tidigare sessioner (2025-02-27)

#### Väder-API Bytt till Open-Meteo ✅
- **Problem:** OpenWeatherMap krävde API-nyckel och användaren ville ha gratis alternativ
- **Lösning:** Bytte till Open-Meteo (helt gratis, ingen nyckel krävs)
- Konverterar vindhastighet från km/h till m/s
- WMO weather codes mappade till svenska beskrivningar
- Top-level fields för frontend: `temperature`, `humidity`, `wind_speed`, `description`

#### Tab-navigation Omorganiserad ✅
- **Premium-flik flyttad FÖRST** i navigationsbaren (användarens önskemål)
- **Community-flik dold från navbar** (`href: null`) - tillgänglig via Quick Actions istället
- Ordning: Premium → Hem → Ägg → Hönor → Ekonomi → Statistik → Inställningar

#### Community Quick Action på Hemskärmen ✅
- Ny Community-knapp (grön) i Quick Actions-sektionen
- Navigerar till `/(tabs)/community`
- Ger snabbare åtkomst utan att fylla navbar

#### Utökad Insikter-sektion ✅
- Nytt: **Ägg/dag snitt** (average_eggs_per_day)
- Nytt: **Värpning idag** (% av hönor som värpt)
- Nytt: **Resultat denna månad** (netto med färgkodning grön/röd)
- Befintligt: Kostnad/ägg, Toppvärpare, Produktivitet

#### Premium Store Error Handling ✅
- **Problem:** Vit/svart skärm efter premium-köp i Expo Go
- **Lösning:** Förbättrad error handling i `premiumStore.ts`:
  - try/catch runt RevenueCat listener
  - Safe access med optional chaining (`?.`)
  - Backend sync-fel är non-blocking (loggas men kraschar inte appen)
  - Loading state sätts till false även vid fel

#### Väder-tips Rendering Fix ✅
- Tips kan vara både string eller objekt med `message`
- Nu hanteras båda formaten korrekt i UI

### Session 4: Subscription & Chores Features (2025-02-27 23:30)

#### Admin Subscription List Fix ✅
- **Problem:** Prenumeranter visades inte i admin-panelen
- **Lösning:** Uppdaterad `/api/admin/subscriptions` endpoint:
  - Hämtar alla subscriptions (inte bara is_active)
  - Kontrollerar `expires_at` för att avgöra faktiskt aktiv status
  - Stöder både `user_id` och `id` fält för användare
  - Visar `purchase_source` i listan

#### Trial Expiry Warning System ✅
- **Backend:** `/api/premium/status` returnerar nu:
  - `is_trial`: Boolean om det är trial
  - `days_remaining`: Antal dagar kvar
  - `trial_expiry_warning`: `three_days`, `two_days`, `one_day`, `last_day`
- **Frontend:** Popup-modal som visar varning:
  - Visas automatiskt vid 3, 2, 1 dag eller sista dagen
  - Tydlig design med röd varning sista dagen
  - "Uppgradera nu" och "Påminn mig senare" knappar
  - Kan dismissas för session

#### "Dagens Sysslor" Feature ✅ (NYT)
- **Backend:** Nya endpoints:
  - `GET /api/daily-chores`: Hämtar dagens sysslor
  - `POST /api/daily-chores/{id}/complete`: Markera som klar
  - `DELETE /api/daily-chores/{id}/complete`: Ta bort markering
- **Sysslor inkluderar:**
  - Dagliga: Vattenkontroll, Ägginsamling, Foderkontroll, Hälsokoll
  - Veckovis (söndag): Rengör reden, Byt ströbädd, Kolla sittpinnar
  - Månadsvis (1:a): Kvalsterkontroll, Rovdjursskydd
  - Säsongsspecifika: Vintervatten, Kvällsmål, Belysning, Skuggkontroll
- **Frontend:** 
  - Ny "Sysslor"-knapp i Quick Actions (cyan färg)
  - Modal med alla dagens sysslor
  - Checka av sysslor genom att trycka
  
#### Dagens Sysslor - Frivillig Auto-popup ✅
- **Första gången:** Modal visas alltid (tvingande)
- **Därefter:** Toggle för "Visa automatiskt vid start"
- **Push-notiser:** Schemaläggs kl 07:30 varje dag (oavsett popup-inställning)
- Meddelande: "🐔 God morgon från Hönsgården! Dags att kolla in dagens sysslor."
- Progress-indikator visar hur många sysslor som är klara
- Sparat i AsyncStorage: `chores_seen_first_time`, `chores_auto_popup_disabled`

#### Smart Notifications System ✅ (NYT)
- **Backend:** `/api/notifications/smart-check` endpoint som analyserar användardata
- **Triggers efter äggregistrering:**
  - 🎊 **Nytt rekord** - När användaren slår sitt personliga rekord
  - ⭐ **Perfekt dag** - När alla hönor värpt
  - 🎉 **Första ägget** - För nya användare
  - 🏆 **Milstolpar** - 10, 50, 100, 250, 500, 1000+ ägg
  - 📈 **Produktion ökar** - +15% eller mer jämfört med förra veckan
  - 📉 **Produktion minskar** - -20% eller mer (varning)
  - 🌟 **Uppmuntran** - Slumpmässig positiv feedback (5% chans)
- **Spårar:** Äggrekord, veckosnitt, totala ägg, produktionstrender
- **Integrerat i:** `hens.tsx` - anropas efter varje äggregistrering

### Batch 2: UI & Feature Improvements (2025-02-27)

#### Admin Panel Förbättringar ✅
- **Multi-select användare**: Kan nu markera flera användare och radera på en gång
- **Sök på prenumerationer**: Nytt sökfält för att filtrera prenumerationer
- **"Logga in på webben"**: Borttagen från settings (som begärt)

#### Premium-priser i Modal ✅
- `PremiumGateModal` hämtar nu faktiska priser från RevenueCat
- Visar `{pris}/månad` och `{pris}/år` istället för "Flexibelt"/"Bäst värde"
- "sju dagars" istället för "7 dagars" (svensk grammatik)

#### Spara-knapp för hönsgårdsnamn ✅
- Explicit "Spara"-knapp bredvid textfältet för hönsgårdsnamnet
- Sparar även vid onBlur (fokus lämnar fältet)

#### Feedback-modal fix ✅
- KeyboardAvoidingView tillagd för iOS/Android
- ScrollView för att kunna se textfältet när tangentbordet är uppe

#### Gratis Agda-teaser för Free Users ✅
- Ny modal `showFreeAgdaTeaser` istället för direkt premium gate
- Visar ett gratis tips från `/api/ai/free-tip`
- Lockar användaren med "Med Premium får du: Obegränsade frågor, dagliga tips, prognos"
- "Uppgradera till Premium" eller "Kanske senare" knappar

#### Affiliate/Produktrekommendations-struktur ✅
- **Ny endpoint**: `GET /api/recommendations`
- Analyserar användarens äggproduktion och säsong
- Returnerar relevanta produkter (foder, belysning, tillskott, etc.)
- Förberedd för Adtraction/bonden.se-integration
- Trigger conditions: `low_eggs`, `winter`, `summer`, `cold`, `parasites`, etc.

### Agdas Kunskapsbas - Massiv Utökning ✅
Komplett ny kunskapsbas med:
- **Hälsa & Sjukdomar**: Frisk vs sjuk höna, mykoplasma, newcastle, mareks, koccidios, salmonella, IB, bumblefoot, peritonit, kvalster, löss, maskar
- **Zoonoser**: Sjukdomar som kan smitta människa
- **Behandling**: Vad man kan göra hemma vs veterinär, isolering
- **Värpning**: Varför höns värper dåligt (ljus, ruggning, ålder, stress, näring)
- **Foder & Näring**: Basfoder, tillskott, GIFTIGA saker
- **Akuta situationer**: Äggstopp, predatorangrepp, blodig pickning, värmeslag
- **Tuppar**: Aggression, hälsa, sporrar, kråkande
- **Säsongskalender**: Januari-December tips

### Native Auth Fix ✅ (KRITISKT - 2025-02-27)
**Problem:** Användare loggades ut direkt efter inloggning i Expo Go (native app).

**Lösning:**
1. **Token-hantering i authStore.ts:**
   - Token sätts SYNKRONT i minnet innan async AsyncStorage-operationer
   - Ny `getSessionToken()` export för direkt minnesåtkomst
   - Grace period ökad till 10 sekunder
   - `loginInProgress` flagga hanteras via timeout (inte manuellt)

2. **apiFetch() i appStore.ts/premiumStore.ts:**
   - Använder `new Headers()` för robust header-hantering
   - Hämtar token direkt via `getSessionToken()` (inte via `getAuthHeaders()`)
   - Consecutive 401 counter: logout sker först efter 3 på varandra följande 401-fel
   - Förbättrad logging för debugging

3. **Backend get_current_user():**
   - Förbättrad logging vid 401-fel (visar alla headers, host, origin)
   - Loggar framgångsrik auth med token-källa (cookie/header)

**Verifierat:** Alla 11 backend-tester passerade (test_native_auth_bearer_token.py)

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
- **Knapp i Settings:** "Bjud in vänner – få sju dagars Premium!"

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
- [x] **Native Auth Fix** - Användare loggades ut direkt (FIXAT 2025-02-27)
- [x] Användaren har konfigurerat production environment variables i Emergent
- [x] **Väder-API bytt till Open-Meteo** (FIXAT 2025-02-27) - Gratis, ingen nyckel
- [x] **Bottom Nav förenklad** (FIXAT 2025-02-28) - 6 tabs: Hem, Ägg, Hönor, Ekonomi, Statistik, Inställningar
- [x] **Avatar-ikon för inställningar** (FIXAT 2025-02-28) - Google-style i header
- [x] **Premium → Statistik i nav** (FIXAT 2025-02-28) - Premium dold, Statistik synlig
- [x] **Utökade Insikter** (FIXAT 2025-02-28) - best_day, feed_cost_per_egg, profit_per_egg
- [x] **Premium Insikter med Blur** (FIXAT 2025-02-28) - Låsta kort med "Exempel" label
- [x] **Admin: Premium-hantering** (FIXAT 2025-02-28) - +7d, +30d, +1år, lifetime, ta bort
- [x] **AI Advisor fix** (FIXAT 2025-02-28) - Hanterar body parameter korrekt
- [x] **Scroll-indikator snabbåtgärder** (FIXAT 2025-02-28) - "Svep →" visas
- [x] **Dölj "Anpassa funktioner"** (FIXAT 2025-02-28) - Endast för gratisanvändare
- [x] **Onboarding uppdaterad** (FIXAT 2025-02-28) - 6 slides med Community, Sysslor, AI
- [x] **Tangentbord-fix hönor** (FIXAT 2025-02-28) - ScrollView + KeyboardAvoidingView
- [x] **AI-rapporter credentials** (FIXAT 2025-02-28) - credentials: include
- [x] **Community refresh** (FIXAT 2025-02-28) - useFocusEffect laddar om poster
- [ ] Verifiera deployment fungerar med rätt databas (väntar på användarbekräftelse)

### P1 - Viktigt
- [ ] DNS-setup för honsgarden.se
- [ ] Ny EAS Build med alla fixar
- [ ] Testa referral-flödet end-to-end i native app

### P2 - Backlog
- [ ] Fixa i18n-kraschen på webb
- [ ] Affiliate-produktlänkar (Adtraction integration när feed är klar)
- [ ] Refaktorera backend/server.py till mindre router-filer
- [ ] Sponsored posts i community-flödet (backend klar, frontend delvis klar)

## Testanvändare
```
Email: nativetest@test.com
Password: test123456
User ID: test-native-user
```
