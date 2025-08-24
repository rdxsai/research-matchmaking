# Railway Entry Point for Research Matchmaking Application
import os
import sys
import uvicorn

# Add the app directory to Python path
app_dir = os.path.join(os.path.dirname(__file__), 'app')
sys.path.insert(0, app_dir)

# Import the FastAPI app from the app directory
try:
    from main import app
    print("Successfully imported FastAPI app")
except ImportError as e:
    print(f"Import error: {e}")
    # Fallback: try direct import
    sys.path.insert(0, os.path.dirname(__file__))
    from app.main import app
    print("Successfully imported FastAPI app via fallback")

# Railway will run this
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting FastAPI server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
