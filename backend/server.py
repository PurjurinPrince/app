from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone


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


# Define Models
class LevelProgress(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    level: int
    stars: int
    attempts: int
    completed: bool
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LevelProgressCreate(BaseModel):
    level: int
    stars: int
    attempts: int
    completed: bool

class LevelProgressUpdate(BaseModel):
    stars: Optional[int] = None
    attempts: Optional[int] = None
    completed: Optional[bool] = None

# Routes
@api_router.get("/")
async def root():
    return {"message": "Bouncy Ball Game API"}

@api_router.get("/progress", response_model=List[LevelProgress])
async def get_all_progress():
    """Get progress for all levels"""
    progress_list = await db.level_progress.find({}, {"_id": 0}).to_list(1000)
    
    for prog in progress_list:
        if isinstance(prog.get('timestamp'), str):
            prog['timestamp'] = datetime.fromisoformat(prog['timestamp'])
    
    return progress_list

@api_router.get("/progress/{level}", response_model=LevelProgress)
async def get_level_progress(level: int):
    """Get progress for a specific level"""
    progress = await db.level_progress.find_one({"level": level}, {"_id": 0})
    
    if not progress:
        # Return default progress if not found
        return LevelProgress(
            level=level,
            stars=0,
            attempts=0,
            completed=False
        )
    
    if isinstance(progress.get('timestamp'), str):
        progress['timestamp'] = datetime.fromisoformat(progress['timestamp'])
    
    return progress

@api_router.post("/progress", response_model=LevelProgress)
async def save_level_progress(input: LevelProgressCreate):
    """Save or update level progress"""
    # Check if progress exists
    existing = await db.level_progress.find_one({"level": input.level})
    
    if existing:
        # Update existing progress only if new stars are better
        if input.stars > existing.get('stars', 0):
            update_data = input.model_dump()
            update_data['timestamp'] = datetime.now(timezone.utc).isoformat()
            await db.level_progress.update_one(
                {"level": input.level},
                {"$set": update_data}
            )
        else:
            # Just update attempts
            await db.level_progress.update_one(
                {"level": input.level},
                {"$set": {"attempts": input.attempts}}
            )
    else:
        # Create new progress
        progress_obj = LevelProgress(**input.model_dump())
        doc = progress_obj.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        await db.level_progress.insert_one(doc)
        return progress_obj
    
    # Return updated progress
    updated = await db.level_progress.find_one({"level": input.level}, {"_id": 0})
    if isinstance(updated.get('timestamp'), str):
        updated['timestamp'] = datetime.fromisoformat(updated['timestamp'])
    return LevelProgress(**updated)

@api_router.delete("/progress/{level}")
async def reset_level_progress(level: int):
    """Reset progress for a specific level"""
    result = await db.level_progress.delete_one({"level": level})
    return {"deleted": result.deleted_count}

@api_router.delete("/progress")
async def reset_all_progress():
    """Reset all progress"""
    result = await db.level_progress.delete_many({})
    return {"deleted": result.deleted_count}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
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