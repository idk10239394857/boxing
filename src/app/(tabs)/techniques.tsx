import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { TechniqueRow } from '../../components/techniques/TechniqueRow';
import { Body, Card, Chip, Label, Screen, SectionHeader } from '../../components/ui';
import { CATEGORIES } from '../../data/techniques';
import { useTechniques } from '../../store/selectors';
import type { TechniqueCategory } from '../../types';
import { colors, fonts, radius, space, tabColor } from '../../theme';

export default function TechniquesScreen() {
  const techniques = useTechniques();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<TechniqueCategory | 'All'>('All');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATEGORIES.filter((c) => category === 'All' || c === category)
      .map((c) => ({
        category: c,
        items: techniques.filter(
          (t) =>
            t.category === c &&
            (!q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.items.length);
  }, [techniques, query, category]);

  const drilledCount = techniques.filter((t) => t.timesDrilled > 0).length;

  return (
    <Screen
      kicker="The library"
      title="Techniques"
      subtitle="Drill it, log it"
      color={tabColor.techniques}
      right={<Label>{drilledCount} of {techniques.length} drilled</Label>}
    >
      <View style={styles.search}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.textMute} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search jab, slip, pivots…"
          placeholderTextColor={colors.textMute}
          style={styles.input}
          autoCorrect={false}
        />
        {query ? (
          <MaterialCommunityIcons name="close-circle" size={18} color={colors.textMute} onPress={() => setQuery('')} />
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {(['All', ...CATEGORIES] as const).map((c) => (
          <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
        ))}
      </ScrollView>

      {groups.map((g) => (
        <View key={g.category} style={{ gap: space.sm }}>
          <SectionHeader title={g.category} right={<Label>{g.items.length}</Label>} />
          <Card style={styles.list}>
            {g.items.map((t) => (
              <TechniqueRow key={t.id} technique={t} />
            ))}
          </Card>
        </View>
      ))}
      {!groups.length ? <Body color={colors.textDim}>Nothing matches “{query}”.</Body> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.borderHi,
    minHeight: 48,
  },
  input: { flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 16, paddingVertical: 12, outlineWidth: 0 },
  chips: { gap: space.sm },
  list: { padding: 0, overflow: 'hidden' },
});
