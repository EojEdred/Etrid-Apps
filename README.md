# Etrid Apps

Frontend applications for the Etrid Network. Web wallet, staking dashboard, governance UI, bridge interface, and mobile apps. Built as a pnpm/Turborepo monorepo with shared component libraries.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## Repository Structure

```
etrid-apps/
├── apps/                     # Frontend applications
│   ├── unified-portal/       # Main portal (all services)
│   ├── validator-dashboard/  # Validator monitoring
│   ├── watchtower-monitor/   # Lightning watchtower
│   ├── masterchef-dashboard/ # LP rewards
│   ├── wallet-web/           # Web wallet
│   ├── wallet-mobile/        # Mobile wallet (React Native)
│   ├── EtridefiBloc/         # iOS wallet (Swift)
│   ├── governance-ui/        # Snapshot voting
│   ├── lightning-landing/    # Landing page
│   ├── network-telemetry/    # Network stats
│   └── defihub/              # Operations center
│
├── packages/                 # Shared libraries
│   ├── ui/                   # @etrid/ui - Components
│   ├── hooks/                # @etrid/hooks - React hooks
│   ├── types/                # @etrid/types - TypeScript types
│   └── utils/                # @etrid/utils - Utilities
│
└── play-store-assets/        # Mobile store assets
```

## Applications

| App | Description | Port | Tech |
|-----|-------------|------|------|
| unified-portal | Main aggregated portal | 3000 | Next.js |
| validator-dashboard | Validator monitoring | 3002 | Next.js |
| watchtower-monitor | Lightning watchtower | 3003 | Next.js |
| masterchef-dashboard | LP rewards tracking | 3001 | Next.js |
| wallet-web | Browser DeFi wallet | 3004 | Next.js |
| wallet-mobile | Mobile wallet | - | React Native |
| EtridefiBloc | iOS native wallet | - | Swift |
| governance-ui | Voting & proposals | 8080 | Vue 3 |
| lightning-landing | Marketing page | 3005 | Next.js |
| network-telemetry | Network stats | 8000 | Vanilla JS |

## Shared Packages

| Package | Description |
|---------|-------------|
| @etrid/ui | 24 UI components (Radix + Tailwind) |
| @etrid/hooks | 8 React hooks for blockchain |
| @etrid/types | 35+ TypeScript definitions |
| @etrid/utils | 20+ utility functions |

## Development

```bash
# Start specific app
pnpm dev:portal       # unified-portal
pnpm dev:validator    # validator-dashboard
pnpm dev:wallet       # wallet-web

# Build packages
pnpm build:packages

# Type check
pnpm type-check

# Lint
pnpm lint

# Format code
pnpm format
```

## Configuration

Copy `.env.example` to `.env.local`:

```bash
NEXT_PUBLIC_PRIMEARC_RPC_URL=wss://rpc.etrid.network
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed architecture guide
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines
- Individual app READMEs in `apps/*/README.md`

## Related Repositories

| Repo | Description |
|------|-------------|
| [etrid](https://github.com/etaborai/etrid) | Blockchain core |
| [etrid-infra](https://github.com/etaborai/etrid-infra) | Infrastructure |
| [etrid-docs](https://github.com/etaborai/etrid-docs) | Documentation |

## License

MIT
