# Hönsgården - Product Requirements Document

## Landningssida (Login.tsx) - KOMPLETT BESKRIVNING

### **Hero-sektion:**
- **Bakgrundsbild**: Kvinna som tar hand om höns (Pexels)
- **Logo**: SVG med stiliserad höna + ägg (orange/gul färgschema)
- **Rubrik**: "Hönsgården" (Playfair Display, 56px, vit, bold)
- **Tagline**: "Din digitala assistent för din hönsgård"
- **Undertitel**: "Håll koll på dina hönor, ägg och ekonomi – på ett enkelt sätt."
- **CTA-knapp**: "Kom igång gratis" (vit bakgrund, grön text)
- **Typsnitt Web**: Playfair Display (rubriker), Inter (brödtext)
- **Typsnitt Mobil**: Playfair Display + Inter (via expo-font)

### **GDPR-compliant Registration (NY - Feb 25, 2026):**
- **Checkbox 1 (obligatorisk)**: "Jag har läst och godkänner användarvillkoren och integritetspolicyn" med klickbar länk
- **Checkbox 2 (valfri)**: "Jag godkänner att Aurora Media AB skickar nyhetsbrev, erbjudanden och produktuppdateringar till min e-postadress"
- **Terms Modal**: Fullständig GDPR-text med alla sektioner (Allmänt, Personuppgifter, GDPR-rättigheter, E-post, Cookies, Säkerhet, Ansvarsbegränsning, Tillämplig lag, Kontakt)
- **Admin-vy**: Visar GDPR-samtycke och Nyhetsbrev-status för varje användare
- **Databaslagring**: accepted_terms, accepted_terms_at, accepted_marketing, accepted_marketing_at

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

### **Cookie-banner (lagkrav):**
- Text: "Vi använder cookies för att förbättra din upplevelse. Genom att fortsätta godkänner du vår användning av cookies."
- Knappar: "Endast nödvändiga" | "Godkänn alla"
- Valet sparas i localStorage så bannern inte visas igen
- **Design**: Diskret banner i hörnet (blockerar inte login-knapp)

---

## API Endpoints (Komplett)

### Core
- `GET/POST /api/eggs` - Äggregistreringar
- `GET/POST /api/hens` - Hönor
- `GET/POST /api/flocks` - Flockar
- `GET/POST /api/transactions` - Ekonomitransaktioner

### Authentication
- `POST /api/auth/session` - Google OAuth exchange
- `POST /api/auth/register` - Email/password registration
- `POST /api/auth/login` - Email/password login
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset with token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Payments (Stripe Subscription)
- `POST /api/checkout/create` - Create Stripe checkout session (mode=subscription)
- `GET /api/checkout/status/{session_id}` - Check payment status
- `POST /api/webhook/stripe` - Stripe webhook handler
- `GET /api/premium/status` - Get premium status
- `POST /api/subscription/cancel` - Cancel subscription

### Statistik
- `GET /api/statistics/today` - Dagens statistik
- `GET /api/statistics/summary` - Månads/total sammanfattning
- `GET /api/statistics/month/{year}/{month}` - Månadsstatistik med daglig breakdown
- `GET /api/insights` - Insikter (kostnad/ägg, toppvärpare, produktivitet)

### Feed Management (Etapp 4 - Premium)
- `GET/POST /api/feed` - Foderregistreringar
- `DELETE /api/feed/{id}` - Ta bort
- `GET /api/feed/inventory` - Lagerstatus + varningar
- `PUT /api/feed/inventory/{type}` - Uppdatera trösklar
- `GET /api/feed/statistics?days=30` - Foderstatistik

### Hatching (Kläckning - Premium)
- `GET/POST /api/hatching` - Kläckningar
- `POST /api/hatching/{id}/complete` - Avsluta kläckning
- `DELETE /api/hatching/{id}` - Ta bort

### AI Features (Premium)
- `GET /api/ai/daily-report` - AI-genererad dagsrapport
- `GET /api/ai/egg-forecast` - 7-dagars äggprognos

