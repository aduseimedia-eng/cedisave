# 🚀 KudiSave - Quick Start Guide

## ⚡ Get Up and Running in 5 Minutes

### Step 1: Install Dependencies (1 min)

```bash
cd smart-money-gh/backend
npm install
```

### Step 2: Setup Database (2 min)

```bash
# Create PostgreSQL database
sudo -u postgres psql

# In psql prompt:
CREATE DATABASE smart_money_gh;
CREATE USER smart_money_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE smart_money_gh TO smart_money_user;
\q

# Run schema
psql -U smart_money_user -d smart_money_gh -f ../database_schema.sql
```

### Step 3: Configure Environment (1 min)

```bash
cp .env.example .env
```

Edit `.env` file:
```env
NODE_ENV=development
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_money_gh
DB_USER=smart_money_user
DB_PASSWORD=your_password
DB_SSL=false

JWT_SECRET=my_dev_secret_key_12345
JWT_EXPIRES_IN=7d

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

FRONTEND_URL=http://localhost:8080
CORS_ORIGIN=http://localhost:8080
```

### Step 4: Start Server (1 min)

```bash
npm run dev
```

You should see:
```
╔═══════════════════════════════════════════════════════════╗
║          🏦 KudiSave API Server Running           ║
║  Environment: DEVELOPMENT    Port:  5000                 ║
║  🚀 Server:     http://localhost:5000                    ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 🧪 Test Your API

### 1. Check Health
```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "message": "KudiSave API is running"
}
```

### 2. Register a User
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kwame Mensah",
    "email": "kwame@test.com",
    "phone": "233244123456",
    "password": "Test1234"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "kwame@test.com",
    "password": "Test1234"
  }'
```

Save the returned `token` for authenticated requests.

### 4. Create an Expense (Use Token from Login)
```bash
curl -X POST http://localhost:5000/api/v1/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "amount": 25.50,
    "category": "Food / Chop Bar",
    "payment_method": "MTN MoMo",
    "expense_date": "2024-01-15",
    "note": "Lunch at Aunty Muni"
  }'
```

### 5. Get Dashboard Data
```bash
# Get expenses
curl http://localhost:5000/api/v1/expenses \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Get streak
curl http://localhost:5000/api/v1/gamification/streak \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Get XP and level
curl http://localhost:5000/api/v1/gamification/xp \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🎮 Test Gamification Features

### Create Multiple Expenses to Earn XP
```bash
# Day 1
curl -X POST http://localhost:5000/api/v1/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount": 10, "category": "Food / Chop Bar", "payment_method": "Cash", "expense_date": "2024-01-15"}'

# Day 2 (next day)
curl -X POST http://localhost:5000/api/v1/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount": 15, "category": "Transport (Trotro / Bolt)", "payment_method": "Cash", "expense_date": "2024-01-16"}'

# Check your streak
curl http://localhost:5000/api/v1/gamification/streak \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response: {"current_streak": 2, "longest_streak": 2}
```

### Create a Savings Goal
```bash
curl -X POST http://localhost:5000/api/v1/goals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "New Phone",
    "target_amount": 1500.00,
    "deadline": "2024-12-31"
  }'
```

### Set a Budget
```bash
curl -X POST http://localhost:5000/api/v1/budget \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "period_type": "monthly",
    "amount": 2000.00,
    "start_date": "2024-02-01"
  }'
```

---

## 📱 Testing with Postman

### Import Collection

1. Open Postman
2. Click "Import"
3. Create these requests:

**Auth → Register**
- Method: POST
- URL: `http://localhost:5000/api/v1/auth/register`
- Body (raw JSON):
```json
{
  "name": "Test User",
  "email": "test@example.com",
  "phone": "233244123456",
  "password": "Test1234"
}
```

**Auth → Login**
- Method: POST
- URL: `http://localhost:5000/api/v1/auth/login`
- Body (raw JSON):
```json
{
  "identifier": "test@example.com",
  "password": "Test1234"
}
```

**Expenses → Create**
- Method: POST
- URL: `http://localhost:5000/api/v1/expenses`
- Headers: `Authorization: Bearer {{token}}`
- Body (raw JSON):
```json
{
  "amount": 25.50,
  "category": "Food / Chop Bar",
  "payment_method": "MTN MoMo",
  "expense_date": "2024-01-15",
  "note": "Lunch"
}
```

---

## 🐛 Troubleshooting

### "Database connection failed"
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# If not running, start it
sudo systemctl start postgresql
```

### "Port 5000 is already in use"
```bash
# Find and kill the process
lsof -i :5000
kill -9 <PID>

# Or use a different port in .env
PORT=3000
```

### "JWT token invalid"
- Make sure you're including `Bearer` before the token
- Check token hasn't expired (default: 7 days)
- Format: `Authorization: Bearer eyJhbGc...`

### "Module not found"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 View Database Data

```bash
# Connect to database
psql -U smart_money_user -d smart_money_gh

# View tables
\dt

# View users
SELECT * FROM users;

# View expenses
SELECT * FROM expenses;

# View user with their stats
SELECT u.name, u.email, s.current_streak, x.total_xp, x.level
FROM users u
LEFT JOIN streaks s ON u.id = s.user_id
LEFT JOIN user_xp x ON u.id = x.user_id;

# Exit
\q
```

---

## 🎯 Next Steps

1. **Frontend Development**
   - Create HTML/CSS/JS interface
   - Use Capacitor to wrap for mobile
   - Connect to API endpoints

2. **Deploy to Cloud**
   - See [DEPLOYMENT.md](DEPLOYMENT.md)
   - Use Railway, Heroku, or DigitalOcean

3. **Add Features**
   - Push notifications
   - MoMo integration
   - Social features
   - AI insights

---

## 📚 Resources

- **Full API Docs**: [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Database Schema**: [database_schema.sql](database_schema.sql)
- **Main README**: [README.md](README.md)

---

## 🤝 Need Help?

- Check the [README.md](README.md) for detailed documentation
- Review [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for endpoint details
- Email: support@kudisave.com

---

**Happy Coding! 🚀🇬🇭**
