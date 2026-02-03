from dotenv import load_dotenv
import os

# Default load (respects existing env vars)
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app import models, database
from app.routers import auth, interview, analytics

models.Base.metadata.create_all(bind=database.engine)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown
    from app.services.rag_service import close_client
    close_client()

app = FastAPI(title="Interview Agent Backend", lifespan=lifespan)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(interview.router)
app.include_router(analytics.router)

@app.get("/")
def read_root():
    return {"message": "Interview Agent Backend is running"}
