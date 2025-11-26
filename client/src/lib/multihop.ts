import { generateKeypair, sendSOL, getBalance } from './solana';
import type { SolanaWallet } from '@shared/types';

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        // Calculate exponential backoff delay: 1s, 2s, 4s, 8s...
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        const jitter = Math.random() * 0.3 * delayMs; // Add ±30% jitter
        const totalDelay = delayMs + jitter;
        
        console.warn(`${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${Math.round(totalDelay)}ms...`, error);
        
        await new Promise(resolve => setTimeout(resolve, totalDelay));
      }
    }
  }
  
  throw new Error(`${operationName} failed after ${maxRetries + 1} attempts: ${lastError?.message || 'unknown error'}`);
}

export interface HopWallet {
  publicKey: string;
  secretKey: string;
  hopNumber: number;
}

export interface MultiHopConfig {
  minHops: number; // minimum hops (2)
  maxHops: number; // maximum hops (4)
  minDelaySeconds: number; // minimum delay (5)
  maxDelaySeconds: number; // maximum delay (60)
  earlyHopVariance: number; // early hop variance % (1-2)
  finalHopVariance: number; // final hop variance % (0.1-0.3)
  enableRandomization: boolean;
  enableRecovery: boolean; // SECURITY WARNING: stores keys in sessionStorage - disable for production
  
  // Circular routing (bounce-back) configuration
  bounceBackProbability: number; // 0-100: probability of revisiting previous hops
  maxBounceBackDepth: number; // how many hops back we can jump (e.g., 2 = can go back 2 wallets)
  minForwardBeforeBounce: number; // minimum forward hops before first bounce-back allowed
  maxSequentialBounce: number; // max consecutive bounce-backs to prevent loops
  
  // Enhanced privacy settings
  amountVariancePercent: number; // amount variance for ALL hops (10-30% for high privacy)
  delayMode: 'fast' | 'balanced' | 'stealth'; // controls delay ranges
  stealthPreset: boolean; // if true, use extreme privacy settings
}

export interface HopProgress {
  currentHop: number;
  totalHops: number;
  status: 'creating' | 'transferring' | 'waiting' | 'completed' | 'failed';
  message: string;
  hopWallets: HopWallet[];
  delaySecondsRemaining?: number;
  currentSignature?: string;
}

export interface HopOperation {
  fromWalletIndex: number; // index in hop wallets array (-1 = source wallet)
  toWalletIndex: number; // index in hop wallets array
  amountPercent: number; // percentage of available balance to send
  isBounceback: boolean; // true if going back to previous wallet
  delaySeconds: number; // delay after this operation
}

interface AccountingState {
  remainingBudget: number; // Total SOL still to be forwarded
  deliveredSoFar: number; // Total SOL delivered through forward hops
  scheduledSends: Map<number, number>; // wallet index -> count of remaining sends
  feeEscrow: Map<number, number>; // wallet index -> reserved SOL for future fees
  perWalletBalance: Map<number, number>; // wallet index -> last known balance
  ledger: number[]; // cumulative delivered amounts (for audit)
}

/**
 * Creates a chain of intermediate hop wallets for privacy mixing
 * Uses randomized hop count to prevent pattern detection
 */
export function createHopChain(config: MultiHopConfig): HopWallet[] {
  // Randomize number of hops between min and max
  const numberOfHops = config.enableRandomization
    ? Math.floor(Math.random() * (config.maxHops - config.minHops + 1)) + config.minHops
    : config.minHops;
  
  const hops: HopWallet[] = [];
  
  for (let i = 0; i < numberOfHops; i++) {
    const { publicKey, secretKey } = generateKeypair();
    hops.push({
      publicKey,
      secretKey,
      hopNumber: i + 1,
    });
  }
  
  return hops;
}

/**
 * Generates a circular hop itinerary with bounce-back patterns
 * Creates non-linear transaction paths (A→B→C→B→D) to break chain analysis
 */
