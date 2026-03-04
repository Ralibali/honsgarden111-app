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
- `server.py` is monolithic (9000+ lines) - needs refactoring

## Backlog (P1/P2)
1. **Adtraction Integration** - Import product feed, AI recommendations
2. **Backend Refactoring** - Split server.py into modules using APIRouter
3. **SEO for Community** - Make questions indexable
4. **Next.js Migration** - Long-term goal

## API Endpoints Summary

### Steg 4 New Endpoints
- `GET /api/ai/flock-analysis` - AI analysis with causes & tips
- `GET /api/alerts` - Smart notifications
- `POST /api/alerts/{id}/dismiss` - Dismiss alert
- `GET /api/stats/national` - National statistics comparison
- `POST /api/ai/hen-personality` - Viral personality feature
- `GET /api/products` - Affiliate products
- `POST /api/admin/products` - Add product (admin)
- `GET /api/ai/product-recommendation` - AI product suggestion
