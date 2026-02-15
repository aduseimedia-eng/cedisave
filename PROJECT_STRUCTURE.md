# KudiPal - Complete Project Structure

```
smart-money-gh/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js          # PostgreSQL connection config
│   │   │   ├── jwt.js               # JWT configuration
│   │   │   └── constants.js         # App constants
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT authentication middleware
│   │   │   ├── validation.js        # Request validation
│   │   │   ├── rateLimiter.js       # Rate limiting
│   │   │   └── errorHandler.js      # Global error handling
│   │   ├── models/
│   │   │   ├── User.js              # User model
│   │   │   ├── Expense.js           # Expense model
│   │   │   ├── Income.js            # Income model
│   │   │   ├── Budget.js            # Budget model
│   │   │   ├── Goal.js              # Savings goal model
│   │   │   ├── Badge.js             # Gamification badges
│   │   │   └── Streak.js            # User streaks
│   │   ├── controllers/
│   │   │   ├── authController.js    # Authentication logic
│   │   │   ├── expenseController.js # Expense CRUD
│   │   │   ├── incomeController.js  # Income CRUD
│   │   │   ├── budgetController.js  # Budget management
│   │   │   ├── goalController.js    # Goals management
│   │   │   ├── reportController.js  # Analytics & reports
│   │   │   └── gamificationController.js # Badges & streaks
│   │   ├── routes/
│   │   │   ├── auth.js              # Auth routes
│   │   │   ├── expenses.js          # Expense routes
│   │   │   ├── income.js            # Income routes
│   │   │   ├── budget.js            # Budget routes
│   │   │   ├── goals.js             # Goals routes
│   │   │   ├── reports.js           # Report routes
│   │   │   └── gamification.js      # Gamification routes
│   │   ├── services/
│   │   │   ├── analyticsService.js  # Financial calculations
│   │   │   ├── gamificationService.js # Badge & XP logic
│   │   │   ├── notificationService.js # Alert system
│   │   │   └── emailService.js      # Email notifications
│   │   ├── utils/
│   │   │   ├── validation.js        # Input validators
│   │   │   ├── phoneValidator.js    # Ghana phone validation
│   │   │   └── helpers.js           # Helper functions
│   │   ├── database/
│   │   │   ├── migrations/          # Database migrations
│   │   │   │   ├── 001_create_users.sql
│   │   │   │   ├── 002_create_expenses.sql
│   │   │   │   ├── 003_create_income.sql
│   │   │   │   ├── 004_create_budgets.sql
│   │   │   │   ├── 005_create_goals.sql
│   │   │   │   ├── 006_create_badges.sql
│   │   │   │   └── 007_create_streaks.sql
│   │   │   └── seeds/               # Sample data
│   │   │       └── categories.sql
│   │   └── app.js                   # Express app setup
│   ├── tests/                       # Unit & integration tests
│   ├── .env.example                 # Environment variables template
│   ├── .gitignore
│   ├── package.json
│   └── server.js                    # Entry point
├── frontend/
│   ├── assets/
│   │   ├── css/
│   │   │   ├── style.css
│   │   │   └── mobile.css
│   │   ├── js/
│   │   │   ├── app.js               # Main app logic
│   │   │   ├── api.js               # API calls
│   │   │   ├── auth.js              # Auth handling
│   │   │   ├── dashboard.js         # Dashboard logic
│   │   │   ├── expenses.js          # Expense management
│   │   │   └── charts.js            # Chart rendering
│   │   └── images/
│   ├── pages/
│   │   ├── index.html               # Landing/login
│   │   ├── register.html            # Registration
│   │   ├── dashboard.html           # Main dashboard
│   │   ├── expenses.html            # Expense tracking
│   │   └── reports.html             # Analytics
│   └── capacitor.config.js          # Mobile wrapper config
├── docs/
│   ├── API_DOCUMENTATION.md         # API endpoints
│   ├── DATABASE_SCHEMA.md           # Database design
│   └── DEPLOYMENT.md                # Deployment guide
└── README.md
```