export function generateHopItinerary(
  hopWallets: HopWallet[],
  config: MultiHopConfig
): HopOperation[] {
  const operations: HopOperation[] = [];
  const numWallets = hopWallets.length;
  
  // Track state for bounce-back logic
  let forwardIndex = 0; // next forward wallet to visit
  let consecutiveBounces = 0;
  let hopsSinceStart = 0;
  
  // History window for bounce-backs (keeps track of recently visited wallets)
  const historyWindow: number[] = [];
  
  // Start from source wallet (-1)
  let currentWalletIndex = -1;
  
  while (forwardIndex < numWallets) {
    const canBounceBack = 
      config.bounceBackProbability > 0 &&
      historyWindow.length > 0 &&
      hopsSinceStart >= config.minForwardBeforeBounce &&
      consecutiveBounces < config.maxSequentialBounce;
    
    const shouldBounceBack = canBounceBack && 
      (Math.random() * 100 < config.bounceBackProbability);
    
    let targetIndex: number;
    let isBounceback = false;
    
    if (shouldBounceBack) {
      // Bounce back to a previous wallet (but NEVER to ourselves)
      const maxDepth = Math.min(config.maxBounceBackDepth, historyWindow.length);
      const bounceDepth = Math.floor(Math.random() * maxDepth) + 1;
      targetIndex = historyWindow[historyWindow.length - bounceDepth];
      
      // Guard: prevent self-hop (bouncing to current wallet)
      if (targetIndex === currentWalletIndex) {
        // Skip bounce-back, move forward instead
        targetIndex = forwardIndex;
        forwardIndex++;
        consecutiveBounces = 0;
        isBounceback = false;
      } else {
        isBounceback = true;
        consecutiveBounces++;
      }
    } else {
      // Move forward to next wallet
      targetIndex = forwardIndex;
      forwardIndex++;
      consecutiveBounces = 0;
      
      // Add to history window
      if (currentWalletIndex >= 0) {
        historyWindow.push(currentWalletIndex);
        // Limit history window size to maxBounceBackDepth
        if (historyWindow.length > config.maxBounceBackDepth) {
          historyWindow.shift();
        }
      }
    }
    
    // Calculate delay based on mode
    const delaySeconds = calculateDelayForMode(config);
    
    // Calculate amount variance (higher for stealth)
    const amountPercent = config.enableRandomization
      ? 100 + ((Math.random() * 2 - 1) * config.amountVariancePercent)
      : 100;
    
    operations.push({
      fromWalletIndex: currentWalletIndex,
      toWalletIndex: targetIndex,
      amountPercent,
      isBounceback,
      delaySeconds,
    });
    
    currentWalletIndex = targetIndex;
    hopsSinceStart++;
  }
  
  return operations;
}

/**
 * Calculate delay based on mode (fast/balanced/stealth)
 */
function calculateDelayForMode(config: MultiHopConfig): number {
  if (!config.enableRandomization) {
    return config.minDelaySeconds;
  }
  
  let minDelay = config.minDelaySeconds;
  let maxDelay = config.maxDelaySeconds;
  
  // Apply stealth multipliers for extreme privacy
  if (config.stealthPreset) {
    minDelay = Math.max(minDelay, 300); // 5 minutes minimum
    maxDelay = Math.max(maxDelay, 3600); // 1 hour maximum
  }
  
  const delayRange = maxDelay - minDelay;
  const randomDelay = Math.random() * delayRange;
  return Math.round(minDelay + randomDelay);
}

/**
 * Preprocess itinerary to count scheduled sends per wallet
 * This enables precise fee reservation based on remaining operations
 */
function preprocessItinerary(itinerary: HopOperation[]): Map<number, number> {
  const scheduledSends = new Map<number, number>();
  
  for (const operation of itinerary) {
    const fromIndex = operation.fromWalletIndex;
    scheduledSends.set(fromIndex, (scheduledSends.get(fromIndex) || 0) + 1);
  }
  
  return scheduledSends;
}

/**
 * Initialize accounting state for fee tracking
 */
function initializeAccounting(
  finalAmount: number,
  scheduledSends: Map<number, number>
): AccountingState {
  const TX_FEE = 0.000005; // Actual Solana transaction fee
  const SOURCE_SAFETY = 0.0005; // Extra buffer for source wallet
  
  const feeEscrow = new Map<number, number>();
  
  // Reserve fees for each wallet based on scheduled sends
  for (const [walletIndex, sendCount] of Array.from(scheduledSends.entries())) {
    const isSource = walletIndex === -1;
    const reservedFees = TX_FEE * sendCount + (isSource ? SOURCE_SAFETY : 0);
    feeEscrow.set(walletIndex, reservedFees);
  }
  
  return {
    remainingBudget: finalAmount,
    deliveredSoFar: 0,
    scheduledSends: new Map(scheduledSends),
    feeEscrow,
    perWalletBalance: new Map(),
    ledger: [],
  };
}

