# Hönsgården - Product Requirements Document

## Landningssida (Login.tsx) - KOMPLETT BESKRIVNING

### **Hero-sektion:**
- **Bakgrundsbild**: Kvinna som tar hand om höns (Pexels)
- **Logo**: SVG med stiliserad höna + ägg (orange/gul färgschema)
- **Rubrik**: "Hönsgården" (Playfair Display, 56px, vit, bold)
- **Tagline**: "Din digitala assistent för din hönsgård"
- **Undertitel**: "Håll koll på dina hönor, ägg och ekonomi – på ett enkelt sätt."
- **CTA-knapp**: "Kom igång gratis med Google" (vit med Google-logga)
- **Typsnitt Web**: Playfair Display (rubriker), Inter (brödtext)
- **Typsnitt Mobil**: Playfair Display + Inter (via expo-font)

### **Features-sektion (6 kort i grid):**
1. 🥚 Äggdagbok - Registrera ägg snabbt och enkelt
2. 🐔 Hönsprofiler - Håll koll på varje höna
3. 📊 Statistik & Insikter - Se trender och analyser
4. 💰 Ekonomi - Spåra kostnader och intäkter
5. 🩺 Hälsologg - Dokumentera hälsoproblem
6. 🏠 Flockhantering - Organisera flera flockar

### **Pristabell (3 kort):**

| **GRATIS (0 kr)** | **PREMIUM MÅNADSVIS (19 kr/mån)** | **PREMIUM ÅRSVIS (149 kr/år)** |
|-------------------|-----------------------------------|--------------------------------|
| ✓ 1 flock | ✓ Allt i Gratis | ✓ Allt i Gratis |
| ✓ 30 dagars historik | ✓ Obegränsad historik | ✓ Obegränsad historik |
| ✓ Grundläggande statistik | ✓ Obegränsade flockar | ✓ Obegränsade flockar |
| ✓ Ägg- och ekonomilogg | ✓ **Hälsologg** | ✓ **Hälsologg** |
| ✓ Äggproduktionsgraf | ✓ AI-genererad dagsrapport | ✓ AI-genererad dagsrapport |
| ✓ Ekonomigraf | ✓ Äggprognos 7 dagar | ✓ Äggprognos 7 dagar |
| | ✓ Avvikelsedetektion | ✓ Avvikelsedetektion |
| | ✓ Ekonomijämförelse m/m | ✓ Ekonomijämförelse m/m |
| | ✓ Kläckningsmodul | ✓ Kläckningsmodul |
| | ✓ Anpassningsbara funktioner | ✓ Anpassningsbara funktioner |
| | **Flexibelt, avsluta när som helst** | **Badge: "Bäst värde"** |
| | | **12,40 kr/mån – spara 79 kr!** |

### **Final CTA:**
- Text: "Gå med andra hönsgårdsägare som redan använder Hönsgården." (borttaget "tusentals")

### **Hälsologg - Premium-funktion:**
- Låst för gratisanvändare i både mobilapp och webbapp
- Visar 🔒 ikon och uppmaning att uppgradera

### **Cookie-banner (lagkrav):**
- Text: "Vi använder cookies för att förbättra din upplevelse. Genom att fortsätta godkänner du vår användning av cookies."
- Knappar: "Endast nödvändiga" | "Godkänn alla"
- Valet sparas i localStorage så bannern inte visas igen

### **Footer:**
- © 2026 Hönsgården (uppdaterat från 2024)

### **Övrigt på landningssidan:**
- Final CTA med kyckling-bild
- Footer med "Kontakta oss" och "Skicka förslag"
- Flytande kontaktknapp (💬)

---

## Feature-parity (Webb vs Mobil)

