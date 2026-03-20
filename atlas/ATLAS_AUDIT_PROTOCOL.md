# ATLAS Design Audit Protocol

## Overview

This is the structured audit the ATLAS agent runs against any existing design before proposing improvements. It examines every layer of a design — from structural architecture to sub-pixel details — and produces a prioritized remediation plan.

Run every section. Score every item. Skip nothing.

---

## Scoring System

Each item is scored on a 4-point scale:

| Score | Meaning | Action |
|-------|---------|--------|
| **4** | Exemplary — exceeds expectations, could be used as a reference | Preserve and protect |
| **3** | Solid — meets standards, no issues | No action needed |
| **2** | Adequate — functional but leaves value on the table | Improve in next iteration |
| **1** | Deficient — actively harms the experience | Fix immediately |
| **0** | Missing — expected element does not exist | Build from scratch |

---

## Layer 1: First Impressions (The 3-Second Test)

These questions are answered in the first 3 seconds of seeing the screen. They represent the user's subconscious assessment.

| # | Audit Item | Score | Notes |
|---|-----------|-------|-------|
| 1.1 | **Visual hierarchy is immediately clear.** Can you identify the single most important element without reading? | | |
| 1.2 | **The purpose of the screen is obvious.** A stranger could tell you what this page is for within 3 seconds. | | |
| 1.3 | **The primary action is unmistakable.** There is one clear thing the user should do next, and it's visually dominant. | | |
| 1.4 | **The emotional tone is appropriate.** The screen *feels* like what the product claims to be. | | |
| 1.5 | **Nothing fights for attention.** There is a clear focal point, not a battlefield of competing elements. | | |
| 1.6 | **The design has a point of view.** It looks designed, not assembled. It has aesthetic conviction. | | |

**Layer 1 Threshold:** If any item scores 0 or 1, this is the priority before all else.

---

## Layer 2: Typography

| # | Audit Item | Score | Notes |
|---|-----------|-------|-------|
| 2.1 | **Typeface selection is intentional.** Fonts have personality that matches the product. Not defaults. | | |
| 2.2 | **Type hierarchy uses no more than 2 families.** Display + body (with optional mono for functional use). | | |
| 2.3 | **Body text is legible.** Size ≥ 15px, line-height 1.5–1.7, adequate contrast against background. | | |
| 2.4 | **Heading scale is consistent.** Uses a modular scale, not arbitrary sizes. Clear differentiation between levels. | | |
| 2.5 | **Font weights are purposeful.** Weight is used to establish hierarchy, not decoration. No more than 3–4 weights in active use. | | |
| 2.6 | **Letter-spacing is considered.** Slightly negative for large display text, neutral or slightly positive for body and small text. | | |
| 2.7 | **Line lengths are controlled.** Body text measure is 45–75 characters per line. Not running edge-to-edge on wide screens. | | |
| 2.8 | **Typographic details are polished.** Proper quotation marks, em dashes, ellipses, tabular nums for data, hanging punctuation where appropriate. | | |
| 2.9 | **Text color values are intentional.** Primary, secondary, and muted text colors are distinct and meaningful, not just "black" and "gray." | | |
| 2.10 | **Responsive type scales gracefully.** Text is readable at every breakpoint without breaking layouts or becoming absurdly large/small. | | |

---

## Layer 3: Color & Palette

| # | Audit Item | Score | Notes |
|---|-----------|-------|-------|
| 3.1 | **Palette has a clear logic.** Ink, ivory, accent — or an equally structured system. Not a grab-bag of colors. | | |
| 3.2 | **Background is not pure white or pure black.** Backgrounds have temperature and character. | | |
| 3.3 | **Accent color is used sparingly.** Appears in ≤ 3 locations per view. Earns attention rather than demanding it. | | |
| 3.4 | **Contrast ratios meet WCAG AA.** Body text: 4.5:1. Large text: 3:1. Interactive elements: 3:1 against adjacent colors. | | |
| 3.5 | **Color is never the sole indicator of state.** Every color-conveyed meaning has a secondary indicator (icon, text, pattern). | | |
| 3.6 | **Surface hierarchy uses color.** Raised, base, and sunken surfaces have distinct but related values. | | |
| 3.7 | **Borders and dividers use subtle, derived colors.** Not hard-coded grays. Transparent blacks or tinted values that relate to the palette. | | |
| 3.8 | **Dark mode (if present) is independently designed.** Not an inversion. Separate palette preserving the same relational logic. | | |
| 3.9 | **Semantic colors are distinct from brand colors.** Error, warning, success, and info have their own palette that doesn't collide with the accent. | | |