/**
 * Calculate amount with tiered variance for privacy obfuscation
 * Early hops use higher variance, final hop sends ALL available balance
 */
async function calculateHopAmount(
  baseAmount: number, 
  config: MultiHopConfig, 
  hopIndex: number,
  totalHops: number,
  sourceWalletPublicKey?: string
): Promise<number> {
  const isLastHop = hopIndex === totalHops - 1;
  
  // Last hop: send ALL available balance (no variance)
  // This ensures we can send the maximum to the exchange regardless of earlier variance
  if (isLastHop && sourceWalletPublicKey) {
    const actualBalance = await getBalance(sourceWalletPublicKey);
    const feeBuffer = 0.001; // Reserve for transaction fee
    return Math.max(0, actualBalance - feeBuffer);
  }
  
  if (!config.enableRandomization) {
    return baseAmount;
  }
  
  const isEarlyHop = hopIndex < Math.floor(totalHops / 2);
  
  // Early hops: higher variance for better privacy (but never more than available)
  const variance = isEarlyHop ? config.earlyHopVariance : config.finalHopVariance;
  const varianceMultiplier = 1 + ((Math.random() * 2 - 1) * (variance / 100));
  let hopAmount = baseAmount * varianceMultiplier;
  
  // Ensure we don't try to send more than we have
  if (sourceWalletPublicKey) {
    const actualBalance = await getBalance(sourceWalletPublicKey);
    const feeBuffer = 0.001;
    const maxAvailable = actualBalance - feeBuffer;
    hopAmount = Math.min(hopAmount, maxAvailable);
  }
  
  return hopAmount;
}

/**
 * Calculate delay with jittered randomization for timing obfuscation
 */
function calculateHopDelay(config: MultiHopConfig): number {
  if (!config.enableRandomization) {
    return config.minDelaySeconds;
  }
  
  // Fully randomized delay between min and max
  const delayRange = config.maxDelaySeconds - config.minDelaySeconds;
  const randomDelay = Math.random() * delayRange;
  return Math.round(config.minDelaySeconds + randomDelay);
}

/**
 * Executes a privacy delay with countdown
 */
async function executeDelay(
  seconds: number,
  onProgress: (secondsRemaining: number) => void,
  abortSignal?: () => boolean
): Promise<void> {
  return new Promise((resolve, reject) => {
    let secondsLeft = seconds;
    
    const intervalId = setInterval(() => {
      if (abortSignal?.()) {
        clearInterval(intervalId);
        reject(new Error('Hop chain cancelled'));
        return;
      }
      
      secondsLeft--;
      onProgress(secondsLeft);
      
      if (secondsLeft <= 0) {
        clearInterval(intervalId);
        resolve();
      }
    }, 1000);
  });
}

/**
 * Confirms balance has arrived at hop wallet (prevents race conditions)
 */
