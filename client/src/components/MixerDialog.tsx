import { useState, useEffect } from 'react';
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
  FormDescription,
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
import { mixerSchema, type MixerFormData, PLATFORM_FEE_PERCENT, PLATFORM_WALLET_ADDRESS } from '@shared/schemas';
import type { SolanaWallet } from '@shared/types';
import { Shuffle, Shield, Clock, AlertTriangle, Loader2, CheckCircle2, XCircle, X, Network, Tag, CheckCircle } from 'lucide-react';
import { executeHopChain, cleanupHopWallets, DEFAULT_MULTIHOP_CONFIG, FAST_MULTIHOP_CONFIG, MAX_PRIVACY_CONFIG, STEALTH_MULTIHOP_CONFIG, type HopWallet, type HopProgress, type MultiHopConfig } from '@/lib/multihop';
import { PresetSelector, type MixerPreset } from './PresetSelector';
import { getWalletActiveSession, saveSessionCheckpoint, createMixerSession, completeSession, failSession } from '@/lib/mixerSession';
import { useAuth } from '@/hooks/use-auth';
import { calculateMixerETA, type ETAEstimate } from '@/lib/etaCalculator';
import { celebrateMixSuccess } from '@/lib/celebration';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { notificationService } from '@/lib/notificationService';

// Helper function to get config for a preset
function getPresetConfig(preset: MixerPreset): MultiHopConfig {
  switch (preset) {
    case 'fast':
      return FAST_MULTIHOP_CONFIG;
    case 'balanced':
      return DEFAULT_MULTIHOP_CONFIG;
    case 'max_privacy':
      return MAX_PRIVACY_CONFIG;
    case 'stealth':
      return STEALTH_MULTIHOP_CONFIG;
    default:
      return DEFAULT_MULTIHOP_CONFIG;
  }
}