---

## Layer 4: Spacing & Layout

| # | Audit Item | Score | Notes |
|---|-----------|-------|-------|
| 4.1 | **Spacing uses a consistent scale.** All margins, padding, and gaps derive from a base unit (4px or 8px). No magic numbers. | | |
| 4.2 | **Proximity groups related elements.** Things that belong together are close together. Unrelated items have meaningful separation. | | |
| 4.3 | **Alignment is rigorous.** Elements snap to a grid. Left edges align. Baselines align where appropriate. Nothing is "close enough." | | |
| 4.4 | **Whitespace is generous and structured.** The layout breathes. Negative space creates rhythm, not emptiness. | | |
| 4.5 | **Content width is constrained.** Max-width is set for readability on large screens. Content doesn't stretch to fill 1920px. | | |
| 4.6 | **Responsive layout is considered, not crammed.** Breakpoints reorganize content, they don't just squeeze it. | | |
| 4.7 | **Vertical rhythm is maintained.** Spacing between sections follows a pattern. The page has a pulse. | | |
| 4.8 | **The layout has compositional interest.** Not just stacked rows of centered content. There is asymmetry, visual weight distribution, or grid variation. | | |

---

## Layer 5: Interactive Elements

| # | Audit Item | Score | Notes |
|---|-----------|-------|-------|
| 5.1 | **Buttons have clear hierarchy.** Primary, secondary, and tertiary actions are visually distinct. Only one primary per view. | | |
| 5.2 | **All five states are designed.** Default, hover, focus, active, and disabled — for every interactive element. | | |
| 5.3 | **Focus states are visible and beautiful.** Not browser defaults. Not invisible. Custom focus rings that match the design system. | | |
| 5.4 | **Touch targets are adequate.** Minimum 44×44px on touch devices. Adequate spacing between adjacent targets. | | |
| 5.5 | **Interactive elements look interactive.** Affordances are clear. Links look like links. Buttons look like buttons. Clickable areas are obvious. | | |
| 5.6 | **Form inputs are well-designed.** Adequate size, clear labels (above, not floating), visible borders/backgrounds, inline validation. | | |
| 5.7 | **Feedback is immediate and contextual.** Users know their action was received. Confirmation is specific ("Saved" not "Success"). | | |
| 5.8 | **Destructive actions have friction.** Delete, remove, and irreversible actions require confirmation. The confirmation is specific about consequences. | | |

---

## Layer 6: Motion & Animation

| # | Audit Item | Score | Notes |
|---|-----------|-------|-------|
| 6.1 | **Motion exists and serves a purpose.** Interfaces are not static. Transitions communicate state changes. | | |
| 6.2 | **Easing is intentional.** Custom cubic-bezier curves, not `ease` or `linear`. Motion feels physical, not computed. | | |
| 6.3 | **Duration is appropriate.** 150–400ms for micro-interactions. Longer for page transitions. Nothing feels sluggish or jarring. | | |
| 6.4 | **Entrance animations are staggered.** Related elements animate in sequence, not simultaneously. Creates a sense of choreography. | | |
| 6.5 | **Reduced motion is respected.** `prefers-reduced-motion: reduce` disables non-essential animation. Critical state changes still communicate. | | |
| 6.6 | **Scroll-driven effects (if any) are performant.** No jank. No layout thrashing. GPU-accelerated properties (transform, opacity) preferred. | | |
| 6.7 | **Motion does not block interaction.** Users can click, type, or navigate during animations. Nothing gates behind "wait for the animation." | | |

---

## Layer 7: Content & Microcopy

| # | Audit Item | Score | Notes |
|---|-----------|-------|-------|
| 7.1 | **Button labels are specific.** "Save draft" not "Submit." "Remove from list" not "Delete." Verbs that describe the outcome. | | |
| 7.2 | **Error messages are helpful.** They explain what happened and what to do. Not "Error" or "Something went wrong." | | |
| 7.3 | **Empty states provide direction.** Not just "Nothing here" — they tell the user how to change that. | | |
| 7.4 | **Confirmation messages are specific.** "Project saved at 3:42 PM" not "Success!" | | |
| 7.5 | **Labels and terminology are consistent.** The same concept uses the same word everywhere. | | |
| 7.6 | **Tone matches the product personality.** Professional products sound professional. Creative tools sound creative. Nothing sounds like a chatbot trying too hard. | | |
| 7.7 | **Loading states communicate progress.** Skeleton screens, progress indicators, or contextual messages — not just spinners. | | |

