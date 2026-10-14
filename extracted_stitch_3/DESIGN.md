---
name: Objective Utility
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#434655'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#555f6d'
  on-secondary: '#ffffff'
  secondary-container: '#d6e0f1'
  on-secondary-container: '#596372'
  tertiary: '#006242'
  on-tertiary: '#ffffff'
  tertiary-container: '#007d55'
  on-tertiary-container: '#bdffdb'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#d9e3f4'
  secondary-fixed-dim: '#bdc7d8'
  on-secondary-fixed: '#121c28'
  on-secondary-fixed-variant: '#3e4755'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
  surface-pure: '#FFFFFF'
  surface-subtle: '#F9FAFB'
  surface-muted: '#F3F4F6'
  border-subtle: '#E5E7EB'
  border-strong: '#D1D5DB'
  tag-university-bg: '#EFF6FF'
  tag-university-text: '#1D4ED8'
  tag-health-bg: '#ECFDF5'
  tag-health-text: '#047857'
  tag-personal-bg: '#FFF7ED'
  tag-personal-text: '#C2410C'
  tag-urgent-bg: '#FEF2F2'
  tag-urgent-text: '#B91C1C'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.005em
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
  space-3xl: 3rem
---

## Brand & Style

This design system embodies an objective, high-efficiency personal productivity environment. Drawing inspiration from modern utilitarian software like Linear and Notion, the visual identity prioritizes clarity, informational density, and uncompromised legibility over decorative flourishes. 

The aesthetic is functional minimalism: pure neutral planes, crisp contrast ratios, and deliberate semantic accents. The user experience is immediate and responsive, treating everyday organizational workflows—task capture, calendar scheduling, and resource retrieval—as friction-free utility. Avoid abstract ornamentation, unnecessary gradients, and corporate jargon. Visual hierarchy is established strictly through clear typography, disciplined whitespace, and subtle perimeter borders.

## Colors

The color palette maintains extreme optical clarity across light mode. The canvas alternates cleanly between pure white (`surface-pure`) and subtle grayish whites (`surface-subtle` and `surface-muted`), avoiding eye fatigue during sustained screen time while maintaining strict component separation.

- **Primary (`#2563EB`):** A precise, focused royal blue reserved for focal interactive elements, primary triggers, active selection states, and systematic highlights.
- **Secondary (`#4B5563`):** Neutral slate for secondary controls, metadata text, and non-active icons.
- **Tertiary (`#10B981`):** Functional muted emerald for positive confirmations, completion milestones, and health/wellness categorizations.
- **Neutral (`#111827`):** Deep charcoal body color ensuring maximal contrast against white surfaces without the harshness of pure black.

Contextual category tagging relies on low-saturation pastel fills with high-contrast text pairings to prevent chromatic clutter while facilitating instant scanning:
- **University:** Blue tint (`#EFF6FF` / `#1D4ED8`)
- **Health / Gym:** Green tint (`#ECFDF5` / `#047857`)
- **Personal:** Soft orange tint (`#FFF7ED` / `#C2410C`)
- **Urgent / High-Priority:** Muted crimson tint (`#FEF2F2` / `#B91C1C`)

## Typography

Inter serves as the singular typographic workhorse across headline, body, and label roles. Its neutral geometry, tall x-height, and refined tabular figures align with high-efficiency productivity interfaces.

Tight, negative tracking is systematically applied to headlines (`headline-xl`, `headline-lg`) to maintain crisp visual density and prevent text from feeling disconnected. Body and microcopy prioritize open spacing and legible line-to-font height ratios (1.4–1.5x) for fatigue-free reading across density-heavy task lists, calendar agendas, and notes.

## Layout & Spacing

The layout philosophy follows a multi-pane productivity model with continuous, natural vertical scrolling. The main canvas never relies on screen-clipping wrappers or artificial viewport height locks (`overflow: hidden` on viewport bodies is strictly avoided).

### Spatial Architecture
- **Sidebar Navigation:** Fixed width of 240px on desktop (collapsible to a 56px icon bar on compact desktop / tablet, or bottom bar on mobile).
- **Primary Content Viewport:** Fluid layout bounded with a generous max-width container (`1280px`) centered on larger displays, using `gutter-lg` (24px) column spacing and `margin-lg` (32px) edge offsets.
- **Rhythm & Grid:** Built on an absolute 4px/8px coordinate rhythm. `space-sm` (8px) and `space-md` (12px) handle compact inline controls, while `space-lg` (16px) and `space-xl` (24px) govern module structure and card paddings.

### Breakpoints & Adaptability
- **Desktop (≥ 1024px):** Persistent left-side navigation with multi-column task queues, calendar grids, or resource boards.
- **Tablet (768px – 1023px):** Compact sidebar, responsive 2-column resource grids, fluid single-column timelines.
- **Mobile (< 768px):** Sidebar converts into a docked bottom navigation bar or top drawer. Main content area collapses into a continuous single-column flow with `margin` set to 16px.