interface MixerDialogProps {
  wallet: SolanaWallet;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface MixerStatus {
  status: 'idle' | 'estimating' | 'creating' | 'delaying' | 'hopping' | 'finished' | 'failed';
  message: string;
  netAmount?: string; // Amount after platform fees
  finalHash?: string; // Final transaction signature
  delaySecondsRemaining?: number;
  hopProgress?: HopProgress;
  hopWallets?: HopWallet[];
  eta?: string; // Estimated time to completion
}

export function MixerDialog({ wallet, open, onOpenChange, onSuccess }: MixerDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [mixerStatus, setMixerStatus] = useState<MixerStatus>({ status: 'idle', message: '' });
  const [minAmount, setMinAmount] = useState<number>(0);
  const [selectedPreset, setSelectedPreset] = useState<MixerPreset>('balanced');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [resumableSession, setResumableSession] = useState<any>(null);
  const [etaEstimate, setEtaEstimate] = useState<ETAEstimate | null>(null);
  const [referralCodeDebounced, setReferralCodeDebounced] = useState('');

  const form = useForm<MixerFormData>({
    resolver: zodResolver(mixerSchema),
    defaultValues: {
      destinationAddress: '',
      amount: '',
      enableDelay: true,
      delayMinutes: 5,
      referralCode: '',
    },
  });

  const referralCodeValue = form.watch('referralCode');
  const amountValue = form.watch('amount');

  // Debounce referral code input for validation
  useEffect(() => {
    const timer = setTimeout(() => {
      setReferralCodeDebounced(referralCodeValue || '');
    }, 500);
    return () => clearTimeout(timer);
  }, [referralCodeValue]);

  // Get fee preview with ALL discounts (loyalty, referral, credits, first-mix-free)
  // Note: This endpoint calculates personalized fees for the user based on:
  // - Their loyalty tier (Bronze/Silver/Gold/Platinum)
  // - Referral code (if provided)
  // - Available credits
  // - First-mix-free status
  // React Query caching prevents unnecessary backend calls when queryKey doesn't change
  const { 
    data: feePreview,
    error: feePreviewError 
  } = useQuery<{
    grossAmount: string;
    platformFee: string;
    netAmount: string;
    effectiveRate: string;
    breakdown: {
      baseFee: string;
      loyaltyDiscount: string;
      referralDiscount: string;
      creditApplied: string;
      finalFee: string;
    };
    referralInfo?: {
      code: string;
      referrerId: string;
    };
  }>({
    queryKey: ['/api/fee/calculate', amountValue, referralCodeDebounced],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/fee/calculate', { 
        grossAmount: amountValue,
        referralCode: referralCodeDebounced || undefined,
      });
      return response.json();
    },
    // Enable for authenticated users with valid amount to show personalized fee rates
    // (includes loyalty discounts, first-mix-free, credits - not just referral)
    enabled: !!amountValue && parseFloat(amountValue) > 0 && !!user,
    retry: false,
    // Cache for 30 seconds to reduce backend load
    staleTime: 30000,
  });

  // Fetch minimum amount and check for active session on mount
  useEffect(() => {
    if (open) {
      fetchMinAmount();
      checkForActiveSession();
    }
  }, [open]);

  const checkForActiveSession = async () => {
    try {
      const activeSession = await getWalletActiveSession(wallet.id);
      if (activeSession && activeSession.status !== 'completed' && activeSession.status !== 'failed') {
        setResumableSession(activeSession);
        setShowResumeDialog(true);
      }
    } catch (error) {
      console.error('Error checking for active session:', error);
    }
  };

  const handleResumeSession = async () => {
    if (!resumableSession) return;
    
    setShowResumeDialog(false);
    setSessionId(resumableSession.id);
    
    try {
      // Parse hopWallets from session if available
      const hopWallets: HopWallet[] = resumableSession.hopWallets 
        ? (typeof resumableSession.hopWallets === 'string' 
          ? JSON.parse(resumableSession.hopWallets) 
          : resumableSession.hopWallets)
        : [];
      
      // Restore form data from session
      if (resumableSession.destinationAddress || resumableSession.grossAmount) {
        form.reset({
          destinationAddress: resumableSession.destinationAddress || '',
          amount: resumableSession.grossAmount?.toString() || '',
          enableDelay: true, // Default to enabled for privacy
          referralCode: resumableSession.referralCode || '',
        });
        
        if (resumableSession.preset) {
          setSelectedPreset(resumableSession.preset as MixerPreset);
        }
      }
      
      // Determine what stage we're at and resume accordingly
      const status = resumableSession.status;
      
      // For SOL→SOL mixer, we only support resuming from hopping/delaying stages
      if (['delaying', 'hopping'].includes(status)) {
        // For pre-exchange stages: restore form and show status
        // User can see progress was made and re-submit if needed
        setMixerStatus({
          status: 'idle',
          message: '',
        });
        
        toast({
          title: 'Session Restored',
          description: `Previous session reached: ${resumableSession.currentMessage}. Form fields restored - review and re-submit to continue.`,
          duration: 6000,
        });
        
        // Don't fail the session yet - let user decide to re-submit or discard
      } else {
        // Unknown status or very early stage
        setMixerStatus({ status: 'idle', message: '' });
        
        toast({
          title: 'Session Restored',
          description: 'Form fields restored from previous session',
        });
      }
    } catch (error: any) {
      console.error('Resume failed:', error);
      toast({
        title: 'Resume Failed',
        description: error.message || 'Could not resume session',
        variant: 'destructive',
      });
      
      await failSession(resumableSession.id, `Resume failed: ${error.message}`);
      setMixerStatus({ status: 'idle', message: '' });
    }
  };

  const handleDiscardSession = async () => {
    if (resumableSession) {
      try {
        await failSession(resumableSession.id, 'User discarded session');
        setResumableSession(null);
        setShowResumeDialog(false);
        
        toast({
          title: 'Session Discarded',
          description: 'You can start a new mix',
        });
      } catch (error) {
        console.error('Error discarding session:', error);
      }
    }
  };

  // Clean up delay timer when dialog closes
  useEffect(() => {
    if (!open && (window as any).__abortMixerDelay) {
      (window as any).__abortMixerDelay();
    }
  }, [open]);

  const fetchMinAmount = async () => {
    try {
      const response = await fetch('/api/mixer/min-amount');
      const data = await response.json();
      if (data.minAmount) {
        setMinAmount(data.minAmount);
      }
    } catch (error: any) {
      console.error('Error fetching min amount:', error);
    }
  };

  const onSubmit = async (data: MixerFormData) => {
    // Check if wallet has any balance
    if (!wallet.balance || wallet.balance === 0) {
      toast({
        title: 'No Balance',
        description: 'Deposit SOL to this wallet address before mixing',
        variant: 'destructive',
      });
      return;
    }

    // Validate amount before starting
    const amount = parseFloat(data.amount);
    if (minAmount > 0 && amount < minAmount) {
      toast({
        title: 'Amount Too Low',
        description: `Minimum amount is ${minAmount} SOL`,
        variant: 'destructive',
      });
      return;
    }

    if (amount > wallet.balance) {
      toast({
        title: 'Insufficient Balance',
        description: `You only have ${wallet.balance.toFixed(4)} SOL`,
        variant: 'destructive',
      });
      return;
    }

    setMixerStatus({ status: 'creating', message: 'Creating privacy mix...' });

    // Declare currentSessionId outside try block for scope access in catch
    let currentSessionId: string | null = null;

    try {
      // Calculate net amount after 2% platform fee
      const amount = parseFloat(data.amount);
      const platformFeeAmount = amount * 0.02; // 2% platform fee
      const netAmount = (amount - platformFeeAmount).toFixed(9);
      
      setMixerStatus({ 
        status: 'creating', 
        message: `Creating privacy mix... You'll receive ~${netAmount} SOL`,
        netAmount,
      });

      // Calculate ETA based on preset and delay settings
      const hopConfig = getPresetConfig(selectedPreset);
      const eta = calculateMixerETA(hopConfig, data.enableDelay, data.delayMinutes);
      setEtaEstimate(eta);
      
      // Create mixer session (SOL→SOL with platform fees)
      const session = await createMixerSession({
        userId: user?.id || wallet.id, // Use authenticated user ID or wallet ID for anonymous
        walletId: wallet.id,
        grossAmount: data.amount,
        destinationAddress: data.destinationAddress,
        preset: selectedPreset,
        hopConfig: hopConfig,
        referralCode: data.referralCode,
      });
      
      // Store session ID locally for use during this execution (state updates async)
      currentSessionId = session?.id || null;
      
      if (currentSessionId) {
        setSessionId(currentSessionId); // Update state for future renders
      } else {
        // Session creation failed, clear any stale sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('zmix-active-session-id');
        }
      }

      // Add privacy delay if enabled (non-blocking with cancellation)
      if (data.enableDelay) {
        const delayMs = data.delayMinutes * 60 * 1000;
        const randomVariation = (Math.random() * 0.2 - 0.1) * delayMs; // ±10% variation
        const actualDelay = delayMs + randomVariation;
        const delaySeconds = Math.round(actualDelay / 1000);
        
        setMixerStatus({
          status: 'delaying',
          message: `Privacy delay: ${delaySeconds}s remaining...`,
          netAmount,
          delaySecondsRemaining: delaySeconds,
          eta: eta.formattedTime,
        });

        // Non-blocking delay with countdown and cancellation support
        let cancelled = false;
        const abortDelay = () => { cancelled = true; };
        (window as any).__abortMixerDelay = abortDelay;
        
        await new Promise<void>((resolve, reject) => {
          let secondsLeft = delaySeconds;
          const intervalId = setInterval(() => {
            if (cancelled) {
              clearInterval(intervalId);
              delete (window as any).__abortMixerDelay;
              reject(new Error('Privacy delay cancelled'));
              return;
            }
            
            secondsLeft--;
            if (secondsLeft <= 0) {
              clearInterval(intervalId);
              delete (window as any).__abortMixerDelay;
              
              // Post-delay checkpoint
              if (currentSessionId) {
                saveSessionCheckpoint(currentSessionId, {
                  status: 'hopping',
                  message: 'Privacy delay complete, starting hop chain...',
                }).catch(err => console.error('Checkpoint save failed:', err));
              }
              
              resolve();
            } else {
              setMixerStatus(prev => ({
                ...prev,
                message: `Privacy delay: ${secondsLeft}s remaining...`,
                delaySecondsRemaining: secondsLeft,
              }));
            }
          }, 1000);
        });
      }

      // Step 2: Fetch private key from server (needed for signing)
      setMixerStatus({
        status: 'hopping',
        message: 'Preparing secure wallet...',
        netAmount,
      });

      const { getPrivateKey } = await import('@/lib/walletService');
      const secretKey = await getPrivateKey(wallet.publicKey);

      // Create wallet with secretKey for hop chain
      const walletWithKey: SolanaWallet = {
        ...wallet,
        secretKey,
      };

      // Step 3: Execute multi-hop privacy chain with FULL gross amount
      setMixerStatus({
        status: 'hopping',
        message: 'Creating privacy hop chain...',
        netAmount,
      });

      let finalHopWallet: HopWallet;
      let hopWalletsArray: HopWallet[] = [];
      const hopAmount = parseFloat(data.amount);
      
      try {
        finalHopWallet = await executeHopChain(
          walletWithKey,
          hopAmount,
          hopConfig,
          (hopProgress: HopProgress) => {
            setMixerStatus({
              status: 'hopping',
              message: hopProgress.message,
              netAmount,
              hopProgress,
              hopWallets: hopProgress.hopWallets,
              delaySecondsRemaining: hopProgress.delaySecondsRemaining,
            });
            hopWalletsArray = hopProgress.hopWallets;
          }
        );

        // Multi-hop chain complete - save checkpoint
        if (currentSessionId) {
          await saveSessionCheckpoint(currentSessionId, {
            status: 'hopping',
            message: 'Hop chain complete, calculating fees...',
            hopWallets: hopWalletsArray,
            hopConfig: hopConfig,
          }).catch(err => console.error('Post-hop checkpoint failed:', err));
        }
      } catch (hopError: any) {
        console.error('Multi-hop failed:', hopError);
        if (currentSessionId) {
          await failSession(currentSessionId, `Hop chain failed: ${hopError.message}`).catch(err => console.error('Session fail failed:', err));
        }
        throw new Error(`Privacy hop failed: ${hopError.message}`);
      }

      // Step 4: Check final hop wallet balance and deduct platform fee (5%)
      const { getBalance } = await import('@/lib/solana');
      const finalHopBalance = await getBalance(finalHopWallet.publicKey);
      
      // Calculate platform fee from final hop balance
      const platformFee = finalHopBalance * PLATFORM_FEE_PERCENT / 100;
      const TX_FEE = 0.001; // Reserve for two transactions (fee + exchange)
      const netAfterFee = finalHopBalance - platformFee - TX_FEE;
      
      if (netAfterFee < 0.001) {
        throw new Error('Insufficient balance in final hop wallet after fees');
      }

      // Step 5: Transfer platform fee from final hop wallet to platform address
      setMixerStatus({
        status: 'hopping',
        message: `Collecting ${platformFee.toFixed(4)} SOL platform fee...`,
        netAmount,
        hopWallets: hopWalletsArray,
      });

      try {
        const feeSignature = await sendSOL(finalHopWallet.secretKey, PLATFORM_WALLET_ADDRESS, platformFee);
        console.log(`Platform fee collected: ${platformFee.toFixed(4)} SOL (TX: ${feeSignature})`);
        
        // Post-fee-transfer checkpoint
        if (currentSessionId) {
          await saveSessionCheckpoint(currentSessionId, {
            status: 'exchanging',
            message: 'Platform fee collected, creating exchange...',
          }).catch(err => console.error('Post-fee checkpoint failed:', err));
        }
      } catch (feeError: any) {
        console.error('Platform fee collection failed:', feeError);
        if (currentSessionId) {
          await failSession(currentSessionId, `Fee collection failed: ${feeError.message}`).catch(err => console.error('Session fail failed:', err));
        }
        throw new Error(`Failed to collect platform fee: ${feeError.message}`);
      }

      // Step 6: Get updated balance after fee collection
      const finalBalanceAfterFee = await getBalance(finalHopWallet.publicKey);
      const actualAmountToSend = Math.max(0, finalBalanceAfterFee - 0.0005); // Small buffer for final tx

      // Step 7: SOL→SOL - Send final hop directly to destination address
      setMixerStatus({
        status: 'finished',
        message: 'Sending SOL to your destination address...',
        hopWallets: hopWalletsArray,
      });
      
      // Send from final hop to user's destination SOL address
      const finalTxSignature = await sendSOL(
        finalHopWallet.secretKey,
        data.destinationAddress,
        actualAmountToSend
      );

      // Wait for transaction confirmation
      setMixerStatus({
        status: 'finished',
        message: 'Confirming transaction on Solana...',
        finalHash: finalTxSignature,
        hopWallets: hopWalletsArray,
      });

      const { connection } = await import('@/lib/solana');
      try {
        await connection.confirmTransaction(finalTxSignature, 'confirmed');
        console.log(`✓ Transaction confirmed: ${finalTxSignature}`);
      } catch (confirmError) {
        console.warn('Transaction confirmation timed out (may still succeed):', confirmError);
        // Continue - transaction was sent successfully
      }

      // Save final transaction signature to session
      if (currentSessionId) {
        await saveSessionCheckpoint(currentSessionId, {
          status: 'finished',
          message: 'Mix completed successfully!',
          finalHash: finalTxSignature,
        }).catch(err => console.error('Final checkpoint failed:', err));
      }

      // Step 8: Complete the session
      setMixerStatus({
        status: 'finished',
        message: 'Privacy mix completed successfully!',
        finalHash: finalTxSignature,
        hopWallets: hopWalletsArray,
      });

      toast({
        title: 'Privacy Mix Complete',
        description: `${actualAmountToSend.toFixed(4)} SOL sent through ${hopWalletsArray.length} privacy hops (${platformFee.toFixed(4)} SOL platform fee)`,
      });

      // Complete session in database
      if (currentSessionId) {
        await completeSession(currentSessionId);
      }

      // Celebrate success
      celebrateMixSuccess();

      // Cleanup hop wallets after short delay
      setTimeout(() => {
        cleanupHopWallets(hopWalletsArray);
      }, 5000);

      // Call onSuccess callback
      if (onSuccess) {
        onSuccess();
      }

    } catch (error: any) {
      // Handle cancellation separately from errors
      if (error.message === 'Privacy delay cancelled') {
        setMixerStatus({ status: 'idle', message: '' });
        form.reset();
        toast({
          title: 'Privacy Delay Cancelled',
          description: 'You can start a new mix when ready',
        });
        return;
      }

      // Handle real errors
      console.error('Mixer error:', error);
      console.error('Error type:', typeof error);
      console.error('Error stringified:', JSON.stringify(error));
      
      // Fail session on error (if not already failed in inner catch blocks)
      if (currentSessionId) {
        await failSession(currentSessionId, error?.message || 'Unknown error').catch(err => console.error('Session fail failed:', err));
      }
      
      let errorMessage = 'Unknown error occurred';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error?.toString && typeof error.toString === 'function') {
        errorMessage = error.toString();
      }
      
      // Determine status message
      const isBalanceError = errorMessage.toLowerCase().includes('balance') || 
                            errorMessage.toLowerCase().includes('insufficient') ||
                            errorMessage.toLowerCase().includes('funds');
      
      setMixerStatus({
        status: 'failed',
        message: isBalanceError ? 'Insufficient SOL balance' : 'Privacy mix failed',
      });
      
      // Send error notification
      const errorDesc = isBalanceError
        ? 'Your wallet needs more SOL to complete the transaction'
        : errorMessage;
      notificationService.notifyMixError(errorDesc);
      
      toast({
        title: 'Privacy Mix Failed',
        description: errorDesc,
        variant: 'destructive',
      });
    }
  };

  const isProcessing = ['estimating', 'creating', 'delaying', 'hopping'].includes(mixerStatus.status);
  const isFinished = mixerStatus.status === 'finished';
  const isFailed = mixerStatus.status === 'failed';

  return (
    <>
      {/* Resume Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent data-testid="dialog-resume-session">
          <DialogHeader>
            <DialogTitle>Resume Mixer Session?</DialogTitle>
            <DialogDescription>
              You have an active mixing session in progress. Would you like to resume it?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <p className="text-sm text-muted-foreground">
              Status: {resumableSession?.currentMessage || 'Processing...'}
            </p>
            {resumableSession?.netAmount && (
              <p className="text-sm text-muted-foreground">
                Net Amount: ~{resumableSession.netAmount} SOL
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleResumeSession}
              className="flex-1"
              data-testid="button-resume-session"
            >
              Resume
            </Button>
            <Button
              onClick={handleDiscardSession}
              variant="outline"
              className="flex-1"
              data-testid="button-discard-session"
            >
              Discard & Start New
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Mixer Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-strong border-border/50 max-h-[90vh] flex flex-col">
        <DialogHeader className="space-y-3 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Shuffle className="h-5 w-5 text-primary" />
            </div>
            <span>Privacy Mixer</span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground/80">
            Mix your SOL through multiple privacy hops for maximum anonymity. Your funds will be routed through 2-4 randomized wallets before reaching your destination address.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 -mx-6 px-6">
        {mixerStatus.status === 'idle' ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Preset Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Mixer Preset</label>
                <PresetSelector
                  selected={selectedPreset}
                  onSelect={setSelectedPreset}
                />
                <p className="text-xs text-muted-foreground">
                  Choose your privacy level. Higher privacy = more hops & longer delays.
                </p>
              </div>

              <FormField
                control={form.control}
                name="destinationAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination SOL Address</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Your destination Solana wallet address" 
                        {...field}
                        className="font-mono text-sm"
                        data-testid="input-destination-address"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      <span className="text-primary font-medium">Privacy:</span> Use a fresh wallet that has never been used before
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (SOL)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.0001" 
                        placeholder={minAmount > 0 ? `Min: ${minAmount} SOL` : "0.0000"} 
                        {...field}
                        data-testid="input-amount"
                      />
                    </FormControl>
                    <FormDescription>
                      {minAmount > 0 && `Minimum: ${minAmount} SOL`}
                      {wallet.balance && ` • Available: ${wallet.balance.toFixed(4)} SOL`}
                    </FormDescription>
                    {field.value && parseFloat(field.value) > 0 && (() => {
                      const amount = parseFloat(field.value);
                      const hopConfig = getPresetConfig(selectedPreset);
                      const avgHops = (hopConfig.minHops + hopConfig.maxHops) / 2;
                      const networkFeePerHop = 0.000005; // Solana tx fee
                      const estimatedNetworkFees = avgHops * networkFeePerHop;
                      
                      // Use dynamic fee calculation if available and not errored, otherwise fallback to default
                      const useDynamicFees = feePreview && !feePreviewError;
                      const platformFee = useDynamicFees ? parseFloat(feePreview.platformFee) : amount * PLATFORM_FEE_PERCENT / 100;
                      const effectiveRate = useDynamicFees ? parseFloat(feePreview.effectiveRate) : PLATFORM_FEE_PERCENT;
                      const netAmount = useDynamicFees ? parseFloat(feePreview.netAmount) : amount * (100 - PLATFORM_FEE_PERCENT) / 100;
                      
                      const hasDiscount = useDynamicFees && (
                        parseFloat(feePreview.breakdown.loyaltyDiscount) > 0 ||
                        parseFloat(feePreview.breakdown.referralDiscount) > 0 ||
                        parseFloat(feePreview.breakdown.creditApplied) > 0
                      );
                      
                      return (
                        <div className="mt-2 text-xs space-y-1 rounded-md bg-muted/50 p-2 border border-border/50">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Amount to mix:</span>
                            <span className="font-medium">{amount.toFixed(4)} SOL</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground/80">
                            <span className="flex items-center gap-1">
                              <span>Platform fee ({effectiveRate.toFixed(2)}%)</span>
                              {hasDiscount && <span className="text-green-600 dark:text-green-400 text-[10px]">(discounted!)</span>}
                            </span>
                            <span>-{platformFee.toFixed(4)} SOL</span>
                          </div>
                          {feePreviewError && (
                            <div className="text-[10px] text-destructive">
                              Unable to load fee preview. Using default rates.
                            </div>
                          )}
                          {hasDiscount && useDynamicFees && (
                            <div className="pl-2 space-y-0.5 text-[10px] text-muted-foreground/70">
                              {parseFloat(feePreview.breakdown.loyaltyDiscount) > 0 && (
                                <div className="flex justify-between">
                                  <span>• Loyalty discount:</span>
                                  <span className="text-green-600 dark:text-green-400">-{feePreview.breakdown.loyaltyDiscount} SOL</span>
                                </div>
                              )}
                              {parseFloat(feePreview.breakdown.referralDiscount) > 0 && (
                                <div className="flex justify-between">
                                  <span>• Referral discount:</span>
                                  <span className="text-green-600 dark:text-green-400">-{feePreview.breakdown.referralDiscount} SOL</span>
                                </div>
                              )}
                              {parseFloat(feePreview.breakdown.creditApplied) > 0 && (
                                <div className="flex justify-between">
                                  <span>• Credits applied:</span>
                                  <span className="text-green-600 dark:text-green-400">-{feePreview.breakdown.creditApplied} SOL</span>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="flex justify-between text-muted-foreground/80">
                            <span className="flex items-center gap-1">
                              <span>Network fees (~{Math.round(avgHops)} hops)</span>
                            </span>
                            <span>~{estimatedNetworkFees.toFixed(6)} SOL</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-border/50">
                            <span className="text-foreground font-medium">You will receive ~:</span>
                            <span className="font-medium text-primary">{netAmount.toFixed(4)} SOL</span>
                          </div>
                          <p className="text-muted-foreground/60 text-[10px] mt-1">
                            Actual amounts may vary slightly based on network conditions
                          </p>
                        </div>
                      );
                    })()}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="referralCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Referral Code (Optional)
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter referral code for 0.5% reward" 
                        {...field}
                        className="uppercase font-mono"
                        data-testid="input-referral-code"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Optional: Enter a referral code to earn 0.5% rewards on this mix
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enableDelay"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-border/50 p-4 glass-panel">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Privacy Delay
                      </FormLabel>
                      <FormDescription className="text-xs">
                        Random delay to obscure timing patterns
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-privacy-delay"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch('enableDelay') && (
                <FormField
                  control={form.control}
                  name="delayMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Delay Duration</FormLabel>
                        <span className="text-sm text-muted-foreground">{field.value} min</span>
                      </div>
                      <FormControl>
                        <Slider
                          min={1}
                          max={60}
                          step={1}
                          value={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          className="py-4"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Actual delay will vary ±10% for additional privacy
                      </FormDescription>
                    </FormItem>
                  )}
                />
              )}

              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-yellow-500">Privacy Best Practices</p>
                    <p className="text-muted-foreground text-xs">
                      For maximum privacy: use a fresh destination SOL address, enable VPN, use privacy delays, and burn this SOL wallet after mixing.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isProcessing}
                data-testid="button-start-mix"
              >
                <Shield className="mr-2 h-4 w-4" />
                Start Privacy Mix
              </Button>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              {isProcessing && <Loader2 className="h-12 w-12 text-primary animate-spin" />}
              {isFinished && <CheckCircle2 className="h-12 w-12 text-green-500" />}
              {isFailed && <XCircle className="h-12 w-12 text-destructive" />}
            </div>

            <div className="text-center space-y-3">
              <p className="font-medium">{mixerStatus.message}</p>
              
              {/* Multi-hop progress indicator */}
              {mixerStatus.status === 'hopping' && mixerStatus.hopProgress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <Network className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Privacy Hop {mixerStatus.hopProgress.currentHop}/{mixerStatus.hopProgress.totalHops}
                    </span>
                  </div>
                  
                  {/* Hop chain visualization */}
                  <div className="flex items-center justify-center gap-1">
                    {Array.from({ length: mixerStatus.hopProgress.totalHops }).map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 w-8 rounded-full transition-colors ${
                          i < mixerStatus.hopProgress!.currentHop
                            ? 'bg-primary'
                            : i === mixerStatus.hopProgress!.currentHop
                            ? 'bg-primary/50 animate-pulse'
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {mixerStatus.netAmount && (
                <p className="text-sm text-muted-foreground">
                  Expected: ~{mixerStatus.netAmount} SOL
                </p>
              )}
              
              {mixerStatus.eta && isProcessing && (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" />
                  ETA: {mixerStatus.eta}
                </p>
              )}
              
              {mixerStatus.finalHash && (
                <p className="text-xs text-muted-foreground font-mono">
                  ID: {mixerStatus.finalHash.slice(0, 16)}...
                </p>
              )}
              {mixerStatus.status === 'delaying' && mixerStatus.delaySecondsRemaining && (
                <Button
                  onClick={() => {
                    if ((window as any).__abortMixerDelay) {
                      (window as any).__abortMixerDelay();
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  data-testid="button-abort-delay"
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Cancel Privacy Delay
                </Button>
              )}
            </div>

            {isProcessing && (
              <div className="rounded-lg border border-border/50 p-4 glass-panel space-y-2">
                <p className="text-xs font-medium">Processing Steps:</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className={mixerStatus.status === 'creating' ? 'text-primary font-medium' : ''}>
                    ✓ SOL sent to mixer
                  </div>
                  <div className={mixerStatus.status === 'hopping' ? 'text-primary font-medium' : 'opacity-50'}>
                    {mixerStatus.status === 'hopping' ? '⟳' : '○'} Processing final transfer
                  </div>
                  <div className={mixerStatus.status === 'finished' ? 'text-primary font-medium' : 'opacity-50'}>
                    {mixerStatus.status === 'finished' ? '⟳' : '○'} Sending to your destination address
                  </div>
                </div>
              </div>
            )}

            {isFinished && (
              <div className="space-y-4">
                <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="space-y-2 flex-1">
                      <p className="font-medium text-green-500">Mix Complete!</p>
                      
                      {mixerStatus.netAmount && (
                        <div className="text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">SOL Amount:</span>
                            <span className="font-mono font-medium">~{mixerStatus.netAmount} SOL</span>
                          </div>
                        </div>
                      )}
                      
                      {mixerStatus.hopWallets && mixerStatus.hopWallets.length > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Privacy Hops:</span>
                          <span className="font-medium">{mixerStatus.hopWallets.length} intermediate wallets</span>
                        </div>
                      )}
                      
                      {mixerStatus.finalHash && (
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Payout TX:</span>
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono bg-background/50 px-2 py-1 rounded flex-1 truncate">
                              {mixerStatus.finalHash}
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => {
                                navigator.clipboard.writeText(mixerStatus.finalHash || '');
                                toast({ description: 'Transaction hash copied!' });
                              }}
                              data-testid="button-copy-payout-hash"
                            >
                              <span className="text-xs">Copy</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <div className="flex gap-2">
                    <Shield className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      For maximum privacy, consider burning this SOL wallet and using a fresh address for future transactions.
                    </p>
                  </div>
                </div>
                
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    form.reset();
                    setMixerStatus({ status: 'idle', message: '' });
                  }}
                  className="w-full"
                  data-testid="button-close-success"
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
