# zmix - Solana Privacy Mixer

A sophisticated privacy mixing solution for Solana blockchain that enables users to break transaction graphs through multi-hop routing and privacy delays.

## 🔐 Features

- **Multi-Hop Privacy Chain**: Route SOL through 2-4 randomized intermediate wallets with dynamic hop counts and jittered delays
- **Privacy Delay**: Optional randomized transaction delays (1-30 minutes) before execution
- **Ephemeral Wallets**: Generate disposable Solana wallets client-side for enhanced privacy
- **Encrypted Storage**: AES-256-CBC encryption for wallet recovery
- **Referral System**: Earn 0.5% rewards from referrals
- **Transaction History**: Auto-refresh every 15 seconds with real Solana blockchain data
- **Real-time Notifications**: In-app and browser push notifications for mix events
- **Privacy Scoring**: Visual privacy score with detailed factor analysis

## 🏗️ Tech Stack

### Frontend
- **React 18+** with TypeScript
- **TanStack Query v5** for server state management
- **Wouter** for routing
- **Shadcn/ui + Radix UI** components
- **Tailwind CSS** with dark theme
- **Vite** for dev/build

### Backend
- **Express.js** with TypeScript
- **Drizzle ORM** with PostgreSQL (Neon serverless)
- **Passport.js** for authentication
- **bcryptjs** for password hashing
- **Redis/IORedis** for session management
- **Zod** for runtime validation

### Blockchain
- **@solana/web3.js** for Solana integration
- **Mainnet only** with real SOL transfers
- **QuickNode RPC** with fallback

## 📋 Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **PostgreSQL** 13+ (or Neon serverless)
- **Redis** (optional, for session management)

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/zmix.git
   cd zmix
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment** (see SETUP.md)
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Initialize database**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

Access at http://localhost:5000

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Comprehensive backend setup guide
- **API Routes** - Backend endpoints in server/routes.ts
- **Types** - TypeScript types in shared/schema.ts

## 🏗️ Project Structure

```
zmix/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── lib/
│   │   └── App.tsx
├── server/              # Express backend
│   ├── index.ts
│   ├── routes.ts
│   ├── storage.ts
│   └── db.ts
├── shared/              # Shared types
│   └── schema.ts
├── vite.config.ts
└── package.json
```

## 🔧 Available Scripts

```bash
npm run dev              # Start dev server
npm run build           # Build for production
npm start              # Run production build
npm run db:push        # Apply database migrations
npm run check          # TypeScript type checking
```

## 🔐 Security Features

- **AES-256-CBC encryption** for private key storage
- **bcrypt** password hashing
- **Rate limiting** on auth endpoints
- **Session-based** multi-tenant isolation
- **CSRF protection** via secure cookies
- **Input validation** with Zod
- **No private keys in responses**

## 💰 Fees & Rewards

- **Platform Fee**: 2% of each mix
- **Referral Rewards**: 0.5% for referrers
- **First Mix**: Free for new users

## 🌐 Blockchain Integration

- **Network**: Solana Mainnet
- **Currency**: SOL only
- **RPC**: QuickNode with fallback
- **Confirmation**: Awaits blockchain confirmation

## 📱 User Flow

1. Generate Wallet
2. Deposit SOL
3. Set Mix Parameters
4. Execute Mix
5. Receive SOL (minus 2% fee)
6. Burn Wallet

## 🎯 Privacy Presets

- **DEFAULT**: 2-4 hops, 5-30s delays
- **FAST**: 2-3 hops, 3-10s delays
- **MAX_PRIVACY**: 3-4 hops, 15-60s delays

## 📝 License

MIT License - See LICENSE file

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

## ⚠️ Disclaimer

This is a privacy tool for legitimate use cases. Users are responsible for compliance with local regulations.

---

**Built with ❤️ for privacy**
