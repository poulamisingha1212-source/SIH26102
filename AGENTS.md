# AGENTS.md — gstack Engineering & Design Rules

This project follows **gstack** (https://github.com/garrytan/gstack) rules for high-velocity, production-grade engineering and design craft.

## 1. Ethos
- **Boil the Ocean**: Completeness is the default. Fix edge cases, defensive guards, error states, and responsive viewports.
- **Search Before Building**: Leverage existing utilities and patterns in the repo first before adding new dependencies or abstractions.
- **User Sovereignty**: Deliver direct value to the user. Real data over placeholders; clear explanations of impact.
- **Build for Real Use**: Solve concrete problems with domain precision (e.g. real Indian Government MPLADS guidelines and metrics).

## 2. Anti-Slop Design Doctrine
- **Typography Hierarchy**:
  - Display/Hero: Distinctive geometric display font (e.g. Satoshi from Fontshare CDN).
  - Body/UI: Clean, readable sans-serif (e.g. DM Sans from Google Fonts).
  - Metrics/Tables/Data: Monospace font with tabular numbers (JetBrains Mono with `tnum`).
- **Color Discipline**:
  - Dark surfaces at `#0C0C0C` (base) and `#141414` (cards) with `#262626` borders.
  - Warm amber cursor accent (`#F59E0B` / `#FBBF24`) for high-intent actions.
  - Clear semantic risk indicators: Red (`#EF4444` for High Risk - Review), Amber (`#F59E0B` for Medium Risk - Monitor), Green (`#22C55E` for Low Risk).
  - Avoid AI slop: no purple/violet gradients, no generic 3-column feature circles, no bubbly oversized border radiuses, no decorative blobs.
- **Materiality & Motion**:
  - Subtle SVG grain/noise overlay (`feTurbulence`) to give depth and prevent flat SaaS template monotony.
  - Crisp micro-interactions (150ms transitions, smooth hover states, pulsating live indicators).
- **Defensive Error Handling**:
  - No empty `catch` blocks or swallowed errors. Every failed request must report actionable feedback or log with context.
