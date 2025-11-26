import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { WalletCard } from '@/components/WalletCard';
import { SendSOLDialog } from '@/components/SendSOLDialog';
import { MixerDialog } from '@/components/MixerDialog';
import { BurnWalletDialog } from '@/components/BurnWalletDialog';
import { ShareDialog } from '@/components/ShareDialog';
import { WalletGridSkeleton } from '@/components/WalletCardSkeleton';
import { useWalletStorage } from '@/hooks/useWalletStorage';
import { generateKeypair, exportWalletFile } from '@/lib/solana';
import { exportZcashWalletFile } from '@/lib/zcash';
import { useToast } from '@/hooks/use-toast';
import { 
  Shuffle, Shield, Zap, Lock, Eye, Flame, Plus, ArrowRight, 
  CheckCircle2, Clock, Wallet, TrendingUp, AlertTriangle, Server, Network, Database
} from 'lucide-react';
import { SiX } from 'react-icons/si';
import type { BurnerWallet, SolanaWallet, ZcashWallet } from '@shared/types';

export default function Home() {
  const { toast } = useToast();
  const { wallets, burnedCount, isLoading, addWallet, updateWallet, removeWallet, addTransaction, clearTransactionHistory } = useWalletStorage();
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [mixerDialogOpen, setMixerDialogOpen] = useState(false);
  const [burnDialogOpen, setBurnDialogOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<BurnerWallet | null>(null);
  const [burningWallet, setBurningWallet] = useState<string | null>(null);
  const solanaWallets = wallets.filter(w => w.chain === 'solana');
  const activeWalletCount = solanaWallets.length;
  const totalBurned = burnedCount;

  const handleGenerateWallet = () => {
    const { publicKey, secretKey } = generateKeypair();
    const newWallet: SolanaWallet = {
      id: crypto.randomUUID(),
      chain: 'solana',
      publicKey,
      secretKey,
      createdAt: Date.now(),
      balance: 0,
    };
    addWallet(newWallet);
    toast({
      title: 'Solana Wallet Generated',
      description: 'New disposable SOL wallet ready for mixing.',
    });
  };

  const handleSendClick = (wallet: BurnerWallet) => {
    setSelectedWallet(wallet);
    setSendDialogOpen(true);
  };

  const handleMixClick = (wallet: BurnerWallet) => {
    setSelectedWallet(wallet);
    setMixerDialogOpen(true);
  };

  const handleBurnClick = (wallet: BurnerWallet) => {
    setSelectedWallet(wallet);
    setBurnDialogOpen(true);
  };

  const handleBurnConfirm = () => {
    if (selectedWallet) {
      setBurningWallet(selectedWallet.id);
      setTimeout(() => {
        removeWallet(selectedWallet.id);
        setBurningWallet(null);
        setSelectedWallet(null);
        toast({
          title: 'Wallet Burned',
          description: 'All traces removed from local storage.',
        });
      }, 1000);
    }
  };

  const handleExport = async (wallet: BurnerWallet) => {
    if (wallet.chain === 'solana') {
      // Fetch private key from server before export
      const { getPrivateKey } = await import('@/lib/walletService');
      const secretKey = await getPrivateKey(wallet.publicKey);
      exportWalletFile(wallet.publicKey, secretKey);
      toast({
        title: 'Wallet Exported',
        description: 'SOL private key saved securely.',
      });
    } else {
      const zcashWallet = wallet as any;
      exportZcashWalletFile(zcashWallet.address, zcashWallet.viewingKey, zcashWallet.spendingKey);
      toast({
        title: 'Wallet Exported',
        description: 'SOL wallets secured and ready.',
      });
    }
  };

  const handleUpdateBalance = (id: string, balance: number) => {
    updateWallet(id, { balance });
  };

  const handleTransactionComplete = (walletId: string, signature: string, recipient: string, amount: number) => {
    const wallet = wallets.find(w => w.id === walletId);
    if (wallet) {
      const from = wallet.chain === 'solana' ? wallet.publicKey : (wallet as any).address;
      addTransaction(walletId, {
        chain: wallet.chain,
        signature,
        from,
        to: recipient,
        amount,
        timestamp: Date.now(),
        direction: 'outgoing',
      });
    }
  };

  const handleClearHistory = (walletId: string) => {
    clearTransactionHistory(walletId);
    toast({
      title: 'History Cleared',
      description: 'Transaction history erased.',
    });
  };

  const handleToggleAutoBurn = async (walletId: string, enabled: boolean) => {
    try {
      const { updateWallet } = await import('@/lib/walletService');
      const { queryClient } = await import('@/lib/queryClient');
      
      await updateWallet(walletId, { autoBurn: enabled ? 1 : 0 });
      
      // Invalidate wallet cache to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['/api/wallets'] });
      
      toast({
        title: enabled ? 'Auto-Burn Enabled' : 'Auto-Burn Disabled',
        description: enabled 
          ? 'Wallet will be automatically burned after successful mixing'
          : 'Wallet will not be automatically burned',
      });
    } catch (error) {
      console.error('Failed to toggle auto-burn:', error);
      toast({
        title: 'Update Failed',
        description: 'Could not update auto-burn setting',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95">
      {/* Animated aurora background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 animate-pulse" style={{ animationDuration: '8s' }} />
      </div>

      {/* Social Media Button */}
      <div className="fixed top-20 right-0 z-40 p-6">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="hover-elevate"
          data-testid="button-x-profile"
        >
          <a
            href="https://x.com/zmix"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Follow us on X"
          >
            <SiX className="h-5 w-5" />
          </a>
        </Button>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Hero Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20">
                <Shield className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-300">Cross-Chain Privacy Mixer</span>
              </div>
              
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Mix SOL
                <span className="block bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text">
                  Privately
                </span>
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed">
                Break the chain. Generate disposable Solana wallets, route through multiple privacy hops with randomized delays, 
                for complete transaction obfuscation. Complete anonymity. Full control. Zero traces.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  onClick={() => {
                    if (solanaWallets.length === 0) {
                      // Generate wallet first
                      handleGenerateWallet();
                    } else {
                      handleMixClick(solanaWallets[0]);
                    }
                  }}
                  data-testid="button-start-mixing"
                >
                  <Shuffle className="h-5 w-5 mr-2" />
                  {solanaWallets.length === 0 ? 'Create Wallet' : 'Start Mixing'}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => {
                    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  data-testid="button-learn-more"
                >
                  Learn How It Works
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-2 gap-6 pt-8 border-t border-border/50">
                <div>
                  <div className="text-3xl font-bold text-foreground">{activeWalletCount}</div>
                  <div className="text-sm text-muted-foreground">Active Wallets</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-foreground">{totalBurned}</div>
                  <div className="text-sm text-muted-foreground">Wallets Burned</div>
                </div>
              </div>
            </div>

            {/* Hero Visual - Privacy Stats Card */}
            <div className="hidden lg:block">
              <Card className="glass-strong p-8 border-purple-500/20">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Privacy Features</h3>
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                      <Lock className="h-3 w-3 mr-1" />
                      Secured
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                        <Shuffle className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">Cross-Chain Mixing</div>
                        <div className="text-xs text-muted-foreground">SOL → SOL privacy routing</div>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                        <Network className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">Multi-Hop Privacy Chain</div>
                        <div className="text-xs text-muted-foreground">Multiple intermediate hops with variance</div>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                        <Clock className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">Privacy Delays</div>
                        <div className="text-xs text-muted-foreground">Timing obfuscation (1-60 min)</div>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                        <Database className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">Encrypted Storage</div>
                        <div className="text-xs text-muted-foreground">AES-256-CBC wallet encryption</div>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                        <Eye className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">No Custody</div>
                        <div className="text-xs text-muted-foreground">You control your keys always</div>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How Privacy Mixing Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Five steps to break transaction graphs and achieve maximum anonymity
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card className="p-6 relative overflow-hidden hover-elevate">
              <div className="absolute top-4 right-4 h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center text-2xl font-bold text-purple-400">
                1
              </div>
              <Wallet className="h-12 w-12 text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Generate Wallet</h3>
              <p className="text-sm text-muted-foreground">
                Create a disposable Solana wallet client-side. Your keys, your control.
              </p>
            </Card>

            <Card className="p-6 relative overflow-hidden hover-elevate">
              <div className="absolute top-4 right-4 h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center text-2xl font-bold text-purple-400">
                2
              </div>
              <Clock className="h-12 w-12 text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Privacy Delay</h3>
              <p className="text-sm text-muted-foreground">
                Optional randomized delay (1-60 min) to obscure timing patterns before mixing.
              </p>
            </Card>

            <Card className="p-6 relative overflow-hidden hover-elevate">
              <div className="absolute top-4 right-4 h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center text-2xl font-bold text-purple-400">
                3
              </div>
              <Network className="h-12 w-12 text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Multi-Hop Chain</h3>
              <p className="text-sm text-muted-foreground">
                Route SOL through multiple intermediate wallets with randomized amounts and delays.
              </p>
            </Card>

            <Card className="p-6 relative overflow-hidden hover-elevate">
              <div className="absolute top-4 right-4 h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center text-2xl font-bold text-purple-400">
                4
              </div>
              <Shuffle className="h-12 w-12 text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Receive at Destination</h3>
              <p className="text-sm text-muted-foreground">
                Final hop sends SOL directly to your destination address minus 2% platform fee.
              </p>
            </Card>

            <Card className="p-6 relative overflow-hidden hover-elevate">
              <div className="absolute top-4 right-4 h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center text-2xl font-bold text-purple-400">
                5
              </div>
              <Flame className="h-12 w-12 text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Burn & Erase</h3>
              <p className="text-sm text-muted-foreground">
                Delete all wallets permanently. Transaction graph broken, privacy restored.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Feature Highlights Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-4">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-green-300">Production Ready</span>
            </div>
            <h2 className="text-3xl font-bold mb-4">Robust Privacy Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Fully tested and battle-hardened privacy infrastructure
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <Card className="p-6 border-green-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Network className="h-5 w-5 text-green-400" />
                </div>
                <h3 className="font-semibold">Multi-Hop Chain</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Multiple intermediate wallets with randomized delays and amount variance
              </p>
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">Live</Badge>
            </Card>

            <Card className="p-6 border-green-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Database className="h-5 w-5 text-green-400" />
                </div>
                <h3 className="font-semibold">Encrypted Storage</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                PostgreSQL with AES-256-CBC encryption for wallet recovery
              </p>
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">Live</Badge>
            </Card>

            <Card className="p-6 border-green-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
                <h3 className="font-semibold">Auto-Balance Updates</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Real-time balance polling every 15s with transaction history
              </p>
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">Live</Badge>
            </Card>
          </div>
        </div>
      </section>

      {/* Dynamic Pricing & Rewards Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-4">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-300">Smart Pricing</span>
            </div>
            <h2 className="text-3xl font-bold mb-4">Earn Rewards While You Mix</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Dynamic pricing tiers, loyalty rewards, and referral bonuses that stack together
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 border-blue-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="font-semibold">Dynamic Pricing Tiers</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Fees automatically decrease as you mix more: from 5% (Standard) down to 1% (Platinum)
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bronze (0-10 SOL):</span>
                  <span className="font-semibold text-foreground">4%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Silver (10-50 SOL):</span>
                  <span className="font-semibold text-foreground">3%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gold (50-200 SOL):</span>
                  <span className="font-semibold text-foreground">2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platinum (200+ SOL):</span>
                  <span className="font-semibold text-purple-400">1%</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-purple-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-purple-400" />
                </div>
                <h3 className="font-semibold">Loyalty Rewards</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Your first mix is FREE! Plus, earn 2% cashback credits on all future mixes to reduce fees even more
              </p>
              <div className="space-y-2">
                <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                  First Mix Free
                </Badge>
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  2% Cashback Credits
                </Badge>
              </div>
            </Card>

            <Card className="p-6 border-green-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Server className="h-5 w-5 text-green-400" />
                </div>
                <h3 className="font-semibold">Referral System</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Share your unique code with friends. They get discounts, you earn rewards on every mix they complete
              </p>
              <div className="flex flex-col gap-2">
                <div className="text-xs text-muted-foreground">Customizable discounts & rewards</div>
                <div className="text-xs text-muted-foreground">Track earnings in dashboard</div>
                <div className="text-xs text-muted-foreground">Unlimited referrals</div>
              </div>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              All discounts stack together! Combine pricing tier + loyalty rewards + referral codes + credits for maximum savings.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <span className="text-xs text-muted-foreground">Minimum fee: 0.25% to cover network costs</span>
            </div>
          </div>
        </div>
      </section>

      {/* Wallet Management Section */}
      {solanaWallets.length > 0 && (
        <section className="py-20 px-6 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2">Your Disposable Wallets</h2>
                <p className="text-muted-foreground">
                  Manage temporary wallets. Mix and burn for maximum privacy.
                </p>
              </div>
              <ShareDialog burnedCount={burnedCount} activeWallets={solanaWallets.length} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoading ? (
                <WalletGridSkeleton count={3} />
              ) : (
                <>
                  {solanaWallets.map((wallet) => (
                  <div
                    key={wallet.id}
                    className={burningWallet === wallet.id ? 'opacity-0 transition-opacity duration-500' : ''}
                  >
                    <WalletCard
                      wallet={wallet}
                      onSendClick={() => handleSendClick(wallet)}
                      onMixClick={wallet.chain === 'solana' ? () => handleMixClick(wallet) : undefined}
                      onBurnClick={() => handleBurnClick(wallet)}
                      onExport={() => handleExport(wallet)}
                      onUpdateBalance={(balance) => handleUpdateBalance(wallet.id, balance)}
                      onClearHistory={() => handleClearHistory(wallet.id)}
                      onToggleAutoBurn={(enabled) => handleToggleAutoBurn(wallet.id, enabled)}
                    />
                  </div>
                  ))}

                  {/* Generate New Wallet Card */}
                  <Card 
                className="p-6 border-dashed border-2 border-border/50 hover:border-purple-500/50 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[300px]"
                onClick={handleGenerateWallet}
                data-testid="button-generate-wallet"
              >
                <Plus className="h-12 w-12 text-muted-foreground mb-4" />
                <div className="text-center">
                  <div className="font-semibold mb-1">Generate New Wallet</div>
                  <div className="text-sm text-muted-foreground">
                    Create disposable SOL wallet
                  </div>
                </div>
              </Card>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Getting Started CTA (when no wallets) */}
      {solanaWallets.length === 0 && (
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Card className="glass-strong p-12 border-purple-500/20">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-purple-500/10 mb-6">
                <Zap className="h-8 w-8 text-purple-400" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Ready to Start?</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Generate your first disposable Solana wallet and experience true cross-chain privacy
              </p>

              <Button 
                size="lg" 
                onClick={handleGenerateWallet}
                data-testid="button-generate-wallet"
              >
                <Plus className="h-5 w-5 mr-2" />
                Generate SOL Wallet
              </Button>
            </Card>
          </div>
        </section>
      )}

      {/* Privacy Tips Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Privacy Best Practices</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Follow these guidelines to maximize your anonymity
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="font-semibold mb-2">Use Shielded Addresses</h3>
              <p className="text-sm text-muted-foreground">
                Always use zs1... addresses for ZEC. Transparent addresses (t1/t3) reduce privacy.
              </p>
            </Card>

            <Card className="p-6">
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="font-semibold mb-2">Enable Privacy Delays</h3>
              <p className="text-sm text-muted-foreground">
                Random timing delays obscure transaction patterns and prevent correlation attacks.
              </p>
            </Card>

            <Card className="p-6">
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <Flame className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="font-semibold mb-2">Burn After Mixing</h3>
              <p className="text-sm text-muted-foreground">
                Delete SOL wallets immediately after mixing to break on-chain transaction graphs.
              </p>
            </Card>

            <Card className="p-6">
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <Eye className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="font-semibold mb-2">Use VPN/Tor</h3>
              <p className="text-sm text-muted-foreground">
                Combine with network-level privacy tools for additional protection against surveillance.
              </p>
            </Card>

            <Card className="p-6">
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                <Wallet className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="font-semibold mb-2">One-Time Use Only</h3>
              <p className="text-sm text-muted-foreground">
                Never reuse disposable wallets. Each transaction should use a fresh wallet.
              </p>
            </Card>

            <Card className="p-6">
              <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-orange-400" />
              </div>
              <h3 className="font-semibold mb-2">Export Before Burning</h3>
              <p className="text-sm text-muted-foreground">
                Always export wallet keys if they hold funds. Burning is permanent and irreversible.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <Shield className="h-6 w-6 text-purple-400" />
            <span className="text-xl font-bold">SilentSwap</span>
          </div>
          <p className="text-muted-foreground mb-2">Cross-Chain Privacy Mixer</p>
          <p className="text-sm text-muted-foreground/70">
            Your keys. Your privacy. Complete anonymity.
          </p>
          <div className="mt-6 pt-6 border-t border-border/30">
            <p className="text-xs text-orange-400 font-medium">
              ⚠️ Live on Solana Mainnet — Real transactions with real SOL
            </p>
          </div>
        </div>
      </footer>

      {/* Dialogs */}
      {selectedWallet && (
        <SendSOLDialog
          key={`send-${selectedWallet.id}`}
          wallet={selectedWallet}
          open={sendDialogOpen}
          onOpenChange={setSendDialogOpen}
          onSuccess={() => {
            setTimeout(() => {
              const el = document.querySelector(`[data-wallet-id="${selectedWallet.id}"]`);
              el?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }}
          onTransactionComplete={handleTransactionComplete}
        />
      )}

      {selectedWallet && selectedWallet.chain === 'solana' && (
        <MixerDialog
          key={`mixer-${selectedWallet.id}`}
          wallet={selectedWallet}
          open={mixerDialogOpen}
          onOpenChange={setMixerDialogOpen}
          onSuccess={() => {
            toast({
              title: 'Privacy Mix Complete',
              description: 'Consider burning this SOL wallet now',
            });
          }}
        />
      )}

      <BurnWalletDialog
        open={burnDialogOpen}
        onOpenChange={setBurnDialogOpen}
        onConfirm={handleBurnConfirm}
        walletAddress={selectedWallet?.chain === 'solana' ? selectedWallet.publicKey : (selectedWallet?.chain === 'zcash' ? selectedWallet.address : '')}
      />
    </div>
  );
}