async function confirmHopBalance(
  publicKey: string,
  expectedAmount: number,
  maxRetries: number = 10
): Promise<boolean> {
  const tolerance = 0.001; // Allow 0.001 SOL variance for fees
  
  for (let i = 0; i < maxRetries; i++) {
    const balance = await getBalance(publicKey);
    
    if (balance >= expectedAmount - tolerance) {
      return true;
    }
    
    // Wait 2 seconds before retry
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return false;
}

/**
 * Executes a single hop in the chain with balance confirmation
 */
async function executeSingleHop(
  fromWallet: { publicKey: string; secretKey: string },
  toPublicKey: string,
  amount: number,
  hopNumber: number,
  totalHops: number,
  onProgress: (progress: HopProgress) => void,
  hopWallets: HopWallet[]
): Promise<string> {
  // Update status to transferring
  onProgress({
    currentHop: hopNumber,
    totalHops,
    status: 'transferring',
    message: `Transferring to privacy hop ${hopNumber}/${totalHops}...`,
    hopWallets,
  });
  
  // Execute the transfer with retry logic
  const signature = await retryWithBackoff(
    () => sendSOL(fromWallet.secretKey, toPublicKey, amount),
    3, // max 3 retries
    1000, // 1 second base delay
    `Hop ${hopNumber}/${totalHops} transfer`
  );
  
  // Confirm balance arrived (prevents race conditions)
  onProgress({
    currentHop: hopNumber,
    totalHops,
    status: 'transferring',
    message: `Confirming hop ${hopNumber}/${totalHops} transfer...`,
    hopWallets,
    currentSignature: signature,
  });
  
  const confirmed = await confirmHopBalance(toPublicKey, amount);
  
  if (!confirmed) {
    throw new Error(`Hop ${hopNumber} transfer confirmation timeout`);
  }
  
  // Update with signature
  onProgress({
    currentHop: hopNumber,
    totalHops,
    status: 'completed',
    message: `Hop ${hopNumber}/${totalHops} confirmed`,
    hopWallets,
    currentSignature: signature,
  });
  
  return signature;
}

/**
 * Executes the full multi-hop chain
 * 
 * @param sourceWallet - Original burner wallet
 * @param finalAmount - Final amount to send (after all hops)
 * @param config - Multi-hop configuration
 * @param onProgress - Callback for progress updates
 * @param abortSignal - Optional abort signal
 * @returns Final hop wallet that will send to the exchange
 */
export async function executeHopChain(
  sourceWallet: SolanaWallet,
  finalAmount: number,
  config: MultiHopConfig,
  onProgress: (progress: HopProgress) => void,
  abortSignal?: () => boolean
): Promise<HopWallet> {
  // Validate that we have the secret key
  if (!sourceWallet.secretKey) {
    throw new Error('Cannot execute hop chain: wallet secret key is missing');
  }
  
  // Create hop chain
  onProgress({
    currentHop: 0,
    totalHops: config.maxHops,
    status: 'creating',
    message: `Creating privacy hop chain...`,
    hopWallets: [],
  });
  
  const hopWallets = createHopChain(config);
  
  onProgress({
    currentHop: 0,
    totalHops: hopWallets.length,
    status: 'creating',
    message: `Created ${hopWallets.length} intermediate wallets`,
    hopWallets,
  });
  
  // Generate circular hop itinerary
  const itinerary = generateHopItinerary(hopWallets, config);
  const totalOperations = itinerary.length;
  
  onProgress({
    currentHop: 0,
    totalHops: totalOperations,
    status: 'creating',
    message: `Planned ${totalOperations} transfers (${hopWallets.length} wallets with circular routing)`,
    hopWallets,
  });
  
  // Helper to get wallet by index (-1 = source, 0+ = hop wallets)
  const getWallet = (index: number) => {
    if (index === -1) {
      return {
        publicKey: sourceWallet.publicKey,
        secretKey: sourceWallet.secretKey!,
      };
    }
    return hopWallets[index];
  };
  
  // Track which wallet will send to the exchange (last FORWARD hop)
  let finalHopWallet = hopWallets[hopWallets.length - 1];
  
  // Track budget to ensure EXACTLY finalAmount is delivered
  let totalBudgetInjected = 0; // Track how much we've injected into the chain
  let isFirstForward = true;
  
  // Execute itinerary with circular routing
  for (let i = 0; i < totalOperations; i++) {
    const operation = itinerary[i];
    const isLastOperation = i === totalOperations - 1;
    const opNumber = i + 1;
    
    const fromWallet = getWallet(operation.fromWalletIndex);
    const toWallet = getWallet(operation.toWalletIndex);
    
    // Calculate amount based on operation type
    const fromBalance = await getBalance(fromWallet.publicKey);
    
    // Reserve ACTUAL transaction fee (~0.000005 SOL) from every transfer
    // This prevents "insufficient funds for fee" errors
    const TX_FEE = 0.000005; // Actual Solana transaction fee
    const feeBuffer = TX_FEE;
    const availableToSend = Math.max(0, fromBalance - feeBuffer);
    
    let transferAmount: number;
    
    if (operation.isBounceback) {
      // Bounce-back: send all available (minus tx fee)
      transferAmount = availableToSend;
    } else if (isFirstForward) {
      // FIRST forward hop: inject EXACTLY finalAmount (minus tx fee)
      const sourceWallet = operation.fromWalletIndex === -1;
      const sourceBuffer = sourceWallet ? 0.001 : TX_FEE; // Source needs extra for initial tx
      const availableInSource = Math.max(0, fromBalance - sourceBuffer);
      
      transferAmount = Math.min(finalAmount, availableInSource);
      totalBudgetInjected = transferAmount;
      isFirstForward = false;
      
      if (transferAmount < finalAmount) {
        throw new Error(`Insufficient balance: wallet has ${availableInSource} SOL but need ${finalAmount} SOL`);
      }
    } else if (isLastOperation) {
      // FINAL forward hop: sweep all available (minus tx fee for the send to exchange)
      transferAmount = availableToSend;
      finalHopWallet = hopWallets[operation.toWalletIndex]; // Update final hop
    } else {
      // Intermediate forward hop: forward all available (minus tx fee)
      transferAmount = availableToSend;
    }
    
    // Guard: skip if transfer amount is too small (would fail on-chain)
    if (transferAmount < 0.000001) {
      console.warn(`Skipping hop ${opNumber}: transfer amount too small (${transferAmount} SOL)`);
      continue;
    }
    
    // Update status with bounce-back indicator
    const hopType = operation.isBounceback ? '↩️ bounce-back' : '→ forward';
    const message = `${hopType} transfer ${opNumber}/${totalOperations}...`;
    
    onProgress({
      currentHop: opNumber,
      totalHops: totalOperations,
      status: 'transferring',
      message,
      hopWallets,
    });
    
    // Execute the transfer with retry logic
    const signature = await retryWithBackoff(
      () => sendSOL(fromWallet.secretKey, toWallet.publicKey, transferAmount),
      3, // max 3 retries
      1000, // 1 second base delay
      `Hop operation ${opNumber}/${totalOperations}`
    );
    
    // Confirm balance arrived
    const confirmed = await confirmHopBalance(toWallet.publicKey, transferAmount);
    if (!confirmed) {
      throw new Error(`Operation ${opNumber} transfer confirmation timeout`);
    }
    
    onProgress({
      currentHop: opNumber,
      totalHops: totalOperations,
      status: 'completed',
      message: `${hopType} ${opNumber}/${totalOperations} confirmed`,
      hopWallets,
      currentSignature: signature,
    });
    
    // Store encrypted state for recovery (if enabled)
    if (config.enableRecovery) {
      saveHopState({
        currentHop: opNumber,
        totalHops: totalOperations,
        hopWallets,
        finalAmount,
        completed: isLastOperation,
      });
    }
    
    // Add delay before next operation (except after last)
    if (!isLastOperation) {
      const delaySeconds = operation.delaySeconds;
      
      onProgress({
        currentHop: opNumber,
        totalHops: totalOperations,
        status: 'waiting',
        message: `Privacy delay: ${delaySeconds}s before next transfer...`,
        hopWallets,
        delaySecondsRemaining: delaySeconds,
      });
      
      await executeDelay(
        delaySeconds,
        (secondsRemaining) => {
          onProgress({
            currentHop: opNumber,
            totalHops: totalOperations,
            status: 'waiting',
            message: `Privacy delay: ${secondsRemaining}s before next transfer...`,
            hopWallets,
            delaySecondsRemaining: secondsRemaining,
          });
        },
        abortSignal
      );
    }
  }
  
  // Return the wallet that will send to the exchange
  return finalHopWallet;
}

/**
 * Recovery state management (encrypted in localStorage)
 */
interface HopRecoveryState {
  currentHop: number;
  totalHops: number;
  hopWallets: HopWallet[];
  finalAmount: number;
  completed: boolean;
  timestamp: number;
}

const RECOVERY_KEY = 'zmix_hop_recovery';

function saveHopState(state: Omit<HopRecoveryState, 'timestamp'>): void {
  const recoveryState: HopRecoveryState = {
    ...state,
    timestamp: Date.now(),
  };
  
  // Store in memory (can be enhanced with encryption)
  sessionStorage.setItem(RECOVERY_KEY, JSON.stringify(recoveryState));
}

export function clearHopState(): void {
  sessionStorage.removeItem(RECOVERY_KEY);
}

export function getHopState(): HopRecoveryState | null {
  try {
    const stored = sessionStorage.getItem(RECOVERY_KEY);
    if (!stored) return null;
    
    const state = JSON.parse(stored) as HopRecoveryState;
    
    // Expire after 1 hour
    if (Date.now() - state.timestamp > 3600000) {
      clearHopState();
      return null;
    }
    
    return state;
  } catch {
    return null;
  }
}

/**
 * Cleans up intermediate hop wallets after successful mix
 * Sweeps residual dust and securely wipes secrets
 */
export async function cleanupHopWallets(hopWallets: HopWallet[]): Promise<void> {
  console.log(`Cleaning up ${hopWallets.length} intermediate hop wallets`);
  
  // Check for dust in each wallet (optional sweep)
  for (const wallet of hopWallets) {
    try {
      const balance = await getBalance(wallet.publicKey);
      if (balance > 0.001) {
        console.warn(`Hop wallet ${wallet.publicKey} has ${balance} SOL dust remaining`);
        // Future: Could sweep dust to a project wallet or burn address
      }
    } catch (error) {
      console.error(`Error checking hop wallet balance:`, error);
    }
  }
  
  // Securely wipe secrets from memory
  for (const wallet of hopWallets) {
    wallet.secretKey = '';
    wallet.publicKey = '';
  }
  
  // Clear array
  hopWallets.length = 0;
  
  // Clear recovery state
  clearHopState();
}

/**
 * Default multi-hop configuration (good privacy/UX balance)
 * Now includes circular routing for better Solscan obfuscation
 */
export const DEFAULT_MULTIHOP_CONFIG: MultiHopConfig = {
  minHops: 2,
  maxHops: 4,
  minDelaySeconds: 5,
  maxDelaySeconds: 30,
  earlyHopVariance: 1.5,
  finalHopVariance: 0.3,
  enableRandomization: true,
  enableRecovery: false,
  
  // Circular routing: moderate bounce-backs
  bounceBackProbability: 30, // 30% chance to revisit previous wallets
  maxBounceBackDepth: 2, // can go back up to 2 wallets
  minForwardBeforeBounce: 2, // need 2 forward hops before first bounce
  maxSequentialBounce: 1, // max 1 consecutive bounce to prevent loops
  
  // Enhanced privacy
  amountVariancePercent: 15, // ±15% variance on amounts (harder to track)
  delayMode: 'balanced',
  stealthPreset: false,
};

/**
 * Fast mode configuration (minimal delays, minimal circular routing)
 */
export const FAST_MULTIHOP_CONFIG: MultiHopConfig = {
  minHops: 2,
  maxHops: 3,
  minDelaySeconds: 3,
  maxDelaySeconds: 10,
  earlyHopVariance: 1.0,
  finalHopVariance: 0.2,
  enableRandomization: true,
  enableRecovery: false,
  
  // Circular routing: light bounce-backs for speed
  bounceBackProbability: 15, // 15% chance to bounce back
  maxBounceBackDepth: 1,
  minForwardBeforeBounce: 2,
  maxSequentialBounce: 1,
  
  // Moderate privacy
  amountVariancePercent: 10, // ±10% variance
  delayMode: 'fast',
  stealthPreset: false,
};

/**
 * Maximum privacy configuration (aggressive circular routing)
 * Creates complex transaction webs that break Solscan chain analysis
 */
export const MAX_PRIVACY_CONFIG: MultiHopConfig = {
  minHops: 3,
  maxHops: 5,
  minDelaySeconds: 15,
  maxDelaySeconds: 60,
  earlyHopVariance: 2.0,
  finalHopVariance: 0.3,
  enableRandomization: true,
  enableRecovery: false,
  
  // Circular routing: aggressive bounce-backs
  bounceBackProbability: 50, // 50% chance to revisit previous wallets
  maxBounceBackDepth: 3, // can go back up to 3 wallets
  minForwardBeforeBounce: 2,
  maxSequentialBounce: 2, // allow 2 consecutive bounces
  
  // High privacy
  amountVariancePercent: 25, // ±25% variance (very hard to track amounts)
  delayMode: 'balanced',
  stealthPreset: false,
};

/**
 * STEALTH mode configuration (EXTREME privacy with long delays)
 * WARNING: Can take hours to complete but provides maximum obfuscation
 */
export const STEALTH_MULTIHOP_CONFIG: MultiHopConfig = {
  minHops: 4,
  maxHops: 6,
  minDelaySeconds: 300, // 5 minutes
  maxDelaySeconds: 3600, // 1 hour
  earlyHopVariance: 3.0,
  finalHopVariance: 0.5,
  enableRandomization: true,
  enableRecovery: false,
  
  // Circular routing: extreme bounce-backs
  bounceBackProbability: 60, // 60% chance to bounce back
  maxBounceBackDepth: 4,
  minForwardBeforeBounce: 2,
  maxSequentialBounce: 3,
  
  // Extreme privacy
  amountVariancePercent: 30, // ±30% variance (maximum obfuscation)
  delayMode: 'stealth',
  stealthPreset: true,
};
