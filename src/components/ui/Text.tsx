import { Text, type TextProps, type TextStyle } from 'react-native';
import { colors, fonts } from '../../theme';

type Props = TextProps & {
  color?: string;
  size?: number;
  align?: TextStyle['textAlign'];
  /** Force the poster voice below 22 px (buttons, table heads). */
  poster?: boolean;
  /** Kept for older call sites: the poster voice. */
  brand?: boolean;
};

/**
 * Two voices. From 22 px up (and for anything marked `poster`): heavy italic condensed caps,
 * the fight-poster voice for headlines and numbers. Below that: Inter Tight, for names and rows.
 */
export function Display({ color = colors.text, size = 28, align, poster, brand, style, ...rest }: Props) {
  const big = poster || brand || size >= 22;
  return (
    <Text
      {...rest}
      style={[
        big
          ? {
              fontFamily: fonts.poster,
              fontSize: size,
              lineHeight: Math.round(size * (size >= 40 ? 0.92 : 1.05)),
              letterSpacing: size >= 40 ? -0.01 * size : 0.01 * size,
              textTransform: 'uppercase',
              paddingRight: size * 0.06, // italic overhang
            }
          : { fontFamily: fonts.semibold, fontSize: size, lineHeight: Math.round(size * 1.3), letterSpacing: -0.01 * size },
        { color, textAlign: align, fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}

/** Tracked condensed caps: the small red line above a headline, and table heads. */
export function Kicker({ color = colors.red, size = 14, align, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[{ fontFamily: fonts.caps, fontSize: size, letterSpacing: 0.18 * size, textTransform: 'uppercase', color, textAlign: align }, style]}
    />
  );
}

/** Small supporting text. */
export function Label({ color = colors.textDim, size = 13, align, style, ...rest }: Props) {
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: fonts.medium, fontSize: size, lineHeight: Math.round(size * 1.35), color, textAlign: align, fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}

export function Body({ color = colors.text, size = 15, align, style, ...rest }: Props) {
  return (
    <Text {...rest} style={[{ fontFamily: fonts.regular, fontSize: size, lineHeight: Math.round(size * 1.5), color, textAlign: align }, style]} />
  );
}
