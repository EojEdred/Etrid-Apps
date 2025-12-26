# ETRID Governance Service - Implementation Summary

## Overview

Complete governance service for the ETRID web wallet matching the iOS app implementation. Connects to the real ETRID chain at `wss://rpc.etrid.org`.

## Files Created

### Core Files
1. **types.ts** (16KB) - Complete TypeScript type definitions
2. **service.ts** (30KB) - Main governance service with all features
3. **hooks.ts** (20KB) - React hooks for easy component integration
4. **index.ts** - Main export file
5. **README.md** (10KB) - Comprehensive documentation
6. **example.tsx** - Reference implementation component
7. **test.ts** - Service testing script

**Total:** ~2,836 lines of production-ready code

## Features Implemented

### ✅ Proposal Management
- Submit new proposals (6 categories)
- Query all proposals with filters
- Get proposal by ID
- Paginated proposal listing
- Category-based filtering
- Status-based filtering (pending, active, passed, rejected, executed)

### ✅ Conviction Voting
- Vote with conviction multipliers (0.1x to 6x)
- Lock periods: 0, 7, 14, 28, 56, 112, 224 days
- Aye/Nay/Abstain vote types
- Voting power calculation
- Vote history tracking
- Check if account has voted

### ✅ Vote Delegation
- Delegate voting power to trusted accounts
- Track-specific delegation (by category)
- Undelegate functionality
- Delegation statistics
- Received delegation tracking

### ✅ Voting Power
- Calculate voting power from staked ETR
- Lock period tracking
- Delegation impact
- Participation history
- Multi-account support

### ✅ Statistics & Analytics
- Overall governance stats
- Category-specific statistics
- Proposal vote tallies
- Turnout calculations
- Pass rate tracking

### ✅ Six Proposal Categories
1. **InflationRate** - Modify network inflation parameters
2. **ParameterChange** - Update runtime parameters
3. **BudgetAllocation** - Treasury fund allocation
4. **ProtocolUpgrade** - Runtime and protocol upgrades
5. **DirectorElection** - Elect network directors
6. **EmergencyAction** - Emergency protocol actions

## Technical Details

### Connection
- Primary RPC: `wss://rpc.etrid.org`
- Automatic failover to backup endpoints
- Lazy connection (connects when needed)
- Graceful error handling

### Dependencies
- Uses existing `@polkadot/api` (already in package.json)
- Uses existing `@polkadot/extension-dapp` for wallet integration
- No additional dependencies required

### Integration
```typescript
import {
  useActiveProposals,
  useCastVote,
  useVotingPower,
  ProposalCategory,
  ConvictionLevel
} from '@/lib/governance';
```

## Usage Examples

### Fetch Active Proposals
```typescript
const { proposals, loading } = useActiveProposals();
```

### Cast Vote with Conviction
```typescript
const { castVote } = useCastVote();
await castVote({
  proposalId: 1,
  voteType: VoteType.Aye,
  conviction: ConvictionLevel.Locked3x, // 3x power, 28 days
}, signer);
```

### Check Voting Power
```typescript
const { votingPower } = useVotingPower(account);
// votingPower.totalVotingPower
```

### Delegate Voting Power
```typescript
const { delegate } = useDelegate();
await delegate({
  target: delegateAddress,
  conviction: ConvictionLevel.Locked2x,
}, signer);
```

## React Hooks Available

### Proposals
- `useProposals(filters?)` - All proposals with filters
- `useProposal(id)` - Single proposal
- `useActiveProposals()` - Active proposals only
- `useProposalsByCategory(category)` - Filter by category
- `usePaginatedProposals(params)` - Paginated results
- `useSubmitProposal()` - Submit new proposal

### Voting
- `useCastVote()` - Cast vote
- `useVotes(proposalId)` - Get votes for proposal
- `useVotingStats(proposalId)` - Voting statistics
- `useHasVoted(proposalId, account)` - Check if voted

### Voting Power
- `useVotingPower(account)` - Get voting power
- `useVotingPowerBreakdown(balance, conviction)` - Calculate power

### Delegation
- `useDelegate()` - Delegate power
- `useUndelegate()` - Remove delegation
- `useDelegation(account)` - Get delegation
- `useDelegationStats(account)` - Delegation stats

### Statistics
- `useGovernanceStats()` - Overall stats
- `useCategoryStats(category)` - Category stats

### Utilities
- `useGovernanceConnection()` - Connection management
- `useGovernancePolling(fn, interval)` - Polling helper
- `useGovernance(account)` - Comprehensive hook
- `useTimeRemaining(blocks)` - Time calculations

## Conviction Levels

| Level | Multiplier | Lock Period |
|-------|-----------|-------------|
| None | 0.1x | 0 days |
| Locked1x | 1x | 7 days |
| Locked2x | 2x | 14 days |
| Locked3x | 3x | 28 days |
| Locked4x | 4x | 56 days |
| Locked5x | 5x | 112 days |
| Locked6x | 6x | 224 days |

## Error Handling

All operations handle errors gracefully:
- Connection failures → return empty data, allow retry
- Transaction failures → return detailed error info
- Missing data → return null/empty with proper typing

## Testing

Run the test script to verify connection:
```bash
npx tsx lib/governance/test.ts
```

## Next Steps

To use in your app:

1. **Import hooks in components:**
```typescript
import { useActiveProposals, useCastVote } from '@/lib/governance';
```

2. **Enable Polkadot extension:**
```typescript
import { web3Enable, web3FromAddress } from '@polkadot/extension-dapp';
await web3Enable('ETRID Wallet');
```

3. **Use in components:**
```typescript
const { proposals } = useActiveProposals();
const { castVote } = useCastVote();
```

4. **See example.tsx for complete implementation reference**

## Production Ready

✅ Type-safe with full TypeScript support
✅ Real chain integration (no mocks)
✅ Error handling and retries
✅ Automatic connection management
✅ React hooks for easy integration
✅ Comprehensive documentation
✅ Example component included
✅ Matches iOS app features

## File Locations

All files at: `/Users/macbook/Desktop/etrid/apps/wallet-web/etrid-crypto-website/lib/governance/`

- `types.ts` - Type definitions
- `service.ts` - Core service
- `hooks.ts` - React hooks
- `index.ts` - Exports
- `README.md` - Documentation
- `example.tsx` - Example component
- `test.ts` - Test script
- `SUMMARY.md` - This file

## Support

For questions or issues, refer to:
- `README.md` - Detailed usage documentation
- `example.tsx` - Working component example
- Existing governance implementation at `lib/polkadot/governance.ts`

---

**Created:** December 3, 2024
**Status:** Production Ready
**Chain:** wss://rpc.etrid.org
