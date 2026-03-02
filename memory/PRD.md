# Hönsgården - Product Requirements Document

## Projektöversikt
Hönsgården är en komplett hönsgårdshanteringsapp för iOS, Android och webb. Appen hjälper användare att spåra äggproduktion, hantera hönor och tuppar, få AI-drivna insikter och prenumerera på premium-funktioner.

## Nyligen Slutförda Uppgifter (2026-03-02)

### Session 17: P0 Fixlista - 6 buggar fixade (2026-03-02)

#### ✅ 1) Premium i ExpoGo - Fallback till backend
- **Problem:** RevenueCat returnerade false i ExpoGo -> isPremium=false
- **Lösning:** Om RevenueCat misslyckas, kollar vi backend `/api/premium/status`
- **Fil:** `frontend/src/store/premiumStore.ts`

#### ✅ 2) Dubbel header på Home - Borttagen
- **Problem:** Både SECTION 1 och CompactDashboard visade header
- **Lösning:** Tog bort SECTION 1: HEADER helt
- **Fil:** `frontend/app/(tabs)/index.tsx`

#### ✅ 3) "20 totalt"-kort borttaget
- **Problem:** PROGRESSION DISPLAY visades med onödig info
- **Lösning:** Tog bort hela sektionen + milestone-meddelanden
- **Fil:** `frontend/app/(tabs)/index.tsx`

#### ✅ 4) Produktivitet flyttad till toppraden
- **Problem:** Produktivitet visades som separat stort kort
- **Lösning:** Flyttade till stat-strip, tog bort dubblett
- **Filer:** `frontend/src/components/CompactDashboard.tsx`, `frontend/app/(tabs)/index.tsx`

#### ✅ 5) Admin premium grant fixad
- **Problem:** Admin.tsx skickade query params, backend väntade JSON body
- **Lösning:** Ändrade fetch till JSON body + error handling
- **Fil:** `honsgarden-web/frontend/src/pages/Admin.tsx`

#### ✅ 6) Stripe checkout verifierad
- **Status:** FUNGERAR! Backend returnerar 200 + checkout URL
- **Logg:** `POST /api/checkout/create HTTP/1.1 200 OK`

### Session 16: Statistik-fix + Tema-sektion borttagen + Svensk Microcopy (2026-03-02)

#### ✅ Statistik-bugg fixad (P0)
- **Problem:** avg_eggs beräknades som total_eggs / days_with_eggs (fel!)
- **Lösning:** avg_eggs_per_day = total_eggs / dagar_i_månaden
- **Ändringar:**
  - `/api/statistics/month/{year}/{month}` - använder nu dagar_i_månaden
  - `/api/statistics/year/{year}` - varje månad har korrekt avg_eggs_per_day
  - `daily_breakdown` innehåller nu ALLA dagar i månaden (även dagar med 0 ägg)

#### ✅ Tema-sektion borttagen från inställningar (P0)
- **Problem:** "Utseende" / "Lantligt tema" sektionen fanns fortfarande i settings.tsx
- **Lösning:** Sektionen är nu helt borttagen
- **Ändringar:**
  - `frontend/app/(tabs)/settings.tsx` - Tagit bort hela Theme Section

#### ✅ Svensk microcopy implementerad (P0)
- **Problem:** Texter var inte enhetliga eller tillräckligt varma
- **Lösning:** Centraliserad microcopy-fil med alla svenska texter
- **Ändringar:**
  - Ny fil: `frontend/src/constants/microcopy.ts`
  - AI-kort använder nu microcopy-texter
  - Snälla feltexter för alla scenarios (timeout, nätverksfel, etc.)

#### Ändrade filer:
- `backend/server.py` (statistik avg_eggs_per_day fix)
- `frontend/app/(tabs)/settings.tsx` (borttagen tema-sektion)
- `frontend/app/(tabs)/index.tsx` (använder MICROCOPY)
- `frontend/src/constants/microcopy.ts` (NY FIL)

#### Done criteria ✅
- [x] avg_eggs_per_day = total_eggs / dagar_i_månaden
- [x] daily_breakdown visar alla dagar i månaden
- [x] Tema-sektion borttagen från inställningar
- [x] AI-kort använder microcopy-texter
- [x] Snälla feltexter implementerade

---

### Session 15: P0 UI/AI Parity Fix (2026-03-02)

