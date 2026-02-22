from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, date
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

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

# ============ MODELS ============

# Coop Settings (hen count, coop name)
class CoopSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    coop_name: str = "Min Hönsgård"
    hen_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CoopSettingsUpdate(BaseModel):
    coop_name: Optional[str] = None
    hen_count: Optional[int] = None

# Individual Hen Profile
class Hen(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    breed: Optional[str] = None
    color: Optional[str] = None
    birth_date: Optional[str] = None  # YYYY-MM-DD
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

# Egg Record - daily egg collection
class EggRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # YYYY-MM-DD format
    count: int
    hen_id: Optional[str] = None  # Optional: link to specific hen
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class EggRecordCreate(BaseModel):
    date: str  # YYYY-MM-DD format
    count: int
    hen_id: Optional[str] = None
    notes: Optional[str] = None

class EggRecordUpdate(BaseModel):
    count: Optional[int] = None
    hen_id: Optional[str] = None
    notes: Optional[str] = None

# Transaction - costs and income
class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str  # YYYY-MM-DD format
    type: TransactionType
    category: TransactionCategory
    amount: float  # Always positive, type determines +/-
    description: Optional[str] = None
    quantity: Optional[int] = None  # For egg sales - number of eggs sold
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TransactionCreate(BaseModel):
    date: str
    type: TransactionType
    category: TransactionCategory
    amount: float
    description: Optional[str] = None
    quantity: Optional[int] = None

# Premium/Subscription
class PremiumSubscription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default_user"  # For now, single user
    is_active: bool = False
    plan: Optional[SubscriptionPlan] = None
    store: Optional[str] = None  # "apple" or "google"
    store_subscription_id: Optional[str] = None
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PremiumStatusResponse(BaseModel):
    is_premium: bool
    subscription_id: Optional[str] = None
    plan: Optional[str] = None
    expires_at: Optional[str] = None

class PremiumWebhookPayload(BaseModel):
    event_type: str
    store: str
    store_subscription_id: str
    plan: SubscriptionPlan
    expires_at: Optional[str] = None

# ============ COOP SETTINGS ENDPOINTS ============

@api_router.get("/coop", response_model=CoopSettings)
async def get_coop_settings():
    """Get or create coop settings"""
    settings = await db.coop_settings.find_one()
    if not settings:
        new_settings = CoopSettings()
        await db.coop_settings.insert_one(new_settings.dict())
        return new_settings
    return CoopSettings(**settings)

@api_router.put("/coop", response_model=CoopSettings)
async def update_coop_settings(update: CoopSettingsUpdate):
    """Update coop settings"""
    settings = await db.coop_settings.find_one()
    if not settings:
        settings = CoopSettings().dict()
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data['updated_at'] = datetime.utcnow()
    
    await db.coop_settings.update_one(
        {"id": settings.get('id', settings.get('_id'))},
        {"$set": update_data},
        upsert=True
    )
    
    updated = await db.coop_settings.find_one()
    return CoopSettings(**updated)

# ============ HEN ENDPOINTS ============

@api_router.post("/hens", response_model=Hen)
async def create_hen(hen: HenCreate):
    """Create a new hen profile"""
    new_hen = Hen(**hen.dict())
    await db.hens.insert_one(new_hen.dict())
    
    # Update hen count in coop settings
    active_hens = await db.hens.count_documents({"is_active": True})
    await db.coop_settings.update_one({}, {"$set": {"hen_count": active_hens}}, upsert=True)
    
    return new_hen

@api_router.get("/hens", response_model=List[Hen])
async def get_hens(active_only: bool = True):
    """Get all hens"""
    query = {"is_active": True} if active_only else {}
    hens = await db.hens.find(query).sort("name", 1).to_list(100)
    return [Hen(**h) for h in hens]

@api_router.get("/hens/{hen_id}", response_model=Hen)
async def get_hen(hen_id: str):
    """Get a specific hen"""
    hen = await db.hens.find_one({"id": hen_id})
    if not hen:
        raise HTTPException(status_code=404, detail="Hen not found")
    return Hen(**hen)

@api_router.put("/hens/{hen_id}", response_model=Hen)
async def update_hen(hen_id: str, update: HenUpdate):
    """Update a hen's profile"""
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data['updated_at'] = datetime.utcnow()
    
    result = await db.hens.update_one(
        {"id": hen_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hen not found")
    
    # Update hen count if active status changed
    if 'is_active' in update_data:
        active_hens = await db.hens.count_documents({"is_active": True})
        await db.coop_settings.update_one({}, {"$set": {"hen_count": active_hens}}, upsert=True)
    
    hen = await db.hens.find_one({"id": hen_id})
    return Hen(**hen)

@api_router.delete("/hens/{hen_id}")
async def delete_hen(hen_id: str):
    """Delete a hen (or mark as inactive)"""
    # Soft delete - mark as inactive
    result = await db.hens.update_one(
        {"id": hen_id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hen not found")
    
    # Update hen count
    active_hens = await db.hens.count_documents({"is_active": True})
    await db.coop_settings.update_one({}, {"$set": {"hen_count": active_hens}}, upsert=True)
    
    return {"message": "Hen removed"}

@api_router.get("/hens/{hen_id}/eggs")
async def get_hen_eggs(hen_id: str, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get egg records for a specific hen"""
    query = {"hen_id": hen_id}
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    records = await db.egg_records.find(query).sort("date", -1).to_list(1000)
    total_eggs = sum(r['count'] for r in records)
    
    return {
        "hen_id": hen_id,
        "total_eggs": total_eggs,
        "record_count": len(records),
        "records": [EggRecord(**r) for r in records]
    }

# ============ EGG RECORD ENDPOINTS ============

@api_router.post("/eggs", response_model=EggRecord)
async def create_egg_record(record: EggRecordCreate):
    """Log eggs collected for a date"""
    # If hen_id is provided, create individual record
    if record.hen_id:
        egg_record = EggRecord(**record.dict())
        await db.egg_records.insert_one(egg_record.dict())
        return egg_record
    
    # Otherwise, check if record exists for this date (without hen_id)
    existing = await db.egg_records.find_one({"date": record.date, "hen_id": None})
    if existing:
        # Update existing record
        await db.egg_records.update_one(
            {"id": existing['id']},
            {"$set": {"count": record.count, "notes": record.notes}}
        )
        updated = await db.egg_records.find_one({"date": record.date, "hen_id": None})
        return EggRecord(**updated)
    
    egg_record = EggRecord(**record.dict())
    await db.egg_records.insert_one(egg_record.dict())
    return egg_record

@api_router.get("/eggs", response_model=List[EggRecord])
async def get_egg_records(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    hen_id: Optional[str] = None,
    limit: int = 100
):
    """Get egg records with optional date filtering"""
    query = {}
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

@api_router.get("/eggs/{record_id}", response_model=EggRecord)
async def get_egg_record(record_id: str):
    """Get a specific egg record"""
    record = await db.egg_records.find_one({"id": record_id})
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return EggRecord(**record)

@api_router.get("/eggs/date/{date_str}", response_model=Optional[EggRecord])
async def get_egg_record_by_date(date_str: str):
    """Get egg record for a specific date"""
    record = await db.egg_records.find_one({"date": date_str, "hen_id": None})
    if not record:
        return None
    return EggRecord(**record)

@api_router.put("/eggs/{record_id}", response_model=EggRecord)
async def update_egg_record(record_id: str, update: EggRecordUpdate):
    """Update an egg record"""
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.egg_records.update_one(
        {"id": record_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    
    record = await db.egg_records.find_one({"id": record_id})
    return EggRecord(**record)

@api_router.delete("/eggs/{record_id}")
async def delete_egg_record(record_id: str):
    """Delete an egg record"""
    result = await db.egg_records.delete_one({"id": record_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": "Record deleted"}

# ============ TRANSACTION ENDPOINTS ============

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction: TransactionCreate):
    """Create a new transaction (cost or sale)"""
    trans = Transaction(**transaction.dict())
    await db.transactions.insert_one(trans.dict())
    return trans

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    type: Optional[TransactionType] = None,
    limit: int = 100
):
    """Get transactions with optional filtering"""
    query = {}
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

@api_router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: str):
    """Get a specific transaction"""
    trans = await db.transactions.find_one({"id": transaction_id})
    if not trans:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return Transaction(**trans)

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    """Delete a transaction"""
    result = await db.transactions.delete_one({"id": transaction_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted"}

# ============ PREMIUM/SUBSCRIPTION ENDPOINTS ============

@api_router.get("/premium/status", response_model=PremiumStatusResponse)
async def get_premium_status():
    """Get current premium subscription status"""
    subscription = await db.subscriptions.find_one({"user_id": "default_user"})
    
    if not subscription:
        return PremiumStatusResponse(is_premium=False)
    
    is_active = subscription.get('is_active', False)
    expires_at = subscription.get('expires_at')
    
    if expires_at and isinstance(expires_at, datetime):
        if expires_at < datetime.utcnow():
            is_active = False
            await db.subscriptions.update_one(
                {"user_id": "default_user"},
                {"$set": {"is_active": False}}
            )
    
    return PremiumStatusResponse(
        is_premium=is_active,
        subscription_id=subscription.get('store_subscription_id'),
        plan=subscription.get('plan'),
        expires_at=expires_at.isoformat() if expires_at else None
    )

@api_router.post("/premium/restore", response_model=PremiumStatusResponse)
async def restore_premium():
    """Restore premium purchases"""
    return await get_premium_status()

@api_router.post("/premium/webhook")
async def handle_premium_webhook(payload: PremiumWebhookPayload):
    """Handle webhooks from RevenueCat"""
    logger.info(f"Received premium webhook: {payload.event_type}")
    
    subscription = await db.subscriptions.find_one({"user_id": "default_user"})
    
    if payload.event_type in ["subscription.created", "subscription.renewed"]:
        expires_at = None
        if payload.expires_at:
            expires_at = datetime.fromisoformat(payload.expires_at.replace('Z', '+00:00'))
        
        subscription_data = {
            "user_id": "default_user",
            "is_active": True,
            "plan": payload.plan,
            "store": payload.store,
            "store_subscription_id": payload.store_subscription_id,
            "expires_at": expires_at,
            "updated_at": datetime.utcnow(),
        }
        
        if subscription:
            await db.subscriptions.update_one(
                {"user_id": "default_user"},
                {"$set": subscription_data}
            )
        else:
            subscription_data["id"] = str(uuid.uuid4())
            subscription_data["created_at"] = datetime.utcnow()
            await db.subscriptions.insert_one(subscription_data)
        
        await db.subscription_logs.insert_one({
            "id": str(uuid.uuid4()),
            "event_type": payload.event_type,
            "store": payload.store,
            "store_subscription_id": payload.store_subscription_id,
            "plan": payload.plan,
            "timestamp": datetime.utcnow(),
        })
        
        return {"status": "success", "is_premium": True}
    
    elif payload.event_type in ["subscription.cancelled", "subscription.expired"]:
        if subscription:
            await db.subscriptions.update_one(
                {"user_id": "default_user"},
                {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
            )
        
        await db.subscription_logs.insert_one({
            "id": str(uuid.uuid4()),
            "event_type": payload.event_type,
            "store": payload.store,
            "store_subscription_id": payload.store_subscription_id,
            "timestamp": datetime.utcnow(),
        })
        
        return {"status": "success", "is_premium": False}
    
    return {"status": "ignored", "reason": "Unknown event type"}

# ============ STATISTICS ENDPOINTS ============

@api_router.get("/statistics/today")
async def get_today_statistics():
    """Get today's statistics"""
    today = date.today().isoformat()
    
    egg_records = await db.egg_records.find({"date": today}).to_list(100)
    eggs_today = sum(r['count'] for r in egg_records)
    
    transactions = await db.transactions.find({"date": today}).to_list(100)
    costs = sum(t['amount'] for t in transactions if t['type'] == 'cost')
    sales = sum(t['amount'] for t in transactions if t['type'] == 'sale')
    
    settings = await db.coop_settings.find_one()
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
async def get_month_statistics(year: int, month: int):
    """Get statistics for a specific month"""
    start_date = f"{year:04d}-{month:02d}-01"
    if month == 12:
        end_date = f"{year+1:04d}-01-01"
    else:
        end_date = f"{year:04d}-{month+1:02d}-01"
    
    eggs = await db.egg_records.find({
        "date": {"$gte": start_date, "$lt": end_date}
    }).to_list(1000)
    total_eggs = sum(e['count'] for e in eggs)
    days_with_eggs = len(set(e['date'] for e in eggs))
    avg_eggs = total_eggs / days_with_eggs if days_with_eggs > 0 else 0
    
    transactions = await db.transactions.find({
        "date": {"$gte": start_date, "$lt": end_date}
    }).to_list(1000)
    total_costs = sum(t['amount'] for t in transactions if t['type'] == 'cost')
    total_sales = sum(t['amount'] for t in transactions if t['type'] == 'sale')
    
    settings = await db.coop_settings.find_one()
    hen_count = settings['hen_count'] if settings else 0
    eggs_per_hen = total_eggs / hen_count if hen_count > 0 else None
    
    # Daily breakdown (aggregate by date)
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
    
    # Eggs per hen breakdown
    hens = await db.hens.find({"is_active": True}).to_list(100)
    hen_eggs = []
    for hen in hens:
        hen_records = [e for e in eggs if e.get('hen_id') == hen['id']]
        hen_total = sum(e['count'] for e in hen_records)
        hen_eggs.append({"id": hen['id'], "name": hen['name'], "eggs": hen_total})
    
    return {
        "year": year,
        "month": month,
        "total_eggs": total_eggs,
        "avg_eggs_per_day": round(avg_eggs, 1),
        "total_costs": total_costs,
        "total_sales": total_sales,
        "net": total_sales - total_costs,
        "eggs_per_hen": round(eggs_per_hen, 1) if eggs_per_hen else None,
        "daily_breakdown": daily_breakdown,
        "hen_breakdown": hen_eggs
    }

@api_router.get("/statistics/year/{year}")
async def get_year_statistics(year: int):
    """Get statistics for a specific year"""
    start_date = f"{year:04d}-01-01"
    end_date = f"{year+1:04d}-01-01"
    
    eggs = await db.egg_records.find({
        "date": {"$gte": start_date, "$lt": end_date}
    }).to_list(10000)
    total_eggs = sum(e['count'] for e in eggs)
    days_with_eggs = len(set(e['date'] for e in eggs))
    avg_eggs = total_eggs / days_with_eggs if days_with_eggs > 0 else 0
    
    transactions = await db.transactions.find({
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
async def get_summary_statistics():
    """Get overall summary statistics"""
    all_eggs = await db.egg_records.find().to_list(10000)
    all_transactions = await db.transactions.find().to_list(10000)
    settings = await db.coop_settings.find_one()
    
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

# ============ BASIC ROUTES ============

@api_router.get("/")
async def root():
    return {"message": "Hönshus Statistik API", "version": "1.2"}

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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
