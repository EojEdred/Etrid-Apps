# ËTRID FlareChain Polkadot.js Service

Complete Polkadot.js integration for connecting to the ËTRID FlareChain relay chain for real blockchain data and interactions.

## Features

- **Connection Management**: Automatic RPC endpoint fallback with multiple endpoints
- **Balance Queries**: Real-time ETR balance queries and subscriptions
- **Transfers**: Send ETR tokens between accounts
- **Democracy Pallet**: Proposals, referendums, and voting
- **Staking Pallet**: Validator queries, staking operations, and nominations
- **Extension Integration**: Polkadot.js browser extension support

## Installation

The required dependencies are already in package.json:

```json
{
  "@polkadot/api": "^16.4.9",
  "@polkadot/extension-dapp": "^0.62.2",
  "@polkadot/util": "^13.5.7",
  "@polkadot/util-crypto": "^13.5.7"
}
```

## Usage

### Initialize Connection

```typescript
import { initApi, getChainInfo } from '@/lib/polkadot';

// Connect to FlareChain
const api = await initApi();

// Get chain information
const info = await getChainInfo();
console.log(`Connected to ${info.chain}`);
```

### Query Balance

```typescript
import { getBalance, subscribeBalance } from '@/lib/polkadot';

// One-time balance query
const balance = await getBalance('5GrwvaEF...');
console.log(`Balance: ${balance.formatted}`);

// Real-time balance subscription
const unsubscribe = await subscribeBalance('5GrwvaEF...', (balance) => {
  console.log(`New balance: ${balance.formatted}`);
});

// Clean up subscription when done
unsubscribe();
```

### Send Transfer

```typescript
import { enableExtension, transfer } from '@/lib/polkadot';

// Enable Polkadot.js extension
const accounts = await enableExtension();

// Send ETR tokens
const result = await transfer(
  accounts[0].address,  // from
  '5GrwvaEF...',        // to
  '1000000000000'       // amount in planck (1 ETR)
);

console.log(`Transaction hash: ${result.txHash}`);
```

### Democracy / Governance

```typescript
import {
  getDemocracyProposals,
  getReferendums,
  voteOnReferendum,
  getMinimumDeposit
} from '@/lib/polkadot';

// Get active proposals
const proposals = await getDemocracyProposals();

// Get active referendums
const referendums = await getReferendums();

// Vote on a referendum
const result = await voteOnReferendum(
  0,              // referendum index
  true,           // aye (yes)
  'Locked1x',     // conviction
  '100000000000', // balance to vote with
  '5GrwvaEF...'   // voter address
);
```

### Staking

```typescript
import {
  getValidators,
  getStakingInfo,
  bond,
  nominate,
  getMinimumStake
} from '@/lib/polkadot';

// Get all validators
const validators = await getValidators();

// Get staking info for an account
const stakingInfo = await getStakingInfo('5GrwvaEF...');

// Bond tokens for staking
const result = await bond(
  '5GrwvaEF...',    // stash address
  '1000000000000',  // amount to bond
  'Staked'          // rewards destination
);

// Nominate validators
await nominate('5GrwvaEF...', [
  '5GNJqTPy...',
  '5HpG9w8E...',
]);
```

## API Reference

### Core API (`api.ts`)

- `initApi()` - Initialize connection to FlareChain
- `getApi()` - Get current API instance
- `disconnectApi()` - Disconnect from chain
- `enableExtension()` - Enable Polkadot.js browser extension
- `getBalance(address)` - Get ETR balance
- `subscribeBalance(address, callback)` - Subscribe to balance updates
- `transfer(from, to, amount)` - Send ETR tokens
- `getChainInfo()` - Get chain metadata
- `getCurrentBlock()` - Get current block number
- `subscribeNewBlocks(callback)` - Subscribe to new blocks
- `isValidAddress(address)` - Validate address format

### Democracy Pallet (`democracy.ts`)

- `getProposals()` - Get all active proposals
- `getProposalDetails(index)` - Get proposal details with deposit info
- `getReferendums()` - Get all active/recent referendums
- `getReferendumDetails(index)` - Get referendum details
- `submitProposal(hash, deposit, address)` - Submit new proposal
- `vote(refIndex, aye, conviction, balance, address)` - Vote on referendum
- `removeVote(refIndex, address)` - Remove vote
- `getVotingInfo(refIndex, address)` - Get user's vote on referendum
- `getMinimumDeposit()` - Get minimum deposit for proposals
- `subscribeReferendums(callback)` - Subscribe to referendum updates

### Staking Pallet (`staking.ts`)

- `getStakingInfo(address)` - Get staking information
- `getValidators()` - Get all active validators
- `getWaitingValidators()` - Get waiting validators
- `getEraInfo()` - Get current era information
- `bond(address, amount, payee)` - Bond tokens
- `bondExtra(address, amount)` - Bond additional tokens
- `unbond(address, amount)` - Unbond tokens
- `withdrawUnbonded(address, numSlashingSpans)` - Withdraw unbonded tokens
- `nominate(address, targets)` - Nominate validators
- `chill(address)` - Stop nominating
- `getMinimumStake()` - Get minimum staking amount
- `getBondingDuration()` - Get bonding duration in eras

## RPC Endpoints

The service tries these endpoints in order:

1. `wss://flarechain.etrid.org` - Production FlareChain
2. `wss://rpc.etrid.org` - Alternative production endpoint
3. `ws://localhost:9944` - Local development node

## Error Handling

All functions handle errors gracefully:

```typescript
try {
  const api = await initApi();
} catch (error) {
  console.error('Failed to connect:', error.message);
  // Show user-friendly error message
}
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  ApiPromise,
  InjectedAccountWithMeta,
  DemocracyProposal,
  Referendum,
  StakingInfo,
  Validator,
} from '@/lib/polkadot';
```

## Notes

- All amounts are in planck (smallest unit): 1 ETR = 10^12 planck
- Transactions require Polkadot.js browser extension
- Subscriptions should be cleaned up when components unmount
- The API connection is cached and reused across calls
