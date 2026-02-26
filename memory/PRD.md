# Hönsgården - Product Requirements Document

## Senaste uppdatering: 26 Feb 2026

### Status: In-App Password Reset - KOMPLETT

---

## NYLIGEN GENOMFÖRT (26 Feb 2026)

### In-App Lösenordsåterställning med 6-siffrig kod
**Status: ✅ KOMPLETT OCH TESTAD**

Backend-endpoints (alla testade och fungerar):
- `POST /api/auth/forgot-password` - Skickar 6-siffrig kod via e-post
- `POST /api/auth/verify-reset-code` - Verifierar kod (max 5 försök, 15 min giltig)
- `POST /api/auth/reset-password-with-code` - Sätter nytt lösenord med verifierad token

Frontend UI (login.tsx) uppdaterad med:
- **forgot**: E-postformulär med "Skicka kod"-knapp
- **verify-code**: 6 separata TextInput-fält för kodinmatning med auto-fokus
- **new-password**: Nytt lösenord + bekräftelse-formulär

authStore.ts uppdaterad med:
- `verifyResetCode(email, code)` - Returnerar token vid giltig kod
- `resetPasswordWithCode(token, newPassword)` - Återställer lösenord

E-postmall (via Resend):
- Snyggt formaterad HTML-mall med 6-siffrig kod
- Avsändare: noreply@honsgarden.se (verifierad domän)

---

## Deployment-status

### EAS Build-konfiguration: ✅ REDO
- `eas.json` konfigurerad med development/preview/production profiles
- `app.json` uppdaterad med korrekt projectId och slug
- `@expo/config-plugins` i dependencies (krävs för EAS)
- Alla ikoner på plats (512x512, 1024x1024)

### Expo SDK: 54 (stabil)

### Deployment-kommandon:
```bash
# Bygg för testning
eas build --platform all --profile preview

# Bygg för produktion
eas build --platform all --profile production

# Uppdatera OTA
eas update --environment production
```

---

## Kända problem

### Expo Web Rendering (BEFINTLIGT PROBLEM)
- "import.meta" JavaScript-fel på webb-versionen
- Orsakas av Metro bundler, inte relaterat till kodändringar
- Påverkar INTE native iOS/Android-byggen
- Webb-frontend på `/api/web` fungerar separat

---

## Komplett funktionslista

### Autentisering
| Funktion | Backend | Mobil |
|----------|---------|-------|
| E-post/lösenord-registrering | ✅ | ✅ |
| E-post/lösenord-inloggning | ✅ | ✅ |
| Google-inloggning | ✅ | ⚠️ (kräver native config) |
| Apple-inloggning | ✅ | ✅ |
| **Lösenordsåterställning (6-siffrig kod)** | ✅ | ✅ |
| GDPR-samtycke vid registrering | ✅ | ✅ |

### Premium-funktioner
| Funktion | Backend | Mobil |
|----------|---------|-------|
| Obegränsade flockar | ✅ | ✅ |
| Hälsologg | ✅ | ✅ |
| Kläckningsmodul | ✅ | ✅ |
| Foderhantering | ✅ | ✅ |
| AI Dagsrapport | ✅ | ✅ |
| Äggprognos 7 dagar | ✅ | ✅ |

### Kärnfunktioner
- Äggdagbok
- Hönsprofiler med tuppar
- Flockhantering
- Ekonomispårning
- Statistik och rapporter
- Väderintegration
- AI-rådgivare "Agda"

---

## API Endpoints

### Autentisering
- `POST /api/auth/register` - Registrering
- `POST /api/auth/login` - Inloggning
- `POST /api/auth/logout` - Utloggning
- `GET /api/auth/me` - Nuvarande användare
- `POST /api/auth/forgot-password` - Begär återställningskod
- `POST /api/auth/verify-reset-code` - Verifiera kod
- `POST /api/auth/reset-password-with-code` - Återställ lösenord
- `POST /api/auth/google/mobile` - Google-inloggning (mobil)
- `POST /api/auth/apple/mobile` - Apple-inloggning (mobil)

### Data
- `GET/POST /api/eggs` - Äggregistreringar
- `GET/POST /api/hens` - Hönor
- `GET/POST /api/flocks` - Flockar
- `GET/POST /api/transactions` - Ekonomi
- `GET/POST /api/feed` - Foder
- `GET/POST /api/hatching` - Kläckning
- `GET/POST /api/health-log` - Hälsologg

### Premium & AI
- `GET /api/premium/status` - Premium-status
- `GET /api/ai/daily-report` - AI-dagsrapport
- `GET /api/ai/egg-forecast` - Äggprognos
- `GET /api/ai/daily-tip` - Dagens tips

---

## Teknisk Stack
- **Backend**: FastAPI, MongoDB Atlas
- **Mobil**: Expo (SDK 54), React Native
- **E-post**: Resend
- **Betalningar**: Stripe (web) / Web-redirect (mobil)
- **AI**: OpenAI via emergentintegrations

---

## Kommande uppgifter

### P1 - Hög prioritet
- [ ] Användartestning på fysisk enhet efter framgångsrikt EAS-bygge
- [ ] Skapa premium-sidan på `honsgarden.se/premium`
- [ ] Verifiera Google Sign-In native config

### P2 - Framtida
- [ ] Onboarding-guide för nya användare
- [ ] Ta bort dormant RevenueCat-kod
- [ ] Förbättrad statistikexport

---

## Testrapporter
- `/app/test_reports/iteration_11.json` - Lösenordsåterställning (100% backend)
- `/app/backend/tests/test_password_reset.py` - Backend-tester

## Testanvändare
- E-post: testuser@test.com
- Lösenord: test123
