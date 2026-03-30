# Midnight Glass Design System

### 1. Overview & Creative North Star
**Creative North Star: The Cinematic Curator**
Midnight Glass is a design system built for immersive, high-fidelity content discovery. It rejects the "flat" web in favor of depth, transparency, and atmospheric lighting. By utilizing a deep navy-slate foundation paired with vibrant violet accents and "glass" surfaces, the system mimics a high-end physical gallery or a cinematic interface. It prioritizes content through intentional asymmetry and extreme typographic scale, ensuring that the interface feels like an extension of the media it hosts.

### 2. Colors
The palette is rooted in a dark, high-contrast spectrum designed to make imagery "pop."

*   **Primary Roles:** A high-saturation Violet (`#8d31e3`) serves as the brand's heartbeat, used for critical actions and progress indicators.
*   **The "No-Line" Rule:** Sectioning is achieved through color blocks and transparency shifts. Traditional 1px solid borders are replaced by background container changes (e.g., shifting from `surface` to `surface_container_low`).
*   **Surface Hierarchy & Nesting:** Use `rgba(255, 255, 255, 0.03)` for broad panels and `0.05` for interactive cards. This creates a logical sense of "nearness" to the user.
*   **The "Glass & Gradient" Rule:** Floating UI elements must use `backdrop-filter: blur(12px)`. Hero sections should utilize a background-dark-to-transparent gradient to anchor text over imagery.

### 3. Typography
The system uses **Inter** exclusively, relying on weight and case to create a sophisticated hierarchy.

*   **Display / Hero:** 3rem (48px) to 4.5rem (72px), Black (900) weight, with `leading-none` and tight tracking to create a heavy, editorial impact.
*   **Headlines:** 1.5rem (24px) for section headers, Bold (700) weight.
*   **Body Text:** 1.125rem (18px) for primary synopses to ensure readability, and 0.875rem (14px) for metadata.
*   **Labels & Metadata:** 10px to 14px, typically Bold (700) and Uppercase with `tracking-widest` to differentiate from narrative text.

The typographic rhythm is intentionally varied, moving from massive display titles to tiny, precise technical metadata to create a "rich" data environment.

### 4. Elevation & Depth
Elevation is expressed through light transmittance and blurred shadows rather than physical height.

*   **Cinematic Shadows:** High-impact elements like posters use a deep, diffused shadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5)`.
*   **Tonal Layering:** The depth is defined by stacking. A background image is at the lowest level, followed by a gradient overlay, then the `surface_container` panels.
*   **The Layering Principle:** Nested elements should always be lighter (more "opaque") than their parents to signify focus.
*   **Glassmorphism:** All "interactive" overlays (like action bars) must apply a blur to the content beneath them to maintain context while ensuring legibility.

### 5. Components
*   **Buttons:** Primary buttons are solid violet with rounded-xl (0.75rem) corners. Secondary buttons use `outline-variant` (white/10) with a glass background.
*   **Cards:** "Glass-cards" use a subtle `white/5` background and `white/10` border. On hover, the border opacity should increase to `primary/50`.
*   **Inputs & Selects:** Fields should be borderless, using `surface_container` as the background with white text and `primary` for focus rings.
*   **Chips:** Pill-shaped, using `slate-800` backgrounds for metadata or `primary` for high-status alerts (e.g., "Trending").

### 6. Do's and Don'ts
**Do:**
*   Use massive typographic scales for main titles to break the grid.
*   Apply backdrop blurs to any UI element that overlaps an image.
*   Use subtle 1px borders only when they are semi-transparent (`rgba(255, 255, 255, 0.1)`).

**Don't:**
*   Use pure black (#000) for backgrounds; use the deep Slate-900/Background-Dark to maintain "airiness."
*   Use default browser outlines or sharp 90-degree corners.
*   Over-rely on shadows; let the change in background transparency define the boundary of most components.