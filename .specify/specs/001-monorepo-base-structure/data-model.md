# Data Model: Monorepo Base Structure

**Feature**: 001-monorepo-base-structure  
**Date**: 2025-11-25  
**Status**: Complete

## Overview

This feature does not introduce domain entities (no accounts, projects, expenses). Instead, it establishes **configuration schemas**—the structure and content of configuration files that define the development environment.

---

## Configuration File Schemas

### 1. package.json

**Purpose**: Define project metadata, dependencies, and npm scripts.

```typescript
interface PackageJson {
  name: string                    // "fluxo-certo"
  version: string                 // "0.0.1"
  private: boolean                // true (not published to npm)
  type: "module"                  // ESM modules
  scripts: {
    dev: string                   // "vite"
    build: string                 // "tsc -b && vite build"
    preview: string               // "vite preview"
    lint: string                  // "eslint ."
    "lint:fix": string            // "eslint . --fix"
    typecheck: string             // "tsc --noEmit"
    test: string                  // "vitest"
    "test:watch": string          // "vitest --watch"
    "test:coverage": string       // "vitest --coverage"
  }
  dependencies: Record<string, string>     // Pinned production deps
  devDependencies: Record<string, string>  // Pinned dev deps
}
```

**Validation Rules**:
- All dependency versions MUST be exact (no `^`, `~`, `*`)
- Scripts MUST match constitution COMMON COMMANDS section
- `type: "module"` required for ESM imports

---

### 2. tsconfig.json

**Purpose**: TypeScript compiler configuration.

```typescript
interface TSConfig {
  compilerOptions: {
    target: "ES2022"
    lib: ["ES2022", "DOM", "DOM.Iterable"]
    module: "ESNext"
    moduleResolution: "bundler"
    strict: true                  // REQUIRED by constitution
    noEmit: true                  // Vite handles emit
    jsx: "react-jsx"
    esModuleInterop: true
    skipLibCheck: true
    resolveJsonModule: true
    isolatedModules: true
    noUnusedLocals: true
    noUnusedParameters: true
    noFallthroughCasesInSwitch: true
    baseUrl: "."
    paths: {
      "@/*": ["./src/*"]          // Path alias
    }
  }
  include: ["src"]
  references: [{ path: "./tsconfig.node.json" }]
}
```

**Validation Rules**:
- `strict: true` is non-negotiable per constitution
- Path alias `@/*` MUST resolve to `./src/*`
- `moduleResolution: "bundler"` required for Vite compatibility

---

### 3. tsconfig.node.json

**Purpose**: TypeScript config for Vite config files.

```typescript
interface TSConfigNode {
  compilerOptions: {
    target: "ES2022"
    lib: ["ES2022"]
    module: "ESNext"
    moduleResolution: "bundler"
    allowSyntheticDefaultImports: true
    strict: true
    noEmit: true
  }
  include: ["vite.config.ts", "vitest.config.ts", "tailwind.config.ts"]
}
```

---

### 4. vite.config.ts

**Purpose**: Vite bundler configuration.

```typescript
interface ViteConfig {
  plugins: Plugin[]               // [react()]
  resolve: {
    alias: {
      "@": string                 // path.resolve(__dirname, './src')
    }
  }
  server?: {
    port?: number                 // 5173 (default)
    open?: boolean                // false
  }
}
```

**Validation Rules**:
- MUST include `@vitejs/plugin-react`
- Path alias MUST match tsconfig paths

---

### 5. vitest.config.ts

**Purpose**: Vitest test runner configuration.

```typescript
interface VitestConfig {
  plugins: Plugin[]               // [react()]
  test: {
    environment: "jsdom"          // Browser-like environment
    globals: boolean              // true (expect, describe, it)
    setupFiles?: string[]         // Optional setup scripts
    include?: string[]            // ["src/**/*.test.{ts,tsx}"]
  }
  resolve: {
    alias: {
      "@": string                 // Must match vite.config
    }
  }
}
```

---

### 6. tailwind.config.ts

**Purpose**: Tailwind CSS v4 configuration.

```typescript
interface TailwindConfig {
  content: string[]               // ["./index.html", "./src/**/*.{ts,tsx}"]
  theme?: {
    extend?: Record<string, unknown>
  }
  plugins?: unknown[]
}
```

**Note**: Tailwind v4 prefers CSS-first configuration via `@theme` directive in `index.css`. The `tailwind.config.ts` file is kept for shadcn/ui compatibility.

---

### 7. components.json (shadcn/ui)

**Purpose**: shadcn/ui component generation configuration.

```typescript
interface ShadcnConfig {
  "$schema": "https://ui.shadcn.com/schema.json"
  style: "new-york" | "default"
  rsc: boolean                    // false (not using React Server Components)
  tsx: boolean                    // true
  tailwind: {
    config: string                // "tailwind.config.ts"
    css: string                   // "src/index.css"
    baseColor: string             // "neutral"
    cssVariables: boolean         // true
  }
  aliases: {
    components: string            // "@/components"
    utils: string                 // "@/lib/utils"
    ui: string                    // "@/components/ui"
    lib: string                   // "@/lib"
    hooks: string                 // "@/hooks"
  }
}
```

---

### 8. eslint.config.js

**Purpose**: ESLint flat configuration.

```typescript
// Flat config uses default export array
type ESLintFlatConfig = Array<{
  ignores?: string[]
  extends?: unknown[]
  files?: string[]
  languageOptions?: {
    ecmaVersion?: number
    globals?: Record<string, boolean>
    parser?: unknown
    parserOptions?: Record<string, unknown>
  }
  plugins?: Record<string, unknown>
  rules?: Record<string, unknown>
}>
```

---

### 9. postcss.config.js

**Purpose**: PostCSS configuration for Tailwind.

```typescript
interface PostCSSConfig {
  plugins: {
    tailwindcss: Record<string, never>
    autoprefixer: Record<string, never>
  }
}
```

---

### 10. .gitignore

**Purpose**: Git exclusion patterns.

```text
# Dependencies
node_modules/

# Build output
dist/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.*.local (optional, machine-specific overrides)

# Logs
*.log
npm-debug.log*

# Testing
coverage/

# Vite
*.local
```

---

## Directory Structure Model

```typescript
interface ProjectDirectory {
  src: {
    components: {
      ui: ComponentFile[]         // shadcn/ui components
    }
    pages: PageFile[]             // Dashboard.tsx, Settings.tsx
    stores: StoreFile[]           // Zustand stores
    db: DatabaseFile[]            // Dexie.js schema/operations
    lib: UtilityFile[]            // utils.ts, cashflow.ts
    types: TypeFile[]             // index.ts with domain types
    "App.tsx": RootComponent
    "main.tsx": EntryPoint
    "index.css": GlobalStyles
  }
  public: StaticAsset[]
  docs: MarkdownFile[]
}
```

---

## File Content Schemas

### main.tsx (Entry Point)

```typescript
// Minimal entry point
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

### App.tsx (Root Component)

```typescript
// Minimal root component - placeholder only
function App() {
  return (
    <div className="min-h-screen bg-background">
      <h1 className="text-2xl font-bold p-8">Fluxo Certo</h1>
    </div>
  )
}

export default App
```

### index.css (Global Styles)

```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    /* ... shadcn/ui CSS variables */
  }
}
```

### lib/utils.ts (shadcn/ui Utility)

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## Entity Relationships

This feature has no domain entity relationships—it's purely infrastructure. The configuration files have the following dependency graph:

```
package.json
    ├── tsconfig.json
    │       └── tsconfig.node.json
    ├── vite.config.ts
    │       └── (uses tsconfig paths)
    ├── vitest.config.ts
    │       └── (extends vite.config)
    ├── tailwind.config.ts
    │       └── (referenced by postcss)
    ├── postcss.config.js
    ├── eslint.config.js
    └── components.json
            └── (references tailwind & paths)
```

---

## State Transitions

Not applicable for this feature (no domain state).

---

## Validation Summary

| File | Required | Validation |
|------|----------|------------|
| package.json | ✅ | Exact versions, required scripts |
| tsconfig.json | ✅ | strict: true, path aliases |
| vite.config.ts | ✅ | React plugin, path alias |
| tailwind.config.ts | ✅ | Content paths, shadcn compat |
| eslint.config.js | ✅ | Flat config format |
| vitest.config.ts | ✅ | jsdom environment |
| components.json | ✅ | shadcn/ui paths |
| .gitignore | ✅ | Standard exclusions |

