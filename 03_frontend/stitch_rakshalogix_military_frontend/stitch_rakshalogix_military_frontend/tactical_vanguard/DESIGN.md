---
name: Tactical Vanguard
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353943'
  surface-container-lowest: '#0a0e17'
  surface-container-low: '#181b25'
  surface-container: '#1c1f29'
  surface-container-high: '#262a34'
  surface-container-highest: '#31353f'
  on-surface: '#dfe2ef'
  on-surface-variant: '#bcc9cd'
  inverse-surface: '#dfe2ef'
  inverse-on-surface: '#2c303a'
  outline: '#869397'
  outline-variant: '#3d494c'
  surface-tint: '#4cd7f6'
  primary: '#4cd7f6'
  on-primary: '#003640'
  primary-container: '#06b6d4'
  on-primary-container: '#00424f'
  inverse-primary: '#00687a'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#e79400'
  on-tertiary-container: '#563400'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#acedff'
  primary-fixed-dim: '#4cd7f6'
  on-primary-fixed: '#001f26'
  on-primary-fixed-variant: '#004e5c'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#0f131c'
  on-background: '#dfe2ef'
  surface-variant: '#31353f'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  headline-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.08em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 12px
    letterSpacing: 0.1em
  telemetry-display:
    fontFamily: JetBrains Mono
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.03em
  telemetry-metric:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 22px
    letterSpacing: 0em
spacing:
  gutter: 0.75rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

Engineered exclusively for forward-brigade logistics officers operating under high-friction tactical conditions, the visual narrative embodies absolute operational readiness, calculated stoicism, and zero-latency comprehension. The target audience comprises brigade supply commanders, ordnance heads, and forward-operating logistics staff responsible for ammunition provisioning, fuel distribution, fleet mobilization, and casualty evacuation logistics across rugged frontiers. 

The aesthetic is firmly rooted in **Tactical High-Density Functionalism**—a specialized offshoot of mechanical brutalism and defense telemetry interfaces:
- **No Decorative Overhead:** Visual elements exist purely to communicate state, priority, coordinate data, and mission-critical metrics. Drop shadows, whimsical organic curves, and ornamental gradients are strictly forbidden.
- **Split-Second Scanning:** Form follows battlefield triage. Visual hierarchies prioritize severe exceptions (fuel depletion, route interdictions, ammunition stockouts) above passive operational states.
- **Mechanical Discipline:** Razor-sharp geometry, 1px demarcations, monospace coordinates, and structured instrumentation panels reflect the ruggedized hardware interfaces found in armored command posts and mobile tactical operations centers (TOCs).

## Colors

The palette is engineered for low-light command post environments, night-vision preservation, and instant threat triage. The canvas operates on a multi-tiered slate foundation accented with luminous functional indicators.

### Tactical Palette Logic
- **Base Canvas (`#020617` / `#090d16`):** Deep tactical slate-950 serves as the operational substrate, minimizing display glare and panel backlighting in darkened TOC shelters.
- **Primary Accent (`#06b6d4` - Cyan):** Reserved for interactive focus, active tactical telemetry, selected convoy tracks, system readiness targets, and live sensor links.
- **Secondary / Nominal (`#10b981` - Emerald):** Indicates verified security, operational depots, fully stocked ordnance status, cleared routes, and encrypted comms links.
- **Tertiary / Warning (`#f59e0b` - Amber):** Signals impending depletion, maintenance anomalies, unverified grid crossings, and adverse meteorological conditions.
- **Critical / Interdiction (`#ef4444` - Red):** Strictly isolated to immediate operational threats—critical ammunition stockouts, breached cordons, vehicle ambushes, and system disconnections.
- **Structural Neutral (`#1e293b` - Slate-800):** Provides crisp 1px structural framing, grid divides, and non-distracting container boundaries.
- **Text & Telemetry Neutral (`#f8fafc` primary, `#94a3b8` secondary, `#475569` disabled/ghosted):** High-contrast legibility ensuring zero ambiguity during extreme stress.

## Typography

The typography framework establishes a bifurcated hierarchy: **Inter** handles narrative structure, status labels, and interface commands; **JetBrains Mono** governs all quantitative, coordinate, and telemetry data.

### Dual Type System
1. **Command Sans (Inter):** Applied across global navigation, section titles, field names, and status alerts. Clean letterforms prevent misreading under fatigue and screen vibration.
2. **Telemetry Monospace (JetBrains Mono):** Mandatory for:
   - MGRS/GPS grid coordinates (e.g., `43R WQ 82910 12093`)
   - Unit designation codes (e.g., `14-RAPID/BGD-LOG`)
   - Inventory counts, fuel metrics, tonnage, and payload capacities
   - UTC/Zulu operational timestamps (`180420Z OCT 24`)
   - SITREP classification codes and comms channel indices

All monospace data labels (`label-md`, `label-sm`) default to uppercase presentation with explicit tracking (`0.05em` to `0.1em`) to eliminate optical clustering on dense data grids.

## Layout & Spacing

The layout model is governed by an **Ultra-Dense Tactical Grid**. The desktop layout utilizes a 24-column or 12-column sub-divided matrix with compact 12px (`0.75rem`) gutters, allowing maximum telemetry and situational awareness panels to remain above the visual horizon without requiring deep vertical scrolling.

### Breakpoints & Adaptive Rules
- **Command Workstation (1920px+):** Four-pane operations board (Navigation Rail | Active Sector Map & Telemetry | Resource Status Tables | Real-Time Urgent Action Feeds).
- **Tactical Rugged Laptop (1280px - 1919px):** Three-pane operations board with collapsible action feeds into flyout panels.
- **Mobile Field Terminal / Rugged Slate (768px - 1279px):** Split-view tablet orientation. Grid switches to 8 columns with priority-docked telemetry tabs.
- **Handheld Scout / Man-Pack Device (< 768px):** Single-column stacked telemetry cards. Header collapses into a locked tactical status bar displaying active comms status, MGRS location, and master alarm counter.

