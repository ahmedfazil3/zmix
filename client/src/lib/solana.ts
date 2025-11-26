import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';

// Use QuickNode RPC if available, fallback to public Mainnet
const SOLANA_RPC = import.meta.env.VITE_QUICKNODE_RPC_URL || 'https://api.mainnet-beta.solana.com';

export const connection = new Connection(SOLANA_RPC, 'confirmed');

export function generateKeypair(): { publicKey: string; secretKey: string } {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: bs58.encode(keypair.secretKey),
  };
}

export async function getBalance(publicKey: string): Promise<number> {
  try {
    const pubKey = new PublicKey(publicKey);
    const balance = await connection.getBalance(pubKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error fetching balance:', error);
    return 0;
  }
}

export async function sendSOL(
  fromSecretKey: string,
  toPublicKey: string,
  amount: number
): Promise<string> {
  try {
    const secretKeyBytes = bs58.decode(fromSecretKey);
    const fromKeypair = Keypair.fromSecretKey(secretKeyBytes);
    const toPubKey = new PublicKey(toPublicKey);

    // Check balance before attempting transaction
    const balance = await connection.getBalance(fromKeypair.publicKey);
    const requiredLamports = amount * LAMPORTS_PER_SOL;
    const estimatedFee = 5000; // ~0.000005 SOL transaction fee
    
    if (balance < requiredLamports + estimatedFee) {
      const balanceSOL = (balance / LAMPORTS_PER_SOL).toFixed(4);
      const requiredSOL = ((requiredLamports + estimatedFee) / LAMPORTS_PER_SOL).toFixed(4);
      throw new Error(`Insufficient balance: ${balanceSOL} SOL available, ${requiredSOL} SOL required (includes tx fee)`);
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPubKey,
        lamports: requiredLamports,
      })
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [fromKeypair],
      { commitment: 'confirmed' }
    );

    return signature;
  } catch (error: any) {
    console.error('sendSOL error:', error);
    
    // Extract meaningful error messages
    let errorMsg = 'Transaction failed';
    
    if (error.message) {
      errorMsg = error.message;
    } else if (error.toString) {
      errorMsg = error.toString();
    }
    
    // Handle common Solana errors
    if (errorMsg.includes('insufficient')) {
      errorMsg = 'Insufficient SOL balance to complete transaction';
    } else if (errorMsg.includes('blockhash')) {
      errorMsg = 'Transaction expired. Please try again.';
    } else if (errorMsg.includes('Invalid')) {
      errorMsg = 'Invalid recipient address';
    }
    
    throw new Error(errorMsg);
  }
}

export async function getTransactionHistory(publicKey: string, limit: number = 10): Promise<Array<{
  signature: string;
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  direction: 'incoming' | 'outgoing';
}>> {
  try {
    const pubKey = new PublicKey(publicKey);
    const signatures = await connection.getSignaturesForAddress(pubKey, { limit });
    
    const transactions = [];
    
    for (const sig of signatures) {
      try {
        const tx = await connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });
        
        if (!tx || !tx.meta || !tx.transaction) continue;
        
        // Parse instructions to find SOL transfers
        const instructions = tx.transaction.message.instructions;
        
        for (const instruction of instructions) {
          if ('parsed' in instruction && instruction.program === 'system') {
            const parsed = instruction.parsed;
            
            if (parsed.type === 'transfer') {
              const info = parsed.info;
              const from = info.source;
              const to = info.destination;
              const lamports = info.lamports;
              
              // Determine direction based on our wallet address
              const direction: 'incoming' | 'outgoing' = to === publicKey ? 'incoming' : 'outgoing';
              
              transactions.push({
                signature: sig.signature,
                from,
                to,
                amount: lamports / LAMPORTS_PER_SOL,
                timestamp: (sig.blockTime || 0) * 1000,
                direction,
              });
            }
          }
        }
      } catch (txError) {
        console.error('Error parsing transaction:', txError);
        continue;
      }
    }
    
    return transactions;
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
}

export function exportWalletFile(publicKey: string, secretKey: string): void {
  const walletData = {
    publicKey,
    secretKey,
    exported: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(walletData, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `silentswap-${publicKey.slice(0, 8)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
