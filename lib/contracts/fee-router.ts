// Fee Router Smart Contract for Solana
// This is a minimal program that splits claimed tokens between user and platform
// Fee: 2% to platform, 98% to user
// No custody: funds are split atomically and never held

import {
  AccountInfo,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";

// Fee Router Program ID (would be deployed on-chain)
export const FEE_ROUTER_PROGRAM_ID = new PublicKey(
  "FeeRouterProgram11111111111111111111111111111"
);

// Platform fee percentage (2%)
export const PLATFORM_FEE_BPS = 200; // Basis points (2% = 200 bps)

// Platform wallet (receives fees)
export const PLATFORM_WALLET = new PublicKey(
  "PlatformWallet111111111111111111111111111111111"
);

/**
 * Create instruction to split claimed tokens
 * This instruction atomically:
 * 1. Receives tokens from airdrop contract
 * 2. Sends (100 - fee)% to user
 * 3. Sends fee% to platform
 * 
 * No custody: funds never sit in the router
 */
export function createSplitInstruction(
  // Source: airdrop contract or claim account
  source: PublicKey,
  // User receiving address
  user: PublicKey,
  // Token mint being claimed
  tokenMint: PublicKey,
  // Token account for user
  userTokenAccount: PublicKey,
  // Token account for platform fees
  platformTokenAccount: PublicKey,
  // Amount to split (in token smallest units)
  amount: bigint,
  // Fee in basis points
  feeBps: number = PLATFORM_FEE_BPS
): TransactionInstruction {
  // Calculate split amounts
  const platformFee = (amount * BigInt(feeBps)) / BigInt(10000);
  const userAmount = amount - platformFee;

  const keys = [
    { pubkey: source, isSigner: false, isWritable: true },
    { pubkey: user, isSigner: false, isWritable: true },
    { pubkey: PLATFORM_WALLET, isSigner: false, isWritable: true },
    { pubkey: tokenMint, isSigner: false, isWritable: false },
    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
    { pubkey: platformTokenAccount, isSigner: false, isWritable: true },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  // Instruction data: [discriminator][user_amount][platform_fee]
  const data = Buffer.alloc(17);
  data.writeUInt8(0, 0); // Discriminator for "split" instruction
  data.writeBigUInt64LE(userAmount, 1);
  data.writeBigUInt64LE(platformFee, 9);

  return new TransactionInstruction({
    keys,
    programId: FEE_ROUTER_PROGRAM_ID,
    data,
  });
}

/**
 * Create instruction for SOL claims (native token)
 */
export function createSolSplitInstruction(
  source: PublicKey,
  user: PublicKey,
  amount: bigint,
  feeBps: number = PLATFORM_FEE_BFS
): TransactionInstruction {
  const platformFee = (amount * BigInt(feeBps)) / BigInt(10000);
  const userAmount = amount - platformFee;

  const keys = [
    { pubkey: source, isSigner: false, isWritable: true },
    { pubkey: user, isSigner: false, isWritable: true },
    { pubkey: PLATFORM_WALLET, isSigner: false, isWritable: true },
  ];

  const data = Buffer.alloc(17);
  data.writeUInt8(1, 0); // Discriminator for "sol_split" instruction
  data.writeBigUInt64LE(userAmount, 1);
  data.writeBigUInt64LE(platformFee, 9);

  return new TransactionInstruction({
    keys,
    programId: FEE_ROUTER_PROGRAM_ID,
    data,
  });
}

/**
 * Initialize fee router state (one-time setup)
 */
export function createInitializeInstruction(
  routerState: PublicKey,
  admin: PublicKey
): TransactionInstruction {
  const keys = [
    { pubkey: routerState, isSigner: false, isWritable: true },
    { pubkey: admin, isSigner: true, isWritable: true },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const data = Buffer.alloc(1);
  data.writeUInt8(255, 0); // Discriminator for "initialize" instruction

  return new TransactionInstruction({
    keys,
    programId: FEE_ROUTER_PROGRAM_ID,
    data,
  });
}

/**
 * Get the platform fee amount for a given claim
 */
export function calculatePlatformFee(amount: bigint, feeBps: number = PLATFORM_FEE_BPS): bigint {
  return (amount * BigInt(feeBps)) / BigInt(10000);
}

/**
 * Get the user amount after fee deduction
 */
export function calculateUserAmount(amount: bigint, feeBps: number = PLATFORM_FEE_BPS): bigint {
  return amount - calculatePlatformFee(amount, feeBps);
}

/**
 * Format fee information for display
 */
export function formatFeeInfo(amountUsd: number): {
  platformFee: number;
  userAmount: number;
  feePercentage: number;
} {
  const platformFee = amountUsd * (PLATFORM_FEE_BPS / 10000);
  const userAmount = amountUsd - platformFee;
  
  return {
    platformFee: Number(platformFee.toFixed(2)),
    userAmount: Number(userAmount.toFixed(2)),
    feePercentage: PLATFORM_FEE_BPS / 100,
  };
}
