# KudiPal - Frontend

A Ghana-themed mobile-first web app for expense tracking, budgeting, and financial management.

## 🚀 Features

- ✅ User authentication (login/register)
- ✅ Dashboard with financial overview
- ✅ Expense tracking with Ghana-specific categories
- ✅ Income management
- ✅ Budget setting and monitoring
- ✅ Savings goals tracking
- ✅ Gamification (badges, XP, streaks)
- ✅ Financial reports and analytics
- ✅ Ghana-themed UI (Red, Gold, Green)
- ✅ Mobile-responsive design

## 📁 Structure

```
frontend/
├── index.html              # Login/Register page
├── pages/
│   ├── dashboard.html      # Main dashboard
│   ├── expenses.html       # Expenses list
│   ├── goals.html          # Savings goals
│   └── reports.html        # Financial reports
├── assets/
│   ├── css/
│   │   └── style.css       # Main stylesheet
│   └── js/
│       ├── api.js          # API service
│       ├── utils.js        # Utility functions
│       └── dashboard.js    # Dashboard logic
└── README.md
```

## 🎨 Green & White Theme

The app uses a clean green and white color scheme:
- **Primary Green** (#006B3F) - Main brand color
- **Light Green** (#00a05e) - Accent highlights
- **Dark Green** (#004d2c) - Emphasis color
- **White** (#ffffff) - Secondary color

## 🛠️ Setup

### 1. Configure API URL

Edit `assets/js/api.js` and set your backend URL:

```javascript
const API_BASE_URL = 'http://localhost:5000/api/v1';
// or
const API_BASE_URL = 'https://your-api.herokuapp.com/api/v1';
```

### 2. Run Locally

Simply open `index.html` in a browser or use a local server:

```bash
# Using Python
python3 -m http.server 8080

# Using Node.js
npx http-server -p 8080

# Using PHP
php -S localhost:8080
```

Then visit: http://localhost:8080

## 📱 Mobile App (Capacitor)

### Install Capacitor

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### Initialize Capacitor

```bash
npx cap init "KudiPal" "com.kudipal.app"
```

### Add Android Platform

```bash
npx cap add android
```

### Sync Files

```bash
npx cap sync
```

### Open in Android Studio

```bash
npx cap open android
```

### Build APK

1. Open Android Studio
2. Build → Generate Signed Bundle / APK
3. Select APK
4. Create/use keystore
5. Build Release

## 🌐 Deployment

### Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Deploy to GitHub Pages

```bash
# Push to GitHub
git add .
git commit -m "Deploy frontend"
git push origin main

# Enable GitHub Pages in repository settings
```

## 🎯 Usage

### 1. Registration

- Go to index.html
- Click "Register" tab
- Fill in details:
  - Name
  - Email
  - Ghana phone (233XXXXXXXXX)
  - Password (min 8 chars, with uppercase, lowercase, number)

### 2. Login

- Enter email or phone
- Enter password
- Click "Login"

### 3. Dashboard

- View financial summary
- See streak and XP
- Add expenses quickly
- Monitor budget

### 4. Expenses

- View all expenses
- Filter by date/category
- Delete expenses

### 5. Goals

- Create savings goals
- Track progress
- View completion status

### 6. Reports

- View financial health score
- See monthly summary
- Analyze spending patterns

## 🇬🇭 Ghana-Specific Features

### Expense Categories
- Food / Chop Bar 🍛
- Transport (Trotro / Bolt) 🚌
- Data / Airtime 📱
- Rent / Hostel 🏠
- Utilities 💡
- Church / Donations ⛪
- Betting / Gaming 🎲
- Entertainment 🎬
- Shopping 🛍️
- Miscellaneous 📦

### Payment Methods
- Cash
- MTN MoMo
- Telecel Cash
- Bank Transfer
- AirtelTigo Money

### Motivational Messages
- "Chale, you dey do well! 💪"
- "Keep it up, boss! Your wallet go thank you 🙌"
- "Masa, check your spending waa 🤔"

## 🔧 Customization

### Change Colors

Edit `assets/css/style.css`:

```css
:root {
  --primary-color: #006B3F;
  --primary-light: #00a05e;
  --primary-dark: #004d2c;
  --secondary-color: #ffffff;
}
```

### Add Categories

Edit `assets/js/utils.js`:

```javascript
const EXPENSE_CATEGORIES = [
  'Your New Category',
  // ... existing categories
];
```

## 📱 Mobile Optimization

The app is fully responsive:
- Mobile-first design
- Touch-friendly buttons
- Optimized forms
- Fast loading
- Low data usage

## 🐛 Troubleshooting

### CORS Errors

If you get CORS errors, make sure your backend has the correct CORS configuration:

```javascript
// Backend
app.use(cors({
  origin: 'http://localhost:8080', // Your frontend URL
  credentials: true
}));
```

### API Connection Failed

- Check if backend is running
- Verify API_BASE_URL in api.js
- Check network console for errors

### Login Not Working

- Verify credentials
- Check backend logs
- Ensure JWT token is being saved

## 📊 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS/Android)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test on mobile
5. Submit pull request

## 📄 License

MIT License

## 🙏 Credits

Built with ❤️ for Ghana 🇬🇭

Helping young Ghanaians master their money!
