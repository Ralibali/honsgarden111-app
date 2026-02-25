from fastapi import FastAPI, APIRouter, HTTPException, Query, Request, Response, Cookie
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, date, timezone, timedelta
from enum import Enum
import httpx
import resend
import bcrypt
import stripe

# AI Integration
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# AI Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Webapp static files path
WEBAPP_DIR = ROOT_DIR / 'webapp_dist'

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Stripe config
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', 'sk_test_emergent')
STRIPE_PUBLISHABLE_KEY = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')
STRIPE_PRICE_MONTHLY = os.environ.get('STRIPE_PRICE_MONTHLY', '')
STRIPE_PRICE_YEARLY = os.environ.get('STRIPE_PRICE_YEARLY', '')

# Resend (Email) config
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
APP_URL = os.environ.get('APP_URL', 'https://honsgarden-deploy.preview.emergentagent.com')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

# Admin config - comma-separated list of admin emails
ADMIN_EMAILS = [email.strip() for email in os.environ.get('ADMIN_EMAILS', '').split(',') if email.strip()]

# Free trial period (days)
FREE_TRIAL_DAYS = 7

# Import Stripe checkout helper
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ ENUMS ============
class TransactionType(str, Enum):
    COST = "cost"
    SALE = "sale"

class TransactionCategory(str, Enum):
    FEED = "feed"
    EQUIPMENT = "equipment"
    MEDICINE = "medicine"
    OTHER_COST = "other_cost"
    EGG_SALE = "egg_sale"
    HEN_SALE = "hen_sale"
    OTHER_INCOME = "other_income"