Element padding strictly follows an 4px baseline rhythm (`space-xs: 4px`, `space-sm: 8px`, `space-md: 12px`, `space-lg: 16px`, `space-xl: 24px`), eliminating air gaps in favor of continuous operational data density.

## Elevation & Depth

This design system avoids decorative depth, ambient blurs, and soft diffuse shadows. Elevation is rendered entirely through **Tonal Stacking and High-Contrast Structural Outlines**.

### Elevation Architecture
- **Base Tactical Canvas (Level 0):** Hex `#020617` (Slate-950). Represents unmapped canvas, deep background, and terminal window boundaries.
- **Surface Panels & Modules (Level 1):** Hex `#0f172a` (Slate-900). Crisp containment with a continuous `1px solid #1e293b` perimeter border.
- **Nested Telemetry & Metric Wells (Level 2):** Hex `#090d16` (Deep Slate Well). Recessed surface for numerical counters, data grids, log monitors, and tabular telemetry.
- **Critical Popover & Tactical Overlays (Level 3):** Hex `#1e293b` (Slate-800). Applied to modal target verification panels and confirmation gates, defined with a highlighted 1px accent border (`#06b6d4` or `#ef4444` depending on alert priority).

### Edge & Border Highlighting
Interactive elements at rest maintain a `1px solid #1e293b` edge. On active telemetry engagement or cursor focus, the border shifts directly to `#06b6d4` without transition delay or glow blooming, providing instant optical acknowledgement.

## Shapes

The design system enforces **Level 0 (Sharp)** roundedness across every component. Radius is explicitly 0px (`border-radius: 0px`).

### Tactical Rationale
- **Zero Pixel Wastage:** Beveled and curved edges consume layout real estate, dilute linear alignment, and degrade visual scanning across high-volume data tables.
- **Rugged Instrument Parity:** Perfectly squared edges align with physical military instrumentation, ruggedized COTS field tablets, and vehicular rack-mounted displays.
- **Chamfered Variants (Contextual):** Major structural container corners may employ a 45-degree chamfer cutout (4px by 4px cut) via CSS clip-path to indicate classified operational feeds or hardware-bound sensory input modules.

## Components

### Buttons & Tactical Triggers
- **Primary Tactical Trigger:** Background `#06b6d4`, foreground `#020617`, font `JetBrains Mono` 11px uppercase bold, 0px corner radius, padding 8px 16px. Active/hover state: background `#22d3ee`, border none.
- **Secondary Action Trigger:** Background `#0f172a`, foreground `#94a3b8`, border `1px solid #1e293b`. Hover: foreground `#f8fafc`, border `1px solid #06b6d4`.
- **Combat Override / Critical Dispatch:** Background `#ef4444`, foreground `#ffffff`, font `JetBrains Mono` 11px uppercase bold. Active pulse animation disabled; flat optical certainty required.

### Tactical Badges & Status Chips
- Height: 20px. Square geometry (0px radius).
- Padding: 2px 6px.
- Typography: `label-sm` (10px uppercase monospace).
- **Nominal Badge:** Border `1px solid #10b981`, background `#022c22`, text `#34d399`.
- **Warning Badge:** Border `1px solid #f59e0b`, background `#451a03`, text `#fbbf24`.
- **Critical / Stockout Badge:** Border `1px solid #ef4444`, background `#450a0a`, text `#f87171`.
- **Telemetry Tag:** Border `1px solid #1e293b`, background `#090d16`, text `#06b6d4`.

### Data Grids & Telemetry Tables
- **Header:** Height 28px, background `#090d16`, border-bottom `1px solid #1e293b`, font `label-md` uppercase, text `#64748b`.
- **Rows:** Height 32px, alternating subtle backgrounds (`#0f172a` and `#090d16`), border-bottom `1px solid #1e293b`.
- **Numeric & Coordinate Alignment:** Right-aligned or monospaced tabular column lock (`font-variant-numeric: tabular-nums`).
- **Critical Cell Highlighting:** Full background tint `#450a0a` with high-contrast text `#fca5a5` for instantaneous threshold breaches.

### Input Fields & Filter Steppers
- Height: 32px. Background `#090d16`, border `1px solid #1e293b`, text `#f8fafc`, font `JetBrains Mono` 12px.
- Focus state: Border `1px solid #06b6d4`, zero drop shadow or focus ring glow.
- Leading indicators: Static monospace unit designation (e.g., `MGRS:`, `QTY:`, `POL-L:`) in `#64748b`.

### Checkboxes & Segmented Selectors
- **Checkbox:** 14px by 14px sharp square, background `#090d16`, border `1px solid #334155`. Checked state: Background `#06b6d4`, inner 6px solid `#020617` sharp square.
- **Segmented Toggle Group:** Container background `#090d16`, 1px border `#1e293b`. Active item: Background `#1e293b`, text `#06b6d4`, border-bottom `2px solid #06b6d4`.

### Tactical Cards & Telemetry Pods
- Background `#0f172a`, border `1px solid #1e293b`, zero box-shadow.
- Card Header: Integrated toolbar strip (height 28px), background `#090d16`, bottom border `1px solid #1e293b`, housing category identifier (e.g., `SEC-04 // AMMUNITION STOCK`) and status chip.
- Metrics display: Prominent monospace numerals (`telemetry-metric`) with secondary micro-labeling below for capacity caps and depletion rates.