import { ApiPromise, WsProvider } from '@polkadot/api';
import { web3Accounts, web3Enable, web3FromAddress } from '@polkadot/extension-dapp';
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { formatBalance } from '@polkadot/util';

// ËTRID Primearc Core Chain RPC endpoints
const RPC_ENDPOINTS = [
  'wss://rpc.etrid.org',           // Primary: Public SSL endpoint
  'ws://157.173.200.80:9944',      // Fallback: Contabo proxy
];

let apiInstance: ApiPromise | null = null;
let currentProvider: WsProvider | null = null;

/**
 * Initialize connection to ËTRID FlareChain
 * Tries multiple RPC endpoints until one succeeds
 */
export async function initApi(): Promise<ApiPromise> {
  if (apiInstance?.isConnected) {
    return apiInstance;
  }

  let lastError: Error | null = null;

  // Try each endpoint until one connects
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      console.log(`[ËTRID] Attempting to connect to ${endpoint}...`);

      const provider = new WsProvider(endpoint, 2500); // 2.5s timeout
      const api = await ApiPromise.create({
        provider,
        throwOnConnect: true,
      });

      await api.isReady;

      // Verify connection is working
      const chain = await api.rpc.system.chain();
      const nodeName = await api.rpc.system.name();
      const nodeVersion = await api.rpc.system.version();

      console.log(`[ËTRID] Connected to ${chain} using ${nodeName} v${nodeVersion}`);

      // Configure balance formatting for ETR token
      const properties = await api.rpc.system.properties();
      const tokenSymbol = properties.tokenSymbol.unwrapOr(['ETR'])[0].toString();
      const tokenDecimals = properties.tokenDecimals.unwrapOr([12])[0].toNumber();

      formatBalance.setDefaults({
        decimals: tokenDecimals,
        unit: tokenSymbol,
      });

      currentProvider = provider;
      apiInstance = api;
      return api;
    } catch (error) {
      lastError = error as Error;
      console.warn(`[ËTRID] Failed to connect to ${endpoint}:`, error);
    }
  }

  throw new Error(
    `Failed to connect to any ËTRID FlareChain RPC endpoint. Last error: ${lastError?.message}`
  );
}

/**
 * Get the current API instance (must call initApi first)
 */
export function getApi(): ApiPromise {
  if (!apiInstance?.isConnected) {
    throw new Error('API not initialized. Call initApi() first.');
  }
  return apiInstance;
}

/**
 * Disconnect from the chain
 */
export async function disconnectApi(): Promise<void> {
  if (apiInstance) {
    await apiInstance.disconnect();
    apiInstance = null;
  }
  if (currentProvider) {
    await currentProvider.disconnect();
    currentProvider = null;
  }
  console.log('[ËTRID] Disconnected from chain');
}

/**
 * Enable Polkadot.js extension and get accounts
 */
export async function enableExtension(): Promise<InjectedAccountWithMeta[]> {
  const extensions = await web3Enable('ËTRID Wallet');

  if (extensions.length === 0) {
    throw new Error('No Polkadot.js extension found. Please install it first.');
  }

  const accounts = await web3Accounts();

  if (accounts.length === 0) {
    throw new Error('No accounts found in extension. Please create or import an account.');
  }

  return accounts;
}

/**
 * Get ETR balance for an address
 */
export async function getBalance(address: string): Promise<{
  free: string;
  reserved: string;
  frozen: string;
  total: string;
  formatted: string;
}> {
  const api = getApi();

  const { data: balance } = await api.query.system.account(address);

  const free = balance.free.toString();
  const reserved = balance.reserved.toString();
  const frozen = balance.frozen?.toString() || '0';
  const total = (BigInt(free) + BigInt(reserved)).toString();

  return {
    free,
    reserved,
    frozen,
    total,
    formatted: formatBalance(total, { withSi: true, withUnit: 'ETR' }),
  };
}

/**
 * Subscribe to balance updates for an address
 */
export async function subscribeBalance(
  address: string,
  callback: (balance: {
    free: string;
    reserved: string;
    frozen: string;
    total: string;
    formatted: string;
  }) => void
): Promise<() => void> {
  const api = getApi();

  const unsubscribe = await api.query.system.account(address, ({ data: balance }) => {
    const free = balance.free.toString();
    const reserved = balance.reserved.toString();
    const frozen = balance.frozen?.toString() || '0';
    const total = (BigInt(free) + BigInt(reserved)).toString();

    callback({
      free,
      reserved,
      frozen,
      total,
      formatted: formatBalance(total, { withSi: true, withUnit: 'ETR' }),
    });
  });

  return unsubscribe;
}

/**
 * Transfer ETR tokens from one address to another
 */
export async function transfer(
  fromAddress: string,
  toAddress: string,
  amount: string | bigint
): Promise<{
  txHash: string;
  blockHash?: string;
}> {
  const api = getApi();

  // Get the injector for signing
  const injector = await web3FromAddress(fromAddress);

  return new Promise(async (resolve, reject) => {
    try {
      const unsub = await api.tx.balances
        .transferKeepAlive(toAddress, amount)
        .signAndSend(
          fromAddress,
          { signer: injector.signer },
          ({ status, txHash, dispatchError }) => {
            console.log(`[ËTRID] Transfer status: ${status.type}`);

            if (status.isInBlock) {
              console.log(`[ËTRID] Transaction included in block: ${status.asInBlock.toHex()}`);
            }

            if (status.isFinalized) {
              console.log(`[ËTRID] Transaction finalized in block: ${status.asFinalized.toHex()}`);

              if (dispatchError) {
                let errorMsg = 'Transaction failed';

                if (dispatchError.isModule) {
                  const decoded = api.registry.findMetaError(dispatchError.asModule);
                  errorMsg = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
                }

                unsub();
                reject(new Error(errorMsg));
              } else {
                unsub();
                resolve({
                  txHash: txHash.toHex(),
                  blockHash: status.asFinalized.toHex(),
                });
              }
            }

            if (status.isError) {
              unsub();
              reject(new Error('Transaction failed'));
            }
          }
        );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get chain information
 */
export async function getChainInfo(): Promise<{
  chain: string;
  nodeName: string;
  nodeVersion: string;
  tokenSymbol: string;
  tokenDecimals: number;
}> {
  const api = getApi();

  const [chain, nodeName, nodeVersion, properties] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version(),
    api.rpc.system.properties(),
  ]);

  return {
    chain: chain.toString(),
    nodeName: nodeName.toString(),
    nodeVersion: nodeVersion.toString(),
    tokenSymbol: properties.tokenSymbol.unwrapOr(['ETR'])[0].toString(),
    tokenDecimals: properties.tokenDecimals.unwrapOr([12])[0].toNumber(),
  };
}

/**
 * Get current block number
 */
export async function getCurrentBlock(): Promise<number> {
  const api = getApi();
  const header = await api.rpc.chain.getHeader();
  return header.number.toNumber();
}

/**
 * Subscribe to new blocks
 */
export async function subscribeNewBlocks(
  callback: (blockNumber: number, blockHash: string) => void
): Promise<() => void> {
  const api = getApi();

  const unsubscribe = await api.rpc.chain.subscribeNewHeads((header) => {
    callback(header.number.toNumber(), header.hash.toHex());
  });

  return unsubscribe;
}

/**
 * Check if address is valid for this chain
 */
export function isValidAddress(address: string): boolean {
  try {
    const api = getApi();
    api.registry.createType('AccountId', address);
    return true;
  } catch {
    return false;
  }
}
