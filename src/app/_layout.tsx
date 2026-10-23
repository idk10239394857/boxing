// Per-weight imports so only the weights in use ship.
import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { BarlowCondensed_700Bold_Italic } from '@expo-google-fonts/barlow-condensed/700Bold_Italic';
import { BarlowCondensed_800ExtraBold_Italic } from '@expo-google-fonts/barlow-condensed/800ExtraBold_Italic';
import { InterTight_400Regular } from '@expo-google-fonts/inter-tight/400Regular';
import { InterTight_500Medium } from '@expo-google-fonts/inter-tight/500Medium';
import { InterTight_600SemiBold } from '@expo-google-fonts/inter-tight/600SemiBold';
import { InterTight_700Bold } from '@expo-google-fonts/inter-tight/700Bold';
import { useFonts } from 'expo-font';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CelebrationModal } from '../components/CelebrationModal';
import { XpToast } from '../components/XpToast';
import { useFightStore } from '../store/useFightStore';
import { colors } from '../theme';

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.accent, border: colors.border },
};

function useHydrated() {
  const [hydrated, setHydrated] = useState(useFightStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useFightStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useFightStore.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold_Italic,
    BarlowCondensed_800ExtraBold_Italic,
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
  });
  const hydrated = useHydrated();
  const refreshStreaks = useFightStore((s) => s.refreshStreaks);

  // Streaks are day-relative: recompute on launch and whenever the app returns to the foreground.
  useEffect(() => {
    if (!hydrated) return;
    refreshStreaks();
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refreshStreaks());
    return () => sub.remove();
  }, [hydrated, refreshStreaks]);

  if ((!fontsLoaded && !fontError) || !hydrated) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="log-session" options={{ presentation: 'modal' }} />
          <Stack.Screen name="technique/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
          <Stack.Screen name="timer" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="track" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
        <XpToast />
        <CelebrationModal />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
