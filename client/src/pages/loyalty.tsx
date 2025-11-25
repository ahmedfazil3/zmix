import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Coins, TrendingUp, Award, Gift, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useEffect } from 'react';

interface UserRewards {
  id: string;
  userId: string;
  totalMixes: number;
  totalVolume: string;
  lifetimeFees: string;
  loyaltyTier: string;
  feeDiscountPercent: string;
  creditsBalance: string;
  firstMixCompleted: number;
  lastMixAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const TIER_THRESHOLDS = {
  bronze: { min: 0, max: 10, discount: '1.00', color: 'bg-amber-600/20 text-amber-400 border-amber-600/30' },
  silver: { min: 10, max: 50, discount: '2.00', color: 'bg-gray-400/20 text-gray-300 border-gray-400/30' },
  gold: { min: 50, max: 200, discount: '3.00', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  platinum: { min: 200, max: Infinity, discount: '4.00', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
};

export default function Loyalty() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if not authenticated (after auth loading completes)
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/auth');
    }
  }, [authLoading, user, setLocation]);

  const { data: rewards, isLoading } = useQuery<UserRewards>({
    queryKey: ['/api/rewards'],
    enabled: !!user,
  });

  if (authLoading || !user) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-5xl">
        <div className="text-center py-12 text-muted-foreground">
          <Award className="h-12 w-12 mx-auto mb-4 animate-pulse" />
          <p>Loading loyalty data...</p>
        </div>
      </div>
    );
  }

  if (isLoading || !rewards) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-5xl">
        <div className="text-center py-12 text-muted-foreground">
          <Award className="h-12 w-12 mx-auto mb-4 animate-pulse" />
          <p>Loading loyalty data...</p>
        </div>
      </div>
    );
  }

  const currentVolume = parseFloat(rewards.totalVolume);
  const currentTier = rewards.loyaltyTier as keyof typeof TIER_THRESHOLDS;
  const tierInfo = TIER_THRESHOLDS[currentTier];
  
  // Calculate next tier
  const tierOrder = ['bronze', 'silver', 'gold', 'platinum'] as const;
  const currentTierIndex = tierOrder.indexOf(currentTier);
  const nextTierKey = currentTierIndex < tierOrder.length - 1 ? tierOrder[currentTierIndex + 1] : null;
  const nextTier = nextTierKey ? TIER_THRESHOLDS[nextTierKey] : null;
  
  // Progress to next tier
  const progressPercent = nextTier
    ? Math.min(100, ((currentVolume - tierInfo.min) / (nextTier.min - tierInfo.min)) * 100)
    : 100;

  const volumeToNextTier = nextTier ? (nextTier.min - currentVolume).toFixed(4) : '0';

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Award className="h-8 w-8 text-primary" data-testid="icon-loyalty" />
          <h1 className="text-3xl font-bold" data-testid="heading-loyalty">Loyalty Rewards</h1>
        </div>
        <p className="text-muted-foreground">
          Earn fee discounts and credits by mixing more volume through the platform
        </p>
      </div>

      {/* Current Tier Card */}
      <Card className="mb-6" data-testid="card-current-tier">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-2xl">Current Tier</CardTitle>
            <Badge 
              variant="secondary" 
              className={`${tierInfo.color} text-lg px-4 py-1`}
              data-testid="badge-tier"
            >
              <Shield className="h-4 w-4 mr-2" />
              {currentTier.toUpperCase()}
            </Badge>
          </div>
          <CardDescription>
            {currentTier === 'platinum' ? 'Maximum tier achieved!' : `Mix ${volumeToNextTier} more SOL to reach ${nextTierKey?.toUpperCase()}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {nextTier && (
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Progress to {nextTierKey?.toUpperCase()}</span>
                <span className="font-semibold">{currentVolume.toFixed(4)} / {nextTier.min} SOL</span>
              </div>
              <Progress value={progressPercent} className="h-3" data-testid="progress-tier" />
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Total Mixes</div>
              <div className="text-2xl font-bold" data-testid="text-total-mixes">{rewards.totalMixes}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Total Volume</div>
              <div className="text-2xl font-bold" data-testid="text-total-volume">{currentVolume.toFixed(4)} SOL</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Fee Discount</div>
              <div className="text-2xl font-bold text-primary" data-testid="text-fee-discount">{rewards.feeDiscountPercent}%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Credits Balance</div>
              <div className="text-2xl font-bold text-green-500" data-testid="text-credits-balance">{parseFloat(rewards.creditsBalance).toFixed(4)} SOL</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tier Breakdown */}
      <Card data-testid="card-tier-breakdown">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tier Breakdown
          </CardTitle>
          <CardDescription>
            Fee discounts increase with your total mixing volume
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(Object.entries(TIER_THRESHOLDS) as [keyof typeof TIER_THRESHOLDS, typeof TIER_THRESHOLDS.bronze][]).map(([tier, info]) => {
              const isCurrentTier = tier === currentTier;
              const isPastTier = tierOrder.indexOf(tier) < currentTierIndex;

              return (
                <div 
                  key={tier} 
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    isCurrentTier ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  data-testid={`tier-row-${tier}`}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className={info.color}>
                      {tier.toUpperCase()}
                    </Badge>
                    <div>
                      <div className="font-semibold">
                        {info.max === Infinity ? `${info.min}+ SOL` : `${info.min}-${info.max} SOL`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {info.discount}% fee discount
                      </div>
                    </div>
                  </div>
                  {isCurrentTier && (
                    <Badge variant="default">
                      <Gift className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  )}
                  {isPastTier && (
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                      <Award className="h-3 w-3 mr-1" />
                      Unlocked
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* First Mix Free Banner */}
      {rewards.firstMixCompleted === 0 && (
        <Card className="mt-6 border-primary bg-primary/5" data-testid="card-first-mix-free">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Coins className="h-5 w-5" />
              First Mix Free!
            </CardTitle>
            <CardDescription>
              Your first mix is completely free - no platform fees charged!
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
