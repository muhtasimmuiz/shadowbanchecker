---
name: Ultra-Modern SaaS System
colors:
  surface: '#fdf7ff'
  surface-dim: '#ded8e0'
  surface-bright: '#fdf7ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f2fa'
  surface-container: '#f2ecf4'
  surface-container-high: '#ece6ee'
  surface-container-highest: '#e6e0e9'
  on-surface: '#1d1b20'
  on-surface-variant: '#494551'
  inverse-surface: '#322f35'
  inverse-on-surface: '#f5eff7'
  outline: '#7a7582'
  outline-variant: '#cbc4d2'
  surface-tint: '#6750a4'
  primary: '#4f378a'
  on-primary: '#ffffff'
  primary-container: '#6750a4'
  on-primary-container: '#e0d2ff'
  inverse-primary: '#cfbcff'
  secondary: '#63597c'
  on-secondary: '#ffffff'
  secondary-container: '#e1d4fd'
  on-secondary-container: '#645a7d'
  tertiary: '#765b00'
  on-tertiary: '#ffffff'
  tertiary-container: '#c9a74d'
  on-tertiary-container: '#503d00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#cfbcff'
  on-primary-fixed: '#22005d'
  on-primary-fixed-variant: '#4f378a'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#cdc0e9'
  on-secondary-fixed: '#1f1635'
  on-secondary-fixed-variant: '#4b4263'
  tertiary-fixed: '#ffdf93'
  tertiary-fixed-dim: '#e7c365'
  on-tertiary-fixed: '#241a00'
  on-tertiary-fixed-variant: '#594400'
  background: '#fdf7ff'
  on-background: '#1d1b20'
  surface-variant: '#e6e0e9'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
---

## Brand & Style

This design system is engineered for high-growth SaaS platforms that prioritize clarity and technical sophistication. It blends the structural rigor of Linear with the fluid, luminous aesthetics of Stripe. 

The visual narrative is built on **Premium Glassmorphism**. Surfaces are treated as semi-translucent layers that interact with the background through high-precision backdrop blurs and subtle white inner-borders. The emotional response should be one of "effortless power"—a workspace that feels light and airy but remains deeply functional. Gradient accents are used sparingly to guide the eye toward primary actions and signify "active" states in an otherwise minimalist environment.

## Colors

The palette is anchored by a cool, architectural gray background (`#F7F9FC`) which provides a stable foundation for the vibrant primary accents. 

**Primary Colors:** The system uses a dual-primary approach. Blue (`#4DA3FF`) is used for core functional actions and data visualization, while Purple (`#8B5CF6`) is reserved for premium features, onboarding, and high-impact brand moments.

**Surface Strategy:** Surfaces are rarely pure white. Instead, they use varying levels of opacity and backdrop filters to create a sense of depth against the background. 

**Semantic Usage:** Semantic colors follow standard conventions but are adjusted for high legibility against the light-blue tinted background. Orange (`#FB923C`) acts as a bridge between Warning and Danger, specifically for non-destructive but urgent notifications.

## Typography

The typography system uses a tiered approach to balance character and utility. 

**Hanken Grotesk** is the voice of the brand, used for headlines and large display text. Its sharp, contemporary geometry mirrors the ultra-modern aesthetic. **Inter** handles the heavy lifting for body text and UI controls, chosen for its exceptional legibility and neutral tone. **JetBrains Mono** is introduced for labels, metadata, and "technical" micro-copy to evoke a sense of precision and developer-centricity.

Hierarchy is established through tight line-heights for headings and generous spacing for body copy to ensure long-form readability.

## Layout & Spacing

The layout is built on a 12-column fluid grid that transitions into a single-column stack for mobile devices. 

**Spacing Rhythm:** A strict 8px base unit (the "spacing unit") governs all margins and paddings. 

**White Space:** This system prioritizes negative space. Sections should be separated by `xxl` (80px) vertical gaps to maintain the "spacious" feel requested. Mobile layouts should condense this to `xl` (48px) to reduce excessive scrolling.

**Alignment:** All card content should maintain a consistent `lg` (24px) internal padding, matching the corner radius of the cards themselves for visual harmony.

## Elevation & Depth

Elevation in this design system is achieved through **Tonal Stacking** and **Ambient Shadows**, rather than heavy black drop shadows.

1.  **Level 0 (Background):** `#F7F9FC` - The base canvas.
2.  **Level 1 (Cards/Surfaces):** White or 70% semi-transparent white. Features a 1px border of `rgba(0,0,0,0.05)` and a very soft, diffused shadow: `0px 4px 20px rgba(0, 0, 0, 0.03)`.
3.  **Level 2 (Floating/Popovers):** Higher transparency with a `blur(12px)` backdrop filter. The shadow becomes more pronounced: `0px 12px 40px rgba(0, 0, 0, 0.08)`.
4.  **Glassmorphism:** Apply a subtle 1px white "inner-glow" stroke (`rgba(255, 255, 255, 0.8)`) to the top and left edges of glass elements to simulate light catching the edge of the pane.

## Shapes

The shape language is defined by large, friendly radii that contrast with the precise typography.

**Key Values:**
- **Cards:** 24px corner radius. This is the signature element of the system and must be consistent across all container types.
- **Buttons & Inputs:** Use a medium radius (10px-12px). This differentiates interactive components from the structural containers.
- **Tags/Chips:** Semi-pill (8px) to maintain a modern, compact look.

Avoid full circles except for avatars or specific icon-only circular buttons.

## Components

**Buttons:**
- **Primary:** Gradient background (Blue to Purple) with white text. Soft shadow that expands slightly on hover.
- **Secondary:** Glass-style white background with a 1px `rgba(0,0,0,0.05)` border.
- **Tertiary:** No border or background; text-only with a color shift on hover.

**Cards:**
- Must use the 24px radius.
- Incorporate a subtle 1px border. For premium features, use a very faint gradient border (Blue to Purple at 10% opacity).

**Input Fields:**
- Background should be slightly darker than the surface (`#F1F5F9`) or semi-transparent glass.
- On focus, the border shifts to the primary Blue with a 3px soft outer glow (spread).

**Navigation:**
- Sidebars should use the glassmorphism effect (`backdrop-filter: blur(10px)`) to allow background colors or shapes to bleed through slightly, creating a sense of continuity.

**Data Visualization:**
- Use the primary Blue and Purple for main datasets.
- Use a "Glow" effect: a subtle drop shadow behind lines or bars that matches the stroke color.