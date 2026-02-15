# 🏗️ KudiPal - System Architecture

## Overview

KudiPal is built on a modern, scalable architecture designed for performance, security, and maintainability.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         MOBILE/WEB CLIENT                        │
│                  (HTML/CSS/JS + Capacitor)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ HTTPS/REST API
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐              │
│  │  CORS      │  │  Helmet    │  │ Rate Limiter │              │
│  │  Security  │  │  Headers   │  │  Protection  │              │
│  └────────────┘  └────────────┘  └──────────────┘              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   AUTHENTICATION LAYER                           │
│              ┌─────────────────────────┐                         │
│              │   JWT Middleware        │                         │
│              │   Token Verification    │                         │
│              └─────────────────────────┘                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                        ROUTER LAYER                              │
│  ┌─────┐ ┌─────────┐ ┌────────┐ ┌────────┐ ┌──────────────┐   │
│  │Auth │ │Expenses │ │ Income │ │ Budget │ │Gamification │   │
│  │/api │ │  /api   │ │  /api  │ │  /api  │ │    /api      │   │
│  └─────┘ └─────────┘ └────────┘ └────────┘ └──────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    CONTROLLER LAYER                              │
│  ┌──────────────────┐  ┌────────────────────────────┐          │
│  │ Request Handler  │  │   Input Validation         │          │
│  │ Business Logic   │  │   Error Handling           │          │
│  └──────────────────┘  └────────────────────────────┘          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     SERVICE LAYER                                │
│  ┌──────────────┐ ┌────────────────┐ ┌──────────────────┐      │
│  │ Analytics    │ │ Gamification   │ │  Notifications   │      │
│  │ Service      │ │ Service        │ │  Service         │      │
│  └──────────────┘ └────────────────┘ └──────────────────┘      │
│  ┌──────────────┐ ┌────────────────┐                           │
│  │ Email        │ │ Budget Alert   │                           │
│  │ Service      │ │ Service        │                           │
│  └──────────────┘ └────────────────┘                           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      DATA ACCESS LAYER                           │
│              ┌─────────────────────────┐                         │
│              │  PostgreSQL Connection  │                         │
│              │  Pool Manager           │                         │
│              │  Query Builder          │                         │
│              └─────────────────────────┘                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                      DATABASE LAYER                              │
│                     PostgreSQL 14+                               │
│  ┌──────┐ ┌─────────┐ ┌────────┐ ┌──────┐ ┌────────┐          │
│  │Users │ │Expenses │ │ Income │ │Budget│ │ Goals  │          │
│  └──────┘ └─────────┘ └────────┘ └──────┘ └────────┘          │
│  ┌──────┐ ┌─────────┐ ┌──────────────┐                         │
│  │Badges│ │Streaks  │ │Notifications │                         │
│  └──────┘ └─────────┘ └──────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Language**: JavaScript (ES6+)
- **Database**: PostgreSQL 14+
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcrypt
- **Validation**: express-validator
- **Email**: nodemailer

### Frontend (Future Implementation)
- **Core**: HTML5, CSS3, JavaScript
- **Mobile Wrapper**: Capacitor
- **Charts**: Chart.js / Recharts
- **HTTP Client**: Fetch API / Axios

### DevOps & Infrastructure
- **Hosting**: Railway / Heroku / DigitalOcean
- **Database Hosting**: ElephantSQL / Supabase / Neon
- **Email Service**: SendGrid / Gmail SMTP
- **Version Control**: Git / GitHub

---

## Database Design

### Core Tables

#### Users
- Primary authentication and profile data
- Links to all user-specific resources
- Includes verification tokens for email verification

#### Expenses
- Main transaction tracking table
- Foreign key to Users
- Supports recurring expenses
- Indexed on user_id and expense_date for fast queries

#### Income
- Income source tracking
- Linked to Users
- Used in savings rate calculations

#### Budgets
- User budget definitions
- Supports weekly and monthly periods
- Only one active budget per period type per user

#### Goals
- Savings goal tracking
- Progress calculation
- Status management (active/completed/abandoned)

#### Badges
- User achievement tracking
- Supports multiple tiers (bronze/silver/gold/platinum)
- Unique constraint on user + badge + tier

#### Streaks
- Daily activity tracking
- One record per user
- Tracks current and longest streaks

#### User_XP
- Experience points and leveling
- One record per user
- Calculated based on various activities

#### Notifications
- In-app notification system
- Read/unread tracking
- Various notification types

### Database Relationships

```
Users (1) ───→ (Many) Expenses
  │
  ├──→ (Many) Income
  │
  ├──→ (Many) Budgets
  │
  ├──→ (Many) Goals
  │
  ├──→ (Many) Badges
  │
  ├──→ (1) Streaks
  │
  ├──→ (1) User_XP
  │
  └──→ (Many) Notifications
```

### Indexes

Strategic indexes for performance:
- `users(email)` - Fast login lookups
- `users(phone)` - Ghana phone number lookups
- `expenses(user_id, expense_date)` - Date range queries
- `expenses(category)` - Category filtering
- `income(user_id, income_date)` - Date range queries
- `budgets(user_id, is_active)` - Active budget lookups

---

## API Architecture

### RESTful Design

All endpoints follow REST conventions:
- **GET** - Retrieve resources
- **POST** - Create resources
- **PUT** - Update resources
- **DELETE** - Remove resources

### Request/Response Flow

```
1. Client Request
   ↓
2. CORS & Security Check
   ↓
3. Rate Limit Check
   ↓
4. JWT Authentication (if required)
   ↓
5. Input Validation
   ↓
6. Controller Logic
   ↓
7. Service Layer Processing
   ↓
8. Database Query
   ↓
9. Response Formatting
   ↓
10. JSON Response to Client
```

### Error Handling

Centralized error handling with:
- Consistent error response format
- HTTP status code mapping
- PostgreSQL error translation
- Development vs production error details

---

## Security Architecture

### Authentication Flow

```
1. User Registration
   ├─ Password hashed with bcrypt (10 rounds)
   ├─ User stored in database
   └─ JWT tokens generated

2. User Login
   ├─ Credentials validated
   ├─ Password verified with bcrypt
   ├─ JWT access token generated (7 days)
   └─ JWT refresh token generated (30 days)

3. Protected Requests
   ├─ Token extracted from Authorization header
   ├─ Token verified with JWT secret
   ├─ User ID extracted from token
   └─ Request processed
```

### Security Layers

1. **Transport Layer**
   - HTTPS enforcement in production
   - TLS 1.2+ required

2. **Application Layer**
   - Helmet.js security headers
   - CORS configuration
   - Rate limiting
   - Input validation

3. **Authentication Layer**
   - JWT token-based auth
   - Bcrypt password hashing
   - Token expiration
   - Secure token storage

4. **Database Layer**
   - Parameterized queries (SQL injection prevention)
   - Connection pooling
   - SSL connections in production
   - Read/write separation (future)

---

## Gamification System

### XP Calculation Engine

```javascript
Activity → XP Award → Total XP Update → Level Check → Badge Check
```

**XP Sources:**
- Expense logging: +10 XP
- Budget adherence: +100 XP
- Goal completion: +250 XP
- Daily streak: +5 XP per day
- Monthly summary: +20 XP

**Level Progression:**
- Level 1: 0 XP
- Level 2: 100 XP
- Level 3: 250 XP
- Level 4: 500 XP
- Level 5: 1000 XP
- [... up to Level 10: 11000 XP]

### Badge System

**Badge Categories:**
1. **Spending Control** (Data King, Chop Saver)
2. **Budget Management** (Budget Boss)
3. **Consistency** (Consistency Champ)
4. **Goal Achievement** (Goal Getter)
5. **Category Specific** (Transport Wise)

**Badge Tiers:**
- Bronze (easy to achieve)
- Silver (moderate effort)
- Gold (significant achievement)
- Platinum (exceptional - future)

### Streak System

```
Day 1: Log expense → Streak = 1
Day 2: Log expense → Streak = 2
Day 3: Skip → Streak resets to 0
Day 4: Log expense → Streak = 1
```

**Streak Milestones:**
- 7 days: Bronze Consistency Champ
- 30 days: Silver Consistency Champ
- 90 days: Gold Consistency Champ

---

## Analytics Engine

### Financial Health Score (0-100)

**Components:**

1. **Savings Rate (30 points)**
   ```
   Savings Rate = (Income - Expenses) / Income * 100
   
   If rate >= 30%: 30 points
   If rate >= 20%: 25 points
   If rate >= 10%: 20 points
   Else: Proportional
   ```

2. **Budget Adherence (30 points)**
   ```
   Usage = Spent / Budget * 100
   
   If usage <= 80%: 30 points
   If usage <= 90%: 25 points
   If usage <= 100%: 20 points
   Else: 10 points
   ```

3. **Consistency (20 points)**
   ```
   Based on current streak:
   
   If streak >= 30 days: 20 points
   If streak >= 14 days: 15 points
   If streak >= 7 days: 10 points
   Else: Proportional
   ```

4. **Goal Progress (20 points)**
   ```
   Based on completed goals and active goal progress
   ```

### Report Generation

**Monthly Report:**
- Total income
- Total expenses
- Net savings
- Savings rate
- Category breakdown
- Top spending category
- Month-over-month comparison

**Weekly Report:**
- Daily average spending
- Top 5 categories
- Budget usage
- Streak status

---

## Scalability Considerations

### Current Architecture (MVP)
- Single server instance
- Single PostgreSQL database
- Direct database connections

### Future Scaling (Phase 2)

1. **Horizontal Scaling**
   - Load balancer
   - Multiple server instances
   - Stateless design (ready)

2. **Database Scaling**
   - Read replicas for queries
   - Write master for transactions
   - Connection pooling (implemented)
   - Database indexing (implemented)

3. **Caching Layer**
   - Redis for session storage
   - Redis for frequently accessed data
   - Cache invalidation strategy

4. **Microservices (Phase 3)**
   - Auth service
   - Transaction service
   - Analytics service
   - Notification service
   - Gamification service

---

## Monitoring & Observability

### Recommended Setup

1. **Application Monitoring**
   - Error tracking: Sentry
   - Performance: New Relic / Datadog
   - Logs: Winston + Papertrail

2. **Infrastructure Monitoring**
   - Uptime: UptimeRobot
   - Server metrics: Netdata / Grafana
   - Database metrics: pgAdmin / DataDog

3. **Business Metrics**
   - User registrations
   - Daily active users
   - Expense entries per user
   - Goal completion rate
   - Badge distribution

---

## Deployment Architecture

### Production Setup

```
┌─────────────────────────────────────────────┐
│           Load Balancer / CDN               │
│              (CloudFlare)                   │
└──────────────────┬──────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
┌──────▼─────┐         ┌──────▼─────┐
│  Server 1  │         │  Server 2  │
│  (Node.js) │         │  (Node.js) │
└──────┬─────┘         └──────┬─────┘
       │                       │
       └───────────┬───────────┘
                   │
        ┌──────────▼──────────┐
        │   PostgreSQL DB     │
        │   (With Replicas)   │
        └─────────────────────┘
```

---

## Future Enhancements

### Phase 2 (Q2 2024)
- MoMo API integration
- Push notifications
- Bill reminders
- Split expenses
- Social features

### Phase 3 (Q3 2024)
- AI spending insights
- Micro-investments
- Business analytics
- Credit scoring
- Partnership integrations

### Phase 4 (Q4 2024)
- Multi-currency support
- International expansion
- Advanced analytics
- Machine learning predictions

---

## Performance Optimization

### Current Optimizations
- Connection pooling
- Database indexes
- Compression middleware
- Efficient queries
- Parameterized queries

### Future Optimizations
- Redis caching
- Query optimization
- Database partitioning
- CDN for static assets
- Image optimization

---

## Conclusion

KudiPal is built on a solid, scalable foundation ready for growth. The architecture supports:
- Easy maintenance
- Horizontal scaling
- Feature additions
- Performance optimization
- Security enhancements

This modular design ensures long-term viability and adaptability to changing needs.
