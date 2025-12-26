'use client';

import { useState, useCallback, useEffect } from 'react';
import { web3Accounts, web3Enable, web3FromAddress } from '@polkadot/extension-dapp';
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { primearcCoreChainApi } from '../api/primearc-core-chain';

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  balance: string;
  network: string;
}

export interface WalletAccount {
  address: string;
  balance?: string;
  name?: string;
  source?: string;
}

export interface UseWalletReturn extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (tx: any) => Promise<{ success: boolean; hash?: string; error?: string }>;
  selectedAccount: WalletAccount | null;
  accounts: WalletAccount[];
  selectAccount: (address: string) => Promise<void>;
  isExtensionAvailable: boolean;
}

export function useWallet(): UseWalletReturn {
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    isConnected: false,
    balance: '0',
    network: 'primearc-core-chain',
  });

  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [isExtensionAvailable, setIsExtensionAvailable] = useState(false);

  // Check for Polkadot.js extension on mount
  useEffect(() => {
    const checkExtension = async () => {
      try {
        const extensions = await web3Enable('ËTRID Wallet');
        setIsExtensionAvailable(extensions.length > 0);

        if (extensions.length === 0) {
          console.warn('⚠️ No Polkadot.js extension found. Please install it to connect.');
        }
      } catch (error) {
        console.error('Failed to check for Polkadot.js extension:', error);
        setIsExtensionAvailable(false);
      }
    };

    checkExtension();
  }, []);

  // Fetch balance for an address
  const fetchBalance = useCallback(async (address: string): Promise<string> => {
    try {
      const api = await primearcCoreChainApi.connectToPrimearcCoreChain();
      const accountInfo = await api.query.system.account(address);
      const accountData = accountInfo.toJSON() as any;

      // ETR has 12 decimals
      const free = accountData?.data?.free || '0';
      const balanceNum = parseInt(free) / Math.pow(10, 12);
      return balanceNum.toFixed(4);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      return '0';
    }
  }, []);

  // Connect to Polkadot.js extension
  const connect = useCallback(async () => {
    try {
      console.log('🔄 Connecting to Polkadot.js extension...');

      // Enable extension
      const extensions = await web3Enable('ËTRID Wallet');

      if (extensions.length === 0) {
        throw new Error('No Polkadot.js extension found. Please install it from https://polkadot.js.org/extension/');
      }

      // Get all accounts
      const allAccounts: InjectedAccountWithMeta[] = await web3Accounts();

      if (allAccounts.length === 0) {
        throw new Error('No accounts found in Polkadot.js extension. Please create an account first.');
      }

      console.log(`✅ Found ${allAccounts.length} account(s)`);

      // Convert to WalletAccount format
      const walletAccounts: WalletAccount[] = allAccounts.map(acc => ({
        address: acc.address,
        name: acc.meta.name,
        source: acc.meta.source,
      }));

      setAccounts(walletAccounts);
      setIsExtensionAvailable(true);

      // Select first account by default
      const firstAccount = walletAccounts[0];
      const balance = await fetchBalance(firstAccount.address);

      setWalletState({
        address: firstAccount.address,
        isConnected: true,
        balance,
        network: 'primearc-core-chain',
      });

      console.log(`✅ Connected to account: ${firstAccount.address.slice(0, 8)}...${firstAccount.address.slice(-6)}`);
      console.log(`💰 Balance: ${balance} ÉTR`);

    } catch (error: any) {
      console.error('❌ Failed to connect to wallet:', error);
      alert(error.message || 'Failed to connect to Polkadot.js extension');
      throw error;
    }
  }, [fetchBalance]);

  // Select a specific account
  const selectAccount = useCallback(async (address: string) => {
    try {
      const balance = await fetchBalance(address);

      setWalletState({
        address,
        isConnected: true,
        balance,
        network: 'primearc-core-chain',
      });

      console.log(`✅ Switched to account: ${address.slice(0, 8)}...${address.slice(-6)}`);
    } catch (error) {
      console.error('Failed to select account:', error);
      throw error;
    }
  }, [fetchBalance]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setWalletState({
      address: null,
      isConnected: false,
      balance: '0',
      network: 'primearc-core-chain',
    });
    setAccounts([]);
    console.log('❌ Disconnected from wallet');
  }, []);

  // Sign and send transaction
  const signTransaction = useCallback(async (tx: any): Promise<{ success: boolean; hash?: string; error?: string }> => {
    if (!walletState.address) {
      return {
        success: false,
        error: 'No wallet connected',
      };
    }

    try {
      console.log('🔏 Signing transaction...');

      // Get the signer from the extension
      const injector = await web3FromAddress(walletState.address);

      // Sign and send the transaction
      return new Promise((resolve) => {
        tx.signAndSend(
          walletState.address,
          { signer: injector.signer },
          ({ status, dispatchError, txHash }: any) => {
            if (dispatchError) {
              console.error('❌ Transaction failed:', dispatchError.toString());
              resolve({
                success: false,
                error: dispatchError.toString(),
              });
            } else if (status.isInBlock) {
              console.log(`✅ Transaction included in block: ${status.asInBlock.toString()}`);
              resolve({
                success: true,
                hash: txHash.toString(),
              });
            } else if (status.isFinalized) {
              console.log(`✅ Transaction finalized: ${status.asFinalized.toString()}`);
              resolve({
                success: true,
                hash: txHash.toString(),
              });
            }
          }
        ).catch((error: any) => {
          console.error('❌ Failed to sign transaction:', error);
          resolve({
            success: false,
            error: error.message || 'Failed to sign transaction',
          });
        });
      });

    } catch (error: any) {
      console.error('❌ Failed to sign transaction:', error);
      return {
        success: false,
        error: error.message || 'Failed to sign transaction',
      };
    }
  }, [walletState.address]);

  const selectedAccount: WalletAccount | null = walletState.address
    ? accounts.find(acc => acc.address === walletState.address) || {
        address: walletState.address,
        balance: walletState.balance,
      }
    : null;

  return {
    ...walletState,
    connect,
    disconnect,
    signTransaction,
    selectedAccount,
    accounts,
    selectAccount,
    isExtensionAvailable,
  };
}

export default useWallet;
