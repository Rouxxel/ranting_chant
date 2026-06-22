#!/bin/bash

# Ranting Chant Backend - Development Startup Script
# Supports AI (Gemini), Voice (ElevenLabs), and Notification (Resend/Twilio) services
# Uses Supabase PostgreSQL as primary database with JSON mock data fallback

echo "🚀 Ranting Chant Backend - Development Setup"
echo "=========================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.12+ and try again."
    exit 1
fi

echo "✅ Python found: $(python3 --version)"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check if .env exists, if not copy from .env.example
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env created - please update with your API keys and configuration"
    echo ""
    echo "📝 Required environment variables:"
    echo "   - GEMINI_API_KEY (for AI services)"
    echo "   - ELEVENLABS_API_KEY (for voice services)"
    echo "   - RESEND_API_KEY (for email notifications)"
    echo "   - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN (for SMS notifications)"
    echo "   - SUPABASE_URL, SUPABASE_KEY (for PostgreSQL database)"
    echo ""
fi

# Create logs directory if it doesn't exist
mkdir -p logs

echo ""
echo "🎯 Setup complete! Choose how to run:"
echo "1. Development mode (with reload)"
echo "2. Production mode"
echo "3. Docker mode"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo "🔄 Starting in development mode with hot reload..."
        export $(cat .env | xargs)
        uvicorn main:app --host ${SERVER_HOST:-0.0.0.0} --port ${SERVER_PORT:-8000} --reload
        ;;
    2)
        echo "🚀 Starting in production mode..."
        export $(cat .env | xargs)
        python main.py
        ;;
    3)
        echo "🐳 Starting with Docker..."
        docker-compose up --build
        ;;
    *)
        echo "❌ Invalid choice. Starting in development mode..."
        export $(cat .env | xargs)
        uvicorn main:app --host ${SERVER_HOST:-0.0.0.0} --port ${SERVER_PORT:-8000} --reload
        ;;
esac