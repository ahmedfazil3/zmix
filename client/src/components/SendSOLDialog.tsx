import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { sendSOL } from '@/lib/solana';
import { sendZEC } from '@/lib/zcash';
import { sendSOLSchema, sendZECSchema, type SendSOLFormData, type SendZECFormData } from '@shared/schemas';
import type { BurnerWallet } from '@shared/types';
import { Send, AlertTriangle, Clock, Zap, Shield } from 'lucide-react';

interface SendSOLDialogProps {
  wallet: BurnerWallet | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onTransactionComplete?: (walletId: string, signature: string, recipient: string, amount: number) => void;
}

export function SendSOLDialog({ wallet, open, onOpenChange, onSuccess, onTransactionComplete }: SendSOLDialogProps) {
  const { toast } = useToast();
  const [enableDelay, setEnableDelay] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState([15]);
  const [isDelaying, setIsDelaying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Dynamic chain configuration
  const isSolana = wallet?.chain === 'solana';
  const chainSymbol = isSolana ? 'SOL' : 'ZEC';
  const chainName = isSolana ? 'Solana' : 'Zcash';
  const chainSchema = isSolana ? sendSOLSchema : sendZECSchema;
  const ChainIcon = isSolana ? Zap : Shield;
  
  const form = useForm<SendSOLFormData | SendZECFormData>({
    resolver: zodResolver(chainSchema),
    defaultValues: {
      recipient: '',
      amount: '',
    },
  });

  const clearTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) {
      clearTimers();
      form.reset();
      setIsDelaying(false);
      setCountdown(0);
    }
  }, [open, form]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  const executeTransaction = async (data: SendSOLFormData | SendZECFormData) => {
    if (!wallet) return;

    try {
      const amountNum = parseFloat(data.amount);
      let signature: string;
      
      // Handle Solana vs Zcash wallets using discriminated union
      if (wallet.chain === 'solana') {
        signature = await sendSOL(wallet.secretKey, data.recipient, amountNum);
      } else {
        // Zcash wallet
        signature = await sendZEC(wallet.spendingKey, data.recipient, amountNum);
      }
      
      if (onTransactionComplete) {
        onTransactionComplete(wallet.id, signature, data.recipient, amountNum);
      }
      
      const chainSymbol = wallet.chain === 'solana' ? 'SOL' : 'ZEC';
      toast({
        title: 'Transaction Sent',
        description: `${chainSymbol} TX: ${signature.slice(0, 8)}...${signature.slice(-8)}`,
      });
      
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Transaction Failed',
        description: error.message || 'Failed to send transaction',
        variant: 'destructive',
      });
    } finally {
      setIsDelaying(false);
      setCountdown(0);
    }
  };

  const cancelDelay = () => {
    clearTimers();
    setIsDelaying(false);
    setCountdown(0);
    toast({
      title: 'Delay Cancelled',
      description: 'Transaction aborted',
    });
  };

  const onSubmit = async (data: SendSOLFormData | SendZECFormData) => {
    if (!wallet) return;

    if (enableDelay) {
      const baseDelay = delaySeconds[0];
      const randomVariation = Math.random() * 10 - 5;
      const actualDelay = Math.max(1, Math.min(30, baseDelay + randomVariation));
      
      setIsDelaying(true);
      setCountdown(Math.ceil(actualDelay));
      
      toast({
        title: 'Privacy Delay Active',
        description: `Waiting ${actualDelay.toFixed(1)}s to obscure timing patterns`,
      });
      
      intervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      timeoutRef.current = setTimeout(() => {
        clearTimers();
        executeTransaction(data);
      }, actualDelay * 1000);
    } else {
      await executeTransaction(data);
    }
  };

  // Guard: Don't render if wallet is null to avoid resolver mismatch
  if (!wallet) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-strong border-border/50">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-xl font-semibold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <ChainIcon className="h-5 w-5 text-primary" />
            </div>
            <span>Send {chainSymbol}</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground/80">
            Send {chainSymbol} from your {chainName} wallet. {isSolana ? 'All transactions are visible on-chain.' : 'Shielded transactions provide enhanced privacy.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recipient"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Recipient Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter destination address..."
                      className="font-mono text-sm"
                      data-testid="input-recipient"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Amount
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step={isSolana ? "0.0001" : "0.00000001"}
                      placeholder={isSolana ? "0.0000" : "0.00000000"}
                      className="font-mono text-lg"
                      data-testid="input-amount"
                      {...field}
                    />
                  </FormControl>
                  {wallet && (
                    <p className="text-xs text-muted-foreground" data-testid="text-available-balance">
                      Available: {wallet.balance?.toFixed(isSolana ? 4 : 8) ?? (isSolana ? '0.0000' : '0.00000000')} {chainSymbol}
                    </p>
                  )}
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            
            {/* Privacy Delay Option */}
            <div className="border border-border/50 rounded-lg bg-background/40 backdrop-blur-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    Privacy Delay
                  </span>
                </div>
                <Switch
                  checked={enableDelay}
                  onCheckedChange={setEnableDelay}
                  data-testid="switch-privacy-delay"
                />
              </div>
              
              {enableDelay && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground/70">
                    <span>
                      Base delay: {delaySeconds[0]}s
                    </span>
                    <span>
                      ±5s random
                    </span>
                  </div>
                  <Slider
                    value={delaySeconds}
                    onValueChange={setDelaySeconds}
                    min={1}
                    max={30}
                    step={1}
                    className="py-2"
                    data-testid="slider-delay"
                  />
                  <p className="text-xs text-muted-foreground/80">
                    Adds randomized delay to obscure transaction timing patterns
                  </p>
                </div>
              )}
            </div>

            <div className="border border-orange-500/30 rounded-lg bg-orange-950/30 backdrop-blur-sm p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-300">
                  Transaction cannot be reversed. Please verify the recipient address before sending.
                </p>
              </div>
            </div>
            
            {isDelaying && countdown > 0 && (
              <div className="border border-primary/50 rounded-lg bg-primary/10 backdrop-blur-sm p-4 text-center">
                <div className="text-3xl font-bold text-primary tabular-nums">
                  {countdown}s
                </div>
                <p className="text-xs text-muted-foreground/80 font-mono uppercase mt-1">
                  Privacy delay active...
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (isDelaying) {
                    cancelDelay();
                  } else {
                    onOpenChange(false);
                  }
                }}
                data-testid="button-cancel-send"
              >
                {isDelaying ? 'Abort' : 'Cancel'}
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || isDelaying}
                className="bg-gradient-purple glow-purple font-semibold"
                data-testid="button-confirm-send"
              >
                <Send className="h-4 w-4 mr-2" />
                {isDelaying ? `${countdown}s` : form.formState.isSubmitting ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
