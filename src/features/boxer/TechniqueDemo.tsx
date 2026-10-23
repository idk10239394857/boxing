import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, IconButton, Label } from '../../components/ui';
import { colors, space } from '../../theme';
import { BoxerViewer } from './BoxerViewer';
import { TECHNIQUE_CLIPS } from './clips';

const SPEEDS = [
  { label: '1×', value: 1 },
  { label: '½×', value: 0.5 },
  { label: '¼×', value: 0.25 },
];
const VIEWS = [
  { label: '3/4', value: 0.65 },
  { label: 'Front', value: 0 },
  { label: 'Side', value: Math.PI / 2 },
];

/** 3D demonstration of a technique with playback controls. */
export function TechniqueDemo({ techniqueId, height = 340 }: { techniqueId: string; height?: number }) {
  const clip = TECHNIQUE_CLIPS[techniqueId];
  const [speed, setSpeed] = useState(1);
  const [view, setView] = useState(VIEWS[0].value);
  const [paused, setPaused] = useState(false);
  const [southpaw, setSouthpaw] = useState(false);
  if (!clip) return null;

  return (
    <View style={{ gap: space.sm }}>
      <View>
        <BoxerViewer clip={clip} speed={speed} paused={paused} view={view} southpaw={southpaw} height={height} />
        <View style={styles.badge} pointerEvents="none">
          <Label size={11} color={colors.text}>
            Drag to rotate
          </Label>
        </View>
      </View>
      <View style={styles.controls}>
        <View style={styles.play}>
          <IconButton icon={paused ? 'play' : 'pause'} label={paused ? 'Play' : 'Pause'} onPress={() => setPaused((p) => !p)} color={colors.ink} size={24} />
        </View>
        {SPEEDS.map((s) => (
          <Chip key={s.label} label={s.label} active={speed === s.value} onPress={() => setSpeed(s.value)} />
        ))}
        <View style={styles.sep} />
        {VIEWS.map((v) => (
          <Chip key={v.label} label={v.label} active={view === v.value} onPress={() => setView(v.value)} />
        ))}
        <View style={styles.sep} />
        <Chip label={southpaw ? 'Southpaw' : 'Orthodox'} active={southpaw} onPress={() => setSouthpaw((s) => !s)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(7, 16, 31, 0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  play: { backgroundColor: colors.accent, borderRadius: 6 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  sep: { width: StyleSheet.hairlineWidth, height: 24, backgroundColor: colors.borderHi, marginHorizontal: 4 },
});
