import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { createBoxerScene } from './boxerScene';
import { loopLength, sampleClip, withRhythm } from './clips';
import { mirrorSkeleton, solvePose } from './rig';
import type { BoxerViewerProps } from './types';

/** Fight-night 3D boxer performing a technique clip. Drag to orbit. */
export function BoxerViewer({ clip, speed, paused, view, southpaw, height }: BoxerViewerProps) {
  const host = useRef<HTMLElement | null>(null);
  const state = useRef({ speed, paused, southpaw, azimuth: view, elevation: 0.16 });
  state.current.speed = speed;
  state.current.paused = paused;
  state.current.southpaw = southpaw;

  // Snap the camera when a view preset is picked.
  useEffect(() => {
    state.current.azimuth = view;
  }, [view]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const boxer = createBoxerScene();
    const canvas = boxer.renderer.domElement;
    canvas.style.touchAction = 'none';
    canvas.style.cursor = 'grab';
    el.appendChild(canvas);

    // Orbit by dragging.
    let drag: { x: number; y: number; az: number; el: number } | null = null;
    const onDown = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY, az: state.current.azimuth, el: state.current.elevation };
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      state.current.azimuth = drag.az - (e.clientX - drag.x) * 0.008;
      state.current.elevation = Math.max(-0.05, Math.min(0.9, drag.el + (e.clientY - drag.y) * 0.005));
    };
    const onUp = () => {
      drag = null;
      canvas.style.cursor = 'grab';
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    const ro = new ResizeObserver(() => boxer.resize(el.clientWidth || 300, el.clientHeight || 300));
    ro.observe(el);
    boxer.resize(el.clientWidth || 300, el.clientHeight || 300);

    let t = 0, last = performance.now(), raf = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!state.current.paused) t += dt * state.current.speed;
      const skel = solvePose(withRhythm(sampleClip(clip, t % loopLength(clip)), t));
      boxer.update(state.current.southpaw ? mirrorSkeleton(skel) : skel);
      boxer.aim(state.current.azimuth, state.current.elevation);
      boxer.render();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      boxer.dispose();
    };
  }, [clip]);

  return <View ref={host as never} style={{ height, width: '100%', overflow: 'hidden', borderRadius: 16 }} />;
}
