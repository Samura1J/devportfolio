---
name: "Apex Engineering"
description: "A dark-mode-first, razor-sharp engineering portfolio system tailored for high-trust technical hiring and freelance product builds."
---

## Overview

Corey Joseph's updated portfolio bridges full-stack engineering ambition with refined product design. The visual direction features a crisp, editorial light canvas grounded in clean porcelain surfaces, laser-accurate typography, calibrated deep cobalt interactive primaries, sharp slate borders, and systematic case-study presentation. It speaks directly to two high-value audiences: tech hiring managers seeking architecture-minded developers, and founders looking for end-to-end web deliverables.

## Colors

The system uses a focused light neutral foundation grounded in crisp porcelain and cool slate with crisp contrast boundaries, complemented by an authoritative royal cobalt primary and emerald status accents for production readiness.

```yaml
colors:
  accent: "#0891B2"
  success: "#059669"
  warning: "#D97706"
  error: "#DC2626"
  light:
    primary: "#1D4ED8"
    on-primary: "#FFFFFF"
    surface: "#F8FAFC"
    on-surface: "#0F172A"
    surface-container: "#FFFFFF"
    surface-container-high: "#F1F5F9"
    outline: "#CBD5E1"
  dark:
    primary: "#60A5FA"
    on-primary: "#0B192C"
    surface: "#090D16"
    on-surface: "#F1F5F9"
    surface-container: "#111827"
    surface-container-high: "#1E293B"
    outline: "#334155"
```

## Typography

Pairing Red Hat Text for structured headers, Instrument Sans for clean human body copy, and Source Code Pro for technical badges, code snippets, and architecture notes.

```yaml
typography:
  display-lg:
    fontFamily: "Red Hat Text"
    fontSize: 48px
    fontWeight: 700
    lineHeight: 56px
    letterSpacing: -1px
  display-lg-mobile:
    fontFamily: "Red Hat Text"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 40px
    letterSpacing: -0.5px
  headline-lg:
    fontFamily: "Red Hat Text"
    fontSize: 36px
    fontWeight: 700
    lineHeight: 44px
    letterSpacing: -0.5px
  headline-lg-mobile:
    fontFamily: "Red Hat Text"
    fontSize: 28px
    fontWeight: 700
    lineHeight: 36px
    letterSpacing: -0.25px
  headline-md:
    fontFamily: "Red Hat Text"
    fontSize: 24px
    fontWeight: 600
    lineHeight: 32px
    letterSpacing: -0.25px
  headline-sm:
    fontFamily: "Red Hat Text"
    fontSize: 20px
    fontWeight: 600
    lineHeight: 28px
  body-lg:
    fontFamily: "Instrument Sans"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 28px
  body-md:
    fontFamily: "Instrument Sans"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
  body-sm:
    fontFamily: "Instrument Sans"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  label-lg:
    fontFamily: "Red Hat Text"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 22px
  label-md:
    fontFamily: "Red Hat Text"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 18px
  label-sm:
    fontFamily: "Source Code Pro"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
```

## Layout & Spacing

A responsive desktop-first grid with max-width 1200px. Built upon an 8px modular scale.

```yaml
spacing:
  gutter-xs: 4px
  gutter-sm: 8px
  gutter-md: 16px
  gutter-lg: 24px
  gutter-xl: 32px
  section: 64px
  page-margin: 24px
```

## Elevation & Depth

Subtle surface contrast steps combined with low-opacity slate outlines. Elevated cards use deep neutral container fills with crisp border boundaries rather than heavy noisy drop shadows.

## Shapes

Sharp, industrial, flat-cornered aesthetic emphasizing technical discipline, structure, and precision across all cards, buttons, badges, and containers.

```yaml
rounded:
  sm: 0px
  DEFAULT: 0px
  md: 0px
  lg: 0px
  xl: 0px
  full: 9999px
```

## Motion & Micro-interaction

Micro-interactions are instantaneous, sharp, and purposeful. Links and cards ease transitions smoothly without delayed spring animations.

```yaml
motion:
  state-change:
    duration: 150ms
    delay: 0ms
    timingFunction: cubic-bezier(0.16, 1, 0.3, 1)
  surface-enter:
    duration: 240ms
    delay: 0ms
    timingFunction: cubic-bezier(0.16, 1, 0.3, 1)
  surface-exit:
    duration: 150ms
    delay: 0ms
    timingFunction: ease-in
```

## Voice & Content Strategy

The voice is assertive, technically specific, and outcome-oriented. Instead of vague descriptions ("I built a weather app"), the content frames architecture, problems solved, stack decisions (React, APIs, caching, state management, full-stack roadmap), and quantitative impact. Action verbs lead all calls to action ("View Live Demo", "Inspect Codebase", "Schedule Technical Chat").

## Components

Component implementations live as individual HTML sticker sheet files in
`components/`. Each file contains the canonical, styled HTML components with
`<!-- COMPONENT: name -->` comment markers. Read each file before use.

- **Button** → `@components/button.html`: `button-primary`, `button-icon`, `button-with-icon`
- **Card** → `@components/card.html`: `card-elevated`, `card-action`, `card-interactive`, `card-interactive-2`
- **Chip** → `@components/chip.html`: `chip-action`, `chip-input`, `chip-with-icon`
- **Typography** → `@components/typography.html`: `typography-display`, `typography-body`, `typography-label`
