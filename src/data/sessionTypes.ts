import type { ComponentProps } from 'react';
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { colors } from '../theme';
import type { PunchType, SessionType } from '../types';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Each kind of session has its own icon and colour, like workout types in a fitness app. */
export const SESSION_TYPES: { id: SessionType; label: string; icon: IconName; color: string }[] = [
  { id: 'bag', label: 'Bag work', icon: 'boxing-glove', color: colors.orange },
  { id: 'pads', label: 'Pads', icon: 'hand-back-left-outline', color: colors.white },
  { id: 'sparring', label: 'Sparring', icon: 'sword-cross', color: colors.gold },
  { id: 'footwork', label: 'Footwork', icon: 'shoe-sneaker', color: colors.steel },
  { id: 'conditioning', label: 'Conditioning', icon: 'heart-pulse', color: colors.red },
  { id: 'shadowboxing', label: 'Shadowboxing', icon: 'account-outline', color: colors.silver },
];

export const sessionTypeMeta = (id: SessionType) => SESSION_TYPES.find((t) => t.id === id)!;

export const PUNCH_TYPES: { id: PunchType; label: string; color: string }[] = [
  { id: 'jab', label: 'Jab', color: colors.white },
  { id: 'cross', label: 'Cross', color: colors.red },
  { id: 'hook', label: 'Hook', color: colors.orange },
  { id: 'uppercut', label: 'Uppercut', color: colors.gold },
  { id: 'body', label: 'Body', color: colors.steel },
];
