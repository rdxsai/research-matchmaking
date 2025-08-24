# Minimal FastAPI test application for Railway debugging
import os
import uvicorn
from fastapi import FastAPI
from fastapi.responses import JSONResponse

# Create minimal FastAPI app
app = FastAPI(title="Research Matchmaking Test")

@app.get("/")
async def root():
    return {"message": "Research Matchmaking API is working!", "status": "success"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "port": os.environ.get("PORT", "8000")}

@app.get("/env")
async def check_env():
    return {
        "PORT": os.environ.get("PORT", "Not set"),
        "DATABASE_URL": "Set" if os.environ.get("DATABASE_URL") else "Not set",
        "REDIS_URL": "Set" if os.environ.get("REDIS_URL") else "Not set"
    }

# Railway entry point
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting minimal FastAPI test server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
