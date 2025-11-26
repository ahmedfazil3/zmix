import type { MixerSession, InsertMixerSession } from '@shared/schema';
import type { HopWallet, MultiHopConfig } from './multihop';

export interface MixerSessionCheckpoint {
  status: string;
  message: string;
  hopWallets?: HopWallet[];
  hopConfig?: MultiHopConfig;
  finalHash?: string; // Final transaction hash for resumability
}

export interface CreateMixerSessionData {
  userId: string;
  walletId: string;
  grossAmount: string;
  destinationAddress: string;
  preset: string;
  hopConfig: MultiHopConfig;
  referralCode?: string;
}

export async function getWalletActiveSession(walletId: string): Promise<MixerSession | null> {
  try {
    const response = await fetch(`/api/mixer/session/wallet/${walletId}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error('Failed to get active session');
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting wallet session:', error);
    return null;
  }
}

export async function createMixerSession(
  data: CreateMixerSessionData
): Promise<MixerSession | null> {
  try {
    const sessionData: Partial<InsertMixerSession> = {
      userId: data.userId,
      walletId: data.walletId,
      status: 'creating',
      grossAmount: data.grossAmount,
      destinationAddress: data.destinationAddress,
      preset: data.preset,
      hopConfig: data.hopConfig as any,
      referralCode: data.referralCode,
    };

    const response = await fetch('/api/mixer/session/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData),
    });

    if (!response.ok) {
      throw new Error('Failed to create session');
    }

    const session = await response.json();
    
    // Store session ID in sessionStorage for resume capability
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('zmix-active-session-id', session.id);
      } catch (e) {
        console.error('Failed to save session ID to sessionStorage:', e);
      }
    }

    return session;
  } catch (error) {
    console.error('Error creating mixer session:', error);
    return null;
  }
}

export async function saveSessionCheckpoint(
  sessionId: string,
  checkpoint: MixerSessionCheckpoint
): Promise<MixerSession | null> {
  try {
    const response = await fetch(`/api/mixer/session/${sessionId}/checkpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checkpoint),
    });
    if (!response.ok) {
      throw new Error('Failed to save checkpoint');
    }
    return await response.json();
  } catch (error) {
    console.error('Error saving checkpoint:', error);
    return null;
  }
}

export async function completeSession(
  sessionId: string
): Promise<void> {
  try {
    await fetch(`/api/mixer/session/${sessionId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    // Clear session from sessionStorage
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('zmix-active-session-id');
      } catch (e) {
        console.error('Failed to clear session ID from sessionStorage:', e);
      }
    }
  } catch (error) {
    console.error('Error completing session:', error);
  }
}

export async function failSession(sessionId: string, errorMessage: string): Promise<void> {
  try {
    await fetch(`/api/mixer/session/${sessionId}/fail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ errorMessage }),
    });
    
    // Clear session from sessionStorage
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('zmix-active-session-id');
      } catch (e) {
        console.error('Failed to clear session ID from sessionStorage:', e);
      }
    }
  } catch (error) {
    console.error('Error failing session:', error);
  }
}
