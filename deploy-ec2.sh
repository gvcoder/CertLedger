#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "   CertLedger - AWS EC2 One-Command Deployment Helper    "
echo "=========================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed on this EC2 instance."
    echo "Please install Docker: sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2"
    exit 1
fi

echo "📦 1. Building Docker containers for Server & Client..."
docker compose build

echo "🚀 2. Launching CertLedger Application Services..."
docker compose up -d

echo "=========================================================="
echo "✅ CertLedger is successfully deployed and running!"
echo "🌐 Access Web Portal: http://$(curl -s ifconfig.me || echo 'YOUR_EC2_PUBLIC_IP')"
echo "=========================================================="
