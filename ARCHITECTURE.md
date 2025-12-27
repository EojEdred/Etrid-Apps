# Etrid Apps Architecture

This document provides a comprehensive overview of the etrid-apps monorepo structure, application catalog, and shared packages.

## Repository Structure

```
etrid-apps/
├── apps/                          # Frontend applications
│   ├── dashboards/                # Monitoring & analytics dashboards
│   │   ├── unified-portal/        # Main aggregated portal
│   │   ├── validator-dashboard/   # Validator monitoring
│   │   ├── watchtower-monitor/    # Lightning watchtower
│   │   └── masterchef-dashboard/  # LP rewards tracking
│   │
│   ├── wallets/                   # Wallet applications
│   │   ├── wallet-web/            # Web wallet (Next.js)
│   │   ├── wallet-mobile/         # Mobile wallet (React Native)
│   │   └── EtridefiBloc/          # iOS native wallet (Swift)
│   │
│   ├── governance/                # Governance interfaces
│   │   └── governance-ui/         # Snapshot voting UI
│   │
│   ├── landing/                   # Marketing & landing pages
│   │   └── lightning-landing/     # Lightning network landing
│   │
│   ├── monitoring/                # Network monitoring tools
│   │   ├── network-telemetry/     # Real-time telemetry
│   │   └── defihub/               # DeFi operations center
│   │
├── packages/                      # Shared libraries
│   ├── ui/                        # @etrid/ui - Component library
│   ├── hooks/                     # @etrid/hooks - React hooks
│   ├── types/                     # @etrid/types - TypeScript types
│   └── utils/                     # @etrid/utils - Utility functions
│
├── play-store-assets/             # Mobile app store assets
│
├── package.json                   # Root workspace config
├── turbo.json                     # Turborepo build config
├── pnpm-workspace.yaml            # PNPM workspace config
└── tsconfig.json                  # Root TypeScript config
```

## Applications Catalog

### Dashboards

| App | Description | Port | Framework | Status |
|-----|-------------|------|-----------|--------|
| **unified-portal** | Main portal aggregating all Etrid services | 3000 | Next.js 16 | Production |
| **validator-dashboard** | Real-time validator monitoring & stats | 3002 | Next.js 14 | Production |
| **watchtower-monitor** | Lightning network watchtower monitoring | 3003 | Next.js 14 | Production |
| **masterchef-dashboard** | LP rewards tracking & yield farming | 3001 | Next.js 14 | Production |

### Wallets

| App | Description | Platform | Framework | Status |
|-----|-------------|----------|-----------|--------|
| **wallet-web** | Browser-based DeFi wallet | Web | Next.js 15 | Production |
| **wallet-mobile** | Cross-platform mobile wallet | iOS/Android | React Native | Production |
| **EtridefiBloc** | Native iOS wallet with deep integration | iOS | Swift/SwiftUI | Production |

### Governance

| App | Description | Framework | Status |
|-----|-------------|-----------|--------|
| **governance-ui** | Snapshot-based voting & proposal system | Vue 3 | Production |

### Landing Pages

| App | Description | Framework | Status |
|-----|-------------|-----------|--------|
| **lightning-landing** | Lightning network marketing page | Next.js 14 | Production |

### Monitoring

| App | Description | Framework | Status |
|-----|-------------|-----------|--------|
| **network-telemetry** | Real-time network statistics | Vanilla JS | Production |
| **defihub** | DeFi operations center & validator management | Documentation | Active |

## Shared Packages

### @etrid/ui (24 Components)

UI component library built with Radix UI and Tailwind CSS.

**Generic Components:**
- Button, Card, Dialog, Table, Badge, Avatar
- Input, Select, Checkbox, Switch, Slider
- Tabs, Accordion, Toast, Tooltip

**Blockchain Components:**
- AddressDisplay - Format & copy blockchain addresses
- BalanceDisplay - Format token balances with decimals
- BlockHeight - Display current block number
- ValidatorBadge - Validator status indicators
- NetworkStatus - Chain connection status

### @etrid/hooks (8 Hooks)

React hooks for blockchain interaction.

