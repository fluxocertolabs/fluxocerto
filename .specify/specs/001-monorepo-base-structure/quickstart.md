# Quickstart: Monorepo Base Structure

**Feature**: 001-monorepo-base-structure  
**Date**: 2025-11-25  
**Audience**: Developers setting up or verifying the base structure

---

## Prerequisites

Before starting, ensure you have:

| Requirement | Version | Check Command |
|------------|---------|---------------|
| Node.js | 20+ | `node --version` |
| pnpm | 10+ | `pnpm --version` |
| Git | Any | `git --version` |

### Installing pnpm (if needed)

```bash
# Using npm
npm install -g pnpm

# Or using Corepack (Node 16.13+)
corepack enable
corepack prepare pnpm@latest --activate
```

---

## Quick Verification

After the base structure is implemented, verify everything works:

```bash
# 1. Clone (if not already done)
git clone <repo-url>
cd fluxo-certo

# 2. Install dependencies
pnpm install

# 3. Start development server
pnpm dev
# → Opens http://localhost:5173
# → You should see "Fluxo Certo" heading

# 4. Verify TypeScript
pnpm typecheck
# → Should exit with 0 (no errors)

# 5. Verify linting
pnpm lint
# → Should exit with 0 (no errors)

# 6. Verify build
pnpm build
# → Creates dist/ directory

# 7. Verify tests
pnpm test
# → Vitest runs (may show "no tests" which is expected)
```

---

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Development | `pnpm dev` | Start Vite dev server with HMR |
| Build | `pnpm build` | TypeScript check + production build |
| Preview | `pnpm preview` | Preview production build locally |
| Lint | `pnpm lint` | Run ESLint on all files |
| Lint Fix | `pnpm lint:fix` | Auto-fix linting issues |
| Type Check | `pnpm typecheck` | Run TypeScript compiler check |
| Test | `pnpm test` | Run Vitest once |
| Test Watch | `pnpm test:watch` | Run Vitest in watch mode |
| Test Coverage | `pnpm test:coverage` | Run tests with coverage report |

---

## Project Structure

After setup, you'll have:

```
fluxo-certo/
├── src/
│   ├── components/
│   │   └── ui/              # shadcn/ui components (empty)
│   ├── pages/               # Page components (empty)
│   ├── stores/              # Zustand stores (empty)
│   ├── db/                  # Dexie.js database (empty)
│   ├── lib/
│   │   └── utils.ts         # cn() utility for shadcn/ui
│   ├── types/               # TypeScript types (empty)
│   ├── App.tsx              # Root component (placeholder)
│   ├── main.tsx             # Entry point
│   └── index.css            # Tailwind + CSS variables
├── public/
│   └── vite.svg             # Favicon
├── docs/
│   ├── PMF.md               # Product-market fit
│   └── USER_STORIES.md      # User stories
├── package.json             # Dependencies & scripts
├── pnpm-lock.yaml           # Locked dependencies
├── tsconfig.json            # TypeScript config
├── tsconfig.node.json       # TS config for build tools
├── vite.config.ts           # Vite bundler config
├── vitest.config.ts         # Test runner config
├── tailwind.config.ts       # Tailwind CSS config
├── postcss.config.js        # PostCSS config
├── eslint.config.js         # ESLint flat config
├── components.json          # shadcn/ui config
├── .gitignore               # Git exclusions
└── AGENTS.md                # AI collaboration protocols
```

---

## Adding shadcn/ui Components

The base structure includes shadcn/ui configuration. To add components:

```bash
# Add a button component
npx shadcn@latest add button

# Add multiple components
npx shadcn@latest add card input form

# List available components
npx shadcn@latest add --help
```

Components are installed to `src/components/ui/`.

---

## Path Aliases

The project uses `@/` as an alias for `src/`:

```typescript
// Instead of relative paths:
import { Button } from '../../../components/ui/button'

// Use path alias:
import { Button } from '@/components/ui/button'
```

This is configured in both `tsconfig.json` and `vite.config.ts`.

---

## Common Issues

### Issue: `pnpm: command not found`

**Solution**: Install pnpm globally:
```bash
npm install -g pnpm
# Or use Corepack
corepack enable
```

### Issue: Node version too old

**Solution**: Update Node.js to v20+:
```bash
# Using nvm
nvm install 20
nvm use 20
```

### Issue: Port 5173 already in use

**Solution**: Kill the process or use a different port:
```bash
# Find process using port
lsof -i :5173

# Or start on different port
pnpm dev -- --port 3000
```

### Issue: ESLint errors after fresh install

**Solution**: The base structure should have zero lint errors. If you see errors:
```bash
# Try fixing automatically
pnpm lint:fix

# If issues persist, check you're on the correct branch
git status
```

### Issue: TypeScript path alias not resolving

**Solution**: Ensure both configs match:
1. `tsconfig.json` has `paths: { "@/*": ["./src/*"] }`
2. `vite.config.ts` has `resolve.alias: { "@": path.resolve(__dirname, "./src") }`
3. Restart your IDE/editor

---

## Next Steps

After verifying the base structure works:

1. **Feature development**: Check `docs/USER_STORIES.md` for next features
2. **Add components**: Use shadcn/ui to add UI components as needed
3. **Database setup**: Next feature will add Dexie.js schema in `src/db/`
4. **State management**: Next feature will add Zustand stores in `src/stores/`

---

## Development Workflow

1. **Start dev server**: `pnpm dev`
2. **Make changes**: Edit files in `src/`
3. **HMR updates**: Changes reflect instantly in browser
4. **Lint before commit**: `pnpm lint`
5. **Type check**: `pnpm typecheck`
6. **Build to verify**: `pnpm build`

---

## Performance Expectations

| Metric | Target | Notes |
|--------|--------|-------|
| `pnpm install` | < 30s | First install, longer with cold cache |
| `pnpm dev` startup | < 2s | Vite cold start |
| HMR update | < 100ms | After file save |
| `pnpm build` | < 10s | Production build |
| `pnpm typecheck` | < 5s | TypeScript compilation |

---

## Environment Variables

No environment variables required for the base structure.

Future features may add additional Vite-specific env files (e.g. `.env.local`), but the core setup uses `.env`.

For now, the app is fully local—no external services needed.

