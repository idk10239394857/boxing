import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router/tabs';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWide } from '../../components/ui';
import { duration, ease, useReducedMotion } from '../../lib/motion';
import { colors, fonts, tabColor } from '../../theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const TABS: { name: keyof typeof tabColor; title: string; icon: IconName; iconOn: IconName }[] = [
  { name: 'index', title: 'Fighter', icon: 'account-circle-outline', iconOn: 'account-circle' },
  { name: 'techniques', title: 'Techniques', icon: 'book-open-page-variant-outline', iconOn: 'book-open-page-variant' },
  { name: 'strikes', title: 'Strikes', icon: 'boxing-glove', iconOn: 'boxing-glove' },
  { name: 'calendar', title: 'Calendar', icon: 'calendar-blank-outline', iconOn: 'calendar-blank' },
  { name: 'roadmap', title: 'Roadmap', icon: 'flag-outline', iconOn: 'flag' },
];

/** Rail icon: red when you're on that tab. */
function TabIcon({ name, icon, iconOn, focused }: { name: keyof typeof tabColor; icon: IconName; iconOn: IconName; focused: boolean }) {
  return <MaterialCommunityIcons name={focused ? iconOn : icon} size={23} color={focused ? tabColor[name] : colors.textMute} />;
}

/** The ground fades in under the bar, so content runs out beneath it instead of hitting a box. */
const Fade = () => (
  <LinearGradient colors={['rgba(7,7,7,0)', 'rgba(7,7,7,0.92)', colors.bg]} locations={[0, 0.35, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
);

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/**
 * The phone tab bar: flat over a fade to black. A short red slash slides between tabs
 * (a continuous transform over 320 ms, MOTION.md Tabs) instead of jumping.
 */
function FightTabBar({ state, navigateToTab }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(state.index)).current;
  const reduce = useReducedMotion();
  useEffect(() => {
    x.stopAnimation();
    Animated.timing(x, { toValue: state.index, duration: reduce ? 0 : duration.default, easing: ease.fluid, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [state.index, x, reduce]);
  const item = w / TABS.length;
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Fade />
      {w ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.slash, { left: item / 2 - 14, transform: [{ translateX: Animated.multiply(x, item) }, { skewX: '-20deg' }] }]}
        />
      ) : null}
      {state.routes.map((route, i) => {
        const t = TABS.find((tab) => tab.name === route.name) ?? TABS[i];
        const focused = state.index === i;
        const c = focused ? tabColor[t.name] : colors.textMute;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={t.title}
            onPress={() => !focused && navigateToTab(route.key)}
            style={styles.tab}
          >
            <MaterialCommunityIcons name={focused ? t.iconOn : t.icon} size={23} color={c} />
            <Text style={[styles.label, { color: focused ? colors.text : colors.textMute }]}>{t.title}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  // Laptops get a side rail; phones get a flat bar over a fade.
  const rail = useWide();
  return (
    <Tabs
      tabBar={rail ? undefined : (props) => <FightTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarPosition: rail ? 'left' : 'bottom',
        tabBarVariant: 'uikit',
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textDim,
        tabBarActiveBackgroundColor: rail ? colors.accentSoft : undefined,
        tabBarBackground: rail ? undefined : Fade,
        tabBarStyle: rail ? styles.rail : styles.bar,
        tabBarLabelStyle: rail
          ? { fontFamily: fonts.posterBold, fontSize: 22, textTransform: 'uppercase', marginLeft: 12 }
          : { fontFamily: fonts.caps, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 },
        tabBarItemStyle: rail ? styles.railItem : styles.item,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ focused }) => <TabIcon name={t.name} icon={t.icon} iconOn={t.iconOn} focused={focused} />,
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 26,
    flexDirection: 'row',
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    elevation: 0,
  },
  item: { paddingTop: 0 },
  slash: { position: 'absolute', top: 14, width: 28, height: 4, backgroundColor: colors.red },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 52 },
  label: { fontFamily: fonts.caps, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  rail: {
    width: 256,
    minWidth: 256,
    backgroundColor: colors.bg,
    borderRightColor: colors.border,
    borderRightWidth: 1,
    paddingTop: 88,
    paddingHorizontal: 14,
  },
  railItem: { borderRadius: 0, minHeight: 52, justifyContent: 'flex-start', paddingHorizontal: 8, marginBottom: 4 },
});
