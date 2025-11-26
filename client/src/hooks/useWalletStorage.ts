import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { BurnerWallet, WalletTransaction, SolanaWallet } from '@shared/types';
import { getWallets, createWallet, deleteWallet, migrateLegacyWallets, getPrivateKey, type ServerWallet } from '@/lib/walletService';
import { getBalance } from '@/lib/solana';

const BURNED_COUNT_KEY = 'zmix_burned_count';
const MIGRATION_FLAG_KEY = 'zmix_migration_done';

export function useWalletStorage() {
  const [burnedCount, setBurnedCount] = useState<number>(0);
  const [localBalances, setLocalBalances] = useState<Record<string, number>>({});
  const [localTransactions, setLocalTransactions] = useState<Record<string, WalletTransaction[]>>({});
  const queryClient = useQueryClient();
  
  // Migrate localStorage wallets to server on first load
  useEffect(() => {
    const migrationDone = localStorage.getItem(MIGRATION_FLAG_KEY);
    if (!migrationDone) {
      migrateLegacyWallets().then((count) => {
        if (count > 0) {
          localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
          queryClient.invalidateQueries({ queryKey: ['/api/wallets'] });
        }
      });
    }

    const burnedStored = localStorage.getItem(BURNED_COUNT_KEY);
    if (burnedStored) {
      setBurnedCount(parseInt(burnedStored, 10) || 0);
    }
  }, [queryClient]);

  // Fetch wallets from server using React Query
  const { data: serverWallets = [], isLoading } = useQuery<ServerWallet[]>({
    queryKey: ['/api/wallets'],
    queryFn: getWallets,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Convert server wallets to BurnerWallet format with cached balances
  const wallets: SolanaWallet[] = useMemo(() => {
    return serverWallets.map(w => ({
      id: w.id,
      chain: 'solana' as const,
      publicKey: w.publicKey,
      secretKey: undefined, // Fetch from server when needed for signing
      label: w.label || undefined,
      createdAt: new Date(w.createdAt).getTime(),
      balance: 0, // Will be updated by balance queries
      transactions: [], // Stored client-side only
      txCount: w.txCount,
      autoBurn: w.autoBurn,
    }));
  }, [serverWallets]);

  // Mutation for creating wallets
  const createWalletMutation = useMutation({
    mutationFn: createWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wallets'] });
    },
  });

  // Mutation for deleting wallets
  const deleteWalletMutation = useMutation({
    mutationFn: deleteWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wallets'] });
      const newCount = burnedCount + 1;
      setBurnedCount(newCount);
      localStorage.setItem(BURNED_COUNT_KEY, newCount.toString());
    },
  });

  const addWallet = (wallet: BurnerWallet) => {
    if (wallet.chain === 'solana') {
      const secretKey = wallet.secretKey;
      if (!secretKey) {
        console.error('Cannot add wallet without secretKey');
        return;
      }
      createWalletMutation.mutate({
        publicKey: wallet.publicKey,
        privateKey: secretKey,
        label: wallet.label,
      });
    }
  };

  const updateWallet = (id: string, updates: Partial<BurnerWallet>) => {
    // Balance updates are local only (fetched from blockchain)
    if (updates.balance !== undefined) {
      setLocalBalances(prev => ({
        ...prev,
        [id]: updates.balance!,
      }));
    }
  };

  const removeWallet = (id: string) => {
    deleteWalletMutation.mutate(id);
  };

  const addTransaction = (walletId: string, transaction: WalletTransaction) => {
    setLocalTransactions(prev => ({
      ...prev,
      [walletId]: [...(prev[walletId] || []), transaction],
    }));
  };

  const clearTransactionHistory = (walletId: string) => {
    setLocalTransactions(prev => {
      const updated = { ...prev };
      delete updated[walletId];
      return updated;
    });
  };

  // Merge local balances and transactions into wallets
  const walletsWithTransactions = useMemo(() => {
    return wallets.map(w => ({
      ...w,
      balance: localBalances[w.id] ?? w.balance,
      transactions: localTransactions[w.id] || [],
    }));
  }, [wallets, localTransactions, localBalances]);

  return {
    wallets: walletsWithTransactions,
    burnedCount,
    addWallet,
    updateWallet,
    removeWallet,
    addTransaction,
    clearTransactionHistory,
    isLoading,
  };
}