---

## Layer 8: Texture & Craft

| # | Audit Item | Score | Notes |
|---|-----------|-------|-------|
| 8.1 | **Backgrounds have depth.** Subtle gradients, noise, or texture — not flat solid fills. | | |
| 8.2 | **Shadows are layered and realistic.** Multiple shadows at different distances simulate real light. Not a single `box-shadow`. | | |
| 8.3 | **Icons are consistent in style and weight.** All from the same family, same stroke weight, same optical size. | | |
| 8.4 | **Border radii are systematic.** A defined scale (sm/md/lg), not random values per component. | | |
| 8.5 | **Scrollbars are styled.** Custom colors and dimensions that match the palette. Not browser defaults. | | |
| 8.6 | **Selection highlight is themed.** `::selection` color matches the design system. | | |
| 8.7 | **Images and media have considered treatments.** Aspect ratios are maintained. Loading states exist. Fallbacks for broken images. | | |
| 8.8 | **The design contains at least one Easter egg or moment of unexpected delight.** A detail that rewards close attention. | | |

---

## Layer 9: Performance & Accessibility

| # | Audit Item | Score | Notes |
|---|-----------|-------|-------|
| 9.1 | **Semantic HTML is used throughout.** Proper landmarks, headings, lists, and labels. | | |
| 9.2 | **Keyboard navigation works completely.** Every interactive element is reachable and usable without a mouse. | | |
| 9.3 | **Screen reader experience is coherent.** ARIA labels where needed. Live regions for dynamic content. Logical reading order. | | |
| 9.4 | **Fonts are loaded efficiently.** `font-display: swap` or `optional`. Subset if possible. Not blocking render. | | |
| 9.5 | **Images are optimized.** Appropriate formats (WebP/AVIF where supported), srcset for responsive images, lazy loading below the fold. | | |
| 9.6 | **CSS is efficient.** No massive unused stylesheets. Specificity is managed. Custom properties are used for theming. | | |
| 9.7 | **The interface works without JavaScript for core content.** Progressive enhancement where possible. | | |

---

## Audit Output Format

After completing the audit, produce a summary in this structure:

### Overall Score
Sum of all scored items divided by total possible points. Express as a percentage and a letter grade:
- **A (90–100%):** Exceptional. Minor polish only.
- **B (75–89%):** Strong. Targeted improvements will elevate significantly.
- **C (60–74%):** Adequate. Structural and surface improvements needed.
- **D (40–59%):** Deficient. Significant redesign required in multiple layers.
- **F (0–39%):** Failing. Fundamental rethinking needed.

### Critical Issues (Score 0–1)
Listed in priority order with specific remediation steps.

### High-Impact Improvements (Score 2)
Listed in order of user impact — what will make the most difference for the least effort?

### Strengths to Preserve (Score 3–4)
What's working and should be carried forward in any redesign.

### Recommended Redesign Scope
One of:
- **Polish** — Keep the structure, refine the surface. (1–2 days)
- **Refinement** — Restructure key components, overhaul visual system. (3–5 days)
- **Redesign** — New visual direction, new component architecture, same content/features. (1–2 weeks)
- **Rethink** — The underlying IA, user flow, or product assumptions need revisiting before visual design. (2+ weeks)

### The Three Moves
If you could only do three things to this design, what would they be? These should be the highest-leverage changes that would most transform the experience.

---

## Using This Audit in Conversation

When the ATLAS agent is asked to improve a design, it should:

1. Run this audit silently (do not dump the full scorecard on the user unless asked)
2. Synthesize findings into a **Diagnosis** section in the response
3. Focus the response on the Critical Issues and Three Moves
4. Reference specific audit items (e.g., "Layer 2, item 2.7 — your line lengths are running to ~95 characters, which is well past the readability threshold") to lend specificity
5. Offer to share the full audit if the user wants the complete picture

The audit is a thinking tool, not a deliverable — unless the user asks for it.
