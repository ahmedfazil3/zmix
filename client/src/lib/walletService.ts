import { apiRequest } from '@/lib/queryClient';
import type { BurnerWallet, SolanaWallet } from '@shared/types';

export interface ServerWallet {
  id: string;
  publicKey: string;
  label: string | null;
  createdAt: Date;
  txCount: number;
  autoBurn?: number;
}

/**
 * Create a new wallet on the server (with encrypted private key)
 */
export async function createWallet(data: {
  publicKey: string;
  privateKey: string;
  label?: string;
}): Promise<ServerWallet> {
  const response = await fetch('/api/wallets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create wallet');
  }
  return response.json();
}

/**
 * Get all wallets for current user from server
 */
export async function getWallets(): Promise<ServerWallet[]> {
  const response = await fetch('/api/wallets');
  if (!response.ok) {
    throw new Error('Failed to fetch wallets');
  }
  return response.json();
}

/**
 * Get decrypted private key from server (for signing transactions)
 */
export async function getPrivateKey(publicKey: string): Promise<string> {
  const response = await fetch(`/api/wallets/${publicKey}/private-key`);
  if (!response.ok) {
    throw new Error('Failed to get private key');
  }
  const data = await response.json();
  return data.privateKey;
}

/**
 * Update wallet (increment txCount, burn, etc.)
 */
export async function updateWallet(id: string, updates: Partial<{
  txCount: number;
  isBurned: number;
  label: string;
  autoBurn: number;
}>): Promise<ServerWallet> {
  const response = await fetch(`/api/wallets/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error('Failed to update wallet');
  }
  return response.json();
}

/**
 * Delete wallet from server
 */
export async function deleteWallet(id: string): Promise<void> {
  const response = await fetch(`/api/wallets/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete wallet');
  }
}

/**
 * Migrate legacy localStorage wallets to server (one-time migration)
 */
export async function migrateLegacyWallets(): Promise<number> {
  const STORAGE_KEY = 'zmix_wallets';
  const stored = localStorage.getItem(STORAGE_KEY);
  
  if (!stored) {
    return 0;
  }
  
  try {
    const localWallets: BurnerWallet[] = JSON.parse(stored);
    const solanaWallets = localWallets.filter(w => w.chain === 'solana') as SolanaWallet[];
    
    let migrated = 0;
    for (const wallet of solanaWallets) {
      try {
        // Only migrate if wallet has a secretKey
        if (wallet.secretKey) {
          await createWallet({
            publicKey: wallet.publicKey,
            privateKey: wallet.secretKey,
            label: wallet.label,
          });
          migrated++;
        }
      } catch (error) {
        console.error('Failed to migrate wallet:', wallet.publicKey, error);
      }
    }
    
    // Clear localStorage after successful migration
    if (migrated > 0) {
      localStorage.removeItem(STORAGE_KEY);
      console.log(`Migrated ${migrated} wallets from localStorage to server`);
    }
    
    return migrated;
  } catch (error) {
    console.error('Migration failed:', error);
    return 0;
  }
}
