import { getApi } from './api';
import type { SignedBlock } from '@polkadot/types/interfaces';
import { formatBalance } from '@polkadot/util';

/**
 * Transaction interface representing a parsed extrinsic
 */
export interface Transaction {
  hash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string | null;
  value: string;
  fee: string;
  status: 'success' | 'failed';
  method: string;
  section: string;
  args?: any[];
}

/**
 * Get recent transactions for an address by scanning blocks
 *
 * @param address - The address to query transactions for
 * @param limit - Maximum number of transactions to return (default: 50)
 * @returns Array of transactions
 */
export async function getRecentTransactions(
  address: string,
  limit: number = 50
): Promise<Transaction[]> {
  const api = getApi();
  const transactions: Transaction[] = [];

  try {
    // Get current block number
    const currentHeader = await api.rpc.chain.getHeader();
    const currentBlockNumber = currentHeader.number.toNumber();

    // Scan backwards from current block
    // We'll scan up to 1000 blocks back or until we find enough transactions
    const maxBlocksToScan = 1000;
    const startBlock = Math.max(1, currentBlockNumber - maxBlocksToScan);

    console.log(`[Transactions] Scanning blocks ${currentBlockNumber} to ${startBlock} for address ${address}`);

    // Scan blocks in reverse order (newest first)
    for (let blockNum = currentBlockNumber; blockNum >= startBlock && transactions.length < limit; blockNum--) {
      try {
        const blockHash = await api.rpc.chain.getBlockHash(blockNum);
        const signedBlock = await api.rpc.chain.getBlock(blockHash);
        const apiAt = await api.at(blockHash);

        // Get block timestamp
        const timestamp = await apiAt.query.timestamp.now();
        const timestampMs = timestamp.toNumber();

        // Get block events to determine transaction success/failure
        const events = await apiAt.query.system.events();

        // Parse extrinsics in the block
        const extrinsics = signedBlock.block.extrinsics;

        for (let extrinsicIndex = 0; extrinsicIndex < extrinsics.length; extrinsicIndex++) {
          const extrinsic = extrinsics[extrinsicIndex];
          const { method, signer } = extrinsic;

          // Skip unsigned extrinsics
          if (!extrinsic.isSigned) {
            continue;
          }

          const fromAddress = signer.toString();

          // Check if this extrinsic involves our address
          const isRelevant = isExtrinsicRelevant(extrinsic, address);
          if (!isRelevant) {
            continue;
          }

          // Find events for this extrinsic
          const extrinsicEvents = events.filter(
            ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.toNumber() === extrinsicIndex
          );

          // Determine if transaction succeeded
          const status = extrinsicEvents.some(({ event }) =>
            api.events.system.ExtrinsicFailed.is(event)
          ) ? 'failed' : 'success';

          // Calculate fee
          let fee = '0';
          const feeEvent = extrinsicEvents.find(({ event }) =>
            api.events.transactionPayment?.TransactionFeePaid?.is(event) ||
            api.events.balances.Withdraw.is(event)
          );

          if (feeEvent) {
            if (api.events.transactionPayment?.TransactionFeePaid?.is(feeEvent.event)) {
              fee = feeEvent.event.data[1]?.toString() || '0';
            } else if (api.events.balances.Withdraw.is(feeEvent.event)) {
              fee = feeEvent.event.data[1]?.toString() || '0';
            }
          }

          // Parse transaction details
          const { section, method: methodName } = method;
          let toAddress: string | null = null;
          let value = '0';

          // Extract destination and value for balance transfers
          if (section === 'balances' && (methodName === 'transfer' || methodName === 'transferKeepAlive')) {
            const args = extrinsic.method.args;
            toAddress = args[0]?.toString() || null;
            value = args[1]?.toString() || '0';
          }

          transactions.push({
            hash: extrinsic.hash.toHex(),
            blockNumber: blockNum,
            timestamp: timestampMs,
            from: fromAddress,
            to: toAddress,
            value,
            fee,
            status,
            method: methodName,
            section,
            args: extrinsic.method.args.map(arg => arg.toJSON()),
          });

          // Stop if we've reached the limit
          if (transactions.length >= limit) {
            break;
          }
        }
      } catch (blockError) {
        console.warn(`[Transactions] Error processing block ${blockNum}:`, blockError);
        // Continue to next block
      }
    }

    console.log(`[Transactions] Found ${transactions.length} transactions for ${address}`);
    return transactions;
  } catch (error) {
    console.error('[Transactions] Error fetching transactions:', error);
    throw error;
  }
}

