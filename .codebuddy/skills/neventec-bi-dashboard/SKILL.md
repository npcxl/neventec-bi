---
name: neventec-bi-dashboard
description: >
  This skill should be used when working on the neventec-bi project — a React-based
  exhibition business intelligence (BI) dashboard for monitoring exhibition halls,
  construction progress, and safety compliance. Use this skill for any task involving
  this project's code, including adding features, fixing bugs, modifying components,
  changing the API layer, adjusting the polling strategy, or understanding the data flow.
  Triggers include: modifying files under src/ (especially App.tsx, api.ts, components/,
  hooks/, store/), changing the dashboard layout or theme, adding new API endpoints,
  or altering the ECharts/GSAP/Three.js visualization logic.
---

# neventec-bi Dashboard Skill

## Purpose

This skill provides comprehensive knowledge of the neventec-bi project — a React 19 +
TypeScript exhibition BI dashboard. The dashboard monitors three business domains:
Exhibition Overview (展会概况总览), Construction Overview (搭建信息概览), and Safety
Overview (现场安全总览). It features a dark tech-themed UI with ECharts maps, GSAP
animations, Three.js 3D halls, Ant Design components, and TailwindCSS styling.

## When to Use

Use this skill whenever modifying any file in the `src/` directory of this project.
This includes but is not limited to:

- Adding or modifying React components
- Changing API endpoint calls or adding new API methods
- Adjusting the polling/refresh strategy
- Modifying the ECharts CenterMap rendering logic
- Changing the dashboard layout or theme
- Adding new business modules or sidebar panels
- Fixing bugs in data flow, state management, or UI rendering
- Understanding how existing features work

## Project Quick Reference

- **Tech Stack**: React 19, TypeScript, Vite 6, Ant Design 6, ECharts 5, GSAP 3, TailwindCSS 3, Three.js
- **Entry Point**: `src/main.tsx` — renders `<App />` wrapped in Ant Design `ConfigProvider` (Chinese locale)
- **Main Component**: `src/App.tsx` (78KB, ~2247 lines) — state hub managing all data and module switching
- **API Layer**: `src/api.ts` — `screenApi` object with ~35 endpoint methods, auto-retry (4x), AbortSignal support
- **State Store**: `src/store/screenStore.ts` — lightweight `useState`-based store for hall/booth/safety data
- **Polling Hook**: `src/hooks/useSequentialApiPolling.ts` — sequential task runner, 90s interval, page visibility aware
- **Dev Port**: 9527, proxy `/ehs-api` → `https://glsz.s.369zhan.com`

## Core Architecture

### Data Flow

```
URL (?exhibitionId=xxx) → App.tsx
  ├── loadOverview() → 14 parallel API calls → populate state
  ├── useSequentialApiPolling → every 90s refresh
  └── State → props → LeftSidebar / CenterMap / RightSidebar
```

### Three Business Modules (hallMode)

| Mode Key | Label | Active Sidebars |
|----------|-------|-----------------|
| `ExhibitionOverview` | 展会概况总览 | ExhibitionLeftSidebar, ExhibitionRightSidebar |
| `ConstructOverview` | 搭建信息概览 | ConstructLeftSidebar, ConstructRightSidebar + Carousel |
| `SafetyOverview` | 现场安全总览 | SafetyLeftSidebar, SafetyRightSidebar + Carousel |

### Main Layout Structure

```
DashboardHeader (title)
MenuButtonGroup (3 module buttons) + CurrentTimeButton
main (3-column grid)
  ├── LeftSidebar (varies by module)
  ├── CenterMap (ECharts) + optional Carousel
  └── RightSidebar (varies by module)
```

## Key Files and Their Roles

- **`src/App.tsx`**: The central state hub. Contains all useState hooks for galleryRows, boothRows,
  safetyRows, constructOverviewData, constructProcessData, constructMaterialData,
  boothProgressData, boothProgressPictures, exhibitionProcessData, safetyCollect,
  violationTypeData, violationRecordData, violationSituationData, orderCollectData, expoName.
  Implements sessionStorage persistence, 60s module cache, and memory management.
  All module switching logic lives here.

- **`src/api.ts`**: The `screenApi` object containing all ~35 API methods organized in three
  sections: Exhibition, Safety, Construction. Each method supports AbortSignal.
  Base URL from `VITE_EHS_API_BASE_URL` env var, default `/ehs-api`.

- **`src/store/screenStore.ts`**: Alternative lightweight store using `useScreenStore()` hook.
  Manages hall metadata, booth-by-id mapping, safety records. Has `getSummary()` for
  computed statistics and `selectors` for derived data. Uses 60s TTL cache.

- **`src/hooks/useSequentialApiPolling.ts`**: Generic polling hook. Takes `tasks[]`, `intervalMs`,
  `timeoutMs`, `enabled`, `immediate`. Runs tasks sequentially, skips when page hidden,
  prevents concurrent cycles.

- **`src/components/CenterMap.tsx`**: Core map component using ECharts `custom` series with
  `renderItem`. Renders booth polygons and rectangles. Supports zoom/pan, click-to-detail modal.
  Adapts to `moduleMode` and `compact` prop for different layouts.

## Coding Conventions

### When adding a new API endpoint
1. Add the method to `screenApi` in `src/api.ts` following existing patterns
2. Follow naming: `getXxx` for global, `getXxxByHallId` for per-hall, `getXxxByBoothNo` for per-booth
3. Use existing `request<T>()` wrapper — retry is built-in
4. Update `references/api_reference.md` in this skill

### When adding a new state variable to App.tsx
1. Add to `AppPersistedState` type
2. Add to `CachedModuleData` type (if needed for module caching)
3. Add setter in `useState`
4. Add to `latestStateRef`, `applyCachedModuleData`, `createPersistedState`, `readPersistedState` (if persisted)
5. Add to the `useEffect` dependency arrays for persistence and memory management
6. Update the `loadOverview` function if it's part of initial data loading

### When adding a new component
1. Place in appropriate `src/components/` subdirectory
2. Use `memo()` for performance-sensitive components
3. Use TailwindCSS classes for styling
4. Use Ant Design components (`Flex`, `Image`, etc.) for layout
5. Follow the dark theme: background `bg-[linear-gradient(...)]`, border `border-[rgba(128,185,255,0.28)]`

### When modifying CenterMap
- The map uses ECharts `custom` series with `renderItem` API
- Booths are rendered as polygons (corner coordinates) or rectangles (bbox + center)
- Color strategy is provided by `useBoothColorStrategy` hook
- `moduleMode` prop determines which color strategy to use
- `compact` prop switches between full and compact map layouts

### Dark Theme Classes
- Background: `bg-[radial-gradient(...)]` or `bg-[linear-gradient(180deg,rgba(9,26,52,0.88),rgba(6,17,34,0.94))]`
- Border: `border border-[rgba(128,185,255,0.28)]`
- Shadow: `shadow-[inset_0_0_24px_rgba(80,157,255,0.08)]`
- Text: `text-slate-100`, `text-[#dbeeff]`

## Reference Files

For detailed information, consult these references:

- `references/api_reference.md` — Complete API endpoint listing with paths, parameters, and descriptions
- `references/architecture.md` — Full project architecture, component tree, data flow diagrams, and design patterns

When implementing features that touch the API layer, load `references/api_reference.md`.
When understanding the overall architecture or component relationships, load `references/architecture.md`.
