import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Gift, Users, TrendingUp, Check, Coins } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';

interface ReferralCode {
  id: string;
  userId: string;
  code: string;
  discountPercent: string;
  referrerRewardPercent: string;
  usageCount: number;
  maxUsages: number | null;
  expiresAt: string | null;
  isActive: number;
  createdAt: string;
}

interface ReferralStats {
  totalReferrals: number;
  totalEarned: string;
  creditsBalance: string;
  usages: Array<{
    id: string;
    refereeId: string;
    discountAmount: string;
    referrerRewardAmount: string;
    createdAt: string;
  }>;
}

export default function Referral() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Redirect if not authenticated (after auth loading completes)
  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/auth');
    }
  }, [authLoading, user, setLocation]);

  const { data: codes, isLoading: codesLoading } = useQuery<ReferralCode[]>({
    queryKey: ['/api/referral/codes'],
    enabled: !!user,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<ReferralStats>({
    queryKey: ['/api/referral/stats'],
    enabled: !!user,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/referral/generate');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/referral/codes'] });
      queryClient.invalidateQueries({ queryKey: ['/api/referral/stats'] });
      toast({
        title: 'Referral code generated!',
        description: 'Share your code with friends to earn rewards.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to generate code',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  if (authLoading || !user) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-5xl">
        <div className="text-center py-12 text-muted-foreground">
          <Gift className="h-12 w-12 mx-auto mb-4 animate-pulse" />
          <p>Loading referral data...</p>
        </div>
      </div>
    );
  }

  const referralCode = codes?.[0];
  const hasCode = !!referralCode;
  const referralLink = hasCode ? `${window.location.origin}?ref=${referralCode.code}` : '';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: 'Copied to clipboard!',
      description: hasCode ? 'Share this code with friends' : 'Link copied',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Gift className="h-8 w-8 text-primary" data-testid="icon-referral" />
          <h1 className="text-3xl font-bold" data-testid="heading-referral">Referral Program</h1>
        </div>
        <p className="text-muted-foreground">
          Share your referral code and earn 5% of every fee when your friends mix
        </p>
      </div>

      {/* Referral Code Card */}
      <Card className="mb-6" data-testid="card-referral-code">
        <CardHeader>
          <CardTitle>Your Referral Code</CardTitle>
          <CardDescription>
            {hasCode 
              ? 'Share this code with friends. They get 10% off, you earn 5% of their fees!'
              : 'Generate your unique referral code to start earning rewards'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasCode ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  value={referralCode.code} 
                  readOnly 
                  className="font-mono text-2xl text-center font-bold"
                  data-testid="input-referral-code"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(referralCode.code)}
                  data-testid="button-copy-code"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex gap-2">
                <Input 
                  value={referralLink} 
                  readOnly 
                  className="font-mono text-sm"
                  data-testid="input-referral-link"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(referralLink)}
                  data-testid="button-copy-link"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Discount for Friends</div>
                  <div className="text-xl font-bold text-primary">{referralCode.discountPercent}%</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Your Reward</div>
                  <div className="text-xl font-bold text-green-500">{referralCode.referrerRewardPercent}%</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Times Used</div>
                  <div className="text-xl font-bold">{referralCode.usageCount}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Status</div>
                  <Badge variant={referralCode.isActive ? 'default' : 'secondary'}>
                    {referralCode.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <Button 
              onClick={() => generateMutation.mutate()} 
              disabled={generateMutation.isPending || codesLoading}
              className="w-full"
              data-testid="button-generate-code"
            >
              <Gift className="h-4 w-4 mr-2" />
              {generateMutation.isPending ? 'Generating...' : 'Generate Referral Code'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      {hasCode && stats && (
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card data-testid="card-total-referrals">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold" data-testid="text-total-referrals">{stats.totalReferrals}</span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-total-earned">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="text-3xl font-bold text-green-500" data-testid="text-total-earned">{parseFloat(stats.totalEarned).toFixed(4)} SOL</span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-available-credits">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available Credits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold text-primary" data-testid="text-available-credits">{parseFloat(stats.creditsBalance).toFixed(4)} SOL</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Referrals */}
      {hasCode && stats && stats.usages.length > 0 && (
        <Card data-testid="card-recent-referrals">
          <CardHeader>
            <CardTitle>Recent Referrals</CardTitle>
            <CardDescription>Your latest referral earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.usages.map((usage, index) => (
                <div
                  key={usage.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                  data-testid={`referral-usage-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      <Users className="h-3 w-3 mr-1" />
                      Referral #{stats.totalReferrals - index}
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(usage.createdAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Your Reward</div>
                      <div className="font-semibold text-green-500">
                        +{parseFloat(usage.referrerRewardAmount).toFixed(6)} SOL
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card className="mt-6" data-testid="card-how-it-works">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-0.5">1</Badge>
              <div>
                <div className="font-semibold mb-1">Share your code</div>
                <div className="text-muted-foreground">Send your referral code or link to friends</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-0.5">2</Badge>
              <div>
                <div className="font-semibold mb-1">They save 10%</div>
                <div className="text-muted-foreground">Your friends get a 10% discount on their platform fee</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <Badge variant="secondary" className="mt-0.5">3</Badge>
              <div>
                <div className="font-semibold mb-1">You earn 5%</div>
                <div className="text-muted-foreground">You receive 5% of their fees as credits, usable on your next mix</div>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert className="mt-6">
        <AlertDescription>
          <strong>Note:</strong> Referral credits are automatically applied to reduce your fees on future mixes.
          Credits stack with loyalty discounts for maximum savings!
        </AlertDescription>
      </Alert>
    </div>
  );
}
