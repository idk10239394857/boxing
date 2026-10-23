/**
 * Motion tokens from Apple Fluid MOTION.md, plus Apple's critically damped spring.
 * Every animation in the app takes its curve and duration from here.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Easing } from 'react-native';

export const ease = {
  /** --motion-ease-fluid: default movement */
  fluid: Easing.bezier(0.22, 1, 0.36, 1),
  /** --motion-ease-enter: entering surfaces */
  enter: Easing.bezier(0.16, 1, 0.3, 1),
  /** --motion-ease-exit: dismissals */
  exit: Easing.bezier(0.7, 0, 0.84, 0),
};

export const duration = { fast: 160, default: 320, slow: 560 };

/** Entrance staggers: cards 45 ms (max 270 ms total), list items 35 ms. */
export const stagger = { card: 45, cardMax: 270, item: 35 };

/**
 * Apple spring as stiffness/damping: response 0.35 s, damping ratio 1 (no overshoot).
 * k = (2π / response)², c = 2ζ√k with mass 1.
 */
const springFor = (response: number, ratio: number) => {
  const stiffness = (2 * Math.PI / response) ** 2;
  return { stiffness, damping: 2 * ratio * Math.sqrt(stiffness), mass: 1 };
};
export const spring = springFor(0.35, 1);
/** Only after a gesture that carried momentum (a flick or a drag release). */
export const springMomentum = springFor(0.35, 0.8);

/** Whether the user asked for reduced motion; updates live. */
export function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

/** Apple's momentum projection: where a flick at `velocity` (px/s) comes to rest. */
export const project = (velocity: number, rate = 0.998) => ((velocity / 1000) * rate) / (1 - rate);

/** Progressive resistance past an edge, instead of a hard stop. */
export const rubberband = (overshoot: number, dimension: number, c = 0.55) =>
  (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
