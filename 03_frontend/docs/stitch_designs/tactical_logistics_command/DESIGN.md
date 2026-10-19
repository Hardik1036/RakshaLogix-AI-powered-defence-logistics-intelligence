---
name: Tactical Logistics Command
colors:
  surface: '#0c1324'
  surface-dim: '#0c1324'
  surface-bright: '#33394c'
  surface-container-lowest: '#070d1f'
  surface-container-low: '#151b2d'
  surface-container: '#191f31'
  surface-container-high: '#23293c'
  surface-container-highest: '#2e3447'
  on-surface: '#dce1fb'
  on-surface-variant: '#bcc9cd'
  inverse-surface: '#dce1fb'
  inverse-on-surface: '#2a3043'
  outline: '#869397'
  outline-variant: '#3d494c'
  surface-tint: '#4cd7f6'
  primary: '#4cd7f6'
  on-primary: '#003640'
  primary-container: '#06b6d4'
  on-primary-container: '#00424f'
  inverse-primary: '#00687a'
  secondary: '#89ceff'
  on-secondary: '#00344d'
  secondary-container: '#00a2e6'
  on-secondary-container: '#00344e'
  tertiary: '#b7c8e1'
  on-tertiary: '#213145'
  tertiary-container: '#97a8c1'
  on-tertiary-container: '#2d3d52'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#acedff'
  primary-fixed-dim: '#4cd7f6'
  on-primary-fixed: '#001f26'
  on-primary-fixed-variant: '#004e5c'
  secondary-fixed: '#c9e6ff'
  secondary-fixed-dim: '#89ceff'
  on-secondary-fixed: '#001e2f'
  on-secondary-fixed-variant: '#004c6e'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#0c1324'
  on-background: '#dce1fb'
  surface-variant: '#2e3447'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  mono-lg:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0.02em
  mono-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.03em
  badge-label:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system defines an operational, mission-critical environment tailored for defense logistics, asset telemetry, and supply-chain command officers. The aesthetic balances situational awareness with high-density data legibility: "Subtle Tactical Glassmorphism" combined with solid, high-contrast operational workspaces.

- **Design Philosophy**: Purpose-built utility meets modern aerospace command center. Glassmorphism is applied selectively to structural chrome (navigation, high-level HUD metrics, modals) to give physical depth and field awareness, while operational data planes (tables, maps, telemetry charts, inputs) remain strictly opaque to ensure absolute optical clarity in low-latency environments.
- **Visual Style**: Restrained, structural glassmorphic layering, razor-sharp 1px hair-thin division lines, high-contrast numeric layouts, and an absence of neon bloom or decorative visual noise.
- **Emotional Impact**: Precision, calm authority, rapid scanability, and uncompromised dependability under operational pressure.

## Colors
The system is built on a dual-palette architecture engineered for seamless day/night operations. Color application strictly preserves contrast ratios, distinguishing supervisory chrome from mission-critical alerts.

### Dark Theme (Default)
- **Canvas Base**: Slate-950 (`#020617` to `#0b0f19`) with an imperceptible cool slate gradation.
- **Glass Surfaces**: `rgba(15, 23, 42, 0.65)` (Slate-900 at 65% opacity) over dynamic canvas elements.
- **Solid Data Surfaces**: Solid `#0b0f19` for tables, chart canvases, map overlays, and telemetry panels.
- **Border Trim**: `rgba(255, 255, 255, 0.08)` for frosted boundaries; `rgba(255, 255, 255, 0.12)` for interactive elements.
- **Primary Accent**: Tactical Cyan `#06b6d4` (Hover: `#22d3ee`, Pressed: `#0891b2`).
- **Typography**: Primary `#f8fafc`, Secondary `#94a3b8`, Muted/Meta `#64748b`.

### Light Theme
- **Canvas Base**: Slate-100 (`#f1f5f9` transitioning faintly to `#f8fafc`).
- **Glass Surfaces**: `rgba(255, 255, 255, 0.72)` with diffuse backdrop refraction.
- **Solid Data Surfaces**: Pure solid `#ffffff` for high-density tables and data entry grids.
- **Border Trim**: `#e2e8f0` (Slate-200) with selective `rgba(0, 0, 0, 0.06)` inner perimeter borders.
- **Primary Accent**: Calibrated Deep Cyan `#0891b2` (tuned to guarantee WCAG AA 4.5:1+ contrast against light surfaces; Hover: `#0e7490`).
- **Typography**: Primary `#0f172a`, Secondary `#475569`, Muted/Meta `#64748b`.

### Operational Status Tokens (Non-Glassy, Absolute Contrast)
Status indicators must never use translucency, blur, or desaturated tints:
- **Critical (RED)**: Dark `#ef4444` | Light `#dc2626`
- **Warning (AMBER)**: Dark `#f59e0b` | Light `#d97706`
- **Stable (EMERALD)**: Dark `#10b981` | Light `#059669`
- **Info/Telemetry (CYAN)**: Dark `#06b6d4` | Light `#0891b2`

## Typography
The system enforces a dual-typeface typographic rhythm:

1. **System Interface (Inter)**: Handles general interaction, navigation labels, contextual body text, modal headers, and descriptive notices. Proportional, clear, and unembellished.
2. **Technical Telemetry (JetBrains Mono)**: Mandatory for all NATO stock numbers, military grid reference system (MGRS) coordinates, tail numbers, timestamps (Zulu/UTC), serials, and high-frequency data matrices. Monospacing eliminates horizontal layout jitter during real-time scalar updates.

