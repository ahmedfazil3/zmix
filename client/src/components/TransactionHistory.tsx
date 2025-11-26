import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { WalletTransaction } from '@shared/types';
import { ArrowUpRight, ArrowDownLeft, Trash2, Clock } from 'lucide-react';

interface TransactionHistoryProps {
  transactions: WalletTransaction[];
  onClearHistory: () => void;
}

export function TransactionHistory({ transactions, onClearHistory }: TransactionHistoryProps) {
  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'JUST NOW';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}M AGO`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}H AGO`;
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
  };

  if (!transactions || transactions.length === 0) {
    return (
      <div className="p-4 border border-primary/20 bg-black/30 rounded-md">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-mono text-center">
          NO TRANSACTION HISTORY
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 border border-primary/20 bg-black/30 rounded-md">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-primary/20">
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3 text-accent" />
          <span className="text-xs text-accent uppercase tracking-wider font-bold">
            [ TX HISTORY ]
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearHistory}
          className="text-xs text-destructive uppercase tracking-wider"
          data-testid="button-clear-history"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          ERASE
        </Button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {transactions.map((tx, index) => {
          const isIncoming = tx.direction === 'incoming';
          return (
            <div
              key={tx.signature}
              className="border border-primary/10 bg-black/50 p-2 hover:border-primary/30 transition-all"
              data-testid={`transaction-${index}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-1 min-w-0">
                  {isIncoming ? (
                    <ArrowDownLeft className="h-3 w-3 text-green-400 flex-shrink-0" />
                  ) : (
                    <ArrowUpRight className="h-3 w-3 text-neon-blue flex-shrink-0" />
                  )}
                  <Badge variant={isIncoming ? "default" : "secondary"} className={`text-xs flex-shrink-0 ${isIncoming ? 'bg-green-500/20 text-green-400 border-green-500/30' : ''}`}>
                    {isIncoming ? 'RECEIVED' : 'SENT'}
                  </Badge>
                  <code className={`text-xs font-mono truncate ${isIncoming ? 'text-green-400' : 'text-neon-blue'}`} data-testid={`text-address-${index}`}>
                    {truncateAddress(isIncoming ? tx.from : tx.to)}
                  </code>
                </div>
                <Badge variant="outline" className="text-xs border-accent text-accent flex-shrink-0">
                  {tx.amount.toFixed(4)} SOL
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <code className="text-xs font-mono text-muted-foreground" data-testid={`text-signature-${index}`}>
                  {truncateAddress(tx.signature)}
                </code>
                <span className="text-xs text-muted-foreground font-mono">
                  {formatTimestamp(tx.timestamp)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
