import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/core/theme';

type PackingIllustrationProps = {
  mode: 'all' | 'preparing' | 'packed' | 'missing';
  title: string;
  caption: string;
  bagRef?: React.Ref<React.ComponentRef<typeof View>>;
};

export function PackingIllustration({ mode, title, caption, bagRef }: PackingIllustrationProps) {
  const colors = useThemeColors();
  const isPacked = mode === 'packed';
  const suitcase = mode === 'all' || mode === 'missing'
    ? require('../../../assets/images/packing-suitcase-closed.png')
    : mode === 'preparing'
      ? require('../../../assets/images/packing-suitcase-empty.png')
      : require('../../../assets/images/packing-suitcase.png');
  return (
    <View style={[styles.banner, { backgroundColor: mode === 'all' ? '#EDF2FA' : isPacked ? '#EAF4F8' : '#FFF3EF' }]}>
      <View style={styles.copy}>
        <Typography variant="label" color={colors.brand.navy} style={styles.title}>{title}</Typography>
        <Typography variant="caption" color={colors.text.secondary} style={styles.caption}>{caption}</Typography>
      </View>
      <View style={styles.art} pointerEvents="none">
        <Image source={suitcase} style={styles.suitcase} resizeMode="contain" />
        {/* Landing zone follows the open compartment rather than the whole illustration. */}
        <View ref={bagRef} collapsable={false} style={[styles.bagOpening, mode === 'all' && { top: 50 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 106, borderRadius: 18, overflow: 'hidden', flexDirection: 'row',
    alignItems: 'center', paddingLeft: 15, paddingVertical: 8, marginBottom: 12,
  },
  copy: { flex: 1, paddingRight: 4 },
  title: { fontWeight: '800', marginBottom: 3 },
  caption: { lineHeight: 16, maxWidth: 210 },
  art: { width: 138, height: 112, position: 'relative' },
  suitcase: { width: 138, height: 112 },
  bagOpening: { position: 'absolute', left: 43, top: 65, width: 55, height: 20 },
});