## Elevation & Depth

Visual hierarchy is maintained via low-contrast outlines and tonal surface layering rather than dramatic, deep drop-shadows. This enforces the crisp, precise atmosphere of modern tools.

### Elevation Levels
- **Base Level (Canvas):** Background renders in `surface-subtle` (`#F9FAFB`).
- **Surface Level 1 (Cards, Modules, Input Containers):** `surface-pure` (`#FFFFFF`) with a 1px solid perimeter of `border-subtle` (`#E5E7EB`). No ambient shadow is applied in resting state.
- **Surface Level 2 (Hover States, Interactive Cards):** Retains `surface-pure` background with a subtle ambient shadow: `0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.02)`. Border strengthens to `border-strong` (`#D1D5DB`).
- **Overlay Level (Dropdown Menus, Datepickers, Tooltips):** Background in `surface-pure`, bordered by `border-subtle`, with an elevated floating shadow: `0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -1px rgba(0, 0, 0, 0.03)`.
- **Active Focus:** Interactive states receive a zero-blur crisp 2px offset ring in `primary_color_hex` (`#2563EB`) with 2px white gap.

## Shapes

The shape language reflects structured utility with subtle, restrained softening. All standard interactive components and cards conform to Roundedness Level 1.

- **Base Radius (0.25rem / 4px):** Applied to compact inputs, difficulty pills, checkboxes, tag badges, and calendar grid cells.
- **Large Radius (`rounded-lg`, 0.5rem / 8px):** Applied to primary cards, task quick-input panels, modal dialogues, and resource link cards.
- **Extra Large Radius (`rounded-xl`, 0.75rem / 12px):** Reserved exclusively for major application boundary containers and side drawer surfaces.
- **Circular (9999px):** Strictly reserved for user avatars, unread count badges, and circular status icons.

## Components

### Buttons
- **Primary:** Background `#2563EB`, text `#FFFFFF`, radius `4px`, padding `8px 14px`, text `label-md`. Hover: `#1D4ED8`. Focus: 2px ring offset.
- **Secondary / Outline:** Background `#FFFFFF`, border `1px solid #E5E7EB`, text `#111827`, radius `4px`, padding `8px 14px`. Hover: `#F9FAFB`, border `#D1D5DB`.
- **Ghost:** Background transparent, text `#4B5563`, radius `4px`, padding `6px 10px`. Hover: background `#F3F4F6`, text `#111827`.

### Segmented Controls (e.g., Difficulty Selectors)
- Container: Background `#F3F4F6`, padding `2px`, radius `6px`, inline-flex layout.
- Options: Radius `4px`, padding `4px 10px`, font `label-sm`. 
  - Resting: transparent background, text `#4B5563`.
  - Active: background `#FFFFFF`, text `#111827`, border `1px solid #E5E7EB`, subtle shadow `0 1px 2px rgba(0,0,0,0.05)`.

### Input Fields & Quick Task Bar
- Structure: Full-width or inline container with `#FFFFFF` fill, 1px border `#E5E7EB`, 6px border radius.
- Padding: `10px 14px` for prominent ingestion inputs; placeholder text in `#9CA3AF` with `body-md`.
- Focus State: Border color `#2563EB`, with a subtle 1px matching outline ring.

### Chips & Semantic Tags
- Geometry: Radius `4px`, padding `2px 8px`, typography `label-sm`.
- Layout: Icon (12px) aligned with 4px gap to text label.
- Color Pairings:
  - **University:** `#EFF6FF` background with `#1D4ED8` text.
  - **Health/Gym:** `#ECFDF5` background with `#047857` text.
  - **Personal:** `#FFF7ED` background with `#C2410C` text.

### Checkboxes & Task List Items
- Checkbox: 16px × 16px square, radius `3px`, 1px border `#D1D5DB`. Checked state displays `#2563EB` fill with a sharp white checkmark.
- Task Row: Padding `10px 12px`, border-bottom `1px solid #F3F4F6`, background transitions smoothly from `#FFFFFF` to `#F9FAFB` on hover. Completed tasks trigger strike-through formatting and reduce text opacity to 50%.

### Resource Cards (My Hub)
- Architecture: 1px border `#E5E7EB`, radius `8px`, background `#FFFFFF`, padding `16px`.
- Hover Behavior: Border transitions to `#D1D5DB`, subtle 2px translate upward, external link glyph transitions from `#9CA3AF` to `#2563EB`.

### Calendar Grid Cells
- Structure: Minimal 1px border grid using `#E5E7EB`.
- Day Header: `label-sm` in `#6B7280`. Active day badge features a clean `#2563EB` 20px circular indicator with white text.
- Task Pill in Cell: Low-height block (18px), radius `2px`, font `11px`, single-line truncated text with categorical color indicator.