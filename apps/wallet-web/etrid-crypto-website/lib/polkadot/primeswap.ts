'use client';

import { getApi, initApi } from './api';
import { signAndSendTx, type TxResult } from '@/lib/wallet/transactions';

// PrimeSwap contract addresses (to be updated after deployment)
export const PRIMESWAP_CONFIG = {
  factory: '', // Will be set after deployment
  lpPool: '5Gdae5WysRZbw4GUogcSSvDC5pTCy1Vh2zJe1qRY58t7rssj',
  isDeployed: false, // Toggle when contracts are live
};

// Supported tokens for swapping to ETR
export interface SwapToken {
  symbol: string;
  name: string;
  icon: string;
  decimals: number;
  priceUSD: number; // Oracle price in USD (8 decimals)
  allocation: string; // ETR allocated to this pool
  color: string;
}

export const SWAP_TOKENS: SwapToken[] = [
  {
    symbol: 'wBTC',
    name: 'Wrapped Bitcoin',
    icon: '₿',
    decimals: 8,
    priceUSD: 100000, // $100,000
    allocation: '845,834,583',
    color: 'from-orange-500 to-amber-500',
  },
  {
    symbol: 'wETH',
    name: 'Wrapped Ethereum',
    icon: 'Ξ',
    decimals: 18,
    priceUSD: 4000, // $4,000
    allocation: '191,394,139',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    symbol: 'wBNB',
    name: 'Wrapped BNB',
    icon: '🔶',
    decimals: 18,
    priceUSD: 700, // $700
    allocation: '40,004,000',
    color: 'from-yellow-500 to-amber-400',
  },
  {
    symbol: 'wSOL',
    name: 'Wrapped Solana',
    icon: '◎',
    decimals: 9,
    priceUSD: 250, // $250
    allocation: '44,504,450',
    color: 'from-purple-500 to-fuchsia-500',
  },
  {
    symbol: 'wXRP',
    name: 'Wrapped XRP',
    icon: '✕',
    decimals: 6,
    priceUSD: 2.5, // $2.50
    allocation: '62,381,238',
    color: 'from-gray-400 to-slate-500',
  },
  {
    symbol: 'wADA',
    name: 'Wrapped Cardano',
    icon: '₳',
    decimals: 6,
    priceUSD: 1, // $1.00
    allocation: '15,626,562',
    color: 'from-blue-600 to-cyan-500',
  },
  {
    symbol: 'wDOGE',
    name: 'Wrapped Dogecoin',
    icon: '🐕',
    decimals: 8,
    priceUSD: 0.4, // $0.40
    allocation: '26,752,675',
    color: 'from-amber-400 to-yellow-300',
  },
  {
    symbol: 'wLINK',
    name: 'Wrapped Chainlink',
    icon: '⬡',
    decimals: 18,
    priceUSD: 25, // $25
    allocation: '8,875,887',
    color: 'from-blue-400 to-blue-600',
  },
  {
    symbol: 'wTRX',
    name: 'Wrapped Tron',
    icon: '⟁',
    decimals: 6,
    priceUSD: 0.3, // $0.30
    allocation: '6,625,662',
    color: 'from-red-500 to-rose-500',
  },
  {
    symbol: 'wXLM',
    name: 'Wrapped Stellar',
    icon: '✦',
    decimals: 7,
    priceUSD: 0.5, // $0.50
    allocation: '4,500,450',
    color: 'from-slate-400 to-gray-500',
  },
  {
    symbol: 'wMATIC',
    name: 'Wrapped Polygon',
    icon: '⬡',
    decimals: 18,
    priceUSD: 1, // $1.00
    allocation: '3,500,350',
    color: 'from-purple-600 to-violet-500',
  },
];

// ETR price in USD
export const ETR_PRICE_USD = 0.004;

/**
 * Calculate how much ETR you get for a given input token amount
 */
export function calculateSwapOutput(
  inputAmount: number,
  inputToken: SwapToken
): { etrAmount: number; usdValue: number; priceImpact: number } {
  if (!inputAmount || inputAmount <= 0) {
    return { etrAmount: 0, usdValue: 0, priceImpact: 0 };
  }

  // Calculate USD value of input
  const usdValue = inputAmount * inputToken.priceUSD;

  // Calculate ETR output (simple: USD value / ETR price)
  // In production, this would use the AMM curve
  const etrAmount = usdValue / ETR_PRICE_USD;

  // Estimate price impact (simplified - would use pool reserves in production)
  const poolAllocation = parseFloat(inputToken.allocation.replace(/,/g, ''));
  const priceImpact = (etrAmount / poolAllocation) * 100;

  return {
    etrAmount,
    usdValue,
    priceImpact: Math.min(priceImpact, 100),
  };
}

/**
 * Calculate how much input token needed for desired ETR output
 */
export function calculateSwapInput(
  etrAmount: number,
  inputToken: SwapToken
): { inputAmount: number; usdValue: number } {
  if (!etrAmount || etrAmount <= 0) {
    return { inputAmount: 0, usdValue: 0 };
  }

  // Calculate USD value of ETR
  const usdValue = etrAmount * ETR_PRICE_USD;

  // Calculate input token amount needed
  const inputAmount = usdValue / inputToken.priceUSD;

  return { inputAmount, usdValue };
}

/**
 * Get swap quote from PrimeSwap (when deployed)
 */
export async function getSwapQuote(
  inputToken: SwapToken,
  inputAmount: string
): Promise<{
  outputAmount: string;
  priceImpact: number;
  fee: string;
  route: string[];
}> {
  // For now, return calculated values
  // When contracts are deployed, this will call the Router
  const amount = parseFloat(inputAmount) || 0;
  const { etrAmount, priceImpact } = calculateSwapOutput(amount, inputToken);

  return {
    outputAmount: etrAmount.toFixed(0),
    priceImpact,
    fee: (etrAmount * 0.003).toFixed(2), // 0.3% fee
    route: [inputToken.symbol, 'ETR'],
  };
}

/**
 * Execute swap on PrimeSwap
 * This will call the VirtualReserveAMM contract when deployed
 */
export async function executeSwap(
  fromAddress: string,
  inputToken: SwapToken,
  inputAmount: string,
  minOutputAmount: string,
  slippage: number = 0.5
): Promise<TxResult> {
  if (!PRIMESWAP_CONFIG.isDeployed) {
    throw new Error('PrimeSwap contracts not yet deployed. Please use PancakeSwap for now.');
  }

  await initApi();
  const api = getApi();

  // Calculate minimum output with slippage
  const minOutput = BigInt(
    Math.floor(parseFloat(minOutputAmount) * (1 - slippage / 100) * 10 ** 12)
  );

  // Build the swap extrinsic
  // This will call etwasmVm.callContract with the Router's swap function
  // For now, throw error as contracts aren't deployed
  throw new Error('Swap execution not yet implemented. Contracts pending deployment.');
}

/**
 * Check if PrimeSwap is available
 */
export function isPrimeSwapAvailable(): boolean {
  return PRIMESWAP_CONFIG.isDeployed;
}

/**
 * Get pool liquidity info
 */
export async function getPoolInfo(token: SwapToken): Promise<{
  etrReserve: string;
  tokenReserve: string;
  tvl: string;
}> {
  // Return static allocation data for now
  return {
    etrReserve: token.allocation.replace(/,/g, ''),
    tokenReserve: '0', // Virtual reserve
    tvl: `$${(parseFloat(token.allocation.replace(/,/g, '')) * ETR_PRICE_USD).toLocaleString()}`,
  };
}
