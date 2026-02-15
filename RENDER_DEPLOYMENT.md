# KudiPal Deployment Guide

## Option 1: Deploy Backend to Render (Recommended - Free)

### Step 1: Create GitHub Repository

1. Go to [github.com](https://github.com) and create a new repository
2. Name it `kudipal` (or any name you prefer)
3. Keep it public for free hosting

### Step 2: Push Code to GitHub

```bash
# In your project folder
cd c:\Users\aduse\Desktop\Code\smart-money-gh-complete

# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - KudiPal expense tracker"

# Add your GitHub repo as remote
git remote add origin https://github.com/YOUR_USERNAME/kudipal.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign up (free)
2. Click **New** → **Web Service**
3. Connect your GitHub account
4. Select your `kudipal` repository
5. Configure:
   - **Name**: `kudipal-api`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

6. Add Environment Variables:
   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `JWT_SECRET` | (generate a random 32+ char string) |
   | `JWT_REFRESH_SECRET` | (generate another random string) |
   | `BCRYPT_ROUNDS` | `12` |

7. Click **Create Web Service**

### Step 4: Create PostgreSQL Database on Render

1. In Render dashboard, click **New** → **PostgreSQL**
2. Configure:
   - **Name**: `kudipal-db`
   - **Plan**: Free
3. Copy the **Internal Database URL**
4. Go to your Web Service → Environment → Add:
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | (paste the Internal Database URL) |

### Step 5: Run Database Migrations

After deployment, you need to set up the database tables:

1. Go to your Render Web Service
2. Click **Shell** tab
3. Run:
```bash
psql $DATABASE_URL -f database_schema.sql
```

Or connect to the database from your local machine using the External Database URL.

### Step 6: Deploy Frontend to GitHub Pages

1. Update `frontend/assets/js/config.js`:
```javascript
window.KUDIPAL_API_URL = 'https://kudipal-api.onrender.com/api/v1';
```

2. In your GitHub repo settings:
   - Go to **Settings** → **Pages**
   - Source: Deploy from a branch
   - Branch: `main`
   - Folder: `/frontend`
   - Click **Save**

3. Your frontend will be live at:
   `https://YOUR_USERNAME.github.io/kudipal/`

---

## Quick Test Commands

Test your deployed API:
```bash
# Health check
curl https://kudipal-api.onrender.com/health

# Register test user
curl -X POST https://kudipal-api.onrender.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","phone":"233501234567","password":"Test123!"}'
```

---

## Troubleshooting

### "Failed to fetch" errors
- Check if your Render backend is running (may take 30s to wake up on free tier)
- Verify the API URL in `config.js` matches your Render URL

### Database connection errors
- Ensure `DATABASE_URL` is set in Render environment variables
- Check if database is active in Render dashboard

### CORS errors
- The backend is configured to allow all origins
- Make sure you're using HTTPS for the Render URL

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Yes | Secret for refresh tokens |
| `NODE_ENV` | Yes | Set to `production` |
| `BCRYPT_ROUNDS` | No | Password hash rounds (default: 12) |
| `PORT` | No | Server port (Render sets automatically) |

---

## Cost

| Service | Plan | Cost |
|---------|------|------|
| Render Web Service | Free | $0/month |
| Render PostgreSQL | Free | $0/month |
| GitHub Pages | Free | $0/month |
| **Total** | | **$0/month** |

Note: Free tier limitations:
- Web service sleeps after 15 min of inactivity
- First request after sleep takes ~30 seconds
- 750 hours/month compute, 100GB bandwidth
