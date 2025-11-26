import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rocket, Clock, CheckCircle2, Circle } from 'lucide-react';

interface RoadmapItem {
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'planned';
  category: string;
}

const roadmapItems: RoadmapItem[] = [
  {
    title: 'SOL→ZEC Privacy Mixer',
    description: 'Cross-chain mixing from Solana to shielded Zcash with automated exchange integration',
    status: 'completed',
    category: 'Core Features',
  },
  {
    title: 'Disposable Wallet Generation',
    description: 'Client-side Solana burner wallet creation with server-backed encrypted storage',
    status: 'completed',
    category: 'Core Features',
  },
  {
    title: 'Multi-Hop Privacy Chain',
    description: 'Multiple intermediate wallets with randomized delays, variance, and balance confirmation',
    status: 'completed',
    category: 'Privacy Features',
  },
  {
    title: 'Privacy Delay System',
    description: 'Randomized transaction timing delays (1-60 minutes) with variance to obscure patterns',
    status: 'completed',
    category: 'Privacy Features',
  },
  {
    title: 'Privacy Score Tracking',
    description: 'Real-time privacy analysis based on wallet age, transactions, and activity',
    status: 'completed',
    category: 'Privacy Features',
  },
  {
    title: 'Transaction History Tracking',
    description: 'Automatic blockchain transaction fetching with incoming/outgoing detection',
    status: 'completed',
    category: 'Core Features',
  },
  {
    title: 'Username + PIN Authentication',
    description: 'Secure login system with bcrypt hashing and persistent sessions',
    status: 'completed',
    category: 'Security',
  },
  {
    title: 'Database Persistence',
    description: 'PostgreSQL storage with AES-256-CBC wallet encryption and soft deletes',
    status: 'completed',
    category: 'Infrastructure',
  },
  {
    title: 'Rate Limiting Protection',
    description: 'Server-side brute-force mitigation and API rate limiting on sensitive endpoints',
    status: 'completed',
    category: 'Security',
  },
  {
    title: 'Balance Auto-Polling',
    description: 'Automatic wallet balance updates every 15 seconds with transaction refresh',
    status: 'completed',
    category: 'Core Features',
  },
  {
    title: 'Success Confirmation Screens',
    description: 'Detailed mixer completion screens with payout hash, hop count, and privacy reminders',
    status: 'completed',
    category: 'UX Features',
  },
  {
    title: 'Dynamic Pricing Tiers',
    description: 'Volume-based fee tiers from 5% (Standard) to 1% (Platinum) with automatic progression',
    status: 'completed',
    category: 'Pricing & Rewards',
  },
  {
    title: 'Loyalty Rewards System',
    description: 'First-mix-free bonus, 2% cashback credits, and volume-based tier upgrades',
    status: 'completed',
    category: 'Pricing & Rewards',
  },
  {
    title: 'Referral Program',
    description: 'Customizable referral codes with configurable discounts and automatic reward distribution',
    status: 'completed',
    category: 'Pricing & Rewards',
  },
  {
    title: 'Tor Integration',
    description: 'Built-in Tor proxy support for network-level anonymity',
    status: 'planned',
    category: 'Privacy Features',
  },
  {
    title: 'Decoy Transactions',
    description: 'Automated generation of fake transactions to confuse blockchain analysis',
    status: 'planned',
    category: 'Privacy Features',
  },
  {
    title: 'Multi-Chain Support',
    description: 'Expand beyond SOL→ZEC to support BTC, ETH, XMR mixing pairs',
    status: 'planned',
    category: 'Core Features',
  },
  {
    title: 'Advanced Analytics Dashboard',
    description: 'Comprehensive privacy metrics, mixer stats, and historical analysis',
    status: 'planned',
    category: 'Analytics',
  },
  {
    title: 'Monero Integration',
    description: 'Add XMR as mixing destination for maximum privacy with RingCT',
    status: 'planned',
    category: 'Privacy Features',
  },
];

function getStatusIcon(status: RoadmapItem['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'in-progress':
      return <Clock className="h-5 w-5 text-purple-400 animate-pulse" />;
    case 'planned':
      return <Circle className="h-5 w-5 text-muted-foreground" />;
  }
}

function getStatusBadge(status: RoadmapItem['status']) {
  switch (status) {
    case 'completed':
      return <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>;
    case 'in-progress':
      return <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">In Progress</Badge>;
    case 'planned':
      return <Badge variant="secondary" className="bg-muted/20 text-muted-foreground border-muted/30">Planned</Badge>;
  }
}

export default function Roadmap() {
  const categories = Array.from(new Set(roadmapItems.map(item => item.category)));

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Rocket className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Roadmap
            </h1>
            <p className="text-muted-foreground">Our journey to maximum privacy</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {categories.map(category => (
          <div key={category}>
            <h2 className="text-xl font-semibold mb-4 text-foreground">{category}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {roadmapItems
                .filter(item => item.category === category)
                .map((item, index) => (
                  <Card
                    key={index}
                    data-testid={`card-roadmap-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    className="border-purple-500/20 bg-background/50 backdrop-blur hover-elevate"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          {getStatusIcon(item.status)}
                          <CardTitle className="text-base">{item.title}</CardTitle>
                        </div>
                        {getStatusBadge(item.status)}
                      </div>
                      <CardDescription className="mt-2">{item.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
