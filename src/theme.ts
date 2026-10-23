/**
 * FightFlow, fight night: black under a red glow, white and red as the voice, huge italic
 * condensed headlines, sharp edges. Sections are separated by lines and space, not boxes.
 */
export const colors = {
  bg: '#070707',
  surface: '#111111',
  surfaceHi: '#1A1A1A',
  sunken: '#0B0B0B',
  border: '#1E1E1E',
  borderHi: '#2C2C2C',

  text: '#FFFFFF',
  textDim: '#B5B5B5',
  textMute: '#6E6E6E',

  /** The corner colour: the brand, primary actions, emphasis. */
  red: '#E8202A',
  white: '#FFFFFF',
  orange: '#FF7A45',
  gold: '#FFC24A',
  steel: '#8C8C8C',
  silver: '#C9C9C9',

  /** Text set on red or white fills. */
  ink: '#070707',

  /** Roles. */
  accent: '#E8202A',
  accentSoft: 'rgba(232, 32, 42, 0.14)',
  streak: '#E8202A',
  xp: '#E8202A',
  success: '#3DDC84',
  danger: '#E8202A',
  warning: '#FFC24A',
  /** Sparring corners. */
  blue: '#3D8BFF',
};

/** Two-stop fills that should feel lit. */
export const gradients = {
  red: ['#FF3A44', '#C2121B'] as const,
  white: ['#FFFFFF', '#D9D9D9'] as const,
  orange: ['#FF9A6B', '#F2591F'] as const,
  gold: ['#FFD27A', '#F0A81E'] as const,
  steel: ['#A8A8A8', '#707070'] as const,
  card: ['#111111', '#0B0B0B'] as const,
};

/** One corner colour everywhere: every tab glows red. */
export const tabColor = {
  index: colors.red,
  techniques: colors.red,
  strikes: colors.red,
  calendar: colors.red,
  roadmap: colors.red,
} as const;

export const fonts = {
  regular: 'InterTight_400Regular',
  medium: 'InterTight_500Medium',
  semibold: 'InterTight_600SemiBold',
  bold: 'InterTight_700Bold',
  heavy: 'InterTight_700Bold',
  black: 'InterTight_700Bold',
  /** Poster voice: headlines, numbers, buttons. */
  poster: 'BarlowCondensed_800ExtraBold_Italic',
  posterBold: 'BarlowCondensed_700Bold_Italic',
  /** Tracked uppercase labels. */
  caps: 'BarlowCondensed_600SemiBold',
  brand: 'BarlowCondensed_800ExtraBold_Italic',
  brandHeavy: 'BarlowCondensed_800ExtraBold_Italic',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 0, md: 0, lg: 0, xl: 0, pill: 0 };

/** Content column width on tablets / laptops. */
export const MAX_CONTENT_WIDTH = 680;

/** Laptop and tablet-landscape widths get a side rail and two-column layouts. */
export const WIDE_MIN = 1024;
export const WIDE_CONTENT_WIDTH = 1160;
