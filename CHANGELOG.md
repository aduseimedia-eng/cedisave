# CediSave Changelog

## Version 2.1.0 - February 16, 2026

### 🎯 Major Updates

#### ✅ Database Integration Complete
- **Goals/Savings**: All goals now save to PostgreSQL database (removed localStorage dependency)
- **Avatar Storage**: Profile pictures stored in database via API calls
- **User Preferences**: Theme, currency, settings synced to database
- **Authentication**: Fully integrated JWT token system

#### ✅ UI/UX Improvements  
- **Login Contrast Fix**: Fixed black text on colored buttons - now uses white text with !important
- **Mobile Responsive**: Enhanced mobile experience across all pages
- **Loading States**: Better loading indicators during API calls
- **Error Handling**: Improved error messages and user feedback

#### ✅ Backend Enhancements
- **PostgreSQL Integration**: Complete database connectivity
- **API Endpoints**: All CRUD operations for goals, expenses, users
- **Authentication Middleware**: Secure JWT token validation
- **Error Logging**: Enhanced debugging and error tracking

### 🔧 Technical Changes

#### Frontend Files Updated:
- `frontend/index.html` - Login contrast fix with `color: #ffffff !important`
- `frontend/pages/goals.html` - API integration with database calls
- `frontend/pages/settings.html` - Avatar upload via API
- `frontend/assets/js/api.js` - Complete API service layer

#### Backend Files Updated:
- `backend/src/routes/goals.js` - Database CRUD operations
- `backend/src/config/database.js` - Enhanced query logging
- `backend/src/controllers/authController.js` - Profile management

### 🚀 Repository Migration
- **New Repository**: Migrated to `https://github.com/aduseimedia-eng/cedisave`
- **Branch**: `main` (contains all latest changes)
- **Commit**: `4be2edd - Complete KudiSave financial app with database integration`

### 📋 Testing Instructions
1. **Backend**: Run `node server.js` in `backend/` directory
2. **Frontend**: Serve files on `http://localhost:8080`
3. **Database**: Requires PostgreSQL with proper env variables
4. **Demo Mode**: Works offline with localStorage fallback

---

**Note**: All changes are live in the CediSave repository. If you don't see updates on GitHub, ensure you're viewing the `main` branch and refresh your browser cache (Ctrl+F5).