import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { colors, space } from '../theme';
import { Body, Display, IconButton } from './ui';

/** Dismiss a modal route; falls back to Home when opened via deep link. */
export const closeModal = () => (router.canGoBack() ? router.back() : router.replace('/'));

/** Header for modal screens: title, one line of context, and a close button. */
export function ModalHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1, gap: 2 }}>
        <Display poster size={48}>
          {title}
        </Display>
        {subtitle ? (
          <Body size={14} color={colors.textDim}>
            {subtitle}
          </Body>
        ) : null}
      </View>
      <IconButton icon="close" label="Close" onPress={closeModal} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingTop: space.xl },
});
