import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Flame } from 'lucide-react';

interface BurnWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  walletAddress: string;
}

export function BurnWalletDialog({ open, onOpenChange, onConfirm, walletAddress }: BurnWalletDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glass-strong border-border/50">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-lg bg-destructive/20 backdrop-blur-sm flex items-center justify-center">
              <Flame className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl font-semibold">
              Burn Wallet
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-muted-foreground/90">
            You are about to permanently delete this wallet from server storage. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          <div className="bg-background/50 rounded-lg p-3 border border-border/50 backdrop-blur-sm">
            <code className="text-xs font-mono text-foreground/95 break-all" data-testid="text-wallet-address">
              {walletAddress}
            </code>
          </div>
          <div className="space-y-3 border-t border-border/50 pt-4">
            <Badge variant="destructive" className="text-xs glow-purple" data-testid="badge-warning-destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Critical Warning
            </Badge>
            <ul className="space-y-2 text-xs text-muted-foreground/90">
              <li className="flex items-start gap-2" data-testid="text-warning-1">
                <span className="text-destructive mt-0.5 font-bold">•</span>
                <span>All remaining SOL will be lost forever</span>
              </li>
              <li className="flex items-start gap-2" data-testid="text-warning-2">
                <span className="text-destructive mt-0.5 font-bold">•</span>
                <span>Wallet cannot be recovered after burning</span>
              </li>
              <li className="flex items-start gap-2" data-testid="text-warning-3">
                <span className="text-destructive mt-0.5 font-bold">•</span>
                <span>Export private key first if wallet contains funds</span>
              </li>
            </ul>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel 
            data-testid="button-cancel-burn"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground glow-purple"
            data-testid="button-confirm-burn"
          >
            <Flame className="h-4 w-4 mr-2" />
            Burn Wallet
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
