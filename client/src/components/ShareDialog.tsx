import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Share2, Copy, CheckCircle2, Flame, Shield, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ShareDialogProps {
  burnedCount: number;
  activeWallets: number;
}

const SHARE_MESSAGES = [
  "Using SilentSwap for private Solana transactions",
  "Privacy-first wallet management with SilentSwap",
  "Practicing good privacy hygiene with disposable wallets",
  "Supporting privacy tools for everyone",
  "Building better privacy habits with SilentSwap",
  "Privacy is a right, not a privilege",
];

export function ShareDialog({ burnedCount, activeWallets }: ShareDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(0);

  const generateShareText = () => {
    const message = SHARE_MESSAGES[selectedMessage];
    const stats = [
      message,
      ``,
      `My Stats:`,
      `  - Wallets Burned: ${burnedCount}`,
      `  - Active Wallets: ${activeWallets}`,
      `  - Privacy Level: High`,
      ``,
      `SilentSwap — Privacy-focused disposable wallets`,
      `silentswap.app`,
    ].join('\n');
    
    return stats;
  };

  const copyShareText = async () => {
    const text = generateShareText();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: 'Copied to Clipboard',
      description: 'Share your privacy stats!',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const nextMessage = () => {
    setSelectedMessage((prev) => (prev + 1) % SHARE_MESSAGES.length);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          data-testid="button-share"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share Stats
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md glass-strong border-border/50">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Share2 className="h-5 w-5 text-accent" />
            </div>
            <span>Share Your Stats</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground/80">
            Share your privacy statistics without revealing wallet details
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Stats Display */}
          <div className="border border-border/50 rounded-lg bg-background/40 backdrop-blur-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-destructive" />
                <span className="text-sm font-medium">
                  Wallets Burned
                </span>
              </div>
              <span 
                className="text-2xl font-bold text-foreground tabular-nums"
                data-testid="text-share-burned-count"
              >
                {burnedCount}
              </span>
            </div>
            
            {activeWallets > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-accent" />
                  <span className="text-sm font-medium">
                    Active Wallets
                  </span>
                </div>
                <span 
                  className="text-xl font-bold text-foreground tabular-nums"
                  data-testid="text-share-active-count"
                >
                  {activeWallets}
                </span>
              </div>
            )}
            
            <div className="pt-2 border-t border-border">
              <Badge 
                variant="outline" 
                className="w-full justify-center border-accent text-accent"
                data-testid="badge-privacy-level"
              >
                Privacy Level: High
              </Badge>
            </div>
          </div>

          {/* Message Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Message
              </label>
              <Button
                size="sm"
                variant="ghost"
                onClick={nextMessage}
                data-testid="button-next-message"
              >
                Next
              </Button>
            </div>
            <div className="border border-border/50 rounded-lg bg-background/40 backdrop-blur-sm p-3">
              <p 
                className="text-sm text-foreground/95 text-center"
                data-testid="text-selected-message"
              >
                {SHARE_MESSAGES[selectedMessage]}
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Preview
            </label>
            <div className="border border-border/50 rounded-lg bg-background/40 backdrop-blur-sm p-3 max-h-48 overflow-y-auto">
              <pre 
                className="text-xs text-muted-foreground/80 whitespace-pre-wrap font-mono"
                data-testid="text-share-preview"
              >
                {generateShareText()}
              </pre>
            </div>
          </div>

          {/* Privacy Notice */}
          <div className="border border-blue-500/30 rounded-lg bg-blue-950/30 backdrop-blur-sm p-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-400 flex-shrink-0" />
              <p 
                className="text-xs text-blue-300"
                data-testid="text-privacy-notice"
              >
                No wallet addresses or private keys are included
              </p>
            </div>
          </div>

          {/* Copy Button */}
          <Button
            onClick={copyShareText}
            className="w-full bg-gradient-purple glow-purple font-semibold"
            data-testid="button-copy-share"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Copied to Clipboard
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Share Text
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
