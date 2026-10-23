import { router } from 'expo-router';
import { View } from 'react-native';
import { Distribution } from '../../components/strikes/Distribution';
import { PunchRow, PunchTableHead } from '../../components/strikes/PunchCard';
import { StrikeLogger } from '../../components/strikes/StrikeLogger';
import { Button, Columns, Screen, SectionHeader } from '../../components/ui';
import { PUNCH_TYPES } from '../../data/sessionTypes';
import { useFightStore } from '../../store/useFightStore';
import { tabColor } from '../../theme';

export default function StrikesScreen() {
  const punches = useFightStore((s) => s.punches);

  return (
    <Screen kicker="Your output" title="Strikes" subtitle="Every punch you have logged" color={tabColor.strikes} wide>
      <Columns
        left={
          <>
            <Distribution />

            <SectionHeader title="By punch" />
            <View>
              <PunchTableHead />
              {PUNCH_TYPES.map((p) => (
                <PunchRow key={p.id} stat={punches[p.id]} label={p.label} color={p.color} />
              ))}
            </View>
          </>
        }
        right={
          <>
            <SectionHeader title="Log a tally" />
            <Button
              label="Count them with Shadow Cam"
              icon="cctv"
              variant="secondary"
              onPress={() => router.push('/track')}
            />
            <StrikeLogger />
          </>
        }
      />
    </Screen>
  );
}