#### ✅ Backend AI-stabilisering (P0)
- **Problem:** AI-funktioner kraschade eller hängde sig
- **Lösning:** Robusta endpoints med timeout och fallback
- **Ändringar:**
  - Ny `/api/ai/health` endpoint - returnerar AI-tjänstens status
  - Alla AI-endpoints har nu 15s timeout
  - Standardiserade JSON-svar: `{ok: true/false, ...}`
  - Fallback-svar vid timeout eller fel (aldrig 500-error)
  - Graceful hantering av låg/ingen data i äggprognos
  - Detaljerad loggning med request_id, user_id, duration_ms

#### ✅ Mobilapp UI-paritet med webb (P0)
- **Problem:** Mobilappen hade gammal layout med "Snabbåtgärder" grid
- **Lösning:** Byggt om hem-skärmen för att matcha webbappen
- **Ändringar:**
  - Borttagen "Snabbåtgärder"-sektion (Foder/Kläckning/Community/Dela)
  - Ny 2x2 AI-kort grid: Fråga Agda, Dagens tips, Dagsrapport, 7-dagars prognos
  - Grön "Registrera ägg" CTA matchar webb exakt
  - Stat-strip: ägg igår, hönor, veckan, kr/mån

#### ✅ Community-flik borttagen (P0)
- **Problem:** Community-flik fanns fortfarande i navigation
- **Lösning:** Tab dold och fil redirectar till hem
- **Ändringar:**
  - `_layout.tsx` - Community tab med `href: null` för att dölja
  - `community.tsx` - Redirectar till hem istället för att visa sidan

#### ✅ Tema låst till "lantligt" (P0)
- **Problem:** Tema-switcher kunde störa konsistent design
- **Lösning:** Tema är hårdkodat till "rural"
- **Ändringar:**
  - `themeStore.ts` - `setThemeMode()` ignorerar alla val utom 'rural'
  - Inställningssidan visar bara "Lantligt tema" med checkmark (ingen väljare)

#### Ändrade filer:
- `backend/server.py` (AI endpoints med timeout/fallback/health)
- `frontend/app/(tabs)/index.tsx` (2x2 AI-grid, borttagen Snabbåtgärder)
- `frontend/app/(tabs)/_layout.tsx` (Community tab dold)
- `frontend/app/(tabs)/community.tsx` (Redirect till hem)
- `frontend/src/store/themeStore.ts` (Låst till rural)

#### Test-resultat (iteration_25):
- Backend: 100% (12/12 tester passerade)
- Frontend: 100% (alla UI-krav verifierade)

#### Done criteria ✅
- [x] AI Health endpoint returnerar ok: true
- [x] Alla AI-endpoints har timeout och fallback
- [x] Mobilapp-layout matchar webbappen (screenshot "bild 1")
- [x] 2x2 AI-kort grid visas på hem-sidan
- [x] Ingen "Snabbåtgärder"-sektion
- [x] Ingen Community-tab i navigation
- [x] Tema låst till "lantligt"

---

## Nyligen Slutförda Uppgifter (2026-03-01)

### Session 14: Kompakt Dashboard Redesign (2026-03-01)

#### ✅ WebDashboardOverview - Total Redesign
- **Problem:** Dashboard tog för mycket plats (hero-panel som fyllde viewport)
- **Lösning:** Kompakt KPI dashboard högst upp
- **Ändringar:**
  - Tagit bort stor hero-ruta
  - Ny kompakt header (hälsning + titel + datum)
  - KPI-grid: 2 kolumner mobil → 3 tablet → 5 desktop
  - KPI-kort med ikon-box + värde + label
  - Quick actions (Registrera ägg + Lägg till höna)
  - UI-guard för orimliga värden (värpprocent > 100% eller hen_count <= 0 visar "—")

#### ✅ Dashboard.tsx Refaktorering
- Borttagen redundant header (WebDashboardOverview har egen)
- Borttagen stor "Registrera ägg" hero-knapp
- Ny weather-share-row under overview
- Fixat useEffect hook order (var placerad efter conditional return)
- Custom event listener för egg modal kommunikation

#### ✅ CSS Uppdateringar
- WebDashboardOverview.css - helt omskriven för kompakt design
- Dashboard.css - lagt till weather-share-row styling och padding för sektioner
- Responsive breakpoints: 480px, 640px, 768px, 1024px

#### Ändrade filer:
- `honsgarden-web/frontend/src/components/WebDashboardOverview.tsx` (total rewrite)
- `honsgarden-web/frontend/src/components/WebDashboardOverview.css` (total rewrite)
- `honsgarden-web/frontend/src/pages/Dashboard.tsx` (refaktorerad)
- `honsgarden-web/frontend/src/pages/Dashboard.css` (ny styling)

