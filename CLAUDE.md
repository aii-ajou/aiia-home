# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Homepage for **AIIA — 아주대학교 인공지능연구원 (AI Institute of Ajou University)**. An Astro static site. UI copy and code comments are in Korean; the default `lang` is `ko` (Base.astro also supports `en`).

## Commands

- `npm install` — install dependencies (first-time setup)
- `npm run dev` — start the dev server (hot reload)
- `npm run build` — production build to `dist/`
- `npm run preview` — serve the built `dist/` locally
- `npm run check` — `astro check` (TypeScript / `.astro` type diagnostics)

## Build tooling / versions

- **Astro 7** on **Node 22** (managed with nvm). `.nvmrc` pins `22`, so `nvm use` selects the right version on any machine; `package.json` `engines` enforces Node `^18.20.8 || ^20.3.0 || >=22.0.0`. On a fresh clone run `nvm install` (or `nvm use`) before `npm install`.
- `package.json` has an `overrides` forcing `yaml` to `^2.9.0` — this patches a transitive vuln (GHSA-48c2-rrv3-qjmp) in `@astrojs/check`'s dev-only language server. `npm audit` must stay at **0 vulnerabilities**; remove the override once upstream `@astrojs/check` ships a fixed `yaml`.
- `astro.config.mjs` sets `site: "https://aiia.ajou.ac.kr"` — required so `Base.astro`'s canonical and OG URLs resolve. Keep it set.
- `tsconfig.json` extends `astro/tsconfigs/strict`. `npm run check` must stay at 0 errors.

## Architecture

- **`src/pages/`** — file-based routes (Astro). `index.astro` is the home page; it is a thin **composition file** — it imports `<Base>` and lays out the section components in order (`UtilityBar → Header → Hero → About → Stats → Centers → Members → News → Inquiry → Contact → Footer`) with no markup or styles of its own.
- **`src/layouts/Base.astro`** — the single page shell. Loads fonts (Nanum Gothic + Space Grotesk), imports `global.css`, renders SEO/OG meta from props (`title`, `description`, `lang`, `ogImage`), and runs an inline `is:inline` script in `<head>` that sets `document.documentElement.dataset.theme` *before first paint* to prevent dark-mode FOUC. Every page wraps its content in `<Base>`.
- **`src/components/`** — one `.astro` component **per page section** (Header, Hero, About, Stats, Centers, Members, News, Inquiry, Contact, Footer), plus `ThemeToggle`. Each section component is self-contained: its markup, its scoped `<style>`, **and its own content data** (the `centers` / `members` / `news` / `navItems` / … arrays in the frontmatter) live together. **To change content, edit the array at the top of the matching component** — there is no central data file.
- **`src/styles/global.css`** — the one and only global stylesheet entry, imported exactly once (by Base.astro). It `@import`s the tokens file, holds base utilities (`.aiia-container`, focus rings, reduced-motion), and defines the **shared UI primitives** used across sections: `.section*`, `.eyebrow*`, `.card`, `.btn*`, `.tag*`, `.grid`, `.placeholder-chip*`. Astro scoped styles do not cross component boundaries, so anything reused by more than one section must live here; section-specific styles stay in that component's scoped `<style>`. Do not import CSS anywhere else.
- **`src/styles/aiia-tokens.css`** — the design system. All colors, typography, spacing, radius, and motion are `--aiia-*` CSS custom properties.
- **`public/`** — static assets served at the site root (e.g. `/brand/aiia-symbol.png`).

When adding a section: create `src/components/<Name>.astro` (data + markup + scoped style), then add it to the composition in `src/pages/index.astro`. Promote a style to `global.css` only once a second component needs it.

## Conventions (important)

- **Never hardcode colors, spacing, radius, or timing.** Always use `--aiia-*` tokens (e.g. `background: var(--aiia-primary)`, `padding: var(--aiia-space-4)`). Adding a new raw hex/px value where a token exists is a mistake.
- **Build UI against the *semantic* theme tokens** (`--aiia-bg`, `--aiia-surface`, `--aiia-surface-2`, `--aiia-ink`, `--aiia-ink-soft`, `--aiia-line`, `--aiia-primary`, `--aiia-on-primary`, …), **not** the raw brand colors (`--aiia-blue`, `--aiia-gold`, …). Semantic tokens are redefined for dark mode, so using them makes dark mode "just work"; using raw brand colors breaks it.
- **Theme system**: light/dark is driven by `data-theme` on `<html>`, persisted in `localStorage` under key **`aiia-theme`**. Dark also auto-applies via `prefers-color-scheme` when no explicit `data-theme` is set. `ThemeToggle.astro` toggles this and must stay in sync with the init script in `Base.astro` (same key, same `dataset.theme` mechanism).
- **Fonts**: `--aiia-font-sans` (Nanum Gothic) for Korean/body; `--aiia-font-display` (Space Grotesk) for Latin display text, numbers, and labels; `--aiia-font-mono` for mono.
- Brand palette follows Ajou University UI guidelines: AJOU BLUE `#005BAC` (primary), AJOU GOLD `#B08D3E` (secondary), plus AJOU SKY/YELLOW/SILVER subs — defined once in `aiia-tokens.css`; reference them, don't redefine.
