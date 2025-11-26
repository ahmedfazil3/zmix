import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Book, Shield, Zap, Eye, AlertTriangle, Lock, Globe, Trash2, DollarSign } from 'lucide-react';

export default function Docs() {
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Book className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Documentation
            </h1>
            <p className="text-muted-foreground">How to use SilentSwap safely and effectively</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Alert className="border-purple-500/30 bg-purple-500/10">
          <Shield className="h-4 w-4 text-purple-400" />
          <AlertDescription className="text-sm">
            <strong>Privacy First:</strong> zmix is designed for maximum anonymity. All wallet operations happen client-side, and no sensitive data is stored on our servers.
          </AlertDescription>
        </Alert>

        <Card className="border-purple-500/20" data-testid="card-getting-started">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-400" />
              Getting Started
            </CardTitle>
            <CardDescription>Quick start guide for your first mix</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Create an Account</h3>
              <p className="text-sm text-muted-foreground">
                Sign up with a username and 4-6 digit PIN. Your session persists until you log out.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">2. Generate a Burner Wallet</h3>
              <p className="text-sm text-muted-foreground">
                Click "New Wallet" to generate a disposable Solana wallet. Your private key is created and stored entirely in your browser—we never see it.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">3. Fund Your Burner</h3>
              <p className="text-sm text-muted-foreground">
                Send SOL to your burner wallet address. Use a fresh source if possible for better privacy.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">4. Mix to Zcash</h3>
              <p className="text-sm text-muted-foreground">
                Click "Mix" and enter your Zcash shielded address (zs1...). Use the privacy delay feature to obscure timing patterns.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">5. Burn the Wallet</h3>
              <p className="text-sm text-muted-foreground">
                After successful mixing, click "Burn Wallet" to permanently delete all traces of the burner from your browser.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20" data-testid="card-privacy-features">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-400" />
              Privacy Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">Privacy Delay</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Adds a random delay (1-60 minutes) before sending transactions, making timing analysis much harder. Always use this feature when possible.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">Privacy Score</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Real-time analysis of your wallet's anonymity based on age, transaction count, and reuse patterns. Aim to keep scores above 80 (green).
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">Wallet Burning</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Permanently deletes wallet data from localStorage, breaking the chain between your burner and its transactions. Always burn after mixing.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">Cross-Chain Mixing</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Converting SOL to shielded ZEC breaks the transaction graph completely. Zcash's privacy tech makes tracing virtually impossible.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/20 bg-orange-500/5" data-testid="card-best-practices">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
              Security Best Practices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-3">
              <Lock className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Use Shielded Zcash Addresses</strong>
                <p className="text-muted-foreground">Always use zs1... addresses from wallets like Ywallet or Zecwallet. Transparent addresses (t1/t3...) offer no privacy.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Globe className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Use a VPN or Tor</strong>
                <p className="text-muted-foreground">Network-level privacy is critical. Connect through a VPN or Tor before using SilentSwap.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Trash2 className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Burn Wallets Immediately</strong>
                <p className="text-muted-foreground">Don't reuse burner wallets. After mixing, burn them to eliminate local traces.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Eye className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Monitor Privacy Scores</strong>
                <p className="text-muted-foreground">If your score drops below 60 (yellow/orange), rotate to a fresh burner immediately.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Zap className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Use Privacy Delays</strong>
                <p className="text-muted-foreground">Even a short delay (5-10 minutes) significantly improves anonymity by breaking timing correlations.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20" data-testid="card-fee-transparency">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-400" />
              Dynamic Pricing & Rewards
            </CardTitle>
            <CardDescription>Volume-based fees that decrease as you mix more</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Pricing Tiers</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Your fee rate automatically decreases based on your total lifetime mixing volume:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/20">
                  <span className="text-muted-foreground">Standard (First mix):</span>
                  <Badge variant="secondary">5%</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/20">
                  <span className="text-muted-foreground">Bronze (0-10 SOL total):</span>
                  <Badge variant="secondary">4%</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/20">
                  <span className="text-muted-foreground">Silver (10-50 SOL total):</span>
                  <Badge variant="secondary">3%</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/20">
                  <span className="text-muted-foreground">Gold (50-200 SOL total):</span>
                  <Badge variant="secondary">2%</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border border-border/20">
                  <span className="text-muted-foreground">Platinum (200+ SOL total):</span>
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">1%</Badge>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Loyalty Rewards</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30 mt-0.5">First Mix Free</Badge>
                  <p className="text-muted-foreground">Your first mix has zero platform fee!</p>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30 mt-0.5">2% Cashback</Badge>
                  <p className="text-muted-foreground">Earn 2% of each fee as credits to reduce future fees</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Referral Program</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Generate a unique referral code in the Referral page. When friends use your code:
              </p>
              <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                <li>They get a discount on their mix (you choose the %)</li>
                <li>You earn rewards on every mix they complete (you choose the %)</li>
                <li>Unlimited referrals, unlimited earnings</li>
              </ul>
            </div>

            <Alert className="border-blue-500/30 bg-blue-500/5">
              <AlertDescription className="text-xs">
                <strong>All discounts stack!</strong> Combine pricing tier + loyalty rewards + referral codes + credits for maximum savings. Minimum fee: 0.25% to cover network costs.
              </AlertDescription>
            </Alert>

            <div className="pt-2">
              <h3 className="font-semibold mb-2 text-sm">Fee Allocation</h3>
              <p className="text-xs text-muted-foreground">
                Platform fees sustain and improve the service: 40% development, 30% infrastructure, 20% security audits, 10% reserve fund. All fees tracked transparently in our ledger system.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20" data-testid="card-technical-details">
          <CardHeader>
            <CardTitle>Technical Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>Network:</strong> Solana Mainnet (real SOL with real value)
            </p>
            <p>
              <strong>RPC Provider:</strong> QuickNode with public endpoint fallback
            </p>
            <p>
              <strong>Exchange Service:</strong> Automated cross-chain exchange for SOL→ZEC conversion
            </p>
            <p>
              <strong>Key Storage:</strong> Client-side only (browser localStorage). Your private keys never leave your device.
            </p>
            <p>
              <strong>Session Management:</strong> Secure HTTP-only cookies with 7-day expiration
            </p>
            <p>
              <strong>Minimum Mix:</strong> 0.00525 SOL (enforced by exchange service)
            </p>
          </CardContent>
        </Card>

        <Alert className="border-red-500/30 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-sm">
            <strong>Disclaimer:</strong> zmix is for educational purposes. Users are responsible for complying with their local laws. We do not log or store sensitive data, but the exchange service may have its own policies.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