## Layout & Spacing
A rigorous 8px baseline grid anchors the entire layout architecture:

- **Desktop (1280px+)**: 12-column fluid grid system with `1.5rem` (24px) gutters and `2rem` (32px) margins. Left collapsible navigation rail at a fixed 260px (collapses to 72px icon rail).
- **Tablet (768px - 1279px)**: 8-column layout with `1rem` (16px) gutters and `1.5rem` (24px) margins. Rail drops into a top contextual glass bar or modal sheet drawer.
- **Mobile (<768px)**: 4-column layout with `0.5rem` (8px) gutters and `1rem` (16px) margins. Tables convert to single-column card stacks with sticky tactical summary chips.

### Structural Flow Rules
- Spacing within dense data tables uses compact `0.5rem` (8px) vertical cell padding.
- Structural chrome (navbar, side drawer) maintains `1rem` (16px) internal padding with items decoupled by `0.5rem` (8px) gaps.
- The top bar holds a static height of 64px to preserve vertical scanning space.

## Elevation & Depth
Elevation is achieved using optical glass diffusion and hairline edge boundary lights rather than murky shadows.

### Glass Architecture (Targeted Elements Only)
Reserved exclusively for:
- Main Left Sidebar & Drawer Canvases
- Fixed Top Navigation Bar
- Top-Level KPI Summary Tiles
- Threat/Advisory Notification Banners
- Modal Shells & Command Palettes

**Specifications:**
- **Blur Engine**: `backdrop-filter: blur(14px) saturate(160%);`
- **Dark Surface**: `rgba(15, 23, 42, 0.65)` enclosed in a 1px border of `rgba(255, 255, 255, 0.08)`.
- **Light Surface**: `rgba(255, 255, 255, 0.72)` enclosed in a 1px border of `rgba(0, 0, 0, 0.06)` / `#e2e8f0`.
- **Depth Shadow**: Ultra-soft diffuse ambient shadow:
  - Dark: `0 8px 32px 0 rgba(0, 0, 0, 0.45)`
  - Light: `0 8px 24px 0 rgba(15, 23, 42, 0.06)`

### Solid Data Architecture (No Glass)
Tables, line-item feeds, vector maps, and inputs must sit on solid, opaque container planes. This eliminates background text bleed-through and guarantees instant legibility in high-stress tracking tasks.

## Shapes
Geometry is utilitarian and balanced (`roundedness: 2`).

- **Glass Containers (Cards, Navbar, Sidebars, Modals)**: Standardized to `rounded-xl` (1.5rem outer bounds) with subtle `1px` perimeter borders.
- **Operational Data Containers (Tables, Chart Pods)**: Standardized to `rounded-lg` (1.0rem) with crisp opaque containment.
- **Interactive Controls (Buttons, Inputs, Selectors)**: `rounded-md` (0.375rem to 0.5rem) to evoke precision instrument keys.
- **Tags, Identifiers, and Lat/Long Pills**: Fully rounded pill shapes (`9999px`) or clipped engineering bevels for status pills.

## Components

### Top Navigation Bar & Theme Engine
- **Structure**: Glass container spanning the viewport width with sticky pinning (`top: 0`, `z-index: 40`).
- **Officer Profile & Theme Toggle**:
  - Logistics Officer Badge displays rank/ID in `JetBrains Mono` sm alongside a solid green/amber clearance beacon dot.
  - Positioned immediately adjacent to the badge is the segmented **Dark/Light Toggle Switch**: A compact, tactile dual-state selector with a 1px inner bezel, containing crisp Sun (`lucide:sun`) and Moon (`lucide:moon`) icons. The active state highlights with a crisp accent cyan boundary.

### KPI & Advisory Cards
- **KPI Metrics**: Glassmorphism surface with `rounded-xl` corners. Value metric set in large numerical `Inter` or `JetBrains Mono`, flanked by a solid trend delta pill (`+12.4%`, `#10b981`).
- **Advisory Card**: Glassmorphism banner featuring a 3px solid vertical anchor line at the left border indicating severity (Red for critical alert, Amber for operational warning). No frosted distortion on the warning icon itself.

### Data Tables & Technical Lists
- **Container**: Solid background (`#0b0f19` in Dark, `#ffffff` in Light), surrounded by a standard 1px border. No glass transparency allowed.
- **Header**: Capitalized `JetBrains Mono` (11px, tracking +0.05em), fixed-height header row with subtle column separator guides.
- **Rows**: Alternating hover highlights (`rgba(6, 182, 212, 0.05)`), zero vertical bounce. Row numbers, inventory SKUs, and coordinates strictly render in monospace.

### Buttons & Interactive Controls
- **Primary Tactical Action**: Solid Cyan fill (`#06b6d4` dark / `#0891b2` light) with high-contrast text (`#020617` dark / `#ffffff` light). Crisp `rounded-md` geometry, no diffuse neon outer glow.
- **Secondary Action**: Translucent glass background with 1px border (`rgba(255, 255, 255, 0.12)` dark / `rgba(0,0,0,0.1)` light).
- **Form Inputs**: Solid background fills (`#020617` dark / `#ffffff` light), `1px` border (`#334155` dark / `#cbd5e1` light). On focus, borders snap instantly to accent Cyan with a 1px ring offset. No blurred drop-shadows on fields.