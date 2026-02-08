# Bundle Size Reduction Plan

## Context

The Vite build produces a single JS chunk of **942 kB** (276 kB gzipped), triggering the >500 kB warning. The codebase was bootstrapped from a Manus platform template that included many unused dependencies and a 1,437-line component showcase. There is zero code-splitting — all 5 routes and all their heavy dependencies load eagerly.

**Goal:** Get the initial bundle under 500 kB by removing dead weight and adding route-based code splitting.

---

## Step 1: Remove unused npm dependencies

Remove packages that are never imported by active code:

```
pnpm remove recharts embla-carousel-react react-day-picker input-otp react-resizable-panels vaul cmdk react-hook-form @hookform/resolvers date-fns streamdown axios next-themes
```

Also remove Manus-specific dev deps and vite plugins:
```
pnpm remove @builder.io/vite-plugin-jsx-loc vite-plugin-manus-runtime
```

**Files:** `package.json`

---

## Step 2: Clean up vite.config.ts

- Remove `jsxLocPlugin` and `vitePluginManusRuntime` imports and plugin entries
- Remove Manus-specific `allowedHosts`
- Keep only: `react()`, `tailwindcss()`

**File:** `vite.config.ts`

---

## Step 3: Delete dead code files

These files are never imported by any active route:

- `client/src/pages/ComponentShowcase.tsx` (1,437 lines — sole consumer of ~20 unused UI components)
- `client/src/components/AIChatBox.tsx`
- `client/src/components/DashboardLayout.tsx`
- `client/src/components/DashboardLayoutSkeleton.tsx`
- `client/src/components/ManusDialog.tsx`

---

## Step 4: Delete unused UI components

After Step 3, these `client/src/components/ui/` files have zero live consumers:

`accordion.tsx`, `aspect-ratio.tsx`, `breadcrumb.tsx`, `calendar.tsx`, `carousel.tsx`, `chart.tsx`, `collapsible.tsx`, `command.tsx`, `context-menu.tsx`, `drawer.tsx`, `form.tsx`, `hover-card.tsx`, `input-otp.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `pagination.tsx`, `progress.tsx`, `radio-group.tsx`, `resizable.tsx`, `scroll-area.tsx`, `sheet.tsx`, `sidebar.tsx`, `skeleton.tsx`, `slider.tsx`, `switch.tsx`, `table.tsx`, `toggle.tsx`, `toggle-group.tsx`

Also delete any of these if they have no live consumers after the above: `alert-dialog.tsx`, `avatar.tsx`, `dropdown-menu.tsx`, `popover.tsx`, `separator.tsx`

Then remove corresponding unused Radix UI packages from `package.json`:

```
pnpm remove @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-aspect-ratio @radix-ui/react-avatar @radix-ui/react-collapsible @radix-ui/react-context-menu @radix-ui/react-dropdown-menu @radix-ui/react-hover-card @radix-ui/react-menubar @radix-ui/react-navigation-menu @radix-ui/react-popover @radix-ui/react-progress @radix-ui/react-radio-group @radix-ui/react-scroll-area @radix-ui/react-separator @radix-ui/react-slider @radix-ui/react-switch @radix-ui/react-toggle @radix-ui/react-toggle-group
```

---

## Step 5: Fix sonner.tsx (drop next-themes)

Replace the `next-themes` import with a hardcoded `"dark"` theme (the app uses `defaultTheme="dark"` and has no theme switching):

```tsx
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={{
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
      } as React.CSSProperties}
      {...props}
    />
  );
};

export { Toaster };
```

**File:** `client/src/components/ui/sonner.tsx`

---

## Step 6: Route-based code splitting in App.tsx

Convert all page imports to `React.lazy()` and wrap the `<Switch>` in `<Suspense>`:

```tsx
import { lazy, Suspense } from "react";

const Home = lazy(() => import("./pages/Home"));
const Discover = lazy(() => import("./pages/Discover"));
const Groups = lazy(() => import("./pages/Groups"));
const MapPage = lazy(() => import("./pages/MapPage"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));

function Router() {
  return (
    <CyberpunkLayout>
      <Suspense fallback={<LoadingFallback />}>
        <Switch>
          <Route path="/" component={Home} />
          ...
        </Switch>
      </Suspense>
    </CyberpunkLayout>
  );
}
```

This works with Wouter — its `<Route component>` accepts any React component, including lazy ones.

**File:** `client/src/App.tsx`

---

## Step 7: Add manualChunks to Vite config

Split vendor libraries into stable, cacheable chunks:

```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        "vendor-react": ["react", "react-dom"],
        "vendor-data": ["wouter", "@tanstack/react-query", "@trpc/client", "@trpc/react-query", "superjson"],
        "vendor-maps": ["react-simple-maps", "d3-geo"],
        "vendor-motion": ["framer-motion"],
        "vendor-gmaps": ["@react-google-maps/api"],
      },
    },
  },
},
```

**File:** `vite.config.ts`

---

## Expected result

| Chunk | Est. Size | Loaded |
|-------|-----------|--------|
| Main (shell + shared UI) | 180-250 kB | Always |
| vendor-react | ~45 kB | Always |
| vendor-data | ~35 kB | Always |
| Home page + vendor-maps + vendor-motion | ~200 kB | On `/` |
| MapPage + vendor-gmaps | ~100 kB | On `/map` |
| Discover/Groups/Profile | ~20-30 kB each | On navigate |

**Initial load: ~260-330 kB** (well under 500 kB target)

---

## Verification

1. `pnpm run build` — no errors, no >500 kB warning
2. `pnpm run check` — TypeScript passes
3. `pnpm run dev` — all routes load correctly, lazy chunks fetched on navigation
4. `pnpm run test` — existing tests pass
