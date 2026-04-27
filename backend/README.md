# Real Estate Backend

Node.js + Express + PostgreSQL REST API for the Real Estate App.

## Quick Start

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Set up environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

### 3. Create the database
```bash
createdb realestate
# Or in psql:
# CREATE DATABASE realestate;
```

### 4. Run migrations + seed data
```bash
psql -U postgres -d realestate -f migrations/001_init.sql
```

### 5. Start the server
```bash
npm run dev      # development (nodemon)
npm start        # production
```

Server runs on **http://localhost:3001**

---

## API Reference

### Auth
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/login` | `{email, password}` | Returns JWT token |

### Properties (Public)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/properties` | List all public properties |
| GET | `/api/properties/:id` | Get property detail |

**Query params for list:** `?category=residential&status=Available&area=Downtown`

### Properties (Admin — requires `Authorization: Bearer <token>`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/properties/admin/all` | All properties |
| POST | `/api/properties` | Create property |
| PUT | `/api/properties/:id` | Update property |
| DELETE | `/api/properties/:id` | Delete property |
| PATCH | `/api/properties/:id/publish` | Toggle `is_public` |

### Analytics (Admin)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/dashboard` | Dashboard KPIs |

---

## Default Admin Credentials
- **Email:** `admin@realestate.com`
- **Password:** `admin123`

> ⚠️ Change these in production!

---

## Environment Variables
See `.env.example` for all required variables.
