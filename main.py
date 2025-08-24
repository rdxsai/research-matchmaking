# Railway Entry Point for Research Matchmaking Application
import os
import sys
import uvicorn

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

# Import the FastAPI app from the app directory
from app.main import app

# Railway will run this
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting FastAPI server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
