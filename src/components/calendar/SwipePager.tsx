import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Animated, PanResponder, Platform, View } from 'react-native';
import { project, rubberband, spring, springMomentum, useReducedMotion } from '../../lib/motion';

const native = Platform.OS !== 'web';

/**
 * Drag a page sideways to turn it. Tracks the finger 1:1 after 10 px of hysteresis, resists
 * past 60% of the width, projects the release velocity to decide, and hands that velocity to
 * the spring. The next page enters from the side the old one left by. Arrow buttons get the
 * same entrance via `from`.
 */
export function SwipePager({ pageKey, from, onPage, children }: { pageKey: string; from: -1 | 0 | 1; onPage: (delta: 1 | -1) => void; children: ReactNode }) {
  const dx = useRef(new Animated.Value(0)).current;
  const width = useRef(320);
  const swiped = useRef<1 | -1 | null>(null);
  const reduce = useReducedMotion();
  const onPageRef = useRef(onPage);
  onPageRef.current = onPage;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderGrant: () => dx.stopAnimation(),
        onPanResponderMove: (_, g) => {
          const lim = width.current * 0.6;
          const over = Math.abs(g.dx) - lim;
          dx.setValue(over > 0 ? Math.sign(g.dx) * (lim + rubberband(over, width.current)) : g.dx);
        },
        onPanResponderRelease: (_, g) => {
          const end = g.dx + project(g.vx * 1000);
          const w = width.current;
          if (Math.abs(end) > w * 0.35) {
            const delta: 1 | -1 = end < 0 ? 1 : -1; // dragged left → next month
            Animated.spring(dx, { toValue: -delta * w, velocity: g.vx, ...springMomentum, overshootClamping: true, useNativeDriver: native }).start(() => {
              swiped.current = delta;
              onPageRef.current(delta);
            });
          } else {
            Animated.spring(dx, { toValue: 0, velocity: g.vx, ...springMomentum, useNativeDriver: native }).start();
          }
        },
        onPanResponderTerminate: () => Animated.spring(dx, { toValue: 0, ...spring, useNativeDriver: native }).start(),
      }),
    [dx],
  );

  // A new page enters along the same path the old one left by.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const fromSwipe = swiped.current !== null;
    const dir = swiped.current ?? from;
    swiped.current = null;
    if (!dir || reduce) return dx.setValue(0);
    // After a swipe the page comes in from the far edge; after an arrow tap, a short slide.
    dx.setValue(dir * width.current * (fromSwipe ? 1 : 0.35));
    Animated.spring(dx, { toValue: 0, ...spring, useNativeDriver: native }).start();
  }, [pageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // No text selection while dragging on the web.
    <View style={[{ overflow: 'hidden' }, !native && ({ userSelect: 'none', cursor: 'grab', touchAction: 'pan-y' } as object)]} onLayout={(e) => (width.current = e.nativeEvent.layout.width)} {...pan.panHandlers}>
      <Animated.View
        style={{
          transform: [{ translateX: dx }],
          opacity: dx.interpolate({ inputRange: [-400, 0, 400], outputRange: [0.2, 1, 0.2], extrapolate: 'clamp' }),
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}
