import type { MultiHopConfig } from './multihop';

export interface ETAEstimate {
  totalSeconds: number;
  formattedTime: string;
  breakdown: {
    initialDelay: number;
    hopChainDelays: number;
    exchangeProcessing: number;
  };
}

/**
 * Calculate estimated time to completion for a mixer operation
 */
export function calculateMixerETA(
  config: MultiHopConfig,
  enableInitialDelay: boolean = false,
  initialDelayMinutes: number = 0
): ETAEstimate {
  // 1. Initial delay (optional)
  const initialDelaySeconds = enableInitialDelay ? initialDelayMinutes * 60 : 0;
  
  // 2. Hop chain delays (average of min/max * average hops)
  const avgHops = (config.minHops + config.maxHops) / 2;
  const avgDelayPerHop = (config.minDelaySeconds + config.maxDelaySeconds) / 2;
  const hopChainDelaySeconds = Math.ceil(avgHops * avgDelayPerHop);
  
  // 3. Exchange processing time (estimated 5-10 minutes, use 7.5 min average)
  const exchangeProcessingSeconds = 450; // 7.5 minutes
  
  const totalSeconds = initialDelaySeconds + hopChainDelaySeconds + exchangeProcessingSeconds;
  
  return {
    totalSeconds,
    formattedTime: formatDuration(totalSeconds),
    breakdown: {
      initialDelay: initialDelaySeconds,
      hopChainDelays: hopChainDelaySeconds,
      exchangeProcessing: exchangeProcessingSeconds,
    },
  };
}

/**
 * Calculate ETA for a running mixer session
 * Adjusts estimate based on current progress
 */
export function calculateRemainingETA(
  originalETA: ETAEstimate,
  elapsedSeconds: number,
  currentStage: 'delaying' | 'hopping' | 'exchanging' | 'sending'
): ETAEstimate {
  let remainingSeconds = Math.max(0, originalETA.totalSeconds - elapsedSeconds);
  
  // Adjust based on what stage we're in
  const breakdown = { ...originalETA.breakdown };
  
  if (currentStage === 'delaying') {
    // Still in initial delay
    const delayRemaining = Math.max(0, breakdown.initialDelay - elapsedSeconds);
    remainingSeconds = delayRemaining + breakdown.hopChainDelays + breakdown.exchangeProcessing;
  } else if (currentStage === 'hopping') {
    // In hop chain, initial delay complete
    const hopElapsed = elapsedSeconds - breakdown.initialDelay;
    const hopRemaining = Math.max(0, breakdown.hopChainDelays - hopElapsed);
    remainingSeconds = hopRemaining + breakdown.exchangeProcessing;
  } else if (currentStage === 'exchanging' || currentStage === 'sending') {
    // In exchange phase
    const exchangeElapsed = elapsedSeconds - breakdown.initialDelay - breakdown.hopChainDelays;
    remainingSeconds = Math.max(0, breakdown.exchangeProcessing - exchangeElapsed);
  }
  
  return {
    totalSeconds: remainingSeconds,
    formattedTime: formatDuration(remainingSeconds),
    breakdown,
  };
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.ceil(seconds)}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.ceil(seconds % 60);
  
  if (minutes < 60) {
    return remainingSeconds > 0 
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return remainingMinutes > 0
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
}
