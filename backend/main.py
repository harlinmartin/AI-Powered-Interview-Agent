from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app import models, database
from app.routers import auth, interview

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Interview Agent Backend")

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

@app.get("/")
def read_root():
    return {"message": "Interview Agent Backend is running"}
