import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, useState, type ComponentProps } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Body, Button, Display, Kicker, Label, PressableScale, Screen } from '../../components/ui';
import { colors, fonts, space } from '../../theme';
import { formatPrice, requestRestore, startCheckout, type Entitlement, type PlanId, type PlanInfo } from './api';

type Locked = Exclude<Entitlement, { active: true }>;
type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const FEATURES: [IconName, string][] = [
  ['cctv', 'Shadow Cam counts every punch, slip and roll from your camera'],
  ['timer-outline', 'Round timer with real bells, built for the gym'],
  ['chart-bar', 'Strike stats, streaks, XP and your training calendar'],
  ['flag-outline', 'A 36-skill roadmap from Novice to Fight Ready'],
  ['rotate-3d-variant', '25 techniques with 3D demos you can slow down and turn'],
];

const per = (interval: string) => (interval === 'year' ? 'year' : interval === 'week' ? 'week' : 'month');

/** The paywall FightFlow opens on: what you get, two plans, Stripe Checkout, and restore. */
export function Paywall({ entitlement, notice, onRetry }: { entitlement: Locked | null; notice: string | null; onRetry: () => void }) {
  const plans = entitlement?.plans ?? [];
  const [selected, setSelected] = useState<PlanId>(plans.some((p) => p.plan === 'yearly') ? 'yearly' : 'monthly');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(notice);
  const [restoring, setRestoring] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const monthly = plans.find((p) => p.plan === 'monthly');
  const yearly = plans.find((p) => p.plan === 'yearly');
  const saving = monthly && yearly && monthly.currency === yearly.currency ? Math.round((1 - yearly.amount / (monthly.amount * 12)) * 100) : 0;
  const chosen = plans.find((p) => p.plan === selected) ?? plans[0];
  const trial = entitlement?.trialDays ?? 0;
  const open = !!entitlement?.configured && !!chosen;

  const checkout = async () => {
    if (!chosen) return;
    setBusy(true);
    setMessage(null);
    try {
      const { url } = await startCheckout(chosen.plan);
      window.location.assign(url);
    } catch (e) {
      setMessage((e as Error).message);
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    try {
      await requestRestore(email.trim());
      setSent(true);
    } catch (e) {
      setMessage((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <Screen>
      <View key="hero" style={styles.hero}>
        <Kicker>FightFlow Pro</Kicker>
        <Display poster size={84}>
          Train like
        </Display>
        <Display poster size={84} color={colors.red}>
          it's fight night.
        </Display>
        <Body size={17} color={colors.textDim} style={{ marginTop: space.md, maxWidth: 420 }}>
          Every round logged, every punch counted, every skill on the path to fight ready.
        </Body>
      </View>

      <View key="features" style={styles.features}>
        {FEATURES.map(([icon, text]) => (
          <View key={text} style={styles.feature}>
            <MaterialCommunityIcons name={icon} size={24} color={colors.red} />
            <Body size={16} style={{ flex: 1 }}>
              {text}
            </Body>
          </View>
        ))}
      </View>

      {entitlement === null ? (
        <View key="offline" style={{ gap: space.md }}>
          <Body color={colors.textDim}>We couldn't reach FightFlow's server. Check your connection.</Body>
          <Button label="Try again" variant="ghost" icon="refresh" onPress={onRetry} />
        </View>
      ) : !open ? (
        <View key="soon" style={{ gap: space.sm }}>
          <Kicker color={colors.textMute}>Memberships open soon</Kicker>
          <Body color={colors.textDim}>FightFlow Pro isn't on sale yet. Check back shortly.</Body>
        </View>
      ) : (
        <View key="plans" style={{ gap: space.md }}>
          {[yearly, monthly].filter((p): p is PlanInfo => !!p).map((p) => (
            <PlanRow key={p.plan} plan={p} active={p.plan === chosen?.plan} badge={p.plan === 'yearly' && saving > 0 ? `Save ${saving}%` : undefined} onPress={() => setSelected(p.plan)} />
          ))}
          <Button
            label={busy ? 'Opening checkout…' : trial ? `Start ${trial}-day free trial` : 'Start training'}
            size="lg"
            disabled={busy}
            onPress={checkout}
            style={{ marginTop: space.sm }}
          />
          <Label align="center" color={colors.textMute}>
            {chosen ? (trial ? `Free for ${trial} days, then ${formatPrice(chosen.amount, chosen.currency)} a ${per(chosen.interval)}.` : `${formatPrice(chosen.amount, chosen.currency)} a ${per(chosen.interval)}.`) : ''} Cancel anytime. Secure checkout by Stripe.
          </Label>
        </View>
      )}

      {message ? (
        <Body key="message" color={colors.text} style={styles.message}>
          {message}
        </Body>
      ) : null}

      {entitlement?.restore ? (
        <View key="restore" style={styles.restore}>
          {!restoring ? (
            <PressableScale to={0.96} onPress={() => setRestoring(true)} accessibilityRole="button" innerStyle={{ paddingVertical: space.sm }}>
              <Kicker color={colors.textDim}>Already a member? Restore purchase</Kicker>
            </PressableScale>
          ) : sent ? (
            <Body color={colors.textDim}>If that email has an active membership, a sign-in link is on its way. It works for 15 minutes.</Body>
          ) : (
            <View style={{ gap: space.md }}>
              <Label>Email you used at checkout</Label>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="you@example.com"
                placeholderTextColor={colors.textMute}
                style={styles.input}
                onSubmitEditing={restore}
              />
              <Button label="Email me a sign-in link" variant="ghost" disabled={busy || !email.includes('@')} onPress={restore} />
            </View>
          )}
        </View>
      ) : null}
    </Screen>
  );
}

function PlanRow({ plan, active, badge, onPress }: { plan: PlanInfo; active: boolean; badge?: string; onPress: () => void }) {
  const perMonth = useMemo(() => (plan.interval === 'year' ? formatPrice(Math.round(plan.amount / 12), plan.currency) : null), [plan]);
  return (
    <PressableScale
      to={0.985}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      innerStyle={[styles.plan, active && { borderColor: colors.red, backgroundColor: colors.accentSoft }]}
    >
      <View style={[styles.radio, active && { borderColor: colors.red }]}>{active ? <View style={styles.dot} /> : null}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <Display poster size={28}>
          {plan.plan === 'yearly' ? 'Yearly' : 'Monthly'}
        </Display>
        <Label>{perMonth ? `${perMonth} a month, billed yearly` : 'Billed monthly'}</Label>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        {badge ? (
          <View style={styles.badge}>
            <Kicker size={12} color={colors.white}>
              {badge}
            </Kicker>
          </View>
        ) : null}
        <Display poster size={28}>
          {formatPrice(plan.amount, plan.currency)}
        </Display>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: space.xxl + 8, gap: 2 },
  features: { gap: space.lg, paddingVertical: space.sm },
  feature: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  plan: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderWidth: 1.5, borderColor: colors.borderHi },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.borderHi, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.red },
  badge: { backgroundColor: colors.red, paddingHorizontal: 8, paddingVertical: 2, transform: [{ skewX: '-10deg' }] },
  message: { borderLeftWidth: 3, borderLeftColor: colors.red, paddingLeft: space.md },
  restore: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderHi, paddingTop: space.lg, marginBottom: space.xxl },
  input: { color: colors.text, fontFamily: fonts.medium, fontSize: 18, borderBottomWidth: 1.5, borderBottomColor: colors.borderHi, paddingVertical: space.sm },
});