class SubscriptionPlan(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"

# ============ AUTH MODELS ============
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SessionRequest(BaseModel):
    session_id: str

# Email/Password Auth Models
class EmailRegister(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None

class EmailLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str

# ============ COOP/DATA MODELS ============
class CoopSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default_user"
    coop_name: str = "Min Hönsgård"
    hen_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CoopSettingsUpdate(BaseModel):
    coop_name: Optional[str] = None
    hen_count: Optional[int] = None

# ============ FEATURE PREFERENCES MODEL ============
class FeaturePreferences(BaseModel):
    """User preferences for which features to show/hide"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    # Feature toggles (all on by default)
    show_flock_management: bool = True
    show_health_log: bool = True
    show_feed_management: bool = True
    show_weather_data: bool = True
    show_hatching_module: bool = True
    show_productivity_alerts: bool = True
    show_economy_insights: bool = True
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FeaturePreferencesUpdate(BaseModel):
    show_flock_management: Optional[bool] = None
    show_health_log: Optional[bool] = None
    show_feed_management: Optional[bool] = None
    show_weather_data: Optional[bool] = None
    show_hatching_module: Optional[bool] = None
    show_productivity_alerts: Optional[bool] = None
    show_economy_insights: Optional[bool] = None

# ============ HATCHING/INCUBATION MODELS (ETAPP 3) ============
class HatchingStatus(str, Enum):
    INCUBATING = "incubating"
    HATCHED = "hatched"
    FAILED = "failed"
    CANCELLED = "cancelled"

class HatchingCreate(BaseModel):
    """Create a new hatching/incubation record"""
    start_date: str  # YYYY-MM-DD
    egg_count: int
    hen_id: Optional[str] = None  # The broody hen, if natural
    incubator_name: Optional[str] = None  # Name of incubator if using one
    notes: Optional[str] = None
    expected_hatch_days: int = 21  # Default chicken incubation period

class HatchingUpdate(BaseModel):
    egg_count: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[HatchingStatus] = None
    hatched_count: Optional[int] = None  # How many actually hatched
    actual_hatch_date: Optional[str] = None

class Hatching(BaseModel):
    """A hatching/incubation record"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    start_date: str
    expected_hatch_date: str  # Calculated from start_date + expected_hatch_days
    egg_count: int
    hen_id: Optional[str] = None
    incubator_name: Optional[str] = None
    notes: Optional[str] = None
    status: str = "incubating"
    hatched_count: Optional[int] = None
    actual_hatch_date: Optional[str] = None
    expected_hatch_days: int = 21
    notification_sent_3_days: bool = False
    notification_sent_1_day: bool = False
    notification_sent_hatch_day: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Hen(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default_user"
    name: str
    breed: Optional[str] = None
    color: Optional[str] = None
    birth_date: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True
    flock_id: Optional[str] = None
    status: str = "active"  # active, sold, deceased
    status_date: Optional[str] = None
    last_seen: Optional[str] = None
    last_seen_warning_days: int = 3  # Default warning after 3 days
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# ============ FLOCK MODELS ============
class FlockCreate(BaseModel):
    name: str
    description: Optional[str] = None

class Flock(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============ HEN STATUS ENUM ============
class HenStatus(str, Enum):
    ACTIVE = "active"
    SOLD = "sold"
    DECEASED = "deceased"

# ============ HEN MODELS ============
class HenCreate(BaseModel):
    name: str
    breed: Optional[str] = None
    color: Optional[str] = None
    birth_date: Optional[str] = None
    notes: Optional[str] = None
    flock_id: Optional[str] = None

class HenUpdate(BaseModel):
    name: Optional[str] = None
    breed: Optional[str] = None
    color: Optional[str] = None
    birth_date: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None
    flock_id: Optional[str] = None
    status: Optional[HenStatus] = None
    status_date: Optional[str] = None
    last_seen: Optional[str] = None
    last_seen_warning_days: Optional[int] = None

class EggRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default_user"
    date: str
    count: int
    hen_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class EggRecordCreate(BaseModel):
    date: str
    count: int
    hen_id: Optional[str] = None
    notes: Optional[str] = None

class EggRecordUpdate(BaseModel):
    count: Optional[int] = None
    hen_id: Optional[str] = None
    notes: Optional[str] = None

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default_user"
    date: str
    type: TransactionType
    category: TransactionCategory
    amount: float
    description: Optional[str] = None
    quantity: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# ============ HEALTH LOG MODELS ============
class HealthLogType(str, Enum):
    SICK = "sick"
    MOLTING = "molting"
    VET_VISIT = "vet_visit"
    VACCINATION = "vaccination"
    DEWORMING = "deworming"
    INJURY = "injury"
    RECOVERED = "recovered"
    NOTE = "note"

class HealthLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    hen_id: str
    date: str
    type: HealthLogType
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HealthLogCreate(BaseModel):
    hen_id: str
    date: str
    type: HealthLogType
    description: Optional[str] = None

class TransactionCreate(BaseModel):
    date: str
    type: TransactionType
    category: TransactionCategory
    amount: float
    description: Optional[str] = None
    quantity: Optional[int] = None

# ============ FEED MANAGEMENT MODELS (ETAPP 4) ============
class FeedType(str, Enum):
    LAYER_FEED = "layer_feed"          # Värpfoder
    GROWER_FEED = "grower_feed"        # Tillväxtfoder
    STARTER_FEED = "starter_feed"      # Startfoder
    SCRATCH_GRAIN = "scratch_grain"    # Korn/vete
    TREATS = "treats"                  # Godis/belöningar
    SUPPLEMENTS = "supplements"        # Tillskott
    OTHER = "other"

class FeedRecord(BaseModel):
    """Feed consumption/purchase record"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    date: str  # YYYY-MM-DD
    feed_type: FeedType
    amount_kg: float  # Amount in kg
    cost: Optional[float] = None  # Cost in SEK
    is_purchase: bool = False  # True = purchase, False = consumption
    brand: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FeedRecordCreate(BaseModel):
    date: str
    feed_type: FeedType
    amount_kg: float
    cost: Optional[float] = None
    is_purchase: bool = False
    brand: Optional[str] = None
    notes: Optional[str] = None

class FeedRecordUpdate(BaseModel):
    date: Optional[str] = None
    feed_type: Optional[FeedType] = None
    amount_kg: Optional[float] = None
    cost: Optional[float] = None
    is_purchase: Optional[bool] = None
    brand: Optional[str] = None
    notes: Optional[str] = None

class FeedInventory(BaseModel):
    """Current feed inventory"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    feed_type: FeedType
    current_stock_kg: float = 0.0
    low_stock_threshold_kg: float = 5.0  # Alert when below this
    brand: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============ SUBSCRIPTION MODELS ============
class PremiumStatusResponse(BaseModel):
    is_premium: bool
    subscription_id: Optional[str] = None
    plan: Optional[str] = None
    expires_at: Optional[str] = None
    stripe_customer_id: Optional[str] = None

class CreateCheckoutRequest(BaseModel):
    plan: str  # "monthly" or "yearly"
    origin_url: str

class CreateCheckoutResponse(BaseModel):
    url: str
    session_id: str

class CancelSubscriptionRequest(BaseModel):
    reason: Optional[str] = None

# ============ FEEDBACK MODELS ============
class FeedbackCreate(BaseModel):
    type: str  # "feature", "bug", "improvement", "other"
    message: str
    email: Optional[str] = None

class Feedback(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    type: str
    message: str
    email: Optional[str] = None
    status: str = "new"  # "new", "read", "replied"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============ AUTH HELPER FUNCTIONS ============
async def get_current_user(request: Request) -> Optional[User]:
    """Get current user from session token in cookie or header"""
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        return None
    
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    
    # Check expiry
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    if not user:
        # Try with user_id field as fallback (for older records)
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        return None
    
    # Normalize user_id field
    if "id" in user and "user_id" not in user:
        user["user_id"] = user["id"]
    
    return User(**user)

async def require_user(request: Request) -> User:
    """Require authenticated user, raise 401 if not"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def require_admin(request: Request) -> User:
    """Require admin user, raise 401/403 if not"""
    user = await require_user(request)
    if user.email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ============ AUTH ENDPOINTS ============
@api_router.post("/auth/session")
async def exchange_session(session_req: SessionRequest, request: Request, response: Response):
    """Exchange session_id from Emergent Auth for user data and session token"""
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_req.session_id}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            data = resp.json()
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")
    
    email = data.get("email")
    name = data.get("name", email.split("@")[0] if email else "User")
    picture = data.get("picture")
    session_token = data.get("session_token")
    
    # Find or create user
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc),
            "reminder_enabled": True,  # Enable reminders by default
            "reminder_time": "18:00"   # Default reminder time
        })
        # Create default coop settings for new user
        await db.coop_settings.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "coop_name": "Min Hönsgård",
            "hen_count": 0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        })
        # Give 7 days FREE trial premium
        trial_expires = datetime.now(timezone.utc) + timedelta(days=FREE_TRIAL_DAYS)
        await db.subscriptions.insert_one({
            "user_id": user_id,
            "is_active": True,
            "plan": "trial",
            "expires_at": trial_expires,
            "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"New user {email} created with {FREE_TRIAL_DAYS}-day free trial")
    
    # Store session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.delete_many({"user_id": user_id})  # Remove old sessions
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    # Set cookie - domain handling for production
    cookie_domain = None
    host = request.headers.get("host", "")
    if "emergent.host" in host:
        # Production deployment - set domain for full host
        cookie_domain = host.split(":")[0]  # Remove port if any
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60,
        domain=cookie_domain
    )
    
    return {
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": picture
    }

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current user info"""
    user = await require_user(request)
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/", secure=True, samesite="none")
    return {"message": "Logged out"}


# ============ EMAIL/PASSWORD AUTH ============
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

@api_router.post("/auth/register")
async def register_email(data: EmailRegister, request: Request, response: Response):
    """Register a new user with email and password"""
    # Check if email already exists
    existing = await db.users.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="E-postadressen är redan registrerad")
    
    # Validate password
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Lösenordet måste vara minst 6 tecken")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_pw = hash_password(data.password)
    
    user = {
        "id": user_id,
        "email": data.email.lower(),
        "password_hash": hashed_pw,
        "name": data.name or data.email.split('@')[0],
        "picture": None,
        "auth_provider": "email",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    # Give 7 days FREE trial premium
    trial_end = datetime.now(timezone.utc) + timedelta(days=7)
    subscription = {
        "user_id": user_id,
        "plan": "trial",
        "is_active": True,
        "trial_end": trial_end.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.subscriptions.insert_one(subscription)
    
    # Create default coop
    coop = CoopSettings(user_id=user_id, coop_name="Min Hönsgård")
    await db.coops.insert_one(coop.dict())
    
    # Create session and set cookie
    session_token = str(uuid.uuid4())
    session = UserSession(
        user_id=user_id,
        session_token=session_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    await db.user_sessions.insert_one(session.dict())
    
    # Set cookie
    host = request.headers.get("host", "")
    cookie_domain = host.split(":")[0] if "emergent.host" in host else None
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60,
        domain=cookie_domain
    )
    
    return {
        "user_id": user_id,
        "email": data.email.lower(),
        "name": user["name"],
        "message": "Konto skapat! Du har 7 dagars gratis Premium-provperiod."
    }

@api_router.post("/auth/login")
async def login_email(data: EmailLogin, request: Request, response: Response):
    """Login with email and password"""
    # Find user
    user = await db.users.find_one({"email": data.email.lower()})
    if not user:
        raise HTTPException(status_code=401, detail="Felaktig e-post eller lösenord")
    
    # Check if user has password (might be Google-only user)
    if not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Detta konto använder Google-inloggning. Logga in med Google istället.")
    
    # Verify password
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Felaktig e-post eller lösenord")
    
    user_id = user["id"]
    
    # Create session and set cookie
    session_token = str(uuid.uuid4())
    session = UserSession(
        user_id=user_id,
        session_token=session_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    await db.user_sessions.insert_one(session.dict())
    
    # Set cookie
    host = request.headers.get("host", "")
    cookie_domain = host.split(":")[0] if "emergent.host" in host else None
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60,
        domain=cookie_domain
    )
    
    return {
        "user_id": user_id,
        "email": user["email"],
        "name": user.get("name", ""),
        "picture": user.get("picture")
    }

@api_router.post("/auth/forgot-password")
async def forgot_password(data: PasswordResetRequest):
    """Request password reset email"""
    user = await db.users.find_one({"email": data.email.lower()})
    
    # Always return success (don't reveal if email exists)
    if not user:
        return {"message": "Om e-postadressen finns i systemet kommer du få ett återställningsmail."}
    
    # Check if user has password auth
    if not user.get("password_hash"):
        return {"message": "Om e-postadressen finns i systemet kommer du få ett återställningsmail."}
    
    # Generate reset token
    reset_token = str(uuid.uuid4())
    expires = datetime.now(timezone.utc) + timedelta(hours=1)
    
    await db.password_resets.insert_one({
        "user_id": user["id"],
        "token": reset_token,
        "expires_at": expires.isoformat(),
        "used": False
    })
    
    # Send email via Resend
    try:
        app_url = os.environ.get('APP_URL', 'https://honsgarden.se')
        reset_link = f"{app_url}/reset-password?token={reset_token}"
        
        resend.api_key = os.environ.get('RESEND_API_KEY')
        resend.Emails.send({
            "from": os.environ.get('SENDER_EMAIL', 'noreply@honsgarden.se'),
            "to": data.email,
            "subject": "Återställ ditt lösenord - Hönsgården",
            "html": f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>🐔 Hönsgården</h2>
                <p>Hej!</p>
                <p>Du har begärt att återställa ditt lösenord. Klicka på knappen nedan för att välja ett nytt lösenord:</p>
                <p style="margin: 24px 0;">
                    <a href="{reset_link}" style="background: #4ade80; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
                        Återställ lösenord
                    </a>
                </p>
                <p>Länken är giltig i 1 timme.</p>
                <p>Om du inte begärde denna återställning kan du ignorera detta mail.</p>
                <p>Vänliga hälsningar,<br>Hönsgården</p>
            </div>
            """
        })
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
    
    return {"message": "Om e-postadressen finns i systemet kommer du få ett återställningsmail."}

@api_router.post("/auth/reset-password")
async def reset_password(data: PasswordReset, request: Request, response: Response):
    """Reset password with token"""
    # Find valid reset token
    reset = await db.password_resets.find_one({
        "token": data.token,
        "used": False
    })
    
    if not reset:
        raise HTTPException(status_code=400, detail="Ogiltig eller utgången återställningslänk")
    
    # Check expiry
    expires = datetime.fromisoformat(reset["expires_at"].replace('Z', '+00:00'))
    if datetime.now(timezone.utc) > expires:
        raise HTTPException(status_code=400, detail="Återställningslänken har gått ut")
    
    # Validate new password
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Lösenordet måste vara minst 6 tecken")
    
    # Update password
    hashed_pw = hash_password(data.new_password)
    await db.users.update_one(
        {"id": reset["user_id"]},
        {"$set": {"password_hash": hashed_pw}}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"token": data.token},
        {"$set": {"used": True}}
    )
    
    # Create session and log user in
    user = await db.users.find_one({"id": reset["user_id"]})
    session_token = str(uuid.uuid4())
    session = UserSession(
        user_id=user["id"],
        session_token=session_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7)
    )
    await db.user_sessions.insert_one(session.dict())
    
    # Set cookie
    host = request.headers.get("host", "")
    cookie_domain = host.split(":")[0] if "emergent.host" in host else None
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60,
        domain=cookie_domain
    )
    
    return {
        "user_id": user["id"],
        "email": user["email"],
        "message": "Lösenordet har återställts"
    }


# ============ STRIPE CHECKOUT ENDPOINTS ============
@api_router.post("/checkout/create", response_model=CreateCheckoutResponse)
async def create_checkout_session(req: CreateCheckoutRequest, request: Request):
    """Create Stripe checkout session for subscription"""
    user = await require_user(request)
    
    # Get price ID based on plan
    if req.plan == "monthly":
        price_id = STRIPE_PRICE_MONTHLY
    elif req.plan == "yearly":
        price_id = STRIPE_PRICE_YEARLY
    else:
        raise HTTPException(status_code=400, detail="Invalid plan. Use 'monthly' or 'yearly'")
    
    if not price_id:
        raise HTTPException(status_code=500, detail="Stripe price not configured")
    
    # Initialize Stripe checkout
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    # Build URLs
    success_url = f"{req.origin_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{req.origin_url}/premium"
    
    # Create checkout session for subscription
    checkout_req = CheckoutSessionRequest(
        stripe_price_id=price_id,
        quantity=1,
        success_url=success_url,
        cancel_url=cancel_url,
        mode="subscription",  # Required for recurring prices
        metadata={
            "user_id": user.user_id,
            "plan": req.plan
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_req)
    
    # Store pending transaction
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user.user_id,
        "plan": req.plan,
        "amount": 19.0 if req.plan == "monthly" else 149.0,
        "currency": "SEK",
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc)
    })
    
    return CreateCheckoutResponse(url=session.url, session_id=session.session_id)

@api_router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, request: Request):
    """Get checkout session status"""
    user = await require_user(request)
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction status
    if status.payment_status == "paid":
        # Find the transaction
        transaction = await db.payment_transactions.find_one({"session_id": session_id})
        if transaction and transaction.get("payment_status") != "paid":
            # Update transaction
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc)}}
            )
            
            # Activate premium for user
            plan = transaction.get("plan", "monthly")
            if plan == "yearly":
                expires_at = datetime.now(timezone.utc) + timedelta(days=365)
            else:
                expires_at = datetime.now(timezone.utc) + timedelta(days=30)
            
            await db.subscriptions.update_one(
                {"user_id": user.user_id},
                {"$set": {
                    "is_active": True,
                    "plan": plan,
                    "expires_at": expires_at,
                    "stripe_session_id": session_id,
                    "updated_at": datetime.now(timezone.utc)
                }},
                upsert=True
            )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    host_url = str(request.base_url).rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        logger.info(f"Webhook received: {webhook_response.event_type}")
        
        if webhook_response.payment_status == "paid":
            user_id = webhook_response.metadata.get("user_id")
            plan = webhook_response.metadata.get("plan", "monthly")
            
            if user_id:
                if plan == "yearly":
                    expires_at = datetime.now(timezone.utc) + timedelta(days=365)
                else:
                    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
                
                await db.subscriptions.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "is_active": True,
                        "plan": plan,
                        "expires_at": expires_at,
                        "stripe_session_id": webhook_response.session_id,
                        "updated_at": datetime.now(timezone.utc)
                    }},
                    upsert=True
                )
                
                # Update payment transaction
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc)}}
                )
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

# ============ PREMIUM STATUS ENDPOINT ============
@api_router.get("/premium/status", response_model=PremiumStatusResponse)
async def get_premium_status(request: Request):
    """Get premium subscription status for current user"""
    user = await get_current_user(request)
    
    if not user:
        # For mobile app compatibility, check default_user
        subscription = await db.subscriptions.find_one({"user_id": "default_user"})
    else:
        subscription = await db.subscriptions.find_one({"user_id": user.user_id})
    
    if not subscription:
        return PremiumStatusResponse(is_premium=False)
    
    is_active = subscription.get('is_active', False)
    expires_at = subscription.get('expires_at')
    
    if expires_at:
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            is_active = False
            await db.subscriptions.update_one(
                {"user_id": subscription.get("user_id")},
                {"$set": {"is_active": False}}
            )
    
    return PremiumStatusResponse(
        is_premium=is_active,
        subscription_id=subscription.get('stripe_session_id'),
        plan=subscription.get('plan'),
        expires_at=expires_at.isoformat() if expires_at else None,
        stripe_customer_id=subscription.get('stripe_customer_id')
    )

# ============ CANCEL SUBSCRIPTION ENDPOINT ============
@api_router.post("/subscription/cancel")
async def cancel_subscription(request: Request, cancel_req: CancelSubscriptionRequest):
    """Cancel user's subscription"""
    user = await require_user(request)
    
    subscription = await db.subscriptions.find_one({"user_id": user.user_id})
    if not subscription or not subscription.get('is_active'):
        raise HTTPException(status_code=400, detail="Ingen aktiv prenumeration hittades")
    
    # Store cancellation info
    await db.subscriptions.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "is_active": False,
            "cancelled_at": datetime.now(timezone.utc),
            "cancellation_reason": cancel_req.reason,
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # Log cancellation
    await db.cancellations.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "email": user.email,
        "plan": subscription.get('plan'),
        "reason": cancel_req.reason,
        "cancelled_at": datetime.now(timezone.utc)
    })
    
    logger.info(f"Subscription cancelled for user {user.email}")
    
    return {
        "message": "Prenumerationen har avslutats",
        "expires_at": subscription.get('expires_at')
    }

# ============ FEEDBACK ENDPOINTS ============
@api_router.post("/feedback")
async def submit_feedback(feedback: FeedbackCreate, request: Request):
    """Submit user feedback/tips"""
    user = await get_current_user(request)
    
    new_feedback = Feedback(
        user_id=user.user_id if user else None,
        type=feedback.type,
        message=feedback.message,
        email=feedback.email or (user.email if user else None)
    )
    
    await db.feedback.insert_one(new_feedback.dict())
    
    # Optionally send email notification to admin
    if RESEND_API_KEY:
        try:
            admin_email = "onboarding@resend.dev"  # Change to actual admin email
            email_html = f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1a1a2e;">🐔 Nytt tips från Hönsgården</h2>
                <p><strong>Typ:</strong> {feedback.type}</p>
                <p><strong>Från:</strong> {feedback.email or 'Anonym'}</p>
                <p><strong>Meddelande:</strong></p>
                <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-top: 8px;">
                    {feedback.message}
                </div>
                <p style="color: #888; font-size: 12px; margin-top: 20px;">
                    Skickat: {datetime.now().strftime('%Y-%m-%d %H:%M')}
                </p>
            </div>
            """
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL,
                "to": [admin_email],
                "subject": f"🐔 Nytt tips: {feedback.type}",
                "html": email_html
            })
        except Exception as e:
            logger.error(f"Failed to send feedback notification: {e}")
    
    logger.info(f"Feedback received: {feedback.type}")
    
    return {"message": "Tack för ditt tips! Vi uppskattar din feedback."}

@api_router.get("/feedback")
async def get_all_feedback(request: Request, limit: int = 50):
    """Get all feedback (admin only - for future use)"""
    user = await require_user(request)
    
    # Simple admin check (expand this later)
    feedback_list = await db.feedback.find().sort("created_at", -1).to_list(limit)
    return [{"id": f.get("id"), "type": f.get("type"), "message": f.get("message"), 
             "email": f.get("email"), "status": f.get("status"), 
             "created_at": f.get("created_at")} for f in feedback_list]

# ============ USER DATA HELPER ============
async def get_user_id(request: Request) -> str:
    """Get user_id from session or return default for mobile app"""
    user = await get_current_user(request)
    return user.user_id if user else "default_user"

# ============ COOP SETTINGS ENDPOINTS ============
@api_router.get("/coop", response_model=CoopSettings)
async def get_coop_settings(request: Request):
    """Get or create coop settings"""
    user_id = await get_user_id(request)
    settings = await db.coop_settings.find_one({"user_id": user_id})
    if not settings:
        new_settings = CoopSettings(user_id=user_id)
        await db.coop_settings.insert_one(new_settings.dict())
        return new_settings
    return CoopSettings(**settings)

@api_router.put("/coop", response_model=CoopSettings)
async def update_coop_settings(update: CoopSettingsUpdate, request: Request):
    """Update coop settings"""
    user_id = await get_user_id(request)
    settings = await db.coop_settings.find_one({"user_id": user_id})
    if not settings:
        settings = CoopSettings(user_id=user_id).dict()
        await db.coop_settings.insert_one(settings)
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data['updated_at'] = datetime.utcnow()
    
    await db.coop_settings.update_one(
        {"user_id": user_id},
        {"$set": update_data}
    )
    
    updated = await db.coop_settings.find_one({"user_id": user_id})
    return CoopSettings(**updated)

# ============ FEATURE PREFERENCES ENDPOINTS ============
@api_router.get("/feature-preferences")
async def get_feature_preferences(request: Request):
    """Get user's feature preferences (Premium feature)"""
    user_id = await get_user_id(request)
    
    # Check premium status
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    prefs = await db.feature_preferences.find_one({"user_id": user_id})
    
    if not prefs:
        # Return defaults
        default_prefs = FeaturePreferences(user_id=user_id)
        return {
            "is_premium": is_premium,
            "can_customize": is_premium,
            "preferences": default_prefs.dict()
        }
    
    return {
        "is_premium": is_premium,
        "can_customize": is_premium,
        "preferences": {
            "show_flock_management": prefs.get("show_flock_management", True),
            "show_health_log": prefs.get("show_health_log", True),
            "show_feed_management": prefs.get("show_feed_management", True),
            "show_weather_data": prefs.get("show_weather_data", True),
            "show_hatching_module": prefs.get("show_hatching_module", True),
            "show_productivity_alerts": prefs.get("show_productivity_alerts", True),
            "show_economy_insights": prefs.get("show_economy_insights", True),
        }
    }

@api_router.put("/feature-preferences")
async def update_feature_preferences(update: FeaturePreferencesUpdate, request: Request):
    """Update user's feature preferences (Premium only)"""
    user_id = await get_user_id(request)
    
    # Check premium status
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    if not is_premium:
        raise HTTPException(status_code=403, detail="Premium krävs för att anpassa funktioner")
    
    prefs = await db.feature_preferences.find_one({"user_id": user_id})
    
    if not prefs:
        # Create new preferences
        new_prefs = FeaturePreferences(user_id=user_id, **update.dict(exclude_none=True))
        await db.feature_preferences.insert_one(new_prefs.dict())
        prefs = new_prefs.dict()
    else:
        # Update existing
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        update_data['updated_at'] = datetime.now(timezone.utc)
        
        await db.feature_preferences.update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )
        prefs = await db.feature_preferences.find_one({"user_id": user_id})
    
    return {
        "is_premium": True,
        "can_customize": True,
        "preferences": {
            "show_flock_management": prefs.get("show_flock_management", True),
            "show_health_log": prefs.get("show_health_log", True),
            "show_feed_management": prefs.get("show_feed_management", True),
            "show_weather_data": prefs.get("show_weather_data", True),
            "show_hatching_module": prefs.get("show_hatching_module", True),
            "show_productivity_alerts": prefs.get("show_productivity_alerts", True),
            "show_economy_insights": prefs.get("show_economy_insights", True),
        },
        "message": "Inställningar sparade!"
    }

# ============ FLOCK ENDPOINTS ============
@api_router.post("/flocks", response_model=Flock)
async def create_flock(flock: FlockCreate, request: Request):
    """Create a new flock (Premium: unlimited, Free: max 1)"""
    user_id = await get_user_id(request)
    
    # Check premium status for flock limits
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    existing_flocks = await db.flocks.count_documents({"user_id": user_id})
    if not is_premium and existing_flocks >= 1:
        raise HTTPException(status_code=403, detail="Gratis-konto tillåter endast 1 flock. Uppgradera till Premium för obegränsat antal.")
    
    new_flock = Flock(user_id=user_id, **flock.dict())
    await db.flocks.insert_one(new_flock.dict())
    return new_flock

@api_router.get("/flocks")
async def get_flocks(request: Request):
    """Get all flocks for the user"""
    user_id = await get_user_id(request)
    flocks = await db.flocks.find({"user_id": user_id}, {"_id": 0}).sort("name", 1).to_list(50)
    return flocks

@api_router.get("/flocks/{flock_id}")
async def get_flock(flock_id: str, request: Request):
    """Get a specific flock with its hens"""
    user_id = await get_user_id(request)
    flock = await db.flocks.find_one({"id": flock_id, "user_id": user_id}, {"_id": 0})
    if not flock:
        raise HTTPException(status_code=404, detail="Flock not found")
    
    # Get hens in this flock
    hens = await db.hens.find({"user_id": user_id, "flock_id": flock_id, "is_active": True}, {"_id": 0}).to_list(100)
    flock["hens"] = hens
    flock["hen_count"] = len(hens)
    
    return flock

@api_router.put("/flocks/{flock_id}")
async def update_flock(flock_id: str, flock: FlockCreate, request: Request):
    """Update a flock"""
    user_id = await get_user_id(request)
    result = await db.flocks.update_one(
        {"id": flock_id, "user_id": user_id},
        {"$set": {"name": flock.name, "description": flock.description}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Flock not found")
    return {"message": "Flock uppdaterad"}

@api_router.delete("/flocks/{flock_id}")
async def delete_flock(flock_id: str, request: Request):
    """Delete a flock (moves hens to no flock)"""
    user_id = await get_user_id(request)
    
    # Remove flock_id from all hens in this flock
    await db.hens.update_many(
        {"user_id": user_id, "flock_id": flock_id},
        {"$set": {"flock_id": None}}
    )
    
    result = await db.flocks.delete_one({"id": flock_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Flock not found")
    return {"message": "Flock borttagen"}

# ============ HEN ENDPOINTS ============
@api_router.get("/hens/productivity-alerts")
async def get_productivity_alerts(request: Request):
    """Get hens with productivity issues (14+ days without eggs).
    Only shows alerts if user actively uses per-hen egg tracking.
    """
    user_id = await get_user_id(request)
    today = date.today()
    
    # First check: Does the user use per-hen egg tracking at all?
    # Count eggs with hen_id in the last 90 days
    ninety_days_ago = (today - timedelta(days=90)).isoformat()
    eggs_with_hen = await db.egg_records.count_documents({
        "user_id": user_id,
        "date": {"$gte": ninety_days_ago},
        "hen_id": {"$exists": True, "$ne": None}
    })
    
    total_eggs = await db.egg_records.count_documents({
        "user_id": user_id,
        "date": {"$gte": ninety_days_ago}
    })
    
    # If user doesn't use per-hen tracking (less than 10% of eggs linked to hens), don't show alerts
    uses_per_hen_tracking = eggs_with_hen > 0 and (eggs_with_hen / max(total_eggs, 1)) >= 0.1
    
    if not uses_per_hen_tracking:
        return {
            "total_alerts": 0,
            "hens_with_issues": [],
            "threshold_days": 14,
            "tracking_enabled": False,
            "message": "Produktivitetsvarningar visas när du registrerar ägg per höna"
        }
    
    # Get all active hens
    hens = await db.hens.find(
        {"user_id": user_id, "is_active": True, "status": "active"},
        {"_id": 0, "id": 1, "name": 1, "breed": 1, "flock_id": 1}
    ).to_list(100)
    
    # Get all eggs for last 30 days
    thirty_days_ago = (today - timedelta(days=30)).isoformat()
    eggs = await db.egg_records.find(
        {"user_id": user_id, "date": {"$gte": thirty_days_ago}},
        {"_id": 0, "hen_id": 1, "date": 1, "count": 1}
    ).to_list(10000)
    
    # Calculate last egg date per hen
    last_egg_by_hen = {}
    for egg in eggs:
        hen_id = egg.get('hen_id')
        if hen_id:
            egg_date = egg.get('date', '')
            if hen_id not in last_egg_by_hen or egg_date > last_egg_by_hen[hen_id]:
                last_egg_by_hen[hen_id] = egg_date
    
    # Only check hens that have at least one egg registered (active tracking)
    # This avoids false positives for newly added hens
    tracked_hen_ids = set(last_egg_by_hen.keys())
    
    # Find hens with 14+ days without eggs (only among tracked hens)
    alerts = []
    fourteen_days_ago = (today - timedelta(days=14)).isoformat()
    
    for hen in hens:
        hen_id = hen['id']
        
        # Only alert for hens that have been tracked before
        if hen_id not in tracked_hen_ids:
            continue
            
        last_egg = last_egg_by_hen.get(hen_id)
        
        if last_egg and last_egg < fourteen_days_ago:
            last_date = datetime.strptime(last_egg, '%Y-%m-%d').date()
            days_since = (today - last_date).days
            
            alerts.append({
                "hen_id": hen_id,
                "hen_name": hen['name'],
                "breed": hen.get('breed'),
                "flock_id": hen.get('flock_id'),
                "last_egg_date": last_egg,
                "days_since_egg": days_since,
                "alert_level": "high" if days_since >= 21 else "medium"
            })
    
    # Sort by days since egg (most concerning first)
    alerts.sort(key=lambda x: x['days_since_egg'], reverse=True)
    
    return {
        "total_alerts": len(alerts),
        "hens_with_issues": alerts,
        "threshold_days": 14,
        "tracking_enabled": True
    }

@api_router.post("/hens", response_model=Hen)
async def create_hen(hen: HenCreate, request: Request):
    """Create a new hen profile"""
    user_id = await get_user_id(request)
    new_hen = Hen(user_id=user_id, **hen.dict())
    await db.hens.insert_one(new_hen.dict())
    
    active_hens = await db.hens.count_documents({"user_id": user_id, "is_active": True})
    await db.coop_settings.update_one({"user_id": user_id}, {"$set": {"hen_count": active_hens}}, upsert=True)
    
    return new_hen

@api_router.get("/hens", response_model=List[Hen])
async def get_hens(request: Request, active_only: bool = True):
    """Get all hens"""
    user_id = await get_user_id(request)
    query = {"user_id": user_id}
    if active_only:
        query["is_active"] = True
    hens = await db.hens.find(query).sort("name", 1).to_list(100)
    return [Hen(**h) for h in hens]

@api_router.get("/hens/{hen_id}", response_model=Hen)
async def get_hen(hen_id: str, request: Request):
    """Get a specific hen"""
    user_id = await get_user_id(request)
    hen = await db.hens.find_one({"id": hen_id, "user_id": user_id})
    if not hen:
        raise HTTPException(status_code=404, detail="Hen not found")
    return Hen(**hen)

@api_router.put("/hens/{hen_id}", response_model=Hen)
async def update_hen(hen_id: str, update: HenUpdate, request: Request):
    """Update a hen's profile"""
    user_id = await get_user_id(request)
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data['updated_at'] = datetime.utcnow()
    
    result = await db.hens.update_one(
        {"id": hen_id, "user_id": user_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hen not found")
    
    if 'is_active' in update_data:
        active_hens = await db.hens.count_documents({"user_id": user_id, "is_active": True})
        await db.coop_settings.update_one({"user_id": user_id}, {"$set": {"hen_count": active_hens}})
    
    hen = await db.hens.find_one({"id": hen_id})
    return Hen(**hen)

@api_router.delete("/hens/{hen_id}")
async def delete_hen(hen_id: str, request: Request):
    """Delete a hen (soft delete)"""
    user_id = await get_user_id(request)
    result = await db.hens.update_one(
        {"id": hen_id, "user_id": user_id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hen not found")
    
    active_hens = await db.hens.count_documents({"user_id": user_id, "is_active": True})
    await db.coop_settings.update_one({"user_id": user_id}, {"$set": {"hen_count": active_hens}})
    
    return {"message": "Hen removed"}

@api_router.post("/hens/{hen_id}/seen")
async def mark_hen_seen(hen_id: str, request: Request):
    """Mark a hen as seen today"""
    user_id = await get_user_id(request)
    today = date.today().isoformat()
    
    result = await db.hens.update_one(
        {"id": hen_id, "user_id": user_id},
        {"$set": {"last_seen": today, "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hen not found")
    
    return {"message": f"Markerad som sedd {today}", "last_seen": today}

@api_router.get("/hens/{hen_id}/profile")
async def get_hen_profile(hen_id: str, request: Request):
    """Get full hen profile with health logs and egg statistics"""
    user_id = await get_user_id(request)
    
    hen = await db.hens.find_one({"id": hen_id, "user_id": user_id}, {"_id": 0})
    if not hen:
        raise HTTPException(status_code=404, detail="Hen not found")
    
    # Get health logs for timeline
    health_logs = await db.health_logs.find(
        {"user_id": user_id, "hen_id": hen_id}, {"_id": 0}
    ).sort("date", -1).limit(50).to_list(50)
    
    # Get egg statistics
    all_eggs = await db.egg_records.find(
        {"user_id": user_id, "hen_id": hen_id}, {"_id": 0, "count": 1, "date": 1}
    ).to_list(10000)
    
    total_eggs = sum(e['count'] for e in all_eggs)
    
    # Calculate weekly and monthly averages
    today = date.today()
    week_ago = (today - timedelta(days=7)).isoformat()
    month_ago = (today - timedelta(days=30)).isoformat()
    
    week_eggs = sum(e['count'] for e in all_eggs if e.get('date', '') >= week_ago)
    month_eggs = sum(e['count'] for e in all_eggs if e.get('date', '') >= month_ago)
    
    # Last egg date
    eggs_sorted = sorted([e for e in all_eggs if e.get('date')], key=lambda x: x['date'], reverse=True)
    last_egg_date = eggs_sorted[0]['date'] if eggs_sorted else None
    
    # Days since last egg
    days_since_egg = None
    if last_egg_date:
        last_egg = datetime.strptime(last_egg_date, '%Y-%m-%d').date()
        days_since_egg = (today - last_egg).days
    
    # Check last_seen warning
    last_seen_warning = False
    days_since_seen = None
    if hen.get('last_seen'):
        last_seen_date = datetime.strptime(hen['last_seen'], '%Y-%m-%d').date()
        days_since_seen = (today - last_seen_date).days
        warning_days = hen.get('last_seen_warning_days', 3)
        last_seen_warning = days_since_seen >= warning_days
    
    # Egg data for graph (last 30 days)
    egg_graph_data = []
    for i in range(30):
        d = (today - timedelta(days=29-i)).isoformat()
        day_eggs = sum(e['count'] for e in all_eggs if e.get('date') == d)
        egg_graph_data.append({"date": d, "count": day_eggs})
    
    return {
        **hen,
        "health_logs": health_logs,
        "statistics": {
            "total_eggs": total_eggs,
            "eggs_this_week": week_eggs,
            "eggs_this_month": month_eggs,
            "weekly_average": round(week_eggs / 7, 1),
            "monthly_average": round(month_eggs / 30, 1),
            "last_egg_date": last_egg_date,
            "days_since_egg": days_since_egg,
            "no_eggs_warning": days_since_egg is not None and days_since_egg >= 14
        },
        "last_seen_warning": last_seen_warning,
        "days_since_seen": days_since_seen,
        "egg_graph_data": egg_graph_data
    }

# ============ HEALTH LOG ENDPOINTS ============
@api_router.post("/health-logs", response_model=HealthLog)
async def create_health_log(log: HealthLogCreate, request: Request):
    """Create a health log entry for a hen (Premium only)"""
    user_id = await get_user_id(request)
    
    # Check premium status - Health log is premium only
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    if not is_premium:
        raise HTTPException(status_code=403, detail="Premium krävs för hälsologgen. Uppgradera för att spåra hälsa per höna.")
    
    # Verify hen exists
    hen = await db.hens.find_one({"id": log.hen_id, "user_id": user_id})
    if not hen:
        raise HTTPException(status_code=404, detail="Hen not found")
    
    health_log = HealthLog(user_id=user_id, **log.dict())
    await db.health_logs.insert_one(health_log.dict())
    return health_log

@api_router.get("/health-logs")
async def get_health_logs(request: Request, hen_id: Optional[str] = None, limit: int = 50):
    """Get health logs, optionally filtered by hen (Premium only)"""
    user_id = await get_user_id(request)
    
    # Check premium status - Health log is premium only
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    if not is_premium:
        # Return empty list for free users - they shouldn't see health logs
        return []
    
    query = {"user_id": user_id}
    if hen_id:
        query["hen_id"] = hen_id
    
    logs = await db.health_logs.find(query, {"_id": 0}).sort("date", -1).limit(limit).to_list(limit)
    return logs

@api_router.get("/health-logs/{hen_id}")
async def get_hen_health_logs(hen_id: str, request: Request, limit: int = 20):
    """Get health logs for a specific hen"""
    user_id = await get_user_id(request)
    logs = await db.health_logs.find(
        {"user_id": user_id, "hen_id": hen_id}, 
        {"_id": 0}
    ).sort("date", -1).limit(limit).to_list(limit)
    return logs

@api_router.delete("/health-logs/{log_id}")
async def delete_health_log(log_id: str, request: Request):
    """Delete a health log entry"""
    user_id = await get_user_id(request)
    result = await db.health_logs.delete_one({"id": log_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Log not found")
    return {"message": "Log deleted"}

# ============ HATCHING/INCUBATION ENDPOINTS (ETAPP 3 - PREMIUM) ============
@api_router.post("/hatching")
async def create_hatching(hatching: HatchingCreate, request: Request):
    """Create a new hatching/incubation record (Premium only)"""
    user_id = await get_user_id(request)
    
    # Check premium status
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    if not is_premium:
        raise HTTPException(status_code=403, detail="Premium krävs för kläckningsmodulen")
    
    # Calculate expected hatch date
    start = datetime.strptime(hatching.start_date, '%Y-%m-%d').date()
    expected_hatch = (start + timedelta(days=hatching.expected_hatch_days)).isoformat()
    
    new_hatching = Hatching(
        user_id=user_id,
        start_date=hatching.start_date,
        expected_hatch_date=expected_hatch,
        egg_count=hatching.egg_count,
        hen_id=hatching.hen_id,
        incubator_name=hatching.incubator_name,
        notes=hatching.notes,
        expected_hatch_days=hatching.expected_hatch_days
    )
    
    await db.hatchings.insert_one(new_hatching.dict())
    
    return {
        **new_hatching.dict(),
        "message": f"Kläckning registrerad! Förväntat kläckningsdatum: {expected_hatch}",
        "days_remaining": hatching.expected_hatch_days
    }

@api_router.get("/hatching")
async def get_hatchings(request: Request, include_completed: bool = False):
    """Get all hatching records"""
    user_id = await get_user_id(request)
    today = date.today()
    
    query = {"user_id": user_id}
    if not include_completed:
        query["status"] = "incubating"
    
    hatchings = await db.hatchings.find(query, {"_id": 0}).sort("expected_hatch_date", 1).to_list(100)
    
    # Calculate days remaining for each
    result = []
    for h in hatchings:
        expected = datetime.strptime(h['expected_hatch_date'], '%Y-%m-%d').date()
        days_remaining = (expected - today).days
        
        # Get hen name if linked
        hen_name = None
        if h.get('hen_id'):
            hen = await db.hens.find_one({"id": h['hen_id']}, {"_id": 0, "name": 1})
            hen_name = hen.get('name') if hen else None
        
        result.append({
            **h,
            "days_remaining": days_remaining,
            "hen_name": hen_name,
            "is_overdue": days_remaining < 0 and h['status'] == 'incubating',
            "is_due_soon": 0 <= days_remaining <= 3 and h['status'] == 'incubating'
        })
    
    return result

@api_router.get("/hatching/{hatching_id}")
async def get_hatching_detail(hatching_id: str, request: Request):
    """Get detailed hatching record"""
    user_id = await get_user_id(request)
    
    hatching = await db.hatchings.find_one({"id": hatching_id, "user_id": user_id}, {"_id": 0})
    if not hatching:
        raise HTTPException(status_code=404, detail="Kläckning hittades inte")
    
    today = date.today()
    expected = datetime.strptime(hatching['expected_hatch_date'], '%Y-%m-%d').date()
    start = datetime.strptime(hatching['start_date'], '%Y-%m-%d').date()
    days_remaining = (expected - today).days
    days_elapsed = (today - start).days
    
    # Get hen name if linked
    hen_name = None
    if hatching.get('hen_id'):
        hen = await db.hens.find_one({"id": hatching['hen_id']}, {"_id": 0, "name": 1})
        hen_name = hen.get('name') if hen else None
    
    return {
        **hatching,
        "days_remaining": days_remaining,
        "days_elapsed": days_elapsed,
        "hen_name": hen_name,
        "progress_percent": min(100, int((days_elapsed / hatching.get('expected_hatch_days', 21)) * 100)),
        "is_overdue": days_remaining < 0 and hatching['status'] == 'incubating',
        "is_due_soon": 0 <= days_remaining <= 3 and hatching['status'] == 'incubating'
    }

@api_router.put("/hatching/{hatching_id}")
async def update_hatching(hatching_id: str, update: HatchingUpdate, request: Request):
    """Update a hatching record"""
    user_id = await get_user_id(request)
    
    hatching = await db.hatchings.find_one({"id": hatching_id, "user_id": user_id})
    if not hatching:
        raise HTTPException(status_code=404, detail="Kläckning hittades inte")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc)
    
    # If marking as hatched and no actual hatch date, use today
    if update.status == HatchingStatus.HATCHED and not update.actual_hatch_date:
        update_data['actual_hatch_date'] = date.today().isoformat()
    
    await db.hatchings.update_one(
        {"id": hatching_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    updated = await db.hatchings.find_one({"id": hatching_id}, {"_id": 0})
    
    message = "Kläckning uppdaterad"
    if update.status == HatchingStatus.HATCHED:
        message = f"🐣 Grattis! {update.hatched_count or updated.get('egg_count', 0)} kycklingar har kläckts!"
    elif update.status == HatchingStatus.FAILED:
        message = "Kläckning markerad som misslyckad"
    elif update.status == HatchingStatus.CANCELLED:
        message = "Kläckning avbruten"
    
    return {**updated, "message": message}

@api_router.delete("/hatching/{hatching_id}")
async def delete_hatching(hatching_id: str, request: Request):
    """Delete a hatching record"""
    user_id = await get_user_id(request)
    result = await db.hatchings.delete_one({"id": hatching_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kläckning hittades inte")
    return {"message": "Kläckning borttagen"}

@api_router.get("/hatching-alerts")
async def get_hatching_alerts(request: Request):
    """Get upcoming hatching alerts (for notifications)"""
    user_id = await get_user_id(request)
    today = date.today()
    
    # Get active hatchings
    hatchings = await db.hatchings.find(
        {"user_id": user_id, "status": "incubating"},
        {"_id": 0}
    ).to_list(100)
    
    alerts = []
    for h in hatchings:
        expected = datetime.strptime(h['expected_hatch_date'], '%Y-%m-%d').date()
        days_remaining = (expected - today).days
        
        # Get hen name if linked
        hen_name = None
        if h.get('hen_id'):
            hen = await db.hens.find_one({"id": h['hen_id']}, {"_id": 0, "name": 1})
            hen_name = hen.get('name') if hen else None
        
        source = hen_name or h.get('incubator_name', 'Kuvös')
        
        if days_remaining == 0:
            alerts.append({
                "hatching_id": h['id'],
                "type": "hatch_day",
                "priority": "high",
                "message": f"🐣 Idag är kläckningsdag! {h['egg_count']} ägg i {source}",
                "days_remaining": 0
            })
        elif days_remaining == 1:
            alerts.append({
                "hatching_id": h['id'],
                "type": "one_day",
                "priority": "high",
                "message": f"🥚 Imorgon kläcks {h['egg_count']} ägg i {source}!",
                "days_remaining": 1
            })
        elif days_remaining == 3:
            alerts.append({
                "hatching_id": h['id'],
                "type": "three_days",
                "priority": "medium",
                "message": f"🥚 3 dagar kvar tills kläckning i {source}",
                "days_remaining": 3
            })
        elif days_remaining < 0:
            alerts.append({
                "hatching_id": h['id'],
                "type": "overdue",
                "priority": "high",
                "message": f"⚠️ Kläckning försenad: {source} ({abs(days_remaining)} dagar sedan förväntad)",
                "days_remaining": days_remaining
            })
    
    return {
        "total_alerts": len(alerts),
        "alerts": alerts
    }

# ============ EGG RECORD ENDPOINTS ============
@api_router.post("/eggs", response_model=EggRecord)
async def create_egg_record(record: EggRecordCreate, request: Request):
    """Log eggs collected for a date"""
    user_id = await get_user_id(request)
    
    if record.hen_id:
        egg_record = EggRecord(user_id=user_id, **record.dict())
        await db.egg_records.insert_one(egg_record.dict())
        return egg_record
    
    existing = await db.egg_records.find_one({"date": record.date, "hen_id": None, "user_id": user_id})
    if existing:
        await db.egg_records.update_one(
            {"id": existing['id']},
            {"$set": {"count": record.count, "notes": record.notes}}
        )
        updated = await db.egg_records.find_one({"date": record.date, "hen_id": None, "user_id": user_id})
        return EggRecord(**updated)
    
    egg_record = EggRecord(user_id=user_id, **record.dict())
    await db.egg_records.insert_one(egg_record.dict())
    return egg_record

@api_router.get("/eggs", response_model=List[EggRecord])
async def get_egg_records(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    hen_id: Optional[str] = None,
    limit: int = 100
):
    """Get egg records with optional date filtering"""
    user_id = await get_user_id(request)
    query = {"user_id": user_id}
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    if hen_id:
        query["hen_id"] = hen_id
    
    records = await db.egg_records.find(query).sort("date", -1).to_list(limit)
    return [EggRecord(**r) for r in records]

@api_router.delete("/eggs/{record_id}")
async def delete_egg_record(record_id: str, request: Request):
    """Delete an egg record"""
    user_id = await get_user_id(request)
    result = await db.egg_records.delete_one({"id": record_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": "Record deleted"}

# ============ TRANSACTION ENDPOINTS ============
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction: TransactionCreate, request: Request):
    """Create a new transaction"""
    user_id = await get_user_id(request)
    trans = Transaction(user_id=user_id, **transaction.dict())
    await db.transactions.insert_one(trans.dict())
    return trans

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    type: Optional[TransactionType] = None,
    limit: int = 100
):
    """Get transactions with optional filtering"""
    user_id = await get_user_id(request)
    query = {"user_id": user_id}
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    if type:
        query["type"] = type
    
    transactions = await db.transactions.find(query).sort("date", -1).to_list(limit)
    return [Transaction(**t) for t in transactions]

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, request: Request):
    """Delete a transaction"""
    user_id = await get_user_id(request)
    result = await db.transactions.delete_one({"id": transaction_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted"}

# ============ FEED MANAGEMENT API (ETAPP 4) ============
@api_router.post("/feed", response_model=dict)
async def create_feed_record(record: FeedRecordCreate, request: Request):
    """Create a new feed record (Premium only)"""
    user_id = await get_user_id(request)
    
    # Check premium status - Feed management is premium only
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    if not is_premium:
        raise HTTPException(status_code=403, detail="Premium krävs för foderhantering. Uppgradera för att spåra foder och kostnader.")
    
    feed_record = FeedRecord(
        user_id=user_id,
        date=record.date,
        feed_type=record.feed_type,
        amount_kg=record.amount_kg,
        cost=record.cost,
        is_purchase=record.is_purchase,
        brand=record.brand,
        notes=record.notes
    )
    
    await db.feed_records.insert_one(feed_record.model_dump())
    
    # Update inventory
    if record.is_purchase:
        # Add to inventory
        await db.feed_inventory.update_one(
            {"user_id": user_id, "feed_type": record.feed_type.value},
            {
                "$inc": {"current_stock_kg": record.amount_kg},
                "$set": {
                    "updated_at": datetime.now(timezone.utc),
                    "brand": record.brand
                },
                "$setOnInsert": {
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "feed_type": record.feed_type.value,
                    "low_stock_threshold_kg": 5.0
                }
            },
            upsert=True
        )
    else:
        # Remove from inventory (consumption)
        await db.feed_inventory.update_one(
            {"user_id": user_id, "feed_type": record.feed_type.value},
            {
                "$inc": {"current_stock_kg": -record.amount_kg},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
    
    result = feed_record.model_dump()
    result.pop('_id', None)
    return result

@api_router.get("/feed")
async def get_feed_records(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    feed_type: Optional[str] = None,
    is_purchase: Optional[bool] = None,
    limit: int = 100
):
    """Get feed records with optional filters (Premium only)"""
    user_id = await get_user_id(request)
    
    # Check premium status - Feed management is premium only
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    if not is_premium:
        return []  # Return empty array for free users
    
    query = {"user_id": user_id}
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    if feed_type:
        query["feed_type"] = feed_type
    if is_purchase is not None:
        query["is_purchase"] = is_purchase
    
    cursor = db.feed_records.find(query, {"_id": 0}).sort("date", -1).limit(limit)
    records = await cursor.to_list(length=limit)
    return records

@api_router.delete("/feed/{record_id}")
async def delete_feed_record(record_id: str, request: Request):
    """Delete a feed record"""
    user_id = await get_user_id(request)
    
    # Get record first to update inventory
    record = await db.feed_records.find_one({"id": record_id, "user_id": user_id})
    if not record:
        raise HTTPException(status_code=404, detail="Feed record not found")
    
    # Reverse inventory change
    if record.get("is_purchase"):
        await db.feed_inventory.update_one(
            {"user_id": user_id, "feed_type": record["feed_type"]},
            {"$inc": {"current_stock_kg": -record["amount_kg"]}}
        )
    else:
        await db.feed_inventory.update_one(
            {"user_id": user_id, "feed_type": record["feed_type"]},
            {"$inc": {"current_stock_kg": record["amount_kg"]}}
        )
    
    await db.feed_records.delete_one({"id": record_id, "user_id": user_id})
    return {"message": "Feed record deleted"}

@api_router.get("/feed/inventory")
async def get_feed_inventory(request: Request):
    """Get current feed inventory and alerts (Premium only)"""
    user_id = await get_user_id(request)
    
    # Check premium status - Feed management is premium only
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    if not is_premium:
        return {"inventory": [], "low_stock_alerts": [], "total_stock_kg": 0}
    
    cursor = db.feed_inventory.find({"user_id": user_id}, {"_id": 0})
    inventory = await cursor.to_list(length=100)
    
    # Check for low stock alerts
    alerts = []
    for item in inventory:
        if item["current_stock_kg"] <= item.get("low_stock_threshold_kg", 5.0):
            alerts.append({
                "feed_type": item["feed_type"],
                "current_stock_kg": item["current_stock_kg"],
                "threshold_kg": item.get("low_stock_threshold_kg", 5.0),
                "brand": item.get("brand")
            })
    
    return {
        "inventory": inventory,
        "low_stock_alerts": alerts,
        "total_stock_kg": sum(i["current_stock_kg"] for i in inventory)
    }

@api_router.put("/feed/inventory/{feed_type}")
async def update_inventory_settings(feed_type: str, request: Request):
    """Update inventory settings like low stock threshold"""
    user_id = await get_user_id(request)
    body = await request.json()
    
    update_fields = {"updated_at": datetime.now(timezone.utc)}
    if "low_stock_threshold_kg" in body:
        update_fields["low_stock_threshold_kg"] = body["low_stock_threshold_kg"]
    if "current_stock_kg" in body:
        update_fields["current_stock_kg"] = body["current_stock_kg"]
    
    result = await db.feed_inventory.update_one(
        {"user_id": user_id, "feed_type": feed_type},
        {"$set": update_fields}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    
    return {"message": "Inventory updated"}

@api_router.get("/feed/statistics")
async def get_feed_statistics(request: Request, days: int = 30):
    """Get feed consumption and cost statistics"""
    user_id = await get_user_id(request)
    today = date.today()
    start_date = (today - timedelta(days=days)).isoformat()
    
    # Get consumption records
    cursor = db.feed_records.find({
        "user_id": user_id,
        "date": {"$gte": start_date},
        "is_purchase": False
    }, {"_id": 0})
    consumption_records = await cursor.to_list(length=1000)
    
    # Get purchase records
    cursor = db.feed_records.find({
        "user_id": user_id,
        "date": {"$gte": start_date},
        "is_purchase": True
    }, {"_id": 0})
    purchase_records = await cursor.to_list(length=1000)
    
    # Calculate statistics
    total_consumed_kg = sum(r["amount_kg"] for r in consumption_records)
    total_purchased_kg = sum(r["amount_kg"] for r in purchase_records)
    total_cost = sum(r.get("cost", 0) or 0 for r in purchase_records)
    
    # Get hen count for feed per hen
    hen_count = await db.hens.count_documents({"user_id": user_id, "status": "active"})
    
    # Daily consumption average
    daily_avg = total_consumed_kg / days if days > 0 else 0
    
    # Cost per kg
    cost_per_kg = total_cost / total_purchased_kg if total_purchased_kg > 0 else 0
    
    # By feed type
    by_type = {}
    for r in consumption_records:
        ft = r["feed_type"]
        if ft not in by_type:
            by_type[ft] = {"consumed_kg": 0, "cost": 0}
        by_type[ft]["consumed_kg"] += r["amount_kg"]
    
    for r in purchase_records:
        ft = r["feed_type"]
        if ft not in by_type:
            by_type[ft] = {"consumed_kg": 0, "cost": 0}
        by_type[ft]["cost"] += r.get("cost", 0) or 0
    
    return {
        "period_days": days,
        "total_consumed_kg": round(total_consumed_kg, 2),
        "total_purchased_kg": round(total_purchased_kg, 2),
        "total_cost": round(total_cost, 2),
        "daily_consumption_avg_kg": round(daily_avg, 3),
        "cost_per_kg": round(cost_per_kg, 2),
        "feed_per_hen_per_day_g": round((daily_avg * 1000 / hen_count), 1) if hen_count > 0 else 0,
        "hen_count": hen_count,
        "by_feed_type": by_type
    }

# ============ INSIGHTS ENDPOINT ============
@api_router.get("/insights")
async def get_insights(request: Request, include_premium: bool = False):
    """Get productivity insights: cost per egg, top hen, productivity index + Premium features"""
    user_id = await get_user_id(request)
    today = date.today()
    
    # Check premium status
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    # Get all eggs with dates
    all_eggs = await db.egg_records.find({"user_id": user_id}, {"_id": 0, "count": 1, "hen_id": 1, "date": 1}).to_list(10000)
    total_eggs = sum(e['count'] for e in all_eggs)
    
    # Get all transactions
    all_transactions = await db.transactions.find({"user_id": user_id}, {"_id": 0, "amount": 1, "type": 1, "date": 1}).to_list(10000)
    total_costs = sum(t['amount'] for t in all_transactions if t['type'] == 'cost')
    total_sales = sum(t['amount'] for t in all_transactions if t['type'] == 'sale')
    
    # Cost per egg
    cost_per_egg = total_costs / total_eggs if total_eggs > 0 else 0
    
    # Get eggs per hen
    eggs_per_hen = {}
    eggs_by_date = {}
    for egg in all_eggs:
        hen_id = egg.get('hen_id')
        egg_date = egg.get('date')
        if hen_id:
            eggs_per_hen[hen_id] = eggs_per_hen.get(hen_id, 0) + egg['count']
        if egg_date:
            eggs_by_date[egg_date] = eggs_by_date.get(egg_date, 0) + egg['count']
    
    # Find top hen
    top_hen = None
    if eggs_per_hen:
        top_hen_id = max(eggs_per_hen, key=eggs_per_hen.get)
        top_hen_eggs = eggs_per_hen[top_hen_id]
        hen_doc = await db.hens.find_one({"id": top_hen_id}, {"_id": 0, "name": 1, "id": 1})
        if hen_doc:
            top_hen = {"id": hen_doc['id'], "name": hen_doc['name'], "eggs": top_hen_eggs}
    
    # Productivity index (eggs per hen per day this month)
    settings = await db.coop_settings.find_one({"user_id": user_id})
    hen_count = settings['hen_count'] if settings else 0
    
    month_start = f"{today.year:04d}-{today.month:02d}-01"
    month_eggs = [e for e in all_eggs if e.get('date', '') >= month_start]
    month_total = sum(e['count'] for e in month_eggs)
    days_this_month = today.day
    
    productivity_index = 0
    if hen_count > 0 and days_this_month > 0:
        productivity_index = round((month_total / hen_count / days_this_month) * 100, 1)
    
    # Hen ranking with lifecycle
    hen_ranking = []
    hens = await db.hens.find({"user_id": user_id, "is_active": True}, {"_id": 0, "id": 1, "name": 1, "birth_date": 1}).to_list(100)
    for hen in hens:
        hen_eggs = eggs_per_hen.get(hen['id'], 0)
        age_days = None
        lifecycle = None
        if hen.get('birth_date'):
            try:
                birth = datetime.strptime(hen['birth_date'], '%Y-%m-%d').date()
                age_days = (today - birth).days
                if age_days < 140:
                    lifecycle = "unghöna"
                elif age_days < 365:
                    lifecycle = "peak"
                elif age_days < 730:
                    lifecycle = "normal"
                else:
                    lifecycle = "senior"
            except:
                pass
        hen_ranking.append({
            "id": hen['id'],
            "name": hen['name'],
            "eggs": hen_eggs,
            "age_days": age_days,
            "lifecycle": lifecycle
        })
    hen_ranking.sort(key=lambda x: x['eggs'], reverse=True)
    
    # Base response (free tier)
    response = {
        "cost_per_egg": round(cost_per_egg, 2),
        "total_eggs": total_eggs,
        "total_costs": total_costs,
        "top_hen": top_hen,
        "productivity_index": productivity_index,
        "hen_count": hen_count,
        "hen_ranking": hen_ranking[:10],
        "is_premium": is_premium
    }
    
    # ============ PREMIUM FEATURES ============
    if is_premium or include_premium:
        
        # 1. 7-DAY FORECAST (based on 14-day moving average)
        forecast_days = 14
        forecast_start = (today - timedelta(days=forecast_days)).isoformat()
        recent_eggs = [e for e in all_eggs if e.get('date', '') >= forecast_start]
        recent_total = sum(e['count'] for e in recent_eggs)
        daily_avg = recent_total / forecast_days if forecast_days > 0 else 0
        forecast_7_days = round(daily_avg * 7)
        
        response["premium"] = {
            "forecast_7_days": forecast_7_days,
            "daily_average": round(daily_avg, 1)
        }
        
        # 2. FLOCK PRODUCTION STATUS (30-day baseline)
        baseline_days = 30
        baseline_start = (today - timedelta(days=baseline_days)).isoformat()
        baseline_eggs = [e for e in all_eggs if e.get('date', '') >= baseline_start]
        baseline_total = sum(e['count'] for e in baseline_eggs)
        baseline_daily = baseline_total / baseline_days if baseline_days > 0 else 0
        
        # Compare last 7 days to baseline
        week_start = (today - timedelta(days=7)).isoformat()
        week_eggs = [e for e in all_eggs if e.get('date', '') >= week_start]
        week_total = sum(e['count'] for e in week_eggs)
        week_daily = week_total / 7
        
        if baseline_daily > 0:
            deviation_percent = ((week_daily - baseline_daily) / baseline_daily) * 100
        else:
            deviation_percent = 0
        
        if deviation_percent < -15:
            production_status = "low"
            production_text = "🟡 Låg produktion"
        elif deviation_percent > 15:
            production_status = "high"
            production_text = "🔵 Hög produktion"
        else:
            production_status = "normal"
            production_text = "🟢 Normal produktion"
        
        response["premium"]["production_status"] = production_status
        response["premium"]["production_text"] = production_text
        response["premium"]["deviation_percent"] = round(deviation_percent, 1)
        
        # 3. HEN DEVIATION DETECTION
        deviating_hens = []
        for hen in hens:
            hen_id = hen['id']
            hen_name = hen['name']
            
            # Eggs last 7 days for this hen
            week_hen_eggs = [e for e in all_eggs 
                           if e.get('hen_id') == hen_id and e.get('date', '') >= week_start]
            eggs_last_7 = sum(e['count'] for e in week_hen_eggs)
            
            # Eggs last 3 days for this hen
            three_days_start = (today - timedelta(days=3)).isoformat()
            three_day_hen_eggs = [e for e in all_eggs 
                                  if e.get('hen_id') == hen_id and e.get('date', '') >= three_days_start]
            eggs_last_3 = sum(e['count'] for e in three_day_hen_eggs)
            
            # Trigger: ≥1 egg last 7 days AND 0 eggs last 3 days
            if eggs_last_7 >= 1 and eggs_last_3 == 0:
                deviating_hens.append({
                    "id": hen_id,
                    "name": hen_name,
                    "eggs_last_7_days": eggs_last_7,
                    "eggs_last_3_days": eggs_last_3,
                    "alert": f"{hen_name} har inte värpt på 3 dagar"
                })
        
        response["premium"]["deviating_hens"] = deviating_hens
        
        # 4. ECONOMY COMPARISON (this month vs last month)
        # This month
        this_month_start = month_start
        this_month_transactions = [t for t in all_transactions if t.get('date', '') >= this_month_start]
        this_month_costs = sum(t['amount'] for t in this_month_transactions if t['type'] == 'cost')
        this_month_sales = sum(t['amount'] for t in this_month_transactions if t['type'] == 'sale')
        this_month_profit = this_month_sales - this_month_costs
        
        # Last month
        if today.month == 1:
            last_month_start = f"{today.year-1:04d}-12-01"
            last_month_end = f"{today.year:04d}-01-01"
        else:
            last_month_start = f"{today.year:04d}-{today.month-1:02d}-01"
            last_month_end = this_month_start
        
        last_month_transactions = [t for t in all_transactions 
                                   if last_month_start <= t.get('date', '') < last_month_end]
        last_month_costs = sum(t['amount'] for t in last_month_transactions if t['type'] == 'cost')
        last_month_sales = sum(t['amount'] for t in last_month_transactions if t['type'] == 'sale')
        last_month_profit = last_month_sales - last_month_costs
        
        # Comparison
        profit_change = this_month_profit - last_month_profit
        if last_month_profit != 0:
            profit_change_percent = (profit_change / abs(last_month_profit)) * 100
        else:
            profit_change_percent = 0 if this_month_profit == 0 else 100
        
        response["premium"]["economy"] = {
            "this_month": {
                "costs": this_month_costs,
                "sales": this_month_sales,
                "profit": this_month_profit
            },
            "last_month": {
                "costs": last_month_costs,
                "sales": last_month_sales,
                "profit": last_month_profit
            },
            "change": profit_change,
            "change_percent": round(profit_change_percent, 1)
        }
        
        # 5. INSIGHT SUMMARY (rule-based text)
        summary_parts = []
        
        # Production status
        summary_parts.append(f"Produktionen är {production_status.replace('low', 'låg').replace('high', 'hög').replace('normal', 'normal')}.")
        
        # Forecast
        summary_parts.append(f"Prognos: ~{forecast_7_days} ägg kommande vecka.")
        
        # Deviating hens
        if deviating_hens:
            hen_names = ", ".join([h['name'] for h in deviating_hens[:2]])
            if len(deviating_hens) > 2:
                hen_names += f" +{len(deviating_hens)-2} till"
            summary_parts.append(f"{hen_names} avviker från sitt snitt.")
        
        # Economy
        if profit_change > 0:
            summary_parts.append(f"Ekonomin är {profit_change:.0f} kr bättre än förra månaden.")
        elif profit_change < 0:
            summary_parts.append(f"Ekonomin är {abs(profit_change):.0f} kr sämre än förra månaden.")
        
        response["premium"]["summary"] = " ".join(summary_parts)
    
    return response

# ============ FREE TIER DATA LIMITS ============
# Free users can only VIEW the last 30 days. ALL data is always saved.
# When they upgrade to Premium, all historical data is unlocked.
FREE_DATA_HISTORY_DAYS = 30

@api_router.get("/account/data-limits")
async def get_data_limits(request: Request):
    """Get information about data limits and hidden data for free users"""
    user_id = await get_user_id(request)
    today = date.today()
    
    # Check premium status
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    # Check if trial/premium is expiring soon
    trial_warning = False
    days_until_expiry = None
    if subscription:
        expires_at = subscription.get('expires_at')
        if expires_at:
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            days_until_expiry = (expires_at.date() - today).days
            if 0 < days_until_expiry <= 7:
                trial_warning = True
    
    # If premium, no data limits apply
    if is_premium:
        return {
            "is_premium": True,
            "data_limit_days": None,
            "oldest_allowed_date": None,
            "hidden_data": None,
            "trial_warning": trial_warning,
            "days_until_expiry": days_until_expiry,
            "plan": subscription.get('plan') if subscription else None
        }
    
    # Calculate cutoff date for free users (30 days visibility)
    cutoff_date = (today - timedelta(days=FREE_DATA_HISTORY_DAYS)).isoformat()
    
    # Find oldest data to calculate months of hidden history
    oldest_egg = await db.egg_records.find_one(
        {"user_id": user_id},
        sort=[("date", 1)]
    )
    
    # Count hidden data (older than 30 days, but NOT deleted)
    eggs_hidden = await db.egg_records.count_documents({
        "user_id": user_id,
        "date": {"$lt": cutoff_date}
    })
    
    transactions_hidden = await db.transactions.count_documents({
        "user_id": user_id,
        "date": {"$lt": cutoff_date}
    })
    
    health_logs_hidden = await db.health_logs.count_documents({
        "user_id": user_id,
        "date": {"$lt": cutoff_date}
    })
    
    total_hidden = eggs_hidden + transactions_hidden + health_logs_hidden
    
    # Calculate months of hidden data
    months_hidden = 0
    if oldest_egg and oldest_egg.get('date'):
        oldest_date_str = oldest_egg['date']
        oldest_date = date.fromisoformat(oldest_date_str)
        cutoff = date.fromisoformat(cutoff_date)
        if oldest_date < cutoff:
            days_hidden = (cutoff - oldest_date).days
            months_hidden = max(1, days_hidden // 30)
    
    return {
        "is_premium": False,
        "data_limit_days": FREE_DATA_HISTORY_DAYS,
        "oldest_allowed_date": cutoff_date,
        "hidden_data": {
            "total": total_hidden,
            "eggs": eggs_hidden,
            "transactions": transactions_hidden,
            "health_logs": health_logs_hidden,
            "months_of_history": months_hidden
        },
        "trial_warning": trial_warning,
        "days_until_expiry": days_until_expiry,
        "plan": subscription.get('plan') if subscription else None,
        "message": f"Du har {months_hidden} månaders statistik sparad – uppgradera till Premium för att låsa upp den!" if months_hidden > 0 else None
    }

# ============ STATISTICS ENDPOINTS ============
@api_router.get("/statistics/today")
async def get_today_statistics(request: Request):
    """Get today's statistics"""
    user_id = await get_user_id(request)
    today = date.today().isoformat()
    
    egg_records = await db.egg_records.find({"date": today, "user_id": user_id}).to_list(100)
    eggs_today = sum(r['count'] for r in egg_records)
    
    transactions = await db.transactions.find({"date": today, "user_id": user_id}).to_list(100)
    costs = sum(t['amount'] for t in transactions if t['type'] == 'cost')
    sales = sum(t['amount'] for t in transactions if t['type'] == 'sale')
    
    settings = await db.coop_settings.find_one({"user_id": user_id})
    hen_count = settings['hen_count'] if settings else 0
    
    return {
        "date": today,
        "egg_count": eggs_today,
        "hen_count": hen_count,
        "total_costs": costs,
        "total_sales": sales,
        "net": sales - costs
    }

@api_router.get("/statistics/month/{year}/{month}")
async def get_month_statistics(year: int, month: int, request: Request):
    """Get statistics for a specific month"""
    user_id = await get_user_id(request)
    start_date = f"{year:04d}-{month:02d}-01"
    if month == 12:
        end_date = f"{year+1:04d}-01-01"
    else:
        end_date = f"{year:04d}-{month+1:02d}-01"
    
    eggs = await db.egg_records.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lt": end_date}
    }, {"_id": 0, "count": 1, "date": 1}).to_list(1000)
    total_eggs = sum(e['count'] for e in eggs)
    days_with_eggs = len(set(e['date'] for e in eggs))
    avg_eggs = total_eggs / days_with_eggs if days_with_eggs > 0 else 0
    
    transactions = await db.transactions.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lt": end_date}
    }, {"_id": 0, "amount": 1, "type": 1, "date": 1}).to_list(1000)
    total_costs = sum(t['amount'] for t in transactions if t['type'] == 'cost')
    total_sales = sum(t['amount'] for t in transactions if t['type'] == 'sale')
    
    settings = await db.coop_settings.find_one({"user_id": user_id})
    hen_count = settings['hen_count'] if settings else 0
    eggs_per_hen = total_eggs / hen_count if hen_count > 0 else None
    
    daily_data = {}
    for egg in eggs:
        d = egg['date']
        if d not in daily_data:
            daily_data[d] = {'date': d, 'eggs': 0, 'costs': 0, 'sales': 0}
        daily_data[d]['eggs'] += egg['count']
    
    for trans in transactions:
        d = trans['date']
        if d not in daily_data:
            daily_data[d] = {'date': d, 'eggs': 0, 'costs': 0, 'sales': 0}
        if trans['type'] == 'cost':
            daily_data[d]['costs'] += trans['amount']
        else:
            daily_data[d]['sales'] += trans['amount']
    
    daily_breakdown = sorted(daily_data.values(), key=lambda x: x['date'])
    
    return {
        "year": year,
        "month": month,
        "total_eggs": total_eggs,
        "avg_eggs_per_day": round(avg_eggs, 1),
        "total_costs": total_costs,
        "total_sales": total_sales,
        "net": total_sales - total_costs,
        "eggs_per_hen": round(eggs_per_hen, 1) if eggs_per_hen else None,
        "daily_breakdown": daily_breakdown
    }

@api_router.get("/statistics/year/{year}")
async def get_year_statistics(year: int, request: Request):
    """Get statistics for a specific year"""
    user_id = await get_user_id(request)
    start_date = f"{year:04d}-01-01"
    end_date = f"{year+1:04d}-01-01"
    
    eggs = await db.egg_records.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lt": end_date}
    }, {"_id": 0, "count": 1, "date": 1}).to_list(10000)
    total_eggs = sum(e['count'] for e in eggs)
    days_with_eggs = len(set(e['date'] for e in eggs))
    avg_eggs = total_eggs / days_with_eggs if days_with_eggs > 0 else 0
    
    transactions = await db.transactions.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lt": end_date}
    }, {"_id": 0, "amount": 1, "type": 1, "date": 1}).to_list(10000)
    total_costs = sum(t['amount'] for t in transactions if t['type'] == 'cost')
    total_sales = sum(t['amount'] for t in transactions if t['type'] == 'sale')
    
    monthly = []
    for m in range(1, 13):
        m_start = f"{year:04d}-{m:02d}-01"
        if m == 12:
            m_end = f"{year+1:04d}-01-01"
        else:
            m_end = f"{year:04d}-{m+1:02d}-01"
        
        m_eggs = sum(e['count'] for e in eggs if m_start <= e['date'] < m_end)
        m_costs = sum(t['amount'] for t in transactions if t['type'] == 'cost' and m_start <= t['date'] < m_end)
        m_sales = sum(t['amount'] for t in transactions if t['type'] == 'sale' and m_start <= t['date'] < m_end)
        
        monthly.append({
            "month": m,
            "eggs": m_eggs,
            "costs": m_costs,
            "sales": m_sales,
            "net": m_sales - m_costs
        })
    
    return {
        "year": year,
        "total_eggs": total_eggs,
        "avg_eggs_per_day": round(avg_eggs, 1),
        "total_costs": total_costs,
        "total_sales": total_sales,
        "net": total_sales - total_costs,
        "monthly_breakdown": monthly
    }

@api_router.get("/statistics/summary")
async def get_summary_statistics(request: Request):
    """Get overall summary statistics"""
    user_id = await get_user_id(request)
    
    all_eggs = await db.egg_records.find({"user_id": user_id}, {"_id": 0, "count": 1, "date": 1}).to_list(10000)
    all_transactions = await db.transactions.find({"user_id": user_id}, {"_id": 0, "amount": 1, "type": 1, "date": 1}).to_list(10000)
    settings = await db.coop_settings.find_one({"user_id": user_id})
    
    total_eggs = sum(e['count'] for e in all_eggs)
    total_costs = sum(t['amount'] for t in all_transactions if t['type'] == 'cost')
    total_sales = sum(t['amount'] for t in all_transactions if t['type'] == 'sale')
    hen_count = settings['hen_count'] if settings else 0
    
    today = date.today()
    month_start = f"{today.year:04d}-{today.month:02d}-01"
    month_eggs = sum(e['count'] for e in all_eggs if e['date'] >= month_start)
    month_costs = sum(t['amount'] for t in all_transactions if t['type'] == 'cost' and t['date'] >= month_start)
    month_sales = sum(t['amount'] for t in all_transactions if t['type'] == 'sale' and t['date'] >= month_start)
    
    return {
        "hen_count": hen_count,
        "total_eggs_all_time": total_eggs,
        "total_costs_all_time": total_costs,
        "total_sales_all_time": total_sales,
        "net_all_time": total_sales - total_costs,
        "this_month": {
            "eggs": month_eggs,
            "costs": month_costs,
            "sales": month_sales,
            "net": month_sales - month_costs
        }
    }

# ============ EMAIL REMINDERS ============
class ReminderSettings(BaseModel):
    enabled: bool = True
    time: str = "18:00"  # HH:MM format

class EmailRequest(BaseModel):
    recipient_email: EmailStr
    subject: str
    html_content: str

@api_router.get("/reminders/settings")
async def get_reminder_settings(request: Request):
    """Get reminder settings for current user"""
    user = await require_user(request)
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return {
        "enabled": user_doc.get("reminder_enabled", True),
        "time": user_doc.get("reminder_time", "18:00")
    }

@api_router.put("/reminders/settings")
async def update_reminder_settings(request: Request, settings: ReminderSettings):
    """Update reminder settings for current user"""
    user = await require_user(request)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "reminder_enabled": settings.enabled,
            "reminder_time": settings.time
        }}
    )
    return {"message": "Påminnelseinställningar uppdaterade", "enabled": settings.enabled, "time": settings.time}

async def send_reminder_email(email: str, name: str, coop_name: str):
    """Send egg collection reminder email"""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured, skipping email")
        return False
    
    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <span style="font-size: 48px;">🥚</span>
        </div>
        <h1 style="color: #1a1a2e; text-align: center; font-size: 24px;">Hej {name}!</h1>
        <p style="color: #333; font-size: 16px; line-height: 1.6; text-align: center;">
            Dags att plocka ägg från <strong>{coop_name}</strong>?
        </p>
        <p style="color: #666; font-size: 14px; text-align: center; margin-top: 20px;">
            Glöm inte att registrera dagens ägg i Hönsgården-appen! 🐔
        </p>
        <div style="text-align: center; margin-top: 30px;">
            <a href="{APP_URL}/api/web/" 
               style="background-color: #4ade80; color: #1a1a2e; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-weight: 600; display: inline-block;">
                Öppna Hönsgården
            </a>
        </div>
        <p style="color: #888; font-size: 12px; text-align: center; margin-top: 40px;">
            Du får detta mail eftersom du aktiverat påminnelser i Hönsgården.<br>
            <a href="{APP_URL}/api/web/settings" style="color: #888;">Ändra inställningar</a>
        </p>
    </div>
    """
    
    params = {
        "from": SENDER_EMAIL,
        "to": [email],
        "subject": f"🥚 Påminnelse: Dags att plocka ägg!",
        "html": html_content
    }
    
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Reminder email sent to {email}, id: {result.get('id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to send reminder email to {email}: {e}")
        return False

@api_router.post("/reminders/send-test")
async def send_test_reminder(request: Request):
    """Send a test reminder email to current user"""
    user = await require_user(request)
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    coop = await db.coop_settings.find_one({"user_id": user.user_id}, {"_id": 0})
    coop_name = coop.get("coop_name", "Min Hönsgård") if coop else "Min Hönsgård"
    
    success = await send_reminder_email(user.email, user.name, coop_name)
    if success:
        return {"message": f"Testpåminnelse skickad till {user.email}"}
    else:
        raise HTTPException(status_code=500, detail="Kunde inte skicka påminnelse")

@api_router.post("/reminders/send-all")
async def trigger_all_reminders():
    """Trigger reminder emails for all users with reminders enabled (for cron job)"""
    users = await db.users.find({"reminder_enabled": True}, {"_id": 0}).to_list(1000)
    sent_count = 0
    
    for user_doc in users:
        email = user_doc.get("email")
        name = user_doc.get("name", "")
        user_id = user_doc.get("user_id")
        
        coop = await db.coop_settings.find_one({"user_id": user_id}, {"_id": 0})
        coop_name = coop.get("coop_name", "Min Hönsgård") if coop else "Min Hönsgård"
        
        if await send_reminder_email(email, name, coop_name):
            sent_count += 1
    
    return {"message": f"Skickade {sent_count} påminnelser", "total_users": len(users)}

# ============ ADMIN ENDPOINTS ============
@api_router.get("/admin/check")
async def check_admin_status(request: Request):
    """Check if current user is an admin"""
    user = await get_current_user(request)
    if not user:
        return {"is_admin": False}
    return {"is_admin": user.email in ADMIN_EMAILS, "email": user.email}

@api_router.get("/admin/stats")
async def get_admin_stats(request: Request):
    """Get dashboard statistics for admin"""
    await require_admin(request)
    
    # Count users
    total_users = await db.users.count_documents({})
    
    # Count active subscriptions
    active_subs = await db.subscriptions.count_documents({"is_active": True})
    
    # Count by plan
    monthly_subs = await db.subscriptions.count_documents({"is_active": True, "plan": "monthly"})
    yearly_subs = await db.subscriptions.count_documents({"is_active": True, "plan": "yearly"})
    
    # Calculate MRR (Monthly Recurring Revenue)
    monthly_price = 19  # SEK
    yearly_price = 149  # SEK per year = 12.42/month
    mrr = (monthly_subs * monthly_price) + (yearly_subs * (yearly_price / 12))
    
    # Recent signups (last 7 days)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_users = await db.users.count_documents({"created_at": {"$gte": week_ago}})
    
    # Feedback count
    new_feedback = await db.feedback.count_documents({"status": "new"})
    total_feedback = await db.feedback.count_documents({})
    
    # Cancellations last 30 days
    month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    recent_cancellations = await db.cancellations.count_documents({"cancelled_at": {"$gte": month_ago}})
    
    return {
        "users": {
            "total": total_users,
            "new_last_7_days": recent_users
        },
        "subscriptions": {
            "active": active_subs,
            "monthly": monthly_subs,
            "yearly": yearly_subs,
            "mrr": round(mrr, 2)
        },
        "feedback": {
            "new": new_feedback,
            "total": total_feedback
        },
        "cancellations": {
            "last_30_days": recent_cancellations
        }
    }

@api_router.get("/admin/users")
async def get_admin_users(request: Request, skip: int = 0, limit: int = 50):
    """Get all users for admin"""
    await require_admin(request)
    
    users = await db.users.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents({})
    
    # Enrich with subscription data
    enriched_users = []
    for u in users:
        sub = await db.subscriptions.find_one({"user_id": u.get("user_id")}, {"_id": 0})
        enriched_users.append({
            "user_id": u.get("user_id"),
            "email": u.get("email"),
            "name": u.get("name"),
            "picture": u.get("picture"),
            "created_at": u.get("created_at"),
            "is_premium": sub.get("is_active", False) if sub else False,
            "plan": sub.get("plan") if sub else None,
            "reminder_enabled": u.get("reminder_enabled", False)
        })
    
    return {"users": enriched_users, "total": total, "skip": skip, "limit": limit}

@api_router.get("/admin/subscriptions")
async def get_admin_subscriptions(request: Request, active_only: bool = False):
    """Get all subscriptions for admin"""
    await require_admin(request)
    
    query = {"is_active": True} if active_only else {}
    subs = await db.subscriptions.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    
    # Enrich with user data
    enriched_subs = []
    for s in subs:
        user = await db.users.find_one({"user_id": s.get("user_id")}, {"_id": 0, "email": 1, "name": 1})
        enriched_subs.append({
            "user_id": s.get("user_id"),
            "email": user.get("email") if user else "Unknown",
            "name": user.get("name") if user else "Unknown",
            "plan": s.get("plan"),
            "is_active": s.get("is_active"),
            "created_at": s.get("created_at"),
            "expires_at": s.get("expires_at"),
            "cancelled_at": s.get("cancelled_at")
        })
    
    return {"subscriptions": enriched_subs, "total": len(enriched_subs)}

@api_router.get("/admin/feedback")
async def get_admin_feedback(request: Request, status: str = None):
    """Get all feedback for admin"""
    await require_admin(request)
    
    query = {"status": status} if status else {}
    feedback_list = await db.feedback.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return {"feedback": feedback_list, "total": len(feedback_list)}

@api_router.put("/admin/feedback/{feedback_id}")
async def update_feedback_status(request: Request, feedback_id: str, status: str):
    """Update feedback status"""
    await require_admin(request)
    
    result = await db.feedback.update_one(
        {"id": feedback_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    return {"message": "Status uppdaterad", "feedback_id": feedback_id, "status": status}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(request: Request, user_id: str):
    """Delete a user and all their data (admin only)"""
    await require_admin(request)
    
    # Delete user data from all collections
    await db.users.delete_one({"user_id": user_id})
    await db.subscriptions.delete_one({"user_id": user_id})
    await db.user_sessions.delete_many({"user_id": user_id})
    await db.coop_settings.delete_one({"user_id": user_id})
    await db.egg_records.delete_many({"user_id": user_id})
    await db.transactions.delete_many({"user_id": user_id})
    
    logger.info(f"Admin deleted user {user_id}")
    
    return {"message": "Användare raderad", "user_id": user_id}

@api_router.put("/admin/subscriptions/{user_id}")
async def update_user_subscription(request: Request, user_id: str, is_active: bool, plan: str = None):
    """Update a user's subscription (admin only)"""
    await require_admin(request)
    
    update_data = {"is_active": is_active, "updated_at": datetime.now(timezone.utc)}
    if plan:
        update_data["plan"] = plan
    if is_active:
        # Set expiry to 1 year from now for manual activation
        update_data["expires_at"] = datetime.now(timezone.utc) + timedelta(days=365)
    
    result = await db.subscriptions.update_one(
        {"user_id": user_id},
        {"$set": update_data},
        upsert=True
    )
    
    logger.info(f"Admin updated subscription for user {user_id}: active={is_active}")
    
    return {"message": "Prenumeration uppdaterad", "user_id": user_id, "is_active": is_active}

# ============ AI PREMIUM FEATURES ============
@api_router.get("/ai/daily-report")
async def get_ai_daily_report(request: Request):
    """Generate AI daily report - Premium only
    Returns a blurred preview for free users"""
    user_id = await get_user_id(request)
    
    # Get user info
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    user_name = user.get("name", "").split()[0] if user and user.get("name") else "hönsägare"
    
    # Check premium status
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    # Get coop name
    coop = await db.coops.find_one({"user_id": user_id}, {"_id": 0})
    coop_name = coop.get("coop_name", "hönsgården") if coop else "hönsgården"
    
    # Get today's data
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    eggs_today = await db.eggs.find({"user_id": user_id, "date": today}).to_list(100)
    total_eggs = sum(e.get('count', 0) for e in eggs_today)
    hens = await db.hens.find({"user_id": user_id, "is_active": True}).to_list(100)
    hen_count = len(hens)
    
    # Get recent health logs
    health_logs = await db.health_logs.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("date", -1).limit(5).to_list(5)
    
    # Get productivity alerts
    alerts = []
    for hen in hens:
        hen_eggs = await db.eggs.find(
            {"user_id": user_id, "hen_id": hen.get("id")}
        ).sort("date", -1).limit(7).to_list(7)
        if len(hen_eggs) < 2:
            alerts.append(f"{hen.get('name', 'Okänd höna')} har inte värpt på länge")
    
    if not is_premium:
        # Return blurred/preview data for free users
        return {
            "is_premium": False,
            "preview": True,
            "report": {
                "summary": "🔒 Din AI-genererade dagsrapport är klar! Uppgradera till Premium för att läsa den.",
                "blurred_preview": f"Idag har du samlat {total_eggs} ägg från {hen_count} höns. [Uppgradera för full rapport med rekommendationer och analys...]",
                "eggs_today": total_eggs,
                "hen_count": hen_count,
                "alerts_count": len(alerts)
            }
        }
    
    # Generate AI report for premium users
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"daily-report-{user_id}-{today}",
            system_message="""Du är Agda, en hjälpsam och erfaren hönsskötare-assistent med bondsk charm. 
Du skriver korta, personliga och uppmuntrande rapporter på svenska. 
Du har alltid tips om hönsskötsel och är varm och omtänksam i tonen.
Använd emojis sparsamt (max 2-3 per rapport).
Avsluta alltid med 'Kacklande hälsningar, Agda 🐔'"""
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Skriv en kort daglig rapport för {user_name} som har {coop_name}.

Data för idag ({today}):
- Antal ägg idag: {total_eggs}
- Antal aktiva höns: {hen_count}
- Produktivitetsvarningar: {', '.join(alerts) if alerts else 'Inga'}
- Senaste hälsoanteckningar: {len(health_logs)} loggade

Rapporten ska innehålla:
1. En personlig hälsning till {user_name}
2. En kort sammanfattning av dagens produktion
3. En observation eller uppmuntran
4. Ett praktiskt tips (om relevant)
5. Avsluta med din signatur

Håll det under 100 ord och personligt."""
        
        message = UserMessage(text=prompt)
        ai_response = await chat.send_message(message)
        
        return {
            "is_premium": True,
            "preview": False,
            "report": {
                "summary": ai_response,
                "eggs_today": total_eggs,
                "hen_count": hen_count,
                "alerts": alerts,
                "generated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    except Exception as e:
        logging.error(f"AI report generation failed: {e}")
        return {
            "is_premium": True,
            "preview": False,
            "report": {
                "summary": f"🐔 Daglig sammanfattning: {total_eggs} ägg från {hen_count} höns. " + 
                          (f"⚠️ {len(alerts)} varningar kräver uppmärksamhet." if alerts else "Allt ser bra ut!"),
                "eggs_today": total_eggs,
                "hen_count": hen_count,
                "alerts": alerts,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "fallback": True
            }
        }


@api_router.get("/ai/egg-forecast")
async def get_egg_forecast(request: Request):
    """7-day egg production forecast - Premium only
    Returns a blurred preview for free users"""
    user_id = await get_user_id(request)
    
    # Check premium status
    subscription = await db.subscriptions.find_one({"user_id": user_id})
    is_premium = subscription.get('is_active', False) if subscription else False
    
    # Get historical data (last 30 days)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).strftime('%Y-%m-%d')
    eggs_history = await db.eggs.find(
        {"user_id": user_id, "date": {"$gte": thirty_days_ago}}
    ).to_list(1000)
    
    # Calculate daily totals
    daily_totals = {}
    for egg in eggs_history:
        date_str = egg.get('date')
        if date_str:
            daily_totals[date_str] = daily_totals.get(date_str, 0) + egg.get('count', 0)
    
    # Calculate average
    if daily_totals:
        avg_daily = sum(daily_totals.values()) / len(daily_totals)
    else:
        avg_daily = 0
    
    # Get active hen count
    hens = await db.hens.count_documents({"user_id": user_id, "is_active": True})
    
    # Simple forecast (with slight variation)
    import random
    forecast = []
    for i in range(7):
        date_future = (datetime.now(timezone.utc) + timedelta(days=i+1)).strftime('%Y-%m-%d')
        # Add some realistic variation
        variation = random.uniform(0.85, 1.15)
        predicted = round(avg_daily * variation)
        forecast.append({
            "date": date_future,
            "predicted_eggs": max(0, predicted),
            "confidence": "medium" if len(daily_totals) > 7 else "low"
        })
    
    total_forecast = sum(f['predicted_eggs'] for f in forecast)
    
    if not is_premium:
        # Return blurred preview for free users
        return {
            "is_premium": False,
            "preview": True,
            "forecast": {
                "message": "🔒 Din 7-dagars prognos är klar! Uppgradera till Premium för att se den.",
                "blurred_preview": f"Förväntat antal ägg nästa vecka: ~{total_forecast} ägg baserat på historik.",
                "avg_daily": round(avg_daily, 1),
                "hen_count": hens,
                "days_of_data": len(daily_totals)
            }
        }
    
    return {
        "is_premium": True,
        "preview": False,
        "forecast": {
            "daily_predictions": forecast,
            "total_predicted": total_forecast,
            "avg_daily": round(avg_daily, 1),
            "hen_count": hens,
            "days_of_data": len(daily_totals),
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    }


# ============ BASIC ROUTES ============
@api_router.get("/")
async def root():
    return {"message": "Hönsgården API", "version": "2.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ WEBAPP STATIC FILES ============
# Serve webapp at ROOT (honsgarden.se) and keep /api/web for backwards compatibility
if WEBAPP_DIR.exists():
    # Mount assets folder at root and /api/web for backwards compatibility
    app.mount("/assets", StaticFiles(directory=str(WEBAPP_DIR / "assets")), name="static_assets_root")
    app.mount("/api/web/assets", StaticFiles(directory=str(WEBAPP_DIR / "assets")), name="static_assets_api")
    
    # Serve favicon
    @app.get("/favicon.svg")
    async def favicon_root():
        return FileResponse(str(WEBAPP_DIR / "favicon.svg"))
    
    @app.get("/favicon.ico")
    async def favicon_ico():
        if (WEBAPP_DIR / "favicon.ico").exists():
            return FileResponse(str(WEBAPP_DIR / "favicon.ico"))
        return FileResponse(str(WEBAPP_DIR / "favicon.svg"))
    
    @app.get("/api/web/favicon.svg")
    async def favicon_api():
        return FileResponse(str(WEBAPP_DIR / "favicon.svg"))
    
    # Serve webapp at ROOT - this catches all non-API routes
    @app.get("/")
    async def serve_webapp_root():
        """Serve the React webapp at root"""
        return FileResponse(str(WEBAPP_DIR / "index.html"))
    
    @app.get("/login")
    @app.get("/eggs")
    @app.get("/hens")
    @app.get("/finance")
    @app.get("/statistics")
    @app.get("/settings")
    @app.get("/premium")
    @app.get("/admin")
    @app.get("/checkout-success")
    async def serve_webapp_routes(request: Request):
        """Serve the React webapp for SPA routes"""
        return FileResponse(str(WEBAPP_DIR / "index.html"))
    
    # Keep /api/web for backwards compatibility
    @app.get("/api/web")
    @app.get("/api/web/")
    @app.get("/api/web/{full_path:path}")
    async def serve_webapp_api(request: Request, full_path: str = ""):
        """Serve the React webapp (backwards compatible)"""
        return FileResponse(str(WEBAPP_DIR / "index.html"))

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