#### Done criteria ✅
- [x] Dashboarden tar inte över viewport (kompakt layout)
- [x] KPI ligger högst upp (5 kort desktop, 3 tablet, 2 mobil)
- [x] Ingen horisontell scroll på mobil
- [x] Snabbknappar under KPI
- [x] Värpprocent visar aldrig orimliga värden (UI guard aktiv)

### Session 13: Webbapp Teknisk Förbättring (2026-03-01)

#### B) ✅ Web Dashboard - Persistent startsida
- **Ny komponent:** `WebDashboardOverview.tsx` + CSS
- **Funktioner:**
  - Tidsbaserad hälsning (God morgon/God förmiddag/God eftermiddag/God kväll)
  - Svenskt datumformat
  - KPI-kort: Ägg igår, Antal hönor, Värpprocent, Denna vecka, Estimerat månadsvärde
- **Integrerad i:** Dashboard.tsx (ej modal, alltid synlig)
- **Responsiv:** 3 kolumner desktop → 2 tablet → 1 mobil

#### C) ✅ Statistik-sidan mobilresponsiv
- Lagt till `overflow-x: hidden` på root
- Cards stacker vertikalt på mobil
- Max-width containers
- Förbättrade breakpoints (768px, 480px, 360px)

#### D) ✅ Stripe Premium checkout verifierad
- API-nyckel fungerar (testad checkout session skapas)
- Webhook endpoint finns (`/api/stripe/webhook`)
- metadata innehåller user_id och plan

#### E) ✅ Avvikelsedetektion implementerad
- Endpoint: `GET /api/hens/productivity-alerts`
- Logik: 14-dagars tröskel
- Räknar avvikelse baserat på rolling average

#### G) ✅ Admin web - förbättrad feature parity
- **Ny sökning:** E-post och namn filter
- **Premium filter:** Alla/Premium/Gratis
- **Grant Premium:** Dropdown med 7d/30d/90d/1år/Livstid val
- **Responsiv:** Mobilanpassad tabell och knappar

#### Ändrade filer:
- `honsgarden-web/frontend/src/components/WebDashboardOverview.tsx` (NY)
- `honsgarden-web/frontend/src/components/WebDashboardOverview.css` (NY)
- `honsgarden-web/frontend/src/pages/Dashboard.tsx` (uppdaterad)
- `honsgarden-web/frontend/src/pages/Statistics.css` (responsivitet)
- `honsgarden-web/frontend/src/pages/Admin.tsx` (sök/filter/grant premium)
- `honsgarden-web/frontend/src/pages/Admin.css` (ny styling)

### Session 12: Daglig Sammanställning Popup (2026-02-28)

#### ✅ Mobilresponsiv design implementerad
- **Dashboard.css**: Komplett responsiv layout för alla skärmstorlekar (768px, 480px, 360px)
  - Stats-grid anpassas för mobil
  - AI-kort staplas på små skärmar
  - Touch-vänliga knappar och tap targets
  - Safe area support för notched phones
  - Landscape-läge optimering
  
- **Layout.css**: Förbättrad mobilnavigation
  - Bottom navigation för mobil
  - Sidebar döljs på små skärmar
  - Touch feedback för interaktioner
  
- **Login.css**: Responsivt inloggningsformulär
  - Anpassade storlekar för mobil
  - Förhindrar iOS zoom på inputs (font-size: 16px)
  - Cookie-banner optimerad för mobil
  
- **Premium.css**: Responsiva priskort
  - Staplade kort på små skärmar
  - Anpassade textstorlekar
  
- **Eggs.css, Hens.css, Settings.css, Statistics.css**: Alla sidor mobiloptimerade

#### Responsiva breakpoints:
- **768px**: Tablet/stor mobil - Sidebar → Bottom nav
- **480px**: Mobil - Enkel kolumnlayout
- **360px**: Liten mobil - Extra kompakt
- **Landscape**: Anpassad för liggande läge

### Session 11: Webbapp Förbättringar (2026-02-28)

#### ✅ Borttagen Google-inloggning
- **Ändring:** Tog bort Google OAuth-inloggningen helt från webbappen
- **Ändrade filer:** `honsgarden-web/frontend/src/pages/Login.tsx`
  - Borttagna: `handleGoogleLogin`, `handleGoogleCallback`, `GOOGLE_AUTH_URL`, `useSearchParams`
  - Borttagna: Alla "Fortsätt med Google"-knappar från welcome, login och register-vyerna
  - Borttagna: "eller"-dividers mellan formulär och Google-knapp

#### ✅ Nya AI-funktioner i webbappen
- **Tillagda:** "Fråga Agda" (AI-rådgivare) och "Dagens tips" till Dashboard
- **Ändrade filer:** `honsgarden-web/frontend/src/pages/Dashboard.tsx`
  - Ny state: `advisorQuestion`, `advisorHistory`, utökad `aiModalType`
  - Ny funktion: `askAgda()` - skickar frågor till `/api/ai/advisor`
  - Utökad `loadAiData()` för att hantera 'advisor' och 'tip' typer
  - Nytt chat-gränssnitt för Fråga Agda i AI-modalen
  - Dagens tips-kort med `/api/ai/daily-tip` endpoint
- **CSS:** Lagt till stilar för chat-interface, tip-card, etc.

#### AI-funktioner nu tillgängliga i webbappen:
1. 🐔 **Fråga Agda** - Chat-baserad AI-rådgivare
2. 💡 **Dagens tips** - Dagligt hönstips  
3. 📋 **Dagsrapport** - AI-genererad sammanfattning
4. 📈 **7-dagars prognos** - Äggproduktionsprognos

### Session 10: Premium UI Null-Fix (2026-02-28)

#### ✅ Bug Fix: "null dagar kvar" i premium-badge
- **Problem:** Premium-badge visade "null dagar kvar" när `days_remaining` var null
- **Lösning - Backend:** Lade till `is_lifetime` flagga i `/api/premium/status` endpoint
- **Lösning - Frontend:** Uppdaterade `TrialBadge.tsx` för att hantera null-värden graciöst
  - Om `daysRemaining === null` → visar "Premium aktiv" istället
  - Om `isLifetime === true` → visar "Livstid" för lifetime-prenumerationer
  - Compact badge visar "Aktiv" istället för antal dagar om null

#### Ändrade filer:
- `backend/server.py`: Lade till `is_lifetime` i premium/status response (3 platser)
- `frontend/src/components/TrialBadge.tsx`: Robust null-hantering i all rendering
- `frontend/src/store/premiumStore.ts`: 
  - Tillagd `isLifetime: boolean` i state
  - Uppdaterad plan-typ för att inkludera 'lifetime' och 'admin_granted'
  - Alla `set()` anrop uppdaterade för att inkludera `isLifetime`

#### API Response Format (/api/premium/status):
```json
{
  "is_premium": true,
  "plan": "lifetime",
  "is_lifetime": true,  // NY FLAGGA
  "days_remaining": 26968,  // eller null om okänt
  "is_trial": false,
  ...
}
```

### Session 9: App Store/Google Play Förberedelser (2026-02-28)

#### ✅ Permissions & Privacy (app.json)
- **Borttaget:** Oanvända kamera-permissions (iOS NSCameraUsageDescription, NSPhotoLibraryUsageDescription, Android CAMERA)
- **Tillagt:** `POST_NOTIFICATIONS` för Android 13+
- **Tillagt:** `buildNumber: "1"` för iOS
- **Tillagt:** `versionCode: 1` för Android

#### ✅ Paywall Förenklad
- Bytte ut komplex plattformsdetektering till enkel: `Platform.OS !== 'web'`
- iOS/Android visar nu alltid RevenueCat native IAP
- Webb visar Stripe-flöde
- Console.log skyddas av `__DEV__`

#### ✅ Debug Logs & Production Readiness
- Alla `console.log` i `_layout.tsx` skyddas nu av `__DEV__`
- Lagt till konfigurationsfel-skärm som visas om EXPO_PUBLIC_BACKEND_URL saknas
- Felskärmen visar tydligt "Konfigurationsfel" + support-meddelande

#### ✅ Admin-route
- Redan skyddad av backend API-kontroll (`/api/admin/check`)
- Knappen visas endast för verifierade admins

### Session 8: Kritiska Buggfixar & UI-uppdateringar (2026-02-28)

#### 🐛 Fixade Kritiska Buggar ✅

**1. Premium-status visas inte efter inloggning - FIXAD**
- Problem: Premium-status hämtades endast vid app-start, inte efter inloggning
- Lösning: Lade till `checkPremiumStatus()` anrop i `_layout.tsx` efter autentisering
- Fil: `frontend/app/_layout.tsx` (rad 92)

**2. Admin-panel visar felskärm - FIXAD**
- Problem: "Modal is not defined" fel i admin.tsx
- Lösning: Importerade `Modal` från react-native
- Fil: `frontend/app/admin.tsx` (rad 14)

**3. Goals API returnerar 404 - FIXAD**
- Problem: `app.include_router(api_router)` låg före endpoint-definitionerna
- Lösning: Flyttade `include_router` till slutet av filen + fixade async/await
- Fil: `backend/server.py` (rad 7830)

