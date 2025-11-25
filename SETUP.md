# Backend Setup Guide

Complete guide for setting up zmix backend for development or production.

## Prerequisites

- Node.js 18+, npm 9+
- PostgreSQL 13+ (or Neon serverless)
- Redis (optional)
- Git

## 1. Clone & Install

```bash
git clone https://github.com/yourusername/zmix.git
cd zmix
npm install
```

## 2. Database Setup

### Option A: Local PostgreSQL

```bash
psql -U postgres
CREATE DATABASE zmix;
CREATE USER zmix_user WITH PASSWORD 'your_secure_password';
ALTER ROLE zmix_user WITH SUPERUSER;
```

Connection string: `postgresql://zmix_user:your_secure_password@localhost:5432/zmix`

### Option B: Neon Serverless

Visit [neon.tech](https://neon.tech/), create project, copy connection string.

## 3. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/zmix
SESSION_SECRET=your_random_secret_key_here_min_32_chars
NODE_ENV=development
VITE_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
VITE_PLATFORM_WALLET=your_platform_solana_address
JWT_SECRET=your_jwt_secret_key_here
```

## 4. Initialize Database

```bash
npm run db:push
```

## 5. Start Development

```bash
npm run dev
```

Access at http://localhost:5000

## 📊 Backend Architecture

### Core Files

- `server/index.ts` - Express setup
- `server/routes.ts` - API endpoints
- `server/storage.ts` - Data persistence
- `server/db.ts` - Drizzle ORM & schema

### API Endpoints

**Auth:**
- `POST /api/auth/signup` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

**Wallets:**
- `GET /api/wallets` - List wallets
- `POST /api/wallets` - Create wallet
- `DELETE /api/wallets/:id` - Delete wallet

**Mixer:**
- `POST /api/mixer/execute` - Execute mix
- `GET /api/mixer/history` - Mix history

**Referrals:**
- `POST /api/referrals/code` - Generate code
- `GET /api/referrals/stats` - Get stats

## 🐛 Troubleshooting

**Connection Error:**
- Verify DATABASE_URL
- Check PostgreSQL running
- Verify credentials

**Port in Use:**
```bash
lsof -ti:5000 | xargs kill -9
```

**Migration Failed:**
```bash
npm run db:push --verbose
```

## 🚀 Production Deployment

```bash
npm run build
npm start
```

Use reverse proxy (Nginx) with SSL/TLS.

---

For detailed information, see README.md and inline code comments.