```typescript
// Blockchain hooks
usePolkadotApi()      // Connect to Substrate chains
useWallet()           // Wallet connection state
useBalance()          // Token balance queries
useBlockNumber()      // Current block subscription
useValidatorStats()   // Validator metrics

// Utility hooks
useDebounce()         // Debounced values
useLocalStorage()     // Persistent state
useMediaQuery()       // Responsive breakpoints
```

### @etrid/types (35+ Types)

TypeScript type definitions organized by domain.

```typescript
// domains
blockchain/    // Chain, Block, Transaction, Extrinsic
governance/    // Proposal, Vote, Delegation
monitoring/    // Metrics, Alert, Status
lightning/     // Channel, Payment, Invoice
wallet/        // Account, Balance, Transfer
```

### @etrid/utils (20+ Utilities)

Shared utility functions.

```typescript
// Formatters
formatAddress()       // Truncate addresses (5DxB...4kF2)
formatBalance()       // Format with decimals (1,234.56 ETR)
formatLargeNumber()   // Compact notation (1.2M)
formatTimeAgo()       // Relative time (2h ago)
formatPercentage()    // Percentage display (12.34%)
formatDuration()      // Duration display (2d 5h 30m)

// Validators
isValidAddress()      // Substrate address validation
isValidEthereumAddress() // EVM address validation
isValidEmail()        // Email format validation
isValidUrl()          // URL validation
isValidStakeAmount()  // Stake amount validation

// Helpers
sleep()               // Async delay
truncate()            // String truncation
copyToClipboard()     // Clipboard operations
debounce()            // Function debouncing
throttle()            // Function throttling
groupBy()             // Array grouping
unique()              // Array deduplication
sortBy()              // Array sorting

// CSS
cn()                  // Tailwind class merging
```

## Technology Stack

### Frontend Frameworks
- **Next.js 14-16** - React framework (5 apps)
- **React Native** - Mobile development (1 app)
- **Vue 3** - Governance UI (1 app)
- **Swift/SwiftUI** - iOS native (1 app)
- **Vanilla JS** - Lightweight monitoring (1 app)

### State Management
- React Query / TanStack Query
- Zustand for client state
- Polkadot.js API subscriptions

### Blockchain Integration
- **@polkadot/api** - Substrate chain interaction
- **ethers.js** / **viem** - EVM chain interaction
- **wagmi** - React hooks for Ethereum
- **WalletConnect** - Cross-wallet connectivity

### Styling
- Tailwind CSS
- Radix UI primitives
- Framer Motion for animations

### Build Tools
- Turborepo for monorepo orchestration
- PNPM for package management
- TypeScript for type safety

## Development

### Quick Start

```bash
# Install dependencies
pnpm install

# Start all apps in development
pnpm dev

# Start specific app
pnpm dev:portal     # unified-portal on :3000
pnpm dev:validator  # validator-dashboard on :3002
pnpm dev:wallet     # wallet-web

# Build all packages
pnpm build:packages

# Build specific app
pnpm build:portal
```

### Adding a New App

1. Create app directory in `apps/[category]/`
2. Initialize with Next.js or preferred framework
3. Add to workspace in `pnpm-workspace.yaml`
4. Configure in `turbo.json` if needed
5. Import shared packages: `@etrid/ui`, `@etrid/hooks`, etc.

### Adding to Shared Packages

1. Add component/hook/type to appropriate package
2. Export from package index
3. Run `pnpm build:packages`
4. Import in apps as needed

## Deployment

### Environment Configuration

Copy `.env.example` to `.env.local` and configure:

```bash
# Required
NEXT_PUBLIC_PRIMEARC_RPC_URL=wss://rpc.etrid.network
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Optional
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id
```

### Build for Production

```bash
# Build all apps
pnpm build

# Build specific app
turbo build --filter=unified-portal
```

### Deployment Targets

| App | Recommended Platform | Notes |
|-----|---------------------|-------|
| Web apps | Vercel / Netlify | Next.js optimized |
| Mobile apps | App Store / Play Store | See mobile README |
| Static apps | Any CDN | Simple HTML/JS |

## Related Repositories

| Repo | Description |
|------|-------------|
| [etrid](https://github.com/etaborai/etrid) | Blockchain core (Primearc + PBCs) |
| [etrid-infra](https://github.com/etaborai/etrid-infra) | Infrastructure & DevOps |
| [etrid-docs](https://github.com/etaborai/etrid-docs) | Documentation |
