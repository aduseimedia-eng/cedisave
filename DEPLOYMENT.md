# KudiPal - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Database Setup](#database-setup)
4. [Environment Configuration](#environment-configuration)
5. [Cloud Deployment Options](#cloud-deployment-options)
6. [Mobile App Deployment](#mobile-app-deployment)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### Required Software
- Node.js 18+ and npm 9+
- PostgreSQL 14+
- Git
- PgAdmin (for database management)
- Android Studio (for mobile builds)

### Accounts Needed
- Cloud hosting provider (Heroku, Railway, DigitalOcean, or AWS)
- PostgreSQL database host (ElephantSQL, Supabase, or Neon)
- Email service (Gmail, SendGrid, or Mailgun)
- Domain name (optional)

---

## Local Development Setup

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/smart-money-gh.git
cd smart-money-gh
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Setup Environment Variables
```bash
cp .env.example .env
# Edit .env with your local configuration
```

### 4. Start Development Server
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

---

## Database Setup

### Option 1: Local PostgreSQL

#### Install PostgreSQL
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql
brew services start postgresql

# Windows
# Download installer from postgresql.org
```

#### Create Database
```bash
# Access PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE smart_money_gh;
CREATE USER smart_money_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE smart_money_gh TO smart_money_user;

# Exit
\q
```

#### Run Schema
```bash
psql -U smart_money_user -d smart_money_gh -f database_schema.sql
```

### Option 2: Cloud Database (Recommended for Production)

#### ElephantSQL (Free Tier)
1. Sign up at [elephantsql.com](https://elephantsql.com)
2. Create new instance (Tiny Turtle - Free)
3. Copy connection URL
4. Update `.env` with database credentials

#### Supabase (Free Tier)
1. Sign up at [supabase.com](https://supabase.com)
2. Create new project
3. Go to Database Settings
4. Copy connection string
5. Update `.env` with credentials

#### Neon (Free Tier)
1. Sign up at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string
4. Update `.env` with credentials

---

## Environment Configuration

### Development (.env)
```env
NODE_ENV=development
PORT=5000

# Local PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_money_gh
DB_USER=smart_money_user
DB_PASSWORD=your_password
DB_SSL=false

# JWT
JWT_SECRET=dev_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# Email (use Gmail for development)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your.email@gmail.com
EMAIL_PASSWORD=your_app_password

FRONTEND_URL=http://localhost:8080
CORS_ORIGIN=http://localhost:8080
```

### Production (.env)
```env
NODE_ENV=production
PORT=5000

# Cloud Database
DB_HOST=your-db-host.com
DB_PORT=5432
DB_NAME=smart_money_gh_prod
DB_USER=prod_user
DB_PASSWORD=strong_secure_password_here
DB_SSL=true

# Strong JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your_super_secure_random_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# Production Email Service
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your_sendgrid_api_key

APP_URL=https://api.kudipal.com
FRONTEND_URL=https://app.kudipal.com
CORS_ORIGIN=https://app.kudipal.com
```

---

## Cloud Deployment Options

### Option 1: Railway (Recommended - Easy & Free Tier)

#### Steps:
1. Sign up at [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub account
4. Select your repository
5. Railway auto-detects Node.js

#### Configure:
1. Add PostgreSQL service: Click "+ New" → "Database" → "PostgreSQL"
2. Link database to your app
3. Add environment variables:
   - Go to your service → Variables
   - Copy all variables from `.env`
   - Railway provides `DATABASE_URL` automatically

4. Deploy:
```bash
# Railway will auto-deploy on git push
git push origin main
```

#### Custom Domain:
1. Go to Settings → Domains
2. Add custom domain or use Railway subdomain
3. Update DNS records as instructed

### Option 2: Heroku

#### Prerequisites:
```bash
# Install Heroku CLI
# Ubuntu
curl https://cli-assets.heroku.com/install-ubuntu.sh | sh

# macOS
brew tap heroku/brew && brew install heroku

# Windows
# Download installer from heroku.com
```

#### Deploy:
```bash
# Login
heroku login

# Create app
heroku create smart-money-gh-api

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your_jwt_secret
heroku config:set EMAIL_HOST=smtp.sendgrid.net
# ... add all other variables

# Deploy
git push heroku main

# Run migrations
heroku run npm run migrate
```

### Option 3: DigitalOcean App Platform

1. Sign up at [digitalocean.com](https://digitalocean.com)
2. Create new App
3. Connect GitHub repository
4. Choose Node.js runtime
5. Add PostgreSQL database
6. Configure environment variables
7. Deploy

### Option 4: AWS (Advanced)

For production at scale:
- **EC2** for Node.js server
- **RDS** for PostgreSQL
- **S3** for file storage
- **CloudFront** for CDN
- **Route 53** for DNS

---

## Mobile App Deployment

### Setup Capacitor

```bash
cd frontend
npm install @capacitor/core @capacitor/cli
npx cap init

# Add Android platform
npx cap add android

# Copy web assets
npx cap copy

# Open in Android Studio
npx cap open android
```

### Android Build

#### Configure
Edit `capacitor.config.json`:
```json
{
  "appId": "com.kudipal.app",
  "appName": "KudiPal",
  "webDir": "dist",
  "server": {
    "androidScheme": "https",
    "url": "https://api.kudipal.com",
    "cleartext": false
  }
}
```

#### Build APK
1. Open in Android Studio
2. Build → Generate Signed Bundle / APK
3. Select APK
4. Create or select keystore
5. Build Release APK

#### Publish to Play Store
1. Create Google Play Console account
2. Create new app
3. Upload APK
4. Complete store listing
5. Submit for review

### iOS Build (Requires macOS)

```bash
npx cap add ios
npx cap open ios
```

1. Open in Xcode
2. Configure signing
3. Build archive
4. Submit to App Store Connect

---

## Production Checklist

### Security
- [ ] Change all default passwords
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable HTTPS/SSL
- [ ] Set up CORS properly
- [ ] Enable rate limiting
- [ ] Use environment variables (never commit secrets)
- [ ] Enable database SSL
- [ ] Set secure cookie flags
- [ ] Implement input validation
- [ ] Enable Helmet.js security headers

### Database
- [ ] Run all migrations
- [ ] Set up automated backups
- [ ] Configure connection pooling
- [ ] Create database indexes
- [ ] Set up read replicas (if needed)
- [ ] Monitor query performance

### Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure logging (Winston, Papertrail)
- [ ] Set up uptime monitoring (UptimeRobot)
- [ ] Enable performance monitoring
- [ ] Set up alerts for errors
- [ ] Monitor database performance

### Performance
- [ ] Enable compression
- [ ] Set up CDN
- [ ] Optimize database queries
- [ ] Implement caching (Redis)
- [ ] Minimize payload sizes
- [ ] Enable gzip compression

---

## Monitoring & Maintenance

### Recommended Tools

#### Error Tracking
- **Sentry**: Real-time error tracking
```bash
npm install @sentry/node
```

#### Logging
- **Winston**: Application logging
```bash
npm install winston
```

#### Uptime Monitoring
- **UptimeRobot**: Free uptime monitoring
- **Pingdom**: Advanced monitoring

#### Performance
- **New Relic**: Application performance
- **Datadog**: Infrastructure monitoring

### Database Backups

#### Automated Backups (cron job)
```bash
# Daily backup script
0 2 * * * pg_dump -h localhost -U user dbname > backup_$(date +\%Y\%m\%d).sql
```

#### Manual Backup
```bash
pg_dump -h host -U user -d database > backup.sql
```

#### Restore
```bash
psql -h host -U user -d database < backup.sql
```

### Update Strategy

```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Run migrations
npm run migrate

# Restart server
pm2 restart smart-money-gh
```

---

## Scaling Considerations

### When to Scale
- Response time > 500ms
- CPU usage > 80%
- Memory usage > 80%
- Database connections maxed out

### Scaling Options
1. **Vertical**: Upgrade server resources
2. **Horizontal**: Add more servers + load balancer
3. **Database**: Read replicas, connection pooling
4. **Caching**: Redis for frequently accessed data
5. **CDN**: CloudFlare for static assets

---

## Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check credentials
psql -h host -U user -d database

# Check firewall/security groups
```

#### Port Already in Use
```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>
```

#### JWT Token Errors
- Verify JWT_SECRET is set
- Check token expiry
- Ensure consistent secret across instances

---

## Support & Resources

### Documentation
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Capacitor Docs](https://capacitorjs.com/docs)

### Community
- GitHub Issues
- KudiPal Discord
- Stack Overflow

---

## License
MIT License - See LICENSE file for details

## Contact
For deployment support: support@kudipal.com
