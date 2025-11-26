import type { BurnerWallet } from '@shared/types';

export interface PrivacyScore {
  score: number;
  level: 'safe' | 'warning' | 'critical';
  warnings: string[];
  factors: {
    walletAge: {
      hours: number;
      impact: number;
      status: 'good' | 'warning' | 'critical';
    };
    transactionCount: {
      count: number;
      impact: number;
      status: 'good' | 'warning' | 'critical';
    };
    lastActivity: {
      hoursAgo: number;
      impact: number;
      status: 'good' | 'warning' | 'critical';
    };
  };
}

const HOURS_IN_MS = 60 * 60 * 1000;

export function calculatePrivacyScore(wallet: BurnerWallet): PrivacyScore {
  const now = Date.now();
  const walletAgeHours = (now - wallet.createdAt) / HOURS_IN_MS;
  const transactionCount = wallet.transactions?.length ?? 0;
  
  const lastActivityTimestamp = wallet.transactions && wallet.transactions.length > 0
    ? Math.max(...wallet.transactions.map(t => t.timestamp))
    : wallet.createdAt;
  const hoursSinceLastActivity = (now - lastActivityTimestamp) / HOURS_IN_MS;
  
  const warnings: string[] = [];
  let score = 100;
  
  let ageImpact = 0;
  let ageStatus: 'good' | 'warning' | 'critical' = 'good';
  if (walletAgeHours > 72) {
    warnings.push('WALLET OLDER THAN 72 HOURS');
    ageImpact = -40;
    ageStatus = 'critical';
    score -= 40;
  } else if (walletAgeHours > 48) {
    warnings.push('WALLET AGE APPROACHING LIMIT');
    ageImpact = -25;
    ageStatus = 'warning';
    score -= 25;
  } else if (walletAgeHours > 24) {
    warnings.push('WALLET OVER 24 HOURS OLD');
    ageImpact = -15;
    ageStatus = 'warning';
    score -= 15;
  }
  
  let txImpact = 0;
  let txStatus: 'good' | 'warning' | 'critical' = 'good';
  if (transactionCount >= 10) {
    warnings.push('TOO MANY TRANSACTIONS');
    txImpact = -35;
    txStatus = 'critical';
    score -= 35;
  } else if (transactionCount >= 5) {
    warnings.push('HIGH TRANSACTION COUNT');
    txImpact = -20;
    txStatus = 'warning';
    score -= 20;
  } else if (transactionCount >= 3) {
    warnings.push('MULTIPLE TRANSACTIONS DETECTED');
    txImpact = -10;
    txStatus = 'warning';
    score -= 10;
  }
  
  let activityImpact = 0;
  let activityStatus: 'good' | 'warning' | 'critical' = 'good';
  if (hoursSinceLastActivity > 12 && transactionCount > 0) {
    warnings.push('WALLET INACTIVE >12 HOURS');
    activityImpact = -15;
    activityStatus = 'warning';
    score -= 15;
  }
  
  score = Math.max(0, score);
  
  let level: 'safe' | 'warning' | 'critical';
  if (score >= 70) {
    level = 'safe';
  } else if (score >= 40) {
    level = 'warning';
  } else {
    level = 'critical';
  }
  
  return { 
    score, 
    level, 
    warnings,
    factors: {
      walletAge: {
        hours: walletAgeHours,
        impact: ageImpact,
        status: ageStatus,
      },
      transactionCount: {
        count: transactionCount,
        impact: txImpact,
        status: txStatus,
      },
      lastActivity: {
        hoursAgo: hoursSinceLastActivity,
        impact: activityImpact,
        status: activityStatus,
      },
    },
  };
}

export function getPrivacyScoreColor(level: 'safe' | 'warning' | 'critical'): string {
  switch (level) {
    case 'safe':
      return 'text-neon-green border-neon-green/50';
    case 'warning':
      return 'text-yellow-400 border-yellow-400/50';
    case 'critical':
      return 'text-destructive border-destructive/50';
  }
}
