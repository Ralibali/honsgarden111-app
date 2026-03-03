# Hönsgården Web API

Backend API för Hönsgården - en app för hönsägare.

## Deploy på Render

1. Skapa ett nytt Web Service på Render
2. Koppla detta GitHub-repo
3. Ställ in:
   - **Root Directory:** `.` (eller lämna tomt)
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn server:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT`

4. Lägg till Environment Variables (se `.env.example`)

## Lokalt

```bash
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

## API Endpoints

- `GET /api/health` - Hälsokontroll
- `POST /api/auth/login` - Logga in
- `POST /api/auth/register` - Registrera
- `GET /api/eggs` - Hämta äggdata
- `GET /api/hens` - Hämta höns
- ... och mer

Webbappen serveras på `/api/web/`
