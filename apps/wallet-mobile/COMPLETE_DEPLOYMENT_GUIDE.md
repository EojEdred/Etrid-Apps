# ËTRID DeFi Wallet - Complete Deployment Guide

Integration and deployment guide for the ËTRID Mobile DeFi Wallet across all platforms.

---

## 🎯 Overview

The ËTRID DeFi Wallet is a comprehensive crypto banking app that can be deployed as:

1. **PWA (Web App)** - Deployed to Vercel, accessible at wallet.etrid.org
2. **iOS App** - Deployed to TestFlight/App Store
3. **Android App** - Deployed to Play Store Internal Testing/Production
4. **Backend API** - Deployed to Gizzi VM or cloud provider

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│  User Access Points                                    │
│                                                        │
│  ├─ wallet.etrid.org (PWA)                            │
│  ├─ iOS App (TestFlight/App Store)                    │
│  └─ Android App (Play Store)                          │
└────────────────┬───────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│  Backend API (Gizzi VM or Cloud)                       │
│  ├─ REST API (Port 3001)                              │
│  ├─ WebSocket (Real-time updates)                     │
│  ├─ PostgreSQL Database                               │
│  └─ Redis Cache                                        │
└────────────────┬───────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│  ËTRID Primearc Core Chain                                      │
│  ├─ RPC: rpc.etrid.org                                │
│  └─ WebSocket: wss://primearc-core-chain.etrid.org             │
└────────────────────────────────────────────────────────┘
```

---

## 📦 Part 1: PWA Deployment to Vercel

### Prerequisites

- Vercel account (free tier works)
- GitHub repository with wallet code
- Domain access for wallet.etrid.org

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Deploy from Local

```bash
cd ~/Desktop/etrid/apps/wallet-mobile/etrid-wallet

# Build for web
npm install
npm run web:build

# Deploy to Vercel
vercel --prod
```

### Step 4: Configure Custom Domain

In Vercel Dashboard:
1. Go to Project Settings
2. Click "Domains"
3. Add `wallet.etrid.org`
4. Get the DNS records shown

In Hostinger DNS:
1. Add CNAME record: `wallet` → `cname.vercel-dns.com`
2. Wait 5-10 minutes for propagation

### Step 5: Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```
EXPO_PUBLIC_API_URL=https://api.etrid.org
EXPO_PUBLIC_PRIMEARC_CORE_CHAIN_WS=wss://primearc-core-chain.etrid.org
EXPO_PUBLIC_PRIMEARC_CORE_CHAIN_HTTP=https://rpc.etrid.org
```

### Step 6: Verify Deployment

Visit: https://wallet.etrid.org

You should see the wallet PWA!

---

## 🔥 Part 2: Firebase Setup

### Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click "Add Project"
3. Name: "Etrid Wallet"
4. Enable Google Analytics: Yes
5. Create Project

### Step 2: Add Apps to Firebase

**For Web/PWA:**
1. Click "Add app" → Web (</>)
2. App nickname: "Etrid Wallet PWA"
3. Enable Firebase Hosting: No (using Vercel)
4. Copy the config

**For iOS:**
1. Click "Add app" → iOS
2. iOS bundle ID: `org.etrid.wallet`
3. Download `GoogleService-Info.plist`
4. Place in `etrid-wallet/ios/`

**For Android:**
1. Click "Add app" → Android
2. Package name: `org.etrid.wallet`
3. Download `google-services.json`
4. Place in `etrid-wallet/android/app/`

### Step 3: Enable Services

**Cloud Messaging (Push Notifications):**
1. Firebase Console → Cloud Messaging
2. Get Server Key
3. Add to `.env`: `FIREBASE_SERVER_KEY=...`

**Analytics:**
Already enabled if you chose it during project creation.

**Crashlytics:**
1. Firebase Console → Crashlytics
2. Enable Crashlytics
3. Follow setup instructions

### Step 4: Configure in App

Create `.env` file in `etrid-wallet/`:

```bash
# Firebase Web Config
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=etrid-wallet.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=etrid-wallet
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=etrid-wallet.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Backend API
EXPO_PUBLIC_API_URL=https://api.etrid.org

# Primearc Core Chain
EXPO_PUBLIC_PRIMEARC_CORE_CHAIN_WS=wss://primearc-core-chain.etrid.org
EXPO_PUBLIC_PRIMEARC_CORE_CHAIN_HTTP=https://rpc.etrid.org
```

---

## 🐳 Part 3: Backend API Deployment

### Option A: Deploy to Gizzi VM (Recommended)

```bash
# SSH into Gizzi VM
ssh root@YOUR_GIZZI_VM_IP

# Clone wallet backend
cd /opt
git clone https://github.com/EojEdred/Etrid.git
cd Etrid/apps/wallet-mobile/backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env

