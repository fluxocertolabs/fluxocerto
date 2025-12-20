# Research: Monorepo Base Structure

**Feature**: 001-monorepo-base-structure  
**Date**: 2025-11-25  
**Status**: Complete

## Overview

This document captures technology research and decisions for setting up the Fluxo Certo monorepo base structure. Since the tech stack is already defined in the constitution, research focuses on configuration best practices and compatibility verification.

---

## 1. Vite 7.2.4 Configuration

### Decision
Use Vite 7.2.4 with `@vitejs/plugin-react` 5.1.1 and configure path aliases via `resolve.alias`.

### Rationale
- Vite 7 introduces improved HMR and faster cold starts
- Native ESM support aligns with React 19's module patterns
- Path aliases via Vite config integrate seamlessly with TypeScript paths

### Configuration Pattern
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Alternatives Considered
- **Webpack**: Rejected—slower, more complex configuration, not needed for SPA
- **Parcel**: Rejected—less ecosystem support for React 19 features
- **Turbopack**: Rejected—still in beta, not production-ready

---

## 2. Tailwind CSS v4 Setup

### Decision
Use Tailwind CSS 4.1.17 with the new CSS-first configuration approach.

### Rationale
- Tailwind v4 moves configuration to CSS using `@theme` directive
- Simpler setup without JavaScript config file for basic cases
- Better IDE support with native CSS syntax

### Configuration Pattern
```css
/* src/index.css */
@import "tailwindcss";

@theme {
  --color-primary: oklch(0.7 0.15 200);
  --color-background: oklch(0.98 0 0);
  --font-family-sans: "Inter", system-ui, sans-serif;
}
```

### Migration Notes
- `tailwind.config.ts` still supported for complex configurations
- shadcn/ui components may require hybrid approach
- Use `@tailwindcss/vite` plugin for optimal integration

### Alternatives Considered
- **Tailwind v3 syntax**: Rejected—v4 is stable and the project is greenfield
- **CSS Modules**: Rejected—more boilerplate, less utility-first
- **Styled Components**: Rejected—runtime overhead, not needed for this scale

---

## 3. shadcn/ui Initialization

### Decision
Use `npx shadcn@latest init` with Vite adapter and New York style.

### Rationale
- shadcn/ui provides accessible, customizable components
- Not a dependency—components are copied to project
- Full control over styling and behavior

### Configuration Pattern
```json
// components.json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### Key Setup Steps
1. Initialize with `npx shadcn@latest init`
2. Creates `lib/utils.ts` with `cn()` helper
3. Sets up Tailwind CSS variables
4. Configures path aliases matching Vite config

### Alternatives Considered
- **Radix UI directly**: Rejected—more setup work, shadcn provides sensible defaults
- **Material UI**: Rejected—heavier bundle, opinionated styling
- **Headless UI**: Rejected—fewer components, more assembly required

---

## 4. TypeScript Configuration

### Decision
Use TypeScript 5.9.3 with strict mode and moduleResolution "bundler".

### Rationale
- Strict mode catches errors at compile time (critical for financial app)
- Bundler resolution aligns with Vite's module handling
- Path aliases via `paths` config mirror Vite aliases

### Configuration Pattern
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Strict Mode Implications
- `strictNullChecks`: All null/undefined must be handled
- `noImplicitAny`: All types must be explicit or inferrable
- `strictFunctionTypes`: Function parameter types are contravariant

---

## 5. ESLint Configuration

### Decision
Use ESLint 9+ flat config format with TypeScript and React plugins.

### Rationale
- Flat config is the new standard (`.eslintrc` deprecated)
- Better TypeScript integration with `@typescript-eslint/parser`
- React 19 specific rules available

### Configuration Pattern
```javascript
// eslint.config.js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
)
```

### Alternatives Considered
- **Biome**: Rejected—less mature ecosystem, fewer React-specific rules
- **ESLint legacy config**: Rejected—deprecated, less future-proof

---

## 6. Vitest Configuration

### Decision
Use Vitest 4.0.14 with jsdom environment for component testing.

### Rationale
- Native Vite integration (shared config)
- Fast execution with intelligent watch mode
- Compatible with React Testing Library

### Configuration Pattern
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

### Alternatives Considered
- **Jest**: Rejected—requires more configuration for ESM, slower
- **Testing Library only**: Rejected—needs a test runner

---

## 7. Package.json Scripts

### Decision
Provide all standard development commands matching constitution.

### Script Definitions
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage"
  }
}
```

---

## 8. Directory Structure Decisions

### Decision
Create minimal placeholder structure per constitution, with `.gitkeep` for empty directories.

### Rationale
- Empty directories aren't tracked by Git
- `.gitkeep` is convention for preserving directory structure
- Only create directories that will be used in immediate next features

### Directories to Create
```
src/
├── components/ui/    # shadcn/ui components go here
├── pages/            # Dashboard.tsx, Settings.tsx (future)
├── stores/           # Zustand stores (future)
├── db/               # Dexie.js (future)
├── lib/              # utils.ts (shadcn requirement)
└── types/            # Domain types (future)
```

### Files to Create as Placeholders
- `src/main.tsx` - Entry point with React.createRoot
- `src/App.tsx` - Root component with minimal "Fluxo Certo" heading
- `src/index.css` - Tailwind directives + CSS variables

---

## Summary of Research Findings

| Topic | Decision | Confidence |
|-------|----------|------------|
| Bundler | Vite 7.2.4 | High |
| CSS Framework | Tailwind v4 CSS-first | High |
| Component Library | shadcn/ui (New York) | High |
| TypeScript | 5.9.3 strict mode | High |
| Linting | ESLint 9 flat config | High |
| Testing | Vitest 4.0.14 + jsdom | High |
| Path Aliases | @/ → src/ | High |

All decisions align with constitution requirements. No NEEDS CLARIFICATION items remain.

