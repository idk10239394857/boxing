import type { ReactNode } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { space, WIDE_MIN } from '../../theme';

export const useWide = () => useWindowDimensions().width >= WIDE_MIN;

/** Two columns side by side on wide screens; stacked on phones. */
export function Columns({ left, right, ratio = 1 }: { left: ReactNode; right: ReactNode; ratio?: number }) {
  const wide = useWide();
  if (!wide)
    return (
      <>
        {left}
        {right}
      </>
    );
  return (
    <View style={{ flexDirection: 'row', gap: space.xl, alignItems: 'flex-start' }}>
      <View style={{ flex: ratio, gap: space.lg, minWidth: 0 }}>{left}</View>
      <View style={{ flex: 1, gap: space.lg, minWidth: 0 }}>{right}</View>
    </View>
  );
}
