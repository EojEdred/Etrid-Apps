#!/bin/bash

# ËTRID Wallet - Complete Deployment Script
# Deploys PWA to Vercel and integrates with main website

set -e

echo "================================================"
echo "  ËTRID DeFi Wallet - Deployment Script"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WALLET_DIR="$SCRIPT_DIR/etrid-wallet"

# Check if we're in the right directory
if [ ! -d "$WALLET_DIR" ]; then
    echo "Error: etrid-wallet directory not found!"
    echo "Please run this script from apps/wallet-mobile/"
    exit 1
fi

# Function to print step headers
print_step() {
    echo ""
    echo -e "${BLUE}==>${NC} ${GREEN}$1${NC}"
    echo ""
}

# Ask user what they want to deploy
echo "What would you like to deploy?"
echo "1) PWA only (Vercel)"
echo "2) Backend API only (requires SSH to Gizzi VM)"
echo "3) Both PWA and Backend"
echo "4) Just build (no deployment)"
echo ""
read -p "Enter choice (1-4): " DEPLOY_CHOICE

# Ask for Gizzi VM IP if deploying backend
if [[ "$DEPLOY_CHOICE" == "2" ]] || [[ "$DEPLOY_CHOICE" == "3" ]]; then
    echo ""
    read -p "Enter Gizzi VM IP address: " GIZZI_IP
    if [ -z "$GIZZI_IP" ]; then
        echo "Error: Gizzi VM IP cannot be empty"
        exit 1
    fi
fi

# Check if Vercel CLI is installed
if [[ "$DEPLOY_CHOICE" == "1" ]] || [[ "$DEPLOY_CHOICE" == "3" ]]; then
    if ! command -v vercel &> /dev/null; then
        echo -e "${YELLOW}Vercel CLI not found. Installing...${NC}"
        npm install -g vercel
    fi
fi

# Step 1: Build PWA
if [[ "$DEPLOY_CHOICE" == "1" ]] || [[ "$DEPLOY_CHOICE" == "3" ]] || [[ "$DEPLOY_CHOICE" == "4" ]]; then
    print_step "Step 1: Building PWA"

    cd "$WALLET_DIR"

    # Install dependencies
    echo "Installing dependencies..."
    npm install

    # Build for web
    echo "Building for web..."
    npm run web:build

    echo -e "${GREEN}✓${NC} PWA build complete"
fi

# Step 2: Deploy to Vercel
if [[ "$DEPLOY_CHOICE" == "1" ]] || [[ "$DEPLOY_CHOICE" == "3" ]]; then
    print_step "Step 2: Deploying to Vercel"

    cd "$WALLET_DIR"

    # Check if user is logged in to Vercel
    if ! vercel whoami &> /dev/null; then
        echo -e "${YELLOW}Not logged in to Vercel. Please login:${NC}"
        vercel login
    fi

    # Deploy
    echo "Deploying to Vercel..."
    vercel --prod

    echo -e "${GREEN}✓${NC} PWA deployed to Vercel"
    echo -e "${BLUE}→${NC} Visit: https://wallet.etrid.org (once DNS is configured)"
fi

# Step 3: Deploy Backend to Gizzi VM
if [[ "$DEPLOY_CHOICE" == "2" ]] || [[ "$DEPLOY_CHOICE" == "3" ]]; then
    print_step "Step 3: Deploying Backend API to Gizzi VM"

    echo "Connecting to Gizzi VM at $GIZZI_IP..."

    # Deploy backend
    ssh root@$GIZZI_IP << 'ENDSSH'
    set -e

    echo "Pulling latest code..."
    cd /opt/Etrid
    git pull

    cd apps/wallet-mobile/backend

    echo "Installing dependencies..."
    npm install

    echo "Restarting API service..."
    pm2 restart etrid-wallet-api || pm2 start server.js --name etrid-wallet-api

    pm2 save

    echo "Backend API deployed and restarted"
ENDSSH

    echo -e "${GREEN}✓${NC} Backend API deployed to Gizzi VM"
    echo -e "${BLUE}→${NC} API running at: http://$GIZZI_IP:3001"
fi

# Step 4: Summary
print_step "Deployment Summary"

if [[ "$DEPLOY_CHOICE" == "1" ]] || [[ "$DEPLOY_CHOICE" == "3" ]]; then
    echo -e "${GREEN}✓${NC} PWA deployed to Vercel"
    echo "  → Visit: https://wallet.etrid.org"
    echo ""
    echo "  Next steps for PWA:"
    echo "  1. Configure custom domain in Vercel Dashboard"
    echo "  2. Add CNAME record in Hostinger: wallet → cname.vercel-dns.com"
    echo "  3. Set environment variables in Vercel"
fi

if [[ "$DEPLOY_CHOICE" == "2" ]] || [[ "$DEPLOY_CHOICE" == "3" ]]; then
    echo -e "${GREEN}✓${NC} Backend API deployed to Gizzi VM"
    echo "  → API: http://$GIZZI_IP:3001"
    echo ""
    echo "  Next steps for Backend:"
    echo "  1. Set up nginx reverse proxy for api.etrid.org"
    echo "  2. Get SSL certificate with certbot"
    echo "  3. Configure firewall to allow port 3001"
fi

if [[ "$DEPLOY_CHOICE" == "4" ]]; then
    echo -e "${GREEN}✓${NC} Build completed successfully"
    echo "  → Web build at: etrid-wallet/web-build/"
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""

# Offer to open in browser
if [[ "$DEPLOY_CHOICE" == "1" ]] || [[ "$DEPLOY_CHOICE" == "3" ]]; then
    read -p "Open wallet in browser? (y/n): " OPEN_BROWSER
    if [[ "$OPEN_BROWSER" == "y" ]]; then
        open "https://wallet.etrid.org" 2>/dev/null || echo "Please open https://wallet.etrid.org manually"
    fi
fi
