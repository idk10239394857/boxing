# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Expo + React Native + TypeScript. The same design ships to iOS, Android and the web (deployed on Vercel); one design language, not per-OS.

## Users

Amateur boxers training on their own. Two scenes dominate: on a phone at the gym, logging between rounds or right after training (sweaty hands, bright overhead light, quick glances); and at home in front of a laptop, shadowboxing with Shadow Cam and the round timer running, several feet from the screen.

## Product Purpose

A boxing training tracker: log sessions, punches and techniques, and see progress over time. Success is the fighter training more consistently and being able to see it.

## Positioning

Built around boxing rather than generic fitness: punch-by-punch strike stats, a technique library with 3D demonstrations, a roadmap of skill tiers, and Shadow Cam, which counts punches, slips and rolls from the camera on-device.

## Operating Context

- Five tabs: Fighter (home/profile), Techniques (library and log), Strikes (stats with steppers and a ring visualisation), Calendar, Roadmap (tiers).
- Supporting screens: log session, round timer (with bells and beeps), Shadow Cam (solo or two-fighter sparring), technique detail with 3D demo, profile.
- XP, levels, FightStreak, celebration modals and achievements.
- Used mid-workout: glanceable from a distance, operable with gloves just off.

## Capabilities and Constraints

- No accounts or backend; data lives on the device.
- Dark mode only (user-confirmed).
- The 3D boxer figure and the Shadow Cam tracking skeleton overlay are out of scope for visual changes (user-confirmed).
- Fonts load through Expo (`@expo-google-fonts/*`); icons from `@expo/vector-icons` MaterialCommunityIcons.

## Brand Commitments

- Name: FIGHTFLOW.
- Feel: a serious training tool. A precise, premium instrument for a fighter; calm, confident and data-forward. Gamification stays but should read as earned, not cartoony.

## Evidence on Hand

Seed data and the user's own logged sessions only. No testimonials, users counts or claims exist; do not invent any.

## Product Principles

1. Glanceable mid-workout: the number that matters is readable from across the room.
2. Earned, not hyped: progress and rewards reflect real work.
3. Boxing-literate: use the sport's own language and structure (rounds, combos, corners).
4. Honest tracking: show what the camera can and cannot see; let the fighter correct counts.

## Accessibility & Inclusion

High contrast for bright gyms and viewing from a distance; large touch targets for taped or sweaty hands; respect reduced motion.
