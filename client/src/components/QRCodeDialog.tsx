import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Copy, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodeDialogProps {
  address: string;
}

export function QRCodeDialog({ address }: QRCodeDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    toast({
      title: 'Address Copied',
      description: 'Wallet address copied to clipboard',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          data-testid="button-qr-code"
        >
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md glass-strong border-border/50">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold text-center">
            Wallet QR Code
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground/80">
            Scan to receive SOL
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          <div className="p-5 bg-white rounded-xl border border-border/30 shadow-lg">
            <QRCodeSVG
              value={address}
              size={200}
              level="H"
              includeMargin={false}
              data-testid="qr-code-image"
            />
          </div>

          <div className="w-full space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
              Address
            </label>
            <code className="block text-xs font-mono text-foreground/95 bg-background/50 px-3 py-2.5 rounded-lg border border-border/50 backdrop-blur-sm break-all" data-testid="text-qr-address">
              {address}
            </code>
          </div>

          <Button
            onClick={copyAddress}
            className="w-full bg-gradient-purple glow-purple font-semibold"
            data-testid="button-copy-qr-address"
          >
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Address
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