| Feature | Mobil | Webb |
|---------|-------|------|
| Dashboard | ✅ | ✅ |
| Äggregistrering (+1,+2,+3,+5,+10) | ✅ | ✅ |
| Ägg-sida | ✅ | ✅ |
| Hönor-sida | ✅ | ✅ |
| Ekonomi/Finance | ✅ | ✅ |
| Statistik med grafer | ✅ | ✅ |
| Inställningar | ✅ | ✅ |
| **Anpassa funktioner** | ✅ | ✅ (FIXAT) |
| **Foderhantering (Etapp 4)** | ✅ | ✅ |
| **Kläckning** | ✅ | ✅ (FIXAT) |
| **Dela statistik** | ✅ | ✅ (FIXAT) |
| **Quick Actions** | ✅ | ✅ (FIXAT) |
| **Grafer på Statistik** | ✅ | ✅ (NYTT) |
| Premium-betalning | ✅ | ✅ |

---

## Grafer på Statistik-sidan

### **GRATIS:**
1. **Äggproduktion över tid** (Linjegraf)
   - Filter: Dag / Vecka / Månad
   - Visar antal ägg per tidsperiod
   - Grön linje (#4ade80)

2. **Ekonomigraf** (Stapeldiagram)
   - Visar intäkter vs kostnader per månad
   - Gröna staplar = intäkter
   - Röda staplar = kostnader

### **PREMIUM (låsta för gratis):**
3. **Förväntad vs faktisk produktion** (Stapeldiagram)
   - Två linjer: Förväntat (lila) vs Faktiskt (grön)
   - Baserat på ras och ålder
   - Veckovis visning

4. **Per-höna-produktion** (Horisontellt stapeldiagram)
   - Varje höna = en stapel
   - Stjärnan i flocken markeras gul
   - Sorterat efter produktion

**Låst-kort för gratis-användare:**
- Visar suddigt innehåll (blur 8px)
- Låssymbol 🔒
- Text: "Uppgradera till Premium för att se denna graf"
- Knapp: "Uppgradera"

---

## API Endpoints (Komplett)

### Core
- `GET/POST /api/eggs` - Äggregistreringar
- `GET/POST /api/hens` - Hönor
- `GET/POST /api/flocks` - Flockar
- `GET/POST /api/transactions` - Ekonomitransaktioner

### Statistik
- `GET /api/statistics/today` - Dagens statistik
- `GET /api/statistics/summary` - Månads/total sammanfattning
- `GET /api/statistics/month/{year}/{month}` - Månadsstatistik med daglig breakdown
- `GET /api/insights` - Insikter (kostnad/ägg, toppvärpare, produktivitet)

### Feed Management (Etapp 4)
- `GET/POST /api/feed` - Foderregistreringar
- `DELETE /api/feed/{id}` - Ta bort
- `GET /api/feed/inventory` - Lagerstatus + varningar
- `PUT /api/feed/inventory/{type}` - Uppdatera trösklar
- `GET /api/feed/statistics?days=30` - Foderstatistik

### Hatching (Kläckning)
- `GET/POST /api/hatching` - Kläckningar
- `POST /api/hatching/{id}/complete` - Avsluta kläckning
- `DELETE /api/hatching/{id}` - Ta bort

### Premium/Account
- `GET /api/account/data-limits` - Gömd data för gratis
- `GET /api/premium/status` - Premiumstatus
- `GET/PUT /api/feature-preferences` - Anpassningsbara funktioner

---

## Completed Features (February 2026)

### Session 1 - P0/P1
- [x] Fix vit skärm på webappen (Vite base path)
- [x] Förena äggregistrerings-UI (+1,+2,+3,+5,+10 + fritext + höna-väljare)
- [x] Feature toggles credentials-bug
- [x] Insikter-sektion visuell förbättring
- [x] Data holdback Premium-funktion (30 dagar för gratis)

### Session 2 - Typsnitt & Etapp 4
- [x] Typsnitt i mobilappen (Playfair Display + Inter)
- [x] Etapp 4: Foderhantering (båda plattformar)
- [x] Dela statistik-funktion
- [x] Quick Actions på Dashboard

### Session 3 - Feature Parity & Grafer
- [x] Uppdatera pristabell (30 dagar, inte 90)
- [x] Anpassa funktioner på webb (Settings)
- [x] Hatching-modul på webb
- [x] Dela statistik på webb
- [x] Quick Actions på webb Dashboard
- [x] Insikter scroll-indikator (← svep →)
- [x] Grafer på Statistik-sidan:
  - Äggproduktion över tid (GRATIS)
  - Ekonomigraf (GRATIS)
  - Förväntad vs faktisk (PREMIUM)
  - Per-höna-graf (PREMIUM)

---

## Teknisk Stack
- **Backend**: FastAPI (Python), MongoDB
- **Frontend Web**: React, Vite, TypeScript, Recharts
- **Frontend Mobile**: React Native, Expo, expo-font
- **Payments**: Stripe
- **Auth**: Google OAuth2
- **Fonts**: Playfair Display, Inter (Google Fonts)

### Session 4 - P0 Bug Fixes (February 24, 2026)
- [x] Valutafix mobilapp: Betalväggen visar nu SEK (19 kr, 149 kr) istället för USD
- [x] "Anpassa funktioner" på webb: Fixat nyckelnamn (preferences.show_flock_management)
- [x] Tillbaka-knapp på Hatching-modulen
- [x] Grafer verifierade - fungerar med recharts

### Session 5 - Premium-begränsningar (February 24, 2026)
- [x] Backend: Hälsologg API kräver nu Premium (POST returnerar 403, GET returnerar tom array)
- [x] Backend: Flock-begränsning (max 1 för gratis) fungerar
- [x] Backend: Kläckningsmodul kräver Premium (403 för gratis)
- [x] Backend: Feature-preferences kräver Premium för anpassning
- [x] Webb Frontend: Hälsologg-knapp visar låst tillstånd för gratisanvändare
- [x] Webb Frontend: Flock-sparning visar premium-popup vid 403

### Session 6 - Demo-data & Feature Parity (February 24, 2026)
- [x] Statistikgrafer: Demo-data visas för nya användare utan äggdata
- [x] Demo-data banner: "Exempeldata visas - Börja logga ägg för att se din egen statistik!"
- [x] Ekonomigraf: Ändrat från BarChart till PieChart för bättre visualisering
- [x] Feature parity audit: Webb och mobil har paritet i kärnfunktioner
- [x] Premium grafer: "Expected vs Actual" och "Per-Hen" låsta med blur för gratisanvändare

### Session 7 - Foderhantering Premium (February 24, 2026)
- [x] Backend: Feed API kräver nu Premium (POST returnerar 403, GET returnerar tom array)
- [x] Mobil Frontend: Feed-skärmen visar premium-lås för gratisanvändare
- [x] Webb Frontend: Feed-sidan visar premium-lås för gratisanvändare

### Session 8 - AI-funktioner & Blurrad Premium (February 24, 2026)
- [x] Backend: AI Daily Report endpoint (/api/ai/daily-report) - Premium only, blurred preview for free
- [x] Backend: Egg Forecast endpoint (/api/ai/egg-forecast) - Premium only, blurred preview for free
- [x] Mobil Dashboard: AI-sektion med blurrade kort för gratisanvändare + "Lås upp" knappar
- [x] Webb Dashboard: AI-sektion med blurrade kort för gratisanvändare + "Lås upp" knappar
- [x] Integration: emergentintegrations + OpenAI GPT-4o för AI-rapporter

---

## Komplett Premium-funktionslista
| Funktion | Backend | Webb | Mobil |
|----------|---------|------|-------|
| Obegränsade flockar | ✅ | ✅ | ✅ |
| Hälsologg | ✅ | ✅ | ✅ |
| Kläckningsmodul | ✅ | ✅ | ✅ |
| Anpassa funktioner | ✅ | ✅ | ✅ |
| Foderhantering | ✅ | ✅ | ✅ |
| Obegränsad historik | ✅ | ✅ | ✅ |

---

## P2 - Future/Backlog
- [ ] Push-notiser för kläckning/hälsokontroller
- [ ] Etapp 5 (borttagen från plan)
