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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

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
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

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

class Hen(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default_user"
    name: str
    breed: Optional[str] = None
    color: Optional[str] = None
    birth_date: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class HenCreate(BaseModel):
    name: str
    breed: Optional[str] = None
    color: Optional[str] = None
    birth_date: Optional[str] = None
    notes: Optional[str] = None

class HenUpdate(BaseModel):
    name: Optional[str] = None
    breed: Optional[str] = None
    color: Optional[str] = None
    birth_date: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

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

class TransactionCreate(BaseModel):
    date: str
    type: TransactionType
    category: TransactionCategory
    amount: float
    description: Optional[str] = None
    quantity: Optional[int] = None

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
    
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        return None
    
    return User(**user)

async def require_user(request: Request) -> User:
    """Require authenticated user, raise 401 if not"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

# ============ AUTH ENDPOINTS ============
@api_router.post("/auth/session")
async def exchange_session(session_req: SessionRequest, response: Response):
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
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
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
    
    # Create checkout session
    checkout_req = CheckoutSessionRequest(
        stripe_price_id=price_id,
        quantity=1,
        success_url=success_url,
        cancel_url=cancel_url,
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

# ============ HEN ENDPOINTS ============
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
    }).to_list(1000)
    total_eggs = sum(e['count'] for e in eggs)
    days_with_eggs = len(set(e['date'] for e in eggs))
    avg_eggs = total_eggs / days_with_eggs if days_with_eggs > 0 else 0
    
    transactions = await db.transactions.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lt": end_date}
    }).to_list(1000)
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
    }).to_list(10000)
    total_eggs = sum(e['count'] for e in eggs)
    days_with_eggs = len(set(e['date'] for e in eggs))
    avg_eggs = total_eggs / days_with_eggs if days_with_eggs > 0 else 0
    
    transactions = await db.transactions.find({
        "user_id": user_id,
        "date": {"$gte": start_date, "$lt": end_date}
    }).to_list(10000)
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
    
    all_eggs = await db.egg_records.find({"user_id": user_id}).to_list(10000)
    all_transactions = await db.transactions.find({"user_id": user_id}).to_list(10000)
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
            <a href="https://honsgarden-deploy.preview.emergentagent.com/api/web/" 
               style="background-color: #4ade80; color: #1a1a2e; padding: 14px 28px; text-decoration: none; border-radius: 50px; font-weight: 600; display: inline-block;">
                Öppna Hönsgården
            </a>
        </div>
        <p style="color: #888; font-size: 12px; text-align: center; margin-top: 40px;">
            Du får detta mail eftersom du aktiverat påminnelser i Hönsgården.<br>
            <a href="https://honsgarden-deploy.preview.emergentagent.com/api/web/settings" style="color: #888;">Ändra inställningar</a>
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
