import { Pressable, StyleSheet, View } from 'react-native';
import { monthGrid, todayKey, WEEKDAYS_SHORT } from '../../lib/dates';
import { colors, fonts } from '../../theme';
import { Label } from '../ui';

interface Props {
  year: number;
  month: number;
  /** date -> sessions that day */
  trainedDays: Map<string, number>;
  selected: string;
  onSelect: (key: string) => void;
}

/** A month where each trained day carries one small band per session. */
export function MonthGrid({ year, month, trainedDays, selected, onSelect }: Props) {
  const today = todayKey();
  const cells = monthGrid(year, month);

  return (
    <View>
      <View style={styles.week}>
        {WEEKDAYS_SHORT.map((d, i) => (
          <Label key={i} style={styles.cellLabel} align="center" color={colors.textMute}>
            {d}
          </Label>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((key, i) => {
          if (!key) return <View key={i} style={styles.cell} />;
          const sessions = trainedDays.get(key) ?? 0;
          const isToday = key === today;
          const isSelected = key === selected;
          const future = key > today;
          return (
            <View key={key} style={styles.cell}>
              <Pressable
                onPress={() => onSelect(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${key}${sessions ? `, ${sessions} session${sessions > 1 ? 's' : ''}` : ''}`}
                style={({ pressed }) => [
                  styles.day,
                  sessions ? styles.trained : null,
                  isSelected && styles.selected,
                  future && { opacity: 0.35 },
                  pressed && { transform: [{ scale: 0.94 }] },
                ]}
              >
                <Label
                  size={15}
                  color={isSelected ? colors.white : isToday ? colors.accent : sessions ? colors.text : colors.textMute}
                  style={{ fontFamily: sessions || isSelected ? fonts.poster : fonts.medium, fontSize: sessions || isSelected ? 20 : 15 }}
                >
                  {Number(key.slice(-2))}
                </Label>
                <View style={styles.bands}>
                  {Array.from({ length: Math.min(sessions, 3) }, (_, j) => (
                    <View key={j} style={[styles.band, { backgroundColor: isSelected ? colors.white : colors.accent }]} />
                  ))}
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row', marginBottom: 6 },
  cellLabel: { width: `${100 / 7}%` },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  day: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  trained: { borderBottomWidth: 0 },
  selected: { backgroundColor: colors.red, transform: [{ skewX: '-8deg' }] },
  bands: { flexDirection: 'row', gap: 2, height: 3 },
  band: { width: 8, height: 3 },
});
