import { z } from 'zod';

export const sendSOLSchema = z.object({
  recipient: z
    .string()
    .min(32, 'Please enter a valid Solana address')
    .max(44, 'Please enter a valid Solana address'),
  amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Amount must be greater than 0',
    }),
});

export const sendZECSchema = z.object({
  recipient: z
    .string()
    .refine(
      (val) => val.startsWith('zs1') || val.startsWith('t1') || val.startsWith('t3'),
      'Please enter a valid Zcash address (zs1... or t1...)'
    )
    .refine(
      (val) => (val.startsWith('zs1') && val.length === 78) || (val.startsWith('t') && val.length === 35),
      'Invalid Zcash address length'
    ),
  amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Amount must be greater than 0',
    }),
});

export type SendSOLFormData = z.infer<typeof sendSOLSchema>;
export type SendZECFormData = z.infer<typeof sendZECSchema>;
export type SendFormData = SendSOLFormData | SendZECFormData;

// Platform configuration - SOL→SOL mixer with 2% platform fee
export const PLATFORM_FEE_PERCENT = 2; // 2% platform fee
export const REFERRAL_REWARD_PERCENT = 0.5; // 0.5% goes to referrer
export const PLATFORM_WALLET_ADDRESS = 'FQycqpNecXG4sszC36h9KyfsYqoojyqw3X7oPKBeYkuF';

// Privacy Mixer Schema - SOL to SOL with platform fees
export const mixerSchema = z.object({
  destinationAddress: z
    .string()
    .min(32, 'Please enter a valid Solana address')
    .max(44, 'Please enter a valid Solana address'),
  amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Amount must be greater than 0',
    }),
  enableDelay: z.boolean().default(false),
  delayMinutes: z.number().min(1).max(60).default(5),
  referralCode: z.string().optional(),
});

export type MixerFormData = z.infer<typeof mixerSchema>;
