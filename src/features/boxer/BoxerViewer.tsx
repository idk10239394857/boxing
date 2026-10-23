import { useEffect, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import Svg, { Circle, Ellipse, Line } from 'react-native-svg';
import { colors } from '../../theme';
import { loopLength, sampleClip, withRhythm } from './clips';
import { mirrorSkeleton, solvePose, type Skeleton } from './rig';
import type { V3 } from './vec';
import type { BoxerViewerProps } from './types';

/** The figure's own palette, fixed independently of the app theme. */
const FIGURE = {
  text: '#F4F4F5',
  textDim: '#A1A1AA',
  surface: '#141416',
  surfaceHi: '#1C1C20',
  border: '#26262B',
  borderHi: '#3A3A41',
  red: '#E10600',
  gold: '#D4A017',
};

/**
 * Native fallback: the same rig projected to 2D with SVG (no GL needed in Expo Go).
 * Drag sideways to orbit.
 */
export function BoxerViewer({ clip, speed, paused, view, southpaw, height }: BoxerViewerProps) {
  const [skel, setSkel] = useState<Skeleton>(() => solvePose(sampleClip(clip, 0)));
  const [width, setWidth] = useState(320);
  const az = useRef(view);
  const opts = useRef({ speed, paused, southpaw });
  opts.current = { speed, paused, southpaw };

  useEffect(() => {
    az.current = view;
  }, [view]);

  useEffect(() => {
    let t = 0, last = Date.now(), raf = 0;
    const tick = () => {
      const now = Date.now();
      if (!opts.current.paused) t += ((now - last) / 1000) * opts.current.speed;
      last = now;
      const s = solvePose(withRhythm(sampleClip(clip, t % loopLength(clip)), t));
      setSkel(opts.current.southpaw ? mirrorSkeleton(s) : s);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clip]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
      onPanResponderMove: (_, g) => {
        az.current -= g.vx * 0.12;
      },
    }),
  ).current;

  const scale = height / 2.2;
  const p = (v: V3) => {
    const c = Math.cos(az.current), s = Math.sin(az.current);
    const x = v[0] * c - v[2] * s;
    const depth = v[0] * s + v[2] * c;
    return { x: width / 2 + x * scale, y: height - 0.12 * scale - v[1] * scale, depth };
  };
  const seg = (a: V3, b: V3, w: number, stroke: string = FIGURE.textDim) => {
    const A = p(a), B = p(b);
    return <Line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={stroke} strokeWidth={w} strokeLinecap="round" />;
  };
  const s = skel;
  const head = p(s.head), gl = p(s.lGlove), gr = p(s.rGlove);

  return (
    <View
      style={{ height, width: '100%', backgroundColor: FIGURE.surface, borderRadius: 16, overflow: 'hidden' }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      {...pan.panHandlers}
    >
      <Svg width={width} height={height}>
        <Ellipse cx={width / 2} cy={height - 0.12 * scale} rx={scale * 0.9} ry={scale * 0.12} stroke={FIGURE.red} strokeWidth={1.5} fill="none" opacity={0.6} />
        {seg(s.rHip, s.rKnee, 12, FIGURE.surfaceHi)}
        {seg(s.rKnee, s.rAnkle, 9)}
        {seg(s.lHip, s.lKnee, 12, FIGURE.surfaceHi)}
        {seg(s.lKnee, s.lAnkle, 9)}
        {seg(s.rHeel, s.rToe, 7, FIGURE.borderHi)}
        {seg(s.lHeel, s.lToe, 7, FIGURE.borderHi)}
        {seg(s.pelvis, s.chest, 26)}
        {seg(s.lHip, s.rHip, 18, FIGURE.surfaceHi)}
        {seg(s.lShoulder, s.rShoulder, 12)}
        {seg(s.rShoulder, s.rElbow, 8)}
        {seg(s.rElbow, s.rWrist, 7)}
        {seg(s.lShoulder, s.lElbow, 8)}
        {seg(s.lElbow, s.lWrist, 7)}
        <Circle cx={head.x} cy={head.y} r={0.11 * scale} fill={FIGURE.textDim} />
        <Circle cx={gr.x} cy={gr.y} r={0.075 * scale} fill={FIGURE.red} />
        <Circle cx={gl.x} cy={gl.y} r={0.075 * scale} fill={FIGURE.red} stroke={FIGURE.gold} strokeWidth={1} />
      </Svg>
    </View>
  );
}
