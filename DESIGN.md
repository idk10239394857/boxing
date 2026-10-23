---
name: FightFlow
description: Fight night. Black under a red ring light, huge italic condensed headlines, sharp edges.
colors:
  ground: "#070707"
  text: "#FFFFFF"
  text-dim: "#B5B5B5"
  text-mute: "#6E6E6E"
  border: "#1E1E1E"
  border-hi: "#2C2C2C"
  red: "#E8202A"
  orange: "#FF7A45"
  gold: "#FFC24A"
  steel: "#8C8C8C"
typography:
  poster:
    fontFamily: "Barlow Condensed"
    fontWeight: 800
    fontStyle: italic
    textTransform: uppercase
    sizes: "84-112px hero, 58-76px screen titles, 34px sections, 19-24px buttons"
  caps:
    fontFamily: "Barlow Condensed"
    fontWeight: 600
    letterSpacing: "0.18em"
    textTransform: uppercase
  body:
    fontFamily: "Inter Tight"
    fontSize: "15-16px"
    fontWeight: 400
rounded:
  all: "0"
---

# Design System: FightFlow

## Overview

A fight poster you train with. Black ground, a red ring light glowing from the top right with a slash of red tape across the corner, and headlines set like a fight bill: heavy italic condensed caps, very large. White and red do the talking; everything else is grey. Sections are separated by rules and space, not boxes. Dark mode only.

## Colors

- **Red** is the corner colour: primary buttons, kickers, emphasis lines in headlines, today, earned trophies, the active tab.
- **White** is the other voice: headlines and numbers.
- **Orange, gold, steel** only mark punch and session types (jab white, cross red, hook orange, uppercut gold, body steel).
- Fills are flat. No gradients except the ring-light glow and the tab bar fade.

## Typography

- **Poster** (Barlow Condensed 800 italic, uppercase): headlines, numbers, button labels. `Display` switches to it from 22px up.
- **Caps** (Barlow Condensed 600, tracked 0.18em): the red kicker above a headline, stat labels, chips, tab labels.
- **Inter Tight**: sentences, names, table rows.

## Shapes

Square everywhere. Primary buttons are a red slab skewed -12deg so the trailing edge is cut at an angle. Secondary buttons, chips and steppers are 1.5px outlines. Progress is a flat 3px line; segments are skewed slabs. Inputs are underlines.

## Layout

- The Fighter hero leads with the streak as a headline ("FOUR DAYS. / DON'T STOP."), one line of context, three big italic numbers, then Log training and the Shadow Cam / Round timer pair.
- Screen titles sit under a red kicker at 58px (phone) or 76px (laptop).
- One readable column (680px) on phones; from 1024px a side rail and two columns up to 1160px.
- The phone tab bar is flat over a fade to black, with a red slash marking the active tab.

## Motion

Apple Fluid MOTION.md tokens live in `src/lib/motion.ts` (fluid/enter/exit curves; 160/320/560 ms) with Apple's critically damped spring (response 0.35 s) for anything touched.

- Entrances: each block rises 20px and fades in over 320ms, 45ms apart (max 270ms); titles rise 28px over 560ms. They replay when a tab regains focus.
- Press: buttons scale to 0.96, surfaces to 0.985.
- Tabs: the red slash slides between tabs over 320ms.
- Numbers count up; progress fills sweep in.
- Responsive: the hero headline tilts toward the pointer or with the phone (max 5°); the ring light scrolls slower than content and dims; calendar months drag with rubber-banding and momentum.
- Reduced motion: transforms off, short fades only.

## Do's and Don'ts

### Do:
- Lead each screen with one huge word or number.
- Use red for one thing per view: the action or the emphasis.

### Don't:
- Put content in filled boxes or rounded cards.
- Use gradients on buttons, bars or text.
- Restyle the 3D boxer or the Shadow Cam skeleton overlay; they keep their own palettes.
