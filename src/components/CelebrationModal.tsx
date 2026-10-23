import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef } from 'react';
import { Animated, Modal, Platform, StyleSheet, Vibration, View } from 'react-native';
import { duration, ease, useReducedMotion } from '../lib/motion';
import { useFightStore } from '../store/useFightStore';
import { colors, space } from '../theme';
import { Confetti } from './Confetti';
import { Body, Button, Display, Kicker } from './ui';

export function CelebrationModal() {
  const current = useFightStore((s) => s.celebrations[0]);
  const dismiss = useFightStore((s) => s.dismissCelebration);
  const v = useRef(new Animated.Value(0)).current;
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!current) return;
    // Dialog entrance (MOTION.md): opacity 0 → 1, scale 0.96 → 1, y 18 → 0 over 320 ms.
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: reduce ? 120 : duration.default, easing: ease.enter, useNativeDriver: Platform.OS !== 'web' }).start();
    if (Platform.OS !== 'web') Vibration.vibrate([0, 80, 60, 160]);
  }, [current, v, reduce]);

  if (!current) return null;
  const isLevel = current.kind === 'level';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Confetti key={JSON.stringify(current)} />
        <Animated.View
          style={[
            styles.content,
            {
              opacity: v,
              transform: reduce
                ? []
                : [
                    { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
                    { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
                  ],
            },
          ]}
        >
          <View style={styles.medal}>
            <MaterialCommunityIcons name={isLevel ? 'arrow-up-bold' : 'trophy-outline'} size={40} color={colors.white} />
          </View>
          <Kicker size={16}>
            {isLevel ? 'Level up' : 'Tier cleared'}
          </Kicker>
          {isLevel ? (
            <>
              <Display poster size={150} color={colors.text} align="center">
                {current.level}
              </Display>
              <Display size={28} color={colors.xp} align="center">
                {current.title}
              </Display>
              <Body color={colors.textDim} align="center">
                The work is paying off. Keep stacking rounds.
              </Body>
            </>
          ) : (
            <>
              <Display poster size={64} color={colors.text} align="center">
                {current.tierName}
              </Display>
              <Display size={28} color={colors.xp} align="center">
                +{current.bonusXp} XP
              </Display>
              <Body color={colors.textDim} align="center">
                {current.nextTierName ? `${current.nextTierName} is now unlocked.` : 'Every tier cleared. You are fight ready.'}
              </Body>
            </>
          )}
          <Button label="Keep going" size="lg" color={colors.xp} onPress={dismiss} style={{ alignSelf: 'stretch', marginTop: space.lg }} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 7, 7, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
  },
  content: { alignItems: 'center', gap: space.sm, width: '100%', maxWidth: 420 },
  medal: { width: 72, height: 72, backgroundColor: colors.xp, transform: [{ skewX: '-10deg' }], alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
});