/**
 * Check if an extrinsic is relevant to a given address
 */
function isExtrinsicRelevant(extrinsic: any, address: string): boolean {
  // Check if sender matches
  if (extrinsic.signer?.toString() === address) {
    return true;
  }

  // Check if recipient matches (for transfers)
  const { method } = extrinsic;
  if (method.section === 'balances' && (method.method === 'transfer' || method.method === 'transferKeepAlive')) {
    const destArg = extrinsic.method.args[0];
    if (destArg?.toString() === address) {
      return true;
    }
  }

  return false;
}

/**
 * Subscribe to new transactions for an address
 *
 * @param address - The address to monitor
 * @param callback - Function to call when a new transaction is detected
 * @returns Unsubscribe function
 */
export async function subscribeTransactions(
  address: string,
  callback: (tx: Transaction) => void
): Promise<() => void> {
  const api = getApi();

  console.log(`[Transactions] Subscribing to transactions for ${address}`);

  // Subscribe to new heads and check each block for relevant transactions
  const unsubscribe = await api.rpc.chain.subscribeNewHeads(async (header) => {
    try {
      const blockNumber = header.number.toNumber();
      const blockHash = header.hash;

      const signedBlock = await api.rpc.chain.getBlock(blockHash);
      const apiAt = await api.at(blockHash);

      // Get block timestamp
      const timestamp = await apiAt.query.timestamp.now();
      const timestampMs = timestamp.toNumber();

      // Get events
      const events = await apiAt.query.system.events();

      // Parse extrinsics
      const extrinsics = signedBlock.block.extrinsics;

      for (let extrinsicIndex = 0; extrinsicIndex < extrinsics.length; extrinsicIndex++) {
        const extrinsic = extrinsics[extrinsicIndex];

        if (!extrinsic.isSigned) {
          continue;
        }

        const isRelevant = isExtrinsicRelevant(extrinsic, address);
        if (!isRelevant) {
          continue;
        }

        const { method, signer } = extrinsic;
        const fromAddress = signer.toString();

        // Find events for this extrinsic
        const extrinsicEvents = events.filter(
          ({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.toNumber() === extrinsicIndex
        );

        const status = extrinsicEvents.some(({ event }) =>
          api.events.system.ExtrinsicFailed.is(event)
        ) ? 'failed' : 'success';

        // Calculate fee
        let fee = '0';
        const feeEvent = extrinsicEvents.find(({ event }) =>
          api.events.transactionPayment?.TransactionFeePaid?.is(event) ||
          api.events.balances.Withdraw.is(event)
        );

        if (feeEvent) {
          if (api.events.transactionPayment?.TransactionFeePaid?.is(feeEvent.event)) {
            fee = feeEvent.event.data[1]?.toString() || '0';
          } else if (api.events.balances.Withdraw.is(feeEvent.event)) {
            fee = feeEvent.event.data[1]?.toString() || '0';
          }
        }

        const { section, method: methodName } = method;
        let toAddress: string | null = null;
        let value = '0';

        if (section === 'balances' && (methodName === 'transfer' || methodName === 'transferKeepAlive')) {
          const args = extrinsic.method.args;
          toAddress = args[0]?.toString() || null;
          value = args[1]?.toString() || '0';
        }

        callback({
          hash: extrinsic.hash.toHex(),
          blockNumber,
          timestamp: timestampMs,
          from: fromAddress,
          to: toAddress,
          value,
          fee,
          status,
          method: methodName,
          section,
          args: extrinsic.method.args.map(arg => arg.toJSON()),
        });
      }
    } catch (error) {
      console.error('[Transactions] Error processing new block:', error);
    }
  });

  return unsubscribe;
}

/**
 * Format transaction value for display
 */
export function formatTransactionValue(value: string): string {
  try {
    return formatBalance(value, { withSi: true, withUnit: 'ETR' });
  } catch {
    return '0 ETR';
  }
}

/**
 * Format timestamp to relative time
 */
export function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

/**
 * Truncate hash for display
 */
export function truncateHash(hash: string, startChars = 6, endChars = 4): string {
  if (!hash || hash.length <= startChars + endChars) {
    return hash;
  }
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}
