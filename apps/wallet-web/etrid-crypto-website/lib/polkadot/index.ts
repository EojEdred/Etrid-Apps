/**
 * ËTRID FlareChain Polkadot.js Integration
 *
 * This module provides a complete integration with the ËTRID FlareChain
 * using Polkadot.js API for real blockchain data and interactions.
 *
 * @module lib/polkadot
 */

// Core API functions
export {
  initApi,
  getApi,
  disconnectApi,
  enableExtension,
  getBalance,
  subscribeBalance,
  transfer,
  getChainInfo,
  getCurrentBlock,
  subscribeNewBlocks,
  isValidAddress,
} from './api';

// Democracy pallet functions
export {
  getProposals as getDemocracyProposals,
  getProposalDetails,
  getReferendums,
  getReferendumDetails,
  submitProposal as submitDemocracyProposal,
  vote as voteOnReferendum,
  removeVote,
  getVotingInfo,
  getMinimumDeposit,
  subscribeReferendums,
} from './democracy';

// Democracy types
export type {
  DemocracyProposal,
  Referendum,
  Vote,
  VoteConviction,
} from './democracy';

// Staking pallet functions
export {
  getStakingInfo,
  getValidators,
  getWaitingValidators,
  getEraInfo,
  bond,
  bondExtra,
  unbond,
  withdrawUnbonded,
  nominate,
  chill,
  getMinimumStake,
  getBondingDuration,
} from './staking';

// Staking types
export type {
  StakingInfo,
  Validator,
  Nomination,
  StakingLedger,
  EraInfo,
} from './staking';

// Re-export commonly used Polkadot.js types
export type { ApiPromise } from '@polkadot/api';
export type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
