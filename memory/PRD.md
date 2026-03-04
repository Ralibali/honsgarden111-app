# Hönsgården - Product Requirements Document

## Original Problem Statement
Build a feature-rich, AI-powered web application called "Hönsgården" (The Chicken Coop) for Swedish chicken farmers. The app helps users track egg production, manage their flock, and get AI-powered insights.

## Tech Stack
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + TypeScript
- **AI**: OpenAI gpt-4o-mini
- **Payments**: Stripe
- **Deployment**: Render

## Completed Sprints

### Sprint 1 ✅
- User streaks with rewards
- Agda's Inbox (daily AI tips)
- Statistics fixes
- AI insights
- Hen personality analysis

### Sprint 2 ✅
- Daily AI overview ("Din hönsgård idag")
- Flock health score
- PWA functionality (manifest.json, service-worker.js)

### Sprint 3A ✅
- Flock ranking system (top X%)
- Weekly challenges/quests
- Endpoints: `/api/ranking/summary`, `/api/challenges/week`

### Sprint 3B ✅
- Community Q&A with content gating
- AI-generated first answer from Agda
- Shareable question URLs
- Endpoints: `/api/community/questions`, `/api/community/questions/{id}/preview`

### Steg 4 ✅ (2026-03-04)
- **AI Flockanalys**: `GET /api/ai/flock-analysis` - Analyzes production, causes, recommendations
- **Smarta Notiser**: `GET /api/alerts` - Warnings like "Greta hasn't laid eggs in 4 days"
- **Nationell Statistik**: `GET /api/stats/national` - Compare against all Swedish users
- **Höna-personlighet**: `POST /api/ai/hen-personality` - Viral personality quiz
- **Affiliate-struktur**: `GET /api/products` - Ready for Adtraction integration
- **Dashboard förbättringar**: Alerts, AI Analysis, National Stats sections added

### Steg 5: Virala Engagemangsfunktioner ✅ (2026-03-04)
- **Flockjämförelse**: `GET /api/stats/flock-comparison` - Visar användarens flock vs app-snitt (ägg/dag)
- **Percentilplacering**: `GET /api/stats/percentile` - "Din flock ligger i topp X%"
- **Veckans Toppflockar**: `GET /api/stats/leaderboard` - Leaderboard med förnamn (anonymiserat)
- **Delbar Resultatbild**: `POST /api/share/generate-image` - Genererar PNG (1200x630) för social delning
- **AI Förbättringstips**: `GET /api/ai/improvement-tips` - Tips om användaren ligger under snittet
- **UI-komponenter**: FlockComparison-sektion, Leaderboard-sektion, Share Modal med nedladdning
- **Statistics-fix**: Chart-container har nu explicit height (240px) för Safari-kompatibilitet
- **Fungerar på**: Mobil (390x844) + Desktop (1920x800)

### Steg 6: Stabilitet, Social & UX ✅ (2026-03-04)
- **15 Fiktiva Leaderboard-användare**: Anna, Johan, Sara, Magnus, Lisa, Erik, Maria, Peter, Emma, Daniel, Fredrik, Linda, Andreas, Karin, Niklas
- **Förbättrad Ägg-registrering**: Större input med +/- stepper-knappar
- **Dela statistik med periodval**: Välj mellan 7, 14, 30 dagar + längre delningstext
- **Vänner-funktion** (Backend klar):
  - `GET /api/friends` - Vännerlista med statistik
  - `GET /api/friends/search?q=` - Sök användare
  - `POST /api/friends/request` - Skicka vänförfrågan
  - `POST /api/friends/accept/{user_id}` - Acceptera
  - `DELETE /api/friends/{user_id}` - Ta bort vän
  - `GET /api/friends/requests` - Se väntande förfrågningar
- **Support i appen** (Backend klar):
  - `GET /api/support/tickets` - Användarens ärenden
  - `POST /api/support/tickets` - Skapa ärende
  - `GET /api/support/tickets/{id}` - Se ärende
  - `POST /api/support/tickets/{id}/reply` - Svara
  - Admin: `/api/admin/support/tickets` endpoints

## Premium Features
- 7-day egg forecast
- AI advisor "Agda"
- Weather-based tips
- Anomaly detection
- Health logging
- Hatching module
- Feed management
- Unlimited flocks

## Key Collections (MongoDB)
- `users`, `hens`, `flocks`, `egg_records`
- `ai_cache`, `ai_flock_analysis` (24h cache)
- `alerts` (dismissible notifications)
- `community_questions`, `community_answers`
- `products` (affiliate structure)
- `hen_personalities` (viral tracking)
- `user_weekly_challenges`

## Known Issues
- MongoDB Atlas auth needs fixing for production
- OpenAI API key needs to be configured
- `server.py` is monolithic (10600+ lines) - needs refactoring

## Backlog (P1/P2)
1. **Adtraction Integration** - Import product feed, AI recommendations
2. **Backend Refactoring** - Split server.py into modules using APIRouter
3. **SEO for Community** - Make questions indexable
4. **Next.js Migration** - Long-term goal
5. **Höna-personlighet bilduppladdning** - Fullständig implementation av viral feature

## API Endpoints Summary

### Steg 5 New Viral Endpoints
- `GET /api/stats/flock-comparison` - User vs app average eggs/day
- `GET /api/stats/percentile` - User's percentile ranking with badge/tips
- `GET /api/stats/leaderboard` - Weekly top 10 flocks (anonymized)
- `POST /api/share/generate-image` - Generate 1200x630 PNG for social sharing
- `GET /api/ai/improvement-tips` - AI tips for users below average

### Steg 4 New Endpoints
- `GET /api/ai/flock-analysis` - AI analysis with causes & tips
- `GET /api/alerts` - Smart notifications
- `POST /api/alerts/{id}/dismiss` - Dismiss alert
- `GET /api/stats/national` - National statistics comparison
- `POST /api/ai/hen-personality` - Viral personality feature
- `GET /api/products` - Affiliate products
- `POST /api/admin/products` - Add product (admin)
- `GET /api/ai/product-recommendation` - AI product suggestion
