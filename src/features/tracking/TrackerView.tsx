import { View } from 'react-native';
import { Body } from '../../components/ui';
import { colors } from '../../theme';
import type { TrackerViewProps } from './types';

/**
 * Native builds: pose tracking needs a camera frame processor (development build).
 * Until then Shadow Cam runs in the browser on any phone or laptop.
 */
export function TrackerView(_: TrackerViewProps) {
  return (
    <View style={{ padding: 24, backgroundColor: colors.surface, borderRadius: 16 }}>
      <Body color={colors.textDim} align="center">
        Shadow Cam runs in the browser. Open FIGHTFLOW on the web (phone or laptop) to track punches with your camera.
      </Body>
    </View>
  );
}

export const TRACKING_SUPPORTED = false;
