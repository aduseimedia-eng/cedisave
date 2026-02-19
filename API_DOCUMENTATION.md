# KudiSave API Documentation

## Base URL
```
Development: http://localhost:5000/api/v1
Production: https://api.kudisave.com/api/v1
```

## Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Authentication Endpoints

### 1. Register User
**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "name": "Kwame Mensah",
  "email": "kwame@example.com",
  "phone": "233244123456",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Kwame Mensah",
      "email": "kwame@example.com",
      "phone": "233244123456",
      "created_at": "2024-01-15T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Login
**POST** `/auth/login`

Login with email/phone and password.

**Request Body:**
```json
{
  "identifier": "kwame@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Kwame Mensah",
      "email": "kwame@example.com",
      "phone": "233244123456"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. Get Profile
**GET** `/auth/profile`

Get current user profile (requires authentication).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Kwame Mensah",
    "email": "kwame@example.com",
    "phone": "233244123456",
    "created_at": "2024-01-15T10:30:00Z",
    "current_streak": 15,
    "longest_streak": 30,
    "total_xp": 1250,
    "level": 5
  }
}
```

---

## Expense Endpoints

### 1. Create Expense
**POST** `/expenses`

Create a new expense entry.

**Request Body:**
```json
{
  "amount": 25.50,
  "category": "Food / Chop Bar",
  "payment_method": "MTN MoMo",
  "expense_date": "2024-01-15",
  "note": "Lunch at Aunty Muni's",
  "is_recurring": false,
  "recurring_frequency": null
}
```

**Response:**
```json
{
  "success": true,
  "message": "Expense created successfully",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "amount": 25.50,
    "category": "Food / Chop Bar",
    "payment_method": "MTN MoMo",
    "expense_date": "2024-01-15",
    "note": "Lunch at Aunty Muni's",
    "is_recurring": false,
    "recurring_frequency": null,
    "created_at": "2024-01-15T12:30:00Z"
  }
}
```

### 2. Get All Expenses
**GET** `/expenses?start_date=2024-01-01&end_date=2024-01-31&category=Food&limit=50&offset=0`

Get all expenses with optional filters.

**Query Parameters:**
- `start_date` (optional): Filter by start date
- `end_date` (optional): Filter by end date
- `category` (optional): Filter by category
- `payment_method` (optional): Filter by payment method
- `limit` (optional, default: 50): Number of results per page
- `offset` (optional, default: 0): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "id": "uuid",
        "amount": 25.50,
        "category": "Food / Chop Bar",
        "payment_method": "MTN MoMo",
        "expense_date": "2024-01-15",
        "note": "Lunch at Aunty Muni's",
        "created_at": "2024-01-15T12:30:00Z"
      }
    ],
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

### 3. Get Expense Summary
**GET** `/expenses/summary?period=month`

Get expense summary statistics.

**Query Parameters:**
- `period` (optional): "week", "month", or "year"

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_transactions": 45,
      "total_amount": "1250.75",
      "avg_amount": "27.79",
      "max_amount": "150.00",
      "min_amount": "5.00"
    },
    "by_category": [
      {
        "category": "Food / Chop Bar",
        "count": 20,
        "total": "450.00"
      },
      {
        "category": "Transport (Trotro / Bolt)",
        "count": 15,
        "total": "300.00"
      }
    ],
    "period": "month"
  }
}
```

---

## Budget Endpoints

### 1. Create Budget
**POST** `/budget`

Create a new budget.

**Request Body:**
```json
{
  "period_type": "monthly",
  "amount": 2000.00,
  "start_date": "2024-02-01"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Budget created successfully",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "period_type": "monthly",
    "amount": 2000.00,
    "start_date": "2024-02-01",
    "end_date": "2024-02-29",
    "is_active": true,
    "created_at": "2024-02-01T10:00:00Z"
  }
}
```

### 2. Get Active Budget
**GET** `/budget/active`

Get current active budget with spending details.

**Response:**
```json
{
  "success": true,
  "data": {
    "budget_id": "uuid",
    "period_type": "monthly",
    "budget_amount": 2000.00,
    "spent_amount": 1250.75,
    "remaining": 749.25,
    "usage_percentage": 62.54,
    "start_date": "2024-02-01",
    "end_date": "2024-02-29",
    "days_remaining": 15
  }
}
```

---

## Goals Endpoints

### 1. Create Goal
**POST** `/goals`

Create a new savings goal.

**Request Body:**
```json
{
  "title": "New Laptop",
  "target_amount": 5000.00,
  "deadline": "2024-12-31"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Goal created successfully",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "title": "New Laptop",
    "target_amount": 5000.00,
    "current_amount": 0.00,
    "deadline": "2024-12-31",
    "status": "active",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

### 2. Get All Goals
**GET** `/goals`

Get all savings goals.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "New Laptop",
      "target_amount": 5000.00,
      "current_amount": 2500.00,
      "progress_percentage": 50.00,
      "deadline": "2024-12-31",
      "status": "active",
      "days_remaining": 180
    }
  ]
}
```

---

## Reports Endpoints

### 1. Monthly Report
**GET** `/reports/monthly?month=2024-01`

Get detailed monthly financial report.

**Response:**
```json
{
  "success": true,
  "data": {
    "month": "2024-01",
    "total_income": 3500.00,
    "total_expenses": 2250.75,
    "net_savings": 1249.25,
    "savings_rate": 35.69,
    "category_breakdown": [
      {
        "category": "Food / Chop Bar",
        "total": 750.00,
        "percentage": 33.33
      }
    ],
    "top_expense": {
      "category": "Food / Chop Bar",
      "amount": 750.00
    }
  }
}
```

### 2. Financial Health Score
**GET** `/reports/health-score`

Get financial health score (0-100).

**Response:**
```json
{
  "success": true,
  "data": {
    "score": 78,
    "breakdown": {
      "savings_rate": 25,
      "budget_adherence": 28,
      "consistency": 18,
      "goal_progress": 15
    },
    "recommendation": "Great job! Focus on increasing your savings rate."
  }
}
```

---

## Gamification Endpoints

### 1. Get Badges
**GET** `/gamification/badges`

Get all earned badges.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "badge_name": "Data King/Queen",
      "badge_tier": "gold",
      "description": "Spend less than GHS 20 on data/airtime for a month",
      "earned_at": "2024-01-31T23:59:00Z"
    }
  ]
}
```

### 2. Get Streak
**GET** `/gamification/streak`

Get current streak information.

**Response:**
```json
{
  "success": true,
  "data": {
    "current_streak": 15,
    "longest_streak": 30,
    "last_activity_date": "2024-01-15"
  }
}
```

### 3. Get XP & Level
**GET** `/gamification/xp`

Get XP and level information.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_xp": 1250,
    "level": 5,
    "current_level_xp": 1000,
    "next_level_xp": 2000,
    "progress_percentage": 25.00
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Rate Limits

- General API: 100 requests per 15 minutes
- Authentication endpoints: 5 requests per 15 minutes
- Registration: 3 requests per hour
- Password reset: 3 requests per hour
- Expense creation: 50 requests per 5 minutes

---

## Ghana-Specific Features

### Valid Expense Categories
- Food / Chop Bar
- Transport (Trotro / Bolt)
- Data / Airtime
- Rent / Hostel
- Utilities
- Church / Donations
- Betting / Gaming
- Entertainment
- Shopping
- Miscellaneous

### Valid Payment Methods
- Cash
- MTN MoMo
- Telecel Cash
- Bank Transfer
- AirtelTigo Money

### Phone Number Format
Ghana phone numbers must be in format: `233XXXXXXXXX` (12 digits starting with 233)