# Set these:
NODE_ENV=production
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=etrid_wallet
DB_USER=etrid
DB_PASSWORD=<strong_password>
JWT_SECRET=<generate with: openssl rand -base64 32>
PRIMEARC_CORE_CHAIN_WS_URL=wss://primearc-core-chain.etrid.org
PRIMEARC_CORE_CHAIN_HTTP_URL=https://rpc.etrid.org

# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres psql
CREATE DATABASE etrid_wallet;
CREATE USER etrid WITH ENCRYPTED PASSWORD '<strong_password>';
GRANT ALL PRIVILEGES ON DATABASE etrid_wallet TO etrid;
\q

# Initialize database
npm run migrate

# Start with PM2
pm2 start server.js --name etrid-wallet-api
pm2 save
pm2 startup

# Setup nginx reverse proxy
sudo nano /etc/nginx/sites-available/api.etrid.org
```

Add this nginx config:

```nginx
server {
    listen 80;
    server_name api.etrid.org;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and get SSL:

```bash
sudo ln -s /etc/nginx/sites-available/api.etrid.org /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo certbot --nginx -d api.etrid.org
```

### Option B: Deploy with Docker

```bash
# On Gizzi VM
cd /opt/Etrid/apps/wallet-mobile/backend

# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f
```

---

## 🌐 Part 4: Integration with Main Website

### Add Wallet Link to etrid.org

Edit `/Users/macbook/Desktop/etrid/etrid-hostinger-deployment/website/index.html`

Around line 182 (navigation), add:

```html
<a href="https://wallet.etrid.org" class="hover:text-etrid-cyan transition-colors" target="_blank">Wallet</a>
```

Around line 183 (apps section), add a wallet card:

```html
<!-- Add to Apps Section -->
<div class="bg-etrid-dark/50 backdrop-blur-lg border border-white/10 rounded-2xl p-8 hover-scale" data-aos="fade-up">
    <div class="h-14 w-14 bg-gradient-to-br from-etrid-purple to-etrid-cyan rounded-xl flex items-center justify-center mb-6 glow-purple">
        <svg class="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
        </svg>
    </div>
    <h3 class="text-2xl font-display font-bold mb-3 text-white">Crypto Wallet</h3>
    <p class="text-gray-400 leading-relaxed mb-4">
        Your all-in-one crypto banking app. Send, receive, swap, and manage your digital assets with bank-level security.
    </p>
    <a href="https://wallet.etrid.org" target="_blank" class="inline-block bg-gradient-to-r from-etrid-purple to-etrid-cyan px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all hover:scale-105">
        Launch Wallet →
    </a>
</div>
```

### Add Wallet to Ops Center

Edit `/Users/macbook/Desktop/etrid/etrid-hostinger-deployment/website/ops.html`

Add wallet link in footer around line 850:

```html
<div class="footer-section">
    <h4 class="font-display font-bold text-white mb-4">Apps</h4>
    <ul class="space-y-2 text-gray-400 text-sm">
        <li><a href="https://wallet.etrid.org" class="hover:text-etrid-blue transition-colors">Crypto Wallet</a></li>
        <li><a href="http://YOUR_GIZZI_VM_IP:3000" class="hover:text-etrid-blue transition-colors">Dashboard</a></li>
        <li><a href="https://telemetry.etrid.org" class="hover:text-etrid-blue transition-colors">Network Stats</a></li>
    </ul>
</div>
```

---

## 📱 Part 5: Mobile App Deployment

### iOS Deployment

#### 1. Prerequisites

- Apple Developer Account ($99/year)
- Xcode installed on Mac
- iOS device for testing

#### 2. Build for iOS

```bash
cd ~/Desktop/etrid/apps/wallet-mobile/etrid-wallet

# Install dependencies
npm install

# Generate iOS project
npx expo prebuild --platform ios

# Open in Xcode
open ios/EtridWallet.xcworkspace

# In Xcode:
# 1. Select target "EtridWallet"
# 2. Set Team (your Apple Developer account)
# 3. Set Bundle Identifier: org.etrid.wallet
# 4. Product → Archive
# 5. Distribute App → TestFlight
```

#### 3. TestFlight Beta

1. Upload build to App Store Connect
2. Go to TestFlight tab
3. Add external testers (up to 10,000)
4. Send invite links

### Android Deployment

#### 1. Prerequisites

- Google Play Console account ($25 one-time)
- Android Studio (optional, for testing)

#### 2. Build for Android

```bash
cd ~/Desktop/etrid/apps/wallet-mobile/etrid-wallet

# Generate Android project
npx expo prebuild --platform android

# Build APK/AAB
cd android
./gradlew bundleRelease

# Signed bundle at:
# android/app/build/outputs/bundle/release/app-release.aab
```

#### 3. Upload to Play Store

1. Go to Google Play Console
2. Create new app: "Ëtrid Wallet"
3. Go to "Internal testing" track
4. Upload `app-release.aab`
5. Add testers
6. Publish to internal testing

---

## 🔒 Security Checklist

Before going live:

- [ ] All API keys in environment variables (not committed)
- [ ] HTTPS enabled on all endpoints (wallet.etrid.org, api.etrid.org)
- [ ] Firebase security rules configured
- [ ] Database passwords are strong (32+ characters)
- [ ] JWT secrets are cryptographically random
- [ ] Rate limiting enabled on API
- [ ] CORS properly configured
- [ ] Input validation on all API endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection headers
- [ ] CSP headers configured
- [ ] Regular backups scheduled
- [ ] Monitoring and alerting set up

---

## 📊 Monitoring

### Application Monitoring

1. **Firebase Analytics**
   - Track user engagement
   - Monitor crashes
   - Analyze user flows

2. **API Monitoring**
   ```bash
   # On Gizzi VM
   pm2 logs etrid-wallet-api
   pm2 monit
   ```

3. **Database Health**
   ```bash
   sudo -u postgres psql etrid_wallet
   SELECT count(*) FROM users;
   SELECT count(*) FROM transactions;
   ```

### Uptime Monitoring

Set up monitoring at:
- https://uptimerobot.com
- Monitor: wallet.etrid.org, api.etrid.org
- Alert: Email, SMS, Slack

---

## 🚀 Deployment Automation

### GitHub Actions (Automatic Deployment)

Create `.github/workflows/deploy-wallet.yml`:

```yaml
name: Deploy Wallet

on:
  push:
    branches: [main]
    paths:
      - 'apps/wallet-mobile/**'

jobs:
  deploy-pwa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: |
          cd apps/wallet-mobile/etrid-wallet
          npm ci

      - name: Build
        run: |
          cd apps/wallet-mobile/etrid-wallet
          npm run web:build

      - name: Deploy to Vercel
        run: |
          cd apps/wallet-mobile/etrid-wallet
          npx vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

---

## 🎯 Quick Deploy Commands

### Deploy Everything at Once

```bash
#!/bin/bash
# deploy-wallet-complete.sh

echo "🚀 Deploying ËTRID Wallet..."

# 1. Deploy PWA to Vercel
echo "📦 Deploying PWA..."
cd ~/Desktop/etrid/apps/wallet-mobile/etrid-wallet
npm run web:build
vercel --prod

# 2. Deploy Backend to Gizzi VM
echo "🔧 Deploying Backend..."
ssh root@YOUR_GIZZI_VM_IP << 'EOF'
cd /opt/Etrid/apps/wallet-mobile/backend
git pull
npm install
pm2 restart etrid-wallet-api
EOF

# 3. Update Main Website
echo "🌐 Updating Main Website..."
cd ~/Desktop/etrid/etrid-hostinger-deployment
# Use your existing upload script
python3 upload-all-apps.py

echo "✅ Deployment Complete!"
echo "PWA: https://wallet.etrid.org"
echo "API: https://api.etrid.org"
```

---

## 📚 Additional Resources

- **Expo Documentation**: https://docs.expo.dev
- **Vercel Documentation**: https://vercel.com/docs
- **Firebase Documentation**: https://firebase.google.com/docs
- **React Native Documentation**: https://reactnative.dev

---

## 🐛 Troubleshooting

### PWA doesn't load

**Check:**
- Vercel deployment succeeded
- Environment variables set
- DNS propagated (`nslookup wallet.etrid.org`)
- Clear browser cache

### API not responding

**Check:**
```bash
# On Gizzi VM
pm2 status
pm2 logs etrid-wallet-api
sudo systemctl status nginx
curl http://localhost:3001/health
```

### Mobile app won't build

**Check:**
- Node version: `node --version` (should be 18+)
- Expo version: `npx expo --version`
- Clear cache: `npx expo start --clear`
- Reinstall: `rm -rf node_modules && npm install`

---

## ✅ Deployment Checklist

- [ ] PWA deployed to Vercel at wallet.etrid.org
- [ ] Backend API running on Gizzi VM at api.etrid.org
- [ ] Firebase project created and configured
- [ ] Environment variables set in Vercel
- [ ] SSL certificates installed (wallet.etrid.org, api.etrid.org)
- [ ] Wallet link added to main website (etrid.org)
- [ ] Wallet link added to ops center
- [ ] Database initialized and running
- [ ] Monitoring set up (UptimeRobot, Firebase Analytics)
- [ ] Security checklist completed
- [ ] iOS TestFlight build uploaded (optional)
- [ ] Android Internal Testing build uploaded (optional)
- [ ] GitHub Actions workflow configured (optional)

---

## 🎉 Success!

Once deployed, users can access the wallet at:

- **Web (PWA)**: https://wallet.etrid.org
- **iOS**: TestFlight → Install
- **Android**: Play Store → Install
- **From Main Site**: etrid.org → "Wallet" in nav

**Your ËTRID DeFi Wallet is now live! 🚀**
