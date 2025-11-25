import type { BurnerWallet, SolanaWallet } from '@shared/types';

const STORAGE_VERSION_KEY = 'silentswap_storage_version';
const CURRENT_VERSION = 1;

/**
 * Storage migration system for SilentSwap
 * Handles upgrading from legacy formats to current schema
 */

interface LegacyWallet {
  id: string;
  publicKey: string;
  secretKey: string;
  createdAt: number;
  balance?: number;
  isLoading?: boolean;
  transactions?: any[];
}

export function getStorageVersion(): number {
  const version = localStorage.getItem(STORAGE_VERSION_KEY);
  return version ? parseInt(version, 10) : 0;
}

export function setStorageVersion(version: number): void {
  localStorage.setItem(STORAGE_VERSION_KEY, version.toString());
}

/**
 * Migrate legacy Solana-only wallets to discriminated union format
 */
export function migrateLegacyWallets(wallets: any[]): BurnerWallet[] {
  const currentVersion = getStorageVersion();
  
  // Version 0: Legacy Solana-only format
  if (currentVersion === 0) {
    console.log('[Migration] Upgrading from legacy format to v1...');
    
    const migratedWallets: BurnerWallet[] = wallets.map((wallet: LegacyWallet) => {
      // Add chain discriminant
      const solanaWallet: SolanaWallet = {
        ...wallet,
        chain: 'solana',
      };
      return solanaWallet;
    });
    
    setStorageVersion(1);
    console.log(`[Migration] Migrated ${migratedWallets.length} wallets to v1`);
    return migratedWallets;
  }
  
  // Already on current version
  return wallets as BurnerWallet[];
}

/**
 * Check if wallets need migration
 */
export function needsMigration(wallets: any[]): boolean {
  if (wallets.length === 0) return false;
  
  // Check if any wallet is missing the chain field
  return wallets.some(w => !('chain' in w));
}

/**
 * Validate wallet structure
 */
export function isValidWallet(wallet: any): wallet is BurnerWallet {
  if (!wallet || typeof wallet !== 'object') return false;
  
  // Must have chain field
  if (!wallet.chain || (wallet.chain !== 'solana' && wallet.chain !== 'zcash')) {
    return false;
  }
  
  // Must have required base fields
  if (!wallet.id || !wallet.createdAt) {
    return false;
  }
  
  // Chain-specific validation
  if (wallet.chain === 'solana') {
    return !!(wallet.publicKey && wallet.secretKey);
  } else if (wallet.chain === 'zcash') {
    return !!(wallet.address && wallet.viewingKey && wallet.spendingKey);
  }
  
  return false;
}

/**
 * Clean invalid wallets from storage
 */
export function cleanInvalidWallets(wallets: any[]): BurnerWallet[] {
  return wallets.filter(isValidWallet);
}

/**
 * Full migration pipeline
 */
export function migrateWalletStorage(rawWallets: any[]): BurnerWallet[] {
  let wallets = rawWallets;
  
  // Step 1: Migrate from legacy format if needed
  if (needsMigration(wallets)) {
    wallets = migrateLegacyWallets(wallets);
  }
  
  // Step 2: Clean invalid entries
  const validWallets = cleanInvalidWallets(wallets);
  
  // Step 3: Log if any were removed
  if (validWallets.length < wallets.length) {
    console.warn(
      `[Migration] Removed ${wallets.length - validWallets.length} invalid wallet(s)`
    );
  }
  
  return validWallets;
}
