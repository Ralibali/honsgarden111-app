# Hönsgården - Product Requirements Document

## Senaste uppdatering: 26 Feb 2026

---

## NYLIGEN GENOMFÖRT (26 Feb 2026)

### 1. In-App Lösenordsåterställning med 6-siffrig kod ✅
**Status: KOMPLETT OCH TESTAD**

Backend-endpoints:
- `POST /api/auth/forgot-password` - Skickar 6-siffrig kod via e-post
- `POST /api/auth/verify-reset-code` - Verifierar kod (max 5 försök, 15 min giltig)
- `POST /api/auth/reset-password-with-code` - Sätter nytt lösenord

Frontend UI (login.tsx):
- **forgot**: E-postformulär med "Skicka kod"-knapp
- **verify-code**: 6 separata TextInput-fält med auto-fokus
- **new-password**: Nytt lösenord + bekräftelse
- **60 sek cooldown** för "Skicka ny kod"-knappen

### 2. Premium Tab & Sida ✅
**Status: KOMPLETT**

Ny tab i navigationen med stjärnikon som visar:
- Hero-sektion med "Uppgradera till Premium"
- Priskort: **19 kr/mån** (månatlig) och **149 kr/år** (årlig med "SPARA 35%")
- 10 premium-funktioner med ikoner och beskrivningar
- 7 dagars gratis provperiod-banner
- CTA-knapp som öppnar honsgarden.se/premium
- FAQ-sektion (2 frågor)
- Visar premium-status om användaren redan är premium

---

## Deployment-status

### EAS Build-konfiguration: ✅ REDO
- `eas.json` konfigurerad med development/preview/production
- `app.json` med korrekt projectId och slug
- Alla ikoner på plats

### Deployment-kommandon:
```bash
# Bygg för testning
eas build --platform all --profile preview

# Bygg för produktion
eas build --platform all --profile production
```

---

## Komplett funktionslista

### Autentisering
| Funktion | Status |
|----------|--------|
| E-post/lösenord-registrering | ✅ |
| E-post/lösenord-inloggning | ✅ |
| Google-inloggning | ⚠️ Webb OK, mobil kräver config |
| Apple-inloggning | ✅ |
| Lösenordsåterställning (6-siffrig kod) | ✅ |
| GDPR-samtycke vid registrering | ✅ |

### Premium & Monetisering
| Funktion | Status |
|----------|--------|
| Premium-sida med priser | ✅ |
| Webb-redirect för betalning | ✅ |
| Premium-status visning | ✅ |

### Kärnfunktioner
| Funktion | Status |
|----------|--------|
| Äggdagbok | ✅ |
| Hönsprofiler | ✅ |
| Flockhantering | ✅ |
| Ekonomispårning | ✅ |
| Statistik | ✅ |
| AI-rådgivare Agda | ✅ |
| AI Dagsrapport | ✅ |
| Äggprognos | ✅ |
| Väderintegration | ✅ |
| Hälsologg | ✅ |
| Kläckningsmodul | ✅ |
| Foderhantering | ✅ |

---

## Teknisk Stack
- **Backend**: FastAPI, MongoDB Atlas
- **Mobil**: Expo (SDK 54), React Native
- **E-post**: Resend (noreply@honsgarden.se)
- **Betalningar**: Stripe via honsgarden.se/premium
- **AI**: OpenAI via emergentintegrations

---

## Kommande uppgifter

### P1 - Hög prioritet
- [ ] Bygg appen via Expo/EAS
- [ ] Användartestning på fysisk enhet
- [ ] Skapa premium-sidan på honsgarden.se/premium (extern webbsida)

### P2 - Framtida
- [ ] Google Sign-In native config
- [ ] Onboarding-guide för nya användare
- [ ] Ta bort dormant RevenueCat-kod

---

## Testrapporter
- `/app/test_reports/iteration_11.json` - Lösenordsåterställning backend (100%)
- `/app/test_reports/iteration_12.json` - Premium tab & cooldown (verifierad)

## Testanvändare
- E-post: testuser@test.com
- Lösenord: test123
