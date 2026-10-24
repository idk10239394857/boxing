import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { Avatar } from '../components/home/FighterCard';
import { closeModal, ModalHeader } from '../components/ModalHeader';
import { Body, Button, Card, Label, Screen, SectionHeader } from '../components/ui';
import { openPortal } from '../features/paywall/api';
import { useFightStore } from '../store/useFightStore';
import { colors, fonts, radius, space } from '../theme';

export default function ProfileScreen() {
  const user = useFightStore((s) => s.user);
  const updateProfile = useFightStore((s) => s.updateProfile);
  const resetData = useFightStore((s) => s.resetData);
  const [name, setName] = useState(user.name);
  const [confirmReset, setConfirmReset] = useState(false);
  const [billing, setBilling] = useState<string | null>(null);

  const manage = async () => {
    setBilling('Opening billing…');
    try {
      window.location.assign((await openPortal()).url);
    } catch (e) {
      setBilling((e as Error).message);
    }
  };

  const save = () => {
    updateProfile({ name: name.trim() || 'You' });
    closeModal();
  };

  return (
    <Screen>
      <ModalHeader title="Your fighter" subtitle="The name on your fighter card" />

      <View style={{ gap: space.sm }}>
        <Label>Fight name</Label>
        <View style={styles.nameRow}>
          <Avatar name={name} />
          <TextInput
          value={name}
          onChangeText={setName}
          maxLength={24}
          placeholder="Your fight name"
          placeholderTextColor={colors.textMute}
          style={styles.input}
          />
        </View>
      </View>

      <Button label="Save" icon="check" size="lg" onPress={save} />

      {Platform.OS === 'web' ? (
        <>
          <SectionHeader title="Membership" />
          <Card style={{ gap: space.md }}>
            <Body color={colors.textDim}>Change your plan, update your card or cancel. Billing is handled by Stripe.</Body>
            <Button label="Manage subscription" variant="ghost" icon="credit-card-outline" onPress={manage} />
            {billing ? <Label>{billing}</Label> : null}
            <Button label="Sign out of this device" variant="ghost" icon="logout" onPress={() => window.location.assign('/api/logout')} />
          </Card>
        </>
      ) : null}

      <SectionHeader title="Danger zone" />
      <Card style={{ gap: space.md }}>
        <Body color={colors.textDim}>Wipe every session, stat and checkmark and start again from zero.</Body>
        <Button
          label={confirmReset ? 'Tap again to confirm' : 'Reset all data'}
          variant={confirmReset ? 'primary' : 'ghost'}
          color={colors.danger}
          icon="delete-forever"
          onPress={() => {
            if (!confirmReset) return setConfirmReset(true);
            resetData();
            closeModal();
          }}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontFamily: fonts.poster,
    fontSize: 34,
    textTransform: 'uppercase',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.borderHi,
    paddingVertical: space.sm,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