**4. Datetime-jämförelsefel i admin subscriptions - FIXAD**
- Problem: Jämförelse mellan naive och timezone-aware datetime
- Lösning: Gör naive datetime timezone-aware innan jämförelse
- Fil: `backend/server.py` (rad 5770)

**5. setChoresAutoPopupEnabled undefined - FIXAD**
- Problem: State-variabel användes utan att deklareras
- Lösning: Lade till useState för `choresAutoPopupEnabled`
- Fil: `frontend/app/(tabs)/index.tsx` (rad 74)

#### 🎨 UI-uppdateringar ✅

**Hemskärmens layout uppdaterad enligt användarens önskemål:**
- **Tre statistik-kort med emojis och färgade ramar**:
  - 🥚 Ägg idag (gul/guld ram) - Klickbar för snabbregistrering
  - 🐔 Höns (röd/brun ram) - Navigerar till höns-fliken
  - 📈 Produktivitet (grön ram) - Navigerar till statistik
- **Totalt ägg och Streak kort** visas överst när data finns
- **Milestone-meddelanden** visas för produktionsmönster

#### 🤖 AI-funktioner verifierade ✅

- **Dagens tips** - Fungerar! Visar dagligt AI-genererat tips från Agda
- **Fråga Agda** - Fungerar! AI-rådgivare med föreslagna frågor och fritt textinput
- **API-endpoints fungerar**: `/api/ai/daily-tip`, `/api/ai/advisor`

#### ✅ Verifierade Funktioner (Testing Agent Iteration 24)
- Login flow: PASS
- Premium status API: PASS
- Admin check API: PASS
- Admin users list: PASS
- Goals GET/SET: PASS
- Home page APIs: PASS
- UI verification: PASS för hem, settings och admin panel

#### 📋 Testdata Skapad
- Admin-konto: admin@test.com / admin123
- Admin-status och lifetime premium tillagd i databas
- ADMIN_EMAILS uppdaterad i backend/.env
- Testägg registrerade för att visa streak och milestone

## Nyligen Slutförda Uppgifter (2025-12-19)

### Session 7: Kritiska Bugfixar + Lantligt Tema (2025-12-19)

#### 💰 ROI-visualisering & Mål-system ✅ (Session 7f)

**ROI-visualisering i Ekonomi:**
- "Om du ökar snittet med 1 ägg/dag → +X kr/mån"
- "Varje extra ägg ger X kr i nettovinst!"
- Visas endast när avgRevenuePerEgg > 0

**Mål-system i Inställningar:**
- Ny sektion "🎯 Mål" i Settings
- Modal för att sätta:
  - Ägg per månad (t.ex. 150 ägg)
  - Vinst-mål (t.ex. 500 kr)
- Sparas i backend via /api/user/goals
- Tips: "Med Premium får du prognos mot dina mål"

**Tekniskt:**
- goalsStore.ts: Hanterar mål-state och API-anrop
- settings.tsx: UI för att visa/redigera mål
- finance.tsx: ROI-visualisering
- server.py: GET/POST /api/user/goals endpoints

#### 🚀 Premium & Retention System ✅ (STOR UPPDATERING - Session 7e)

**Implementerat:**

**1. Trial Badge (TrialBadge.tsx)**
- Visar "Premium aktiv – X dagar kvar"
- Dag 5-6: Visa "Vill du fortsätta få prognoser och optimeringsförslag?"
- Snygg design med varningsfärger vid utlöp

**2. Progression & Streak Display**
- 🥚 Total ägg-räknare på startsidan
- 🔥 Streak-display (dagar i rad)
- Gyllene ram vid 7+ dagars streak

**3. Milestone-meddelanden**
- 10+ ägg: "Nu börjar vi se mönster i din produktion!"
- 30+ ägg: "Du har nog data för trend-analys" (länk till Premium)

**4. Goals Store (goalsStore.ts)**
- Sätt mål: Ägg/månad och vinst-mål
- Progress-beräkning och visualisering
- Backend API: /api/user/goals

**5. Analytics Store (analyticsStore.ts)**
- Spårar: Ägg registrerade, streak, skärmvisningar
- Konverteringstriggers: 30+ ägg, 7 dagars streak, 5+ stats-visningar
- Backend API: /api/analytics/track, /api/analytics/conversion

**6. Premium-priser**
- 19 kr/månad
- 149 kr/år (markerad som "Bäst värde" + "Spara 35%")

**Backend-endpoints:**
- GET/POST /api/user/goals
- GET /api/analytics/user
- POST /api/analytics/track
- POST /api/analytics/conversion

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
