# KudiPal - GitHub Pages Deployment Guide

## Quick Fix for Current Issues

If CSS doesn't load and Try Demo fails on GitHub Pages, follow these steps:

---

## Option 1: Deploy Frontend Only (Recommended)

### Step 1: Create a New Branch for GitHub Pages

```bash
# Navigate to your repo
cd smart-money-gh-complete

# Create a new orphan branch for GitHub Pages
git checkout --orphan gh-pages

# Remove everything except frontend
git rm -rf .
```

### Step 2: Copy Frontend Contents to Root

```bash
# Copy all frontend files to root
xcopy frontend\* . /E /I

# Remove the empty frontend folder if it exists
rmdir /s /q frontend 2>nul

# Add all files
git add .
git commit -m "Deploy frontend to GitHub Pages"
git push -u origin gh-pages
```

### Step 3: Configure GitHub Pages

1. Go to your GitHub repo → **Settings** → **Pages**
2. Under "Source", select **Deploy from a branch**
3. Select branch: **gh-pages** and folder: **/ (root)**
4. Click **Save**

Your site will be live at: `https://YOUR-USERNAME.github.io/REPO-NAME/`

---

## Option 2: Deploy from Main Branch (Alternative)

If you want to keep everything in main branch:

### Step 1: Configure GitHub Pages to use /frontend folder

Unfortunately, GitHub Pages doesn't allow deploying from a subfolder directly.

### Workaround: Use GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy Frontend to GitHub Pages
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: frontend
          branch: gh-pages
```

Push this file, and GitHub Actions will automatically deploy the frontend folder to gh-pages branch.

---

## Testing Your Deployment

### 1. CSS Should Work
- Navigate to your GitHub Pages URL
- Open browser DevTools (F12) → Network tab
- Reload the page and check if `style.css` loads (Status 200)

### 2. Try Demo Should Work
- Click "Try Demo" button
- You should see "🎮 KudiPal: Demo mode" in console
- Demo data is stored in localStorage

### 3. Login Should Work
- Enter any email/password
- Demo mode accepts any credentials

---

## Switching to Production (With Backend)

Once you deploy your backend to Render:

### Step 1: Update config.js

Edit `frontend/assets/js/config.js`:

```javascript
// Change this line:
const RENDER_API_URL = null;

// To:
const RENDER_API_URL = 'https://YOUR-APP-NAME.onrender.com/api/v1';
```

### Step 2: Redeploy

```bash
git add .
git commit -m "Switch to production API"
git push
```

Demo mode will automatically disable once `RENDER_API_URL` is set.

---

## Troubleshooting

### CSS Not Loading
- **Check file structure**: `index.html` must be at the root of gh-pages branch
- **Check browser console**: Look for 404 errors
- **Check case sensitivity**: GitHub Pages is case-sensitive on Linux

### Try Demo Not Working
- **Check console**: Should say "🎮 KudiPal: Demo mode"
- **Clear localStorage**: `localStorage.clear()` in console
- **Check config.js loads**: Should be before api.js in HTML

### Login Redirects to Splash
- **Check token**: `localStorage.getItem('token')` in console
- **Clear and retry**: `localStorage.clear()` then try demo again

---

## Live Demo URL

Once deployed, share your app at:
```
https://YOUR-USERNAME.github.io/REPO-NAME/
```

Users start at `splash.html` → `index.html` (login) → `pages/dashboard.html`
