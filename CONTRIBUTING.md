# Contributing to Etrid Apps

Thank you for your interest in contributing to Etrid Apps!

## Development Setup

1. **Prerequisites**
   - Node.js 18+
   - pnpm 8+
   - Git

2. **Clone and Install**
   ```bash
   git clone https://github.com/etaborai/etrid-apps.git
   cd etrid-apps
   pnpm install
   ```

3. **Start Development**
   ```bash
   pnpm dev
   ```

## Code Style

- **TypeScript** - All new code should be TypeScript
- **Prettier** - Run `pnpm format` before committing
- **ESLint** - Run `pnpm lint` to check for issues

## Adding a New App

1. Create directory in `apps/`
2. Initialize with preferred framework
3. Import shared packages:
   ```typescript
   import { Button, Card } from '@etrid/ui';
   import { useWallet } from '@etrid/hooks';
   import { formatBalance } from '@etrid/utils';
   ```

## Adding to Shared Packages

### Components (@etrid/ui)
```typescript
// packages/ui/src/components/MyComponent.tsx
export function MyComponent() { ... }

// packages/ui/src/index.ts
export { MyComponent } from './components/MyComponent';
```

### Hooks (@etrid/hooks)
```typescript
// packages/hooks/src/useMyHook.ts
export function useMyHook() { ... }

// packages/hooks/src/index.ts
export { useMyHook } from './useMyHook';
```

## Pull Request Process

1. Create feature branch from `main`
2. Make changes with clear commits
3. Run tests and linting
4. Submit PR with description
5. Wait for review

## Commit Messages

Use conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

## Questions?

Open an issue or reach out to the Etrid team.
