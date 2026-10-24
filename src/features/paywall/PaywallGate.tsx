import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { useFightStore } from '../../store/useFightStore';
import { colors } from '../../theme';
import { getEntitlement, takeReturnNotice, type Entitlement } from './api';
import { Paywall } from './Paywall';

/**
 * FightFlow 2.0: the app opens behind the paywall until the server confirms an active
 * subscription. Native builds pass through for now (they'll need App Store / Play billing).
 */
export function PaywallGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Entitlement | 'loading' | 'offline'>(Platform.OS === 'web' ? 'loading' : { active: true, configured: true });
  const [notice] = useState(() => (Platform.OS === 'web' ? takeReturnNotice() : null));

  const check = useCallback(() => {
    setState('loading');
    getEntitlement()
      .then(setState)
      // Local development has no /api: let the developer through; production stays locked.
      .catch(() => setState(__DEV__ ? { active: true, configured: true } : 'offline'));
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') check();
  }, [check]);

  const unlocked = typeof state === 'object' && state.active;
  useEffect(() => {
    if (unlocked && notice === 'welcome') useFightStore.setState({ toast: { id: Date.now(), text: "You're in. Welcome to FightFlow" } });
  }, [unlocked, notice]);

  if (state === 'loading') return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (unlocked) return <>{children}</>;
  return <Paywall entitlement={state === 'offline' ? null : (state as Exclude<Entitlement, { active: true }>)} notice={notice === 'welcome' ? null : notice} onRetry={check} />;
}