---

## Completed Features (February 2026)

### Session 10 - Nya funktioner (February 25, 2026)
- [x] **GDPR-compliant Registration Flow** - Helt ny registreringsprocess
  - Obligatorisk checkbox för användarvillkor & integritetspolicy
  - Valfri checkbox för nyhetsbrev och marknadsföring
  - Full GDPR-text i modal med alla sektioner
  - Admin-vy visar samtyckesstatus per användare
  - Samtycke sparas med tidsstämpel i databasen
  - Välkomstmail skickas vid registrering (via Resend)
- [x] **AI Hönsgårdsrådgivare "Agda"** - Premium-funktion som ger personliga råd baserat på flocken
  - Kunskapsbas med 10+ års erfarenhet av höns
  - Tips om stallmiljö, foder, sjukdomar, tuppar, väder och säsong
  - Endpoint: POST /api/ai/advisor
- [x] **Väderintegration** - Visar väder och ger tips
  - Temperaturbaserade tips (kyla, värme)
  - Säsongstips (vinter = mer ljus behövs)
  - Fuktighetstips
  - Endpoint: GET /api/weather
- [x] **Tupp-funktion** - Lägg till tuppar i flocken
  - Ny typ-väljare (Höna/Tupp) i formuläret
  - Flockstatistik med tupp/höna-ratio
  - Rekommendationer (8-12 höns per tupp)
  - Endpoint: GET /api/flock/statistics
- [x] **Dashboard uppdaterad** - Visar väder och flockråd
- [x] **Google Sign-In borttagen** - Endast e-post/lösenord för nu

### Session 9 - P0 Bug Fixes (February 25, 2026)
- [x] **KRITISK FIX: Stripe checkout** - Bytte från emergentintegrations CheckoutSessionRequest (mode='payment' hårdkodat) till direkt stripe.checkout.Session.create() med mode='subscription' för prenumerationer
- [x] **FIX: "Normal produktion" text** - Ändrade insights endpoint att visa "Inga ägg registrerade än" (status: no_data) för användare med 0 ägg istället för "Normal produktion"
- [x] **FIX: Login redirect** - Fixade React Router basename till `/api/web` och email-login uppdaterar AuthContext state korrekt
- [x] **UI/UX Komplett:**
  - Dela statistik-modal med Facebook, Twitter, och "Ladda ner bild" för Instagram
  - Animationer (fade-in, slide-up med delays)
  - Responsiv design för mobil
  - AI-insikter sektion på dashboard
  - Snabbåtgärder-grid

### Tidigare Sessioner
- [x] Critical Auth Fix: Resolved login loop with missing `request` parameter
- [x] Premium Feature Lockdown (Backend + Frontend)
- [x] Email/Password Authentication
- [x] AI-Powered Features (Daily Report, 7-Day Forecast)
- [x] Dashboard & UX Redesign
- [x] Cookie Banner Redesign
- [x] Demo data for statistics graphs
- [x] Share to Social Media function

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
| AI Dagsrapport | ✅ | ✅ | ✅ |
| Äggprognos 7 dagar | ✅ | ✅ | ✅ |

---

## Teknisk Stack
- **Backend**: FastAPI (Python), MongoDB
- **Frontend Web**: React, Vite, TypeScript, Recharts
- **Frontend Mobile**: React Native, Expo, expo-font
- **Payments**: Stripe (Subscription Mode)
- **Auth**: Google OAuth2 + Email/Password (bcrypt, JWT)
- **AI**: emergentintegrations + OpenAI GPT-4o
- **Fonts**: Playfair Display, Inter (Google Fonts)

---

## P2 - Future/Backlog
- [ ] Push-notiser för kläckning/hälsokontroller
- [ ] Apple Sign-In
- [ ] Enhanced Analytics
- [ ] User Onboarding guide

---

## Test Files
- `/app/backend/tests/test_stripe_and_auth.py` - Stripe checkout + Auth tests
- `/app/test_reports/iteration_7.json` - Latest test report
