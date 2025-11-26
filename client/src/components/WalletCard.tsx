import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Copy, Send, Download, Flame, CheckCircle2, RefreshCw, AlertTriangle, ShieldAlert, Zap, Shield, ChevronDown, Activity, Clock as ClockIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getBalance, getTransactionHistory } from '@/lib/solana';
import { getZcashBalance } from '@/lib/zcash';
import { TransactionHistory } from './TransactionHistory';
import { QRCodeDialog } from './QRCodeDialog';
import { calculatePrivacyScore, getPrivacyScoreColor } from '@/lib/privacyScore';
import type { BurnerWallet, WalletTransaction } from '@shared/types';

interface WalletCardProps {
  wallet: BurnerWallet;
  onSendClick: () => void;
  onMixClick?: () => void;
  onBurnClick: () => void;
  onExport: () => void;
  onUpdateBalance: (balance: number) => void;
  onClearHistory: () => void;
  onToggleAutoBurn?: (enabled: boolean) => void;
}

export function WalletCard({ wallet, onSendClick, onMixClick, onBurnClick, onExport, onUpdateBalance, onClearHistory, onToggleAutoBurn }: WalletCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<'address' | 'key' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [blockchainTransactions, setBlockchainTransactions] = useState<WalletTransaction[]>([]);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);
  const privacyScore = calculatePrivacyScore(wallet);

  // Get wallet address based on chain type
  // Handle both new discriminated union wallets and legacy wallets
  const walletAddress = wallet.chain === 'solana' 
    ? wallet.publicKey 
    : ('address' in wallet && wallet.address ? wallet.address : '');
  const currencySymbol = wallet.chain === 'solana' ? 'SOL' : 'ZEC';
  
  // If Zcash wallet is missing address, it's invalid
  if (wallet.chain === 'zcash' && !walletAddress) {
    console.error('Zcash wallet missing address property:', wallet);
    return null;
  }
  
  // Solana wallets should always have publicKey, but guard anyway
  if (wallet.chain === 'solana' && !wallet.publicKey) {
    console.error('Solana wallet missing publicKey:', wallet);
    return null;
  }

  const refreshBalance = useCallback(async () => {
    setIsRefreshing(true);
    try {
      let balance = 0;
      
      if (wallet.chain === 'solana') {
        balance = await getBalance(wallet.publicKey);
        
        // Fetch blockchain transaction history
        const txHistory = await getTransactionHistory(wallet.publicKey, 10);
        setBlockchainTransactions(txHistory.map(tx => ({
          ...tx,
          chain: 'solana' as const,
        })));
      } else {
        // Zcash wallet
        balance = await getZcashBalance(wallet.spendingKey);
      }
      
      onUpdateBalance(balance);
    } catch (error) {
      console.error('Failed to refresh balance:', error);
      toast({
        title: 'Refresh Failed',
        description: 'Could not fetch wallet balance. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [wallet, onUpdateBalance, toast]);

  useEffect(() => {
    refreshBalance();
    
    // Auto-refresh balance every 15 seconds to detect incoming transactions
    const interval = setInterval(() => {
      refreshBalance();
    }, 15000);
    
    return () => clearInterval(interval);
  }, [refreshBalance]);

  const copyToClipboard = async (text: string, type: 'address' | 'key') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    toast({
      title: type === 'address' ? 'Address Copied' : 'Key Copied',
      description: 'Copied to clipboard successfully',
    });
    setTimeout(() => setCopied(null), 2000);
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    }).replace(',', '');
  };

  return (
    <Card className="glass-strong p-6 hover-elevate transition-all overflow-hidden" data-wallet-id={wallet.id}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant="default" 
              className={wallet.chain === 'solana' ? 'bg-gradient-purple text-xs' : 'bg-accent/30 border-accent text-xs'}
              data-testid="badge-chain"
            >
              {wallet.chain === 'solana' ? (
                <><Zap className="h-3 w-3 mr-1" /> Solana</>
              ) : (
                <><Shield className="h-3 w-3 mr-1" /> Zcash</>
              )}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Ephemeral
            </Badge>
            <Badge 
              variant="outline" 
              className={`text-xs ${getPrivacyScoreColor(privacyScore.level)}`}
              data-testid="badge-privacy-score"
            >
              <ShieldAlert className="h-3 w-3 mr-1" />
              {privacyScore.score}%
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground/70 font-mono">
            {formatTimestamp(wallet.createdAt)}
          </span>
        </div>

        {/* Privacy Warnings */}
        {privacyScore.warnings.length > 0 && (
          <div className="space-y-2 pb-4 border-b border-border/50">
            {privacyScore.warnings.map((warning, index) => (
              <div 
                key={index} 
                className="flex items-center gap-2 text-xs px-3 py-2 bg-orange-950/30 border border-orange-500/30 rounded-lg backdrop-blur-sm"
                data-testid={`warning-${index}`}
              >
                <AlertTriangle className="h-3 w-3 text-orange-400 flex-shrink-0" />
                <span className="text-orange-300">
                  {warning}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Privacy Score Details */}
        <div className="space-y-2 pb-4 border-b border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-xs hover-elevate"
            onClick={() => setShowPrivacyDetails(!showPrivacyDetails)}
            data-testid="button-toggle-privacy-details"
          >
            <span className="flex items-center gap-2">
              <ShieldAlert className="h-3 w-3" />
              Privacy Score Details
            </span>
            <ChevronDown className={`h-3 w-3 transition-transform ${showPrivacyDetails ? 'rotate-180' : ''}`} />
          </Button>
          
          {showPrivacyDetails && (
            <div className="space-y-2 text-xs">
              <div className={`flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 border ${
                privacyScore.factors.walletAge.status === 'critical' ? 'border-destructive/30' :
                privacyScore.factors.walletAge.status === 'warning' ? 'border-yellow-400/30' :
                'border-border/30'
              }`}>
                <div className="flex items-center gap-2">
                  <ClockIcon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Wallet Age</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{privacyScore.factors.walletAge.hours.toFixed(1)}h</span>
                  {privacyScore.factors.walletAge.impact !== 0 && (
                    <span className={privacyScore.factors.walletAge.status === 'critical' ? 'text-destructive' : 'text-yellow-400'}>
                      {privacyScore.factors.walletAge.impact}
                    </span>
                  )}
                </div>
              </div>

              <div className={`flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 border ${
                privacyScore.factors.transactionCount.status === 'critical' ? 'border-destructive/30' :
                privacyScore.factors.transactionCount.status === 'warning' ? 'border-yellow-400/30' :
                'border-border/30'
              }`}>
                <div className="flex items-center gap-2">
                  <Activity className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Transactions</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{privacyScore.factors.transactionCount.count}</span>
                  {privacyScore.factors.transactionCount.impact !== 0 && (
                    <span className={privacyScore.factors.transactionCount.status === 'critical' ? 'text-destructive' : 'text-yellow-400'}>
                      {privacyScore.factors.transactionCount.impact}
                    </span>
                  )}
                </div>
              </div>

              <div className={`flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 border ${
                privacyScore.factors.lastActivity.status === 'critical' ? 'border-destructive/30' :
                privacyScore.factors.lastActivity.status === 'warning' ? 'border-yellow-400/30' :
                'border-border/30'
              }`}>
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Last Activity</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{privacyScore.factors.lastActivity.hoursAgo.toFixed(1)}h ago</span>
                  {privacyScore.factors.lastActivity.impact !== 0 && (
                    <span className={privacyScore.factors.lastActivity.status === 'critical' ? 'text-destructive' : 'text-yellow-400'}>
                      {privacyScore.factors.lastActivity.impact}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Address */}
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-2">
            {wallet.chain === 'solana' ? 'Public Key' : 'Shielded Address'}
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono text-foreground/95 bg-background/50 px-3 py-2.5 rounded-lg border border-border/50 backdrop-blur-sm">
              {truncateAddress(walletAddress)}
            </code>
            <QRCodeDialog address={walletAddress} />
            <Button
              size="icon"
              variant="outline"
              onClick={() => copyToClipboard(walletAddress, 'address')}
              data-testid="button-copy-address"
            >
              {copied === 'address' ? (
                <CheckCircle2 className="h-4 w-4 text-accent" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Balance */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
              Balance
            </label>
            <Button
              size="sm"
              variant="ghost"
              onClick={refreshBalance}
              disabled={isRefreshing}
              data-testid="button-refresh"
              className="h-7 text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Syncing' : 'Refresh'}
            </Button>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl font-bold text-foreground tabular-nums" data-testid="text-balance">
              {wallet.balance?.toFixed(wallet.chain === 'solana' ? 4 : 8) ?? (wallet.chain === 'solana' ? '0.0000' : '0.00000000')}
            </span>
            <span className="text-base text-muted-foreground font-medium">{currencySymbol}</span>
          </div>
          
          {/* Deposit Instructions for Empty Wallets */}
          {(!wallet.balance || wallet.balance === 0) && wallet.chain === 'solana' && (
            <div className="mt-3 flex items-start gap-2 text-xs px-3 py-2.5 bg-blue-950/30 border border-blue-500/30 rounded-lg backdrop-blur-sm">
              <AlertTriangle className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-blue-300 font-medium">Deposit SOL to start mixing</p>
                <p className="text-blue-300/80">
                  Send SOL to this wallet address, then click "Mix" to route through privacy hops
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Transaction History */}
        <TransactionHistory 
          transactions={(() => {
            // Merge blockchain and local transactions, dedupe by signature
            const allTx = [...blockchainTransactions, ...(wallet.transactions || [])];
            const seenSignatures = new Set<string>();
            const uniqueTx = allTx.filter(tx => {
              if (seenSignatures.has(tx.signature)) return false;
              seenSignatures.add(tx.signature);
              return true;
            });
            return uniqueTx.sort((a, b) => b.timestamp - a.timestamp);
          })()} 
          onClearHistory={onClearHistory}
        />

        {/* Auto-Burn Toggle (only for Solana wallets) */}
        {wallet.chain === 'solana' && onToggleAutoBurn && (
          <div className="flex items-center justify-between rounded-lg border border-border/50 p-3 glass-panel">
            <div className="space-y-0.5">
              <div className="text-sm font-medium flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                Auto-Burn After Mix
              </div>
              <div className="text-xs text-muted-foreground">
                Automatically burn this wallet after successful mixing
              </div>
            </div>
            <Switch
              checked={wallet.autoBurn === 1}
              onCheckedChange={onToggleAutoBurn}
              data-testid="switch-auto-burn"
            />
          </div>
        )}

        {/* Actions */}
        <div className={`grid gap-2 pt-3 border-t border-border/50 ${onMixClick ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <Button
            onClick={onSendClick}
            size="sm"
            variant="default"
            data-testid="button-send"
          >
            <Send className="h-3.5 w-3.5 mr-1" />
            Send
          </Button>
          {onMixClick && (
            <Button
              onClick={onMixClick}
              size="sm"
              variant="secondary"
              className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300"
              data-testid="button-mix"
              disabled={!wallet.balance || wallet.balance === 0}
            >
              <Zap className="h-3.5 w-3.5 mr-1" />
              Mix
            </Button>
          )}
          <Button
            onClick={onExport}
            size="sm"
            variant="outline"
            data-testid="button-export"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Export
          </Button>
          <Button
            onClick={onBurnClick}
            size="sm"
            variant="destructive"
            className="glow-purple"
            data-testid="button-burn"
          >
            <Flame className="h-3.5 w-3.5 mr-1" />
            Burn
          </Button>
        </div>
      </div>
    </Card>
  );
}
