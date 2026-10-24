import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/core/theme';

type PackingIllustrationProps = {
  mode: 'preparing' | 'packed';
  title: string;
  caption: string;
};

export function PackingIllustration({ mode, title, caption }: PackingIllustrationProps) {
  const colors = useThemeColors();
  const isPacked = mode === 'packed';

  return (
    <View style={[styles.banner, { backgroundColor: isPacked ? '#EAF4F8' : '#FFF3EF' }]}>
      <View style={styles.copy}>
        <Typography variant="label" color={colors.brand.navy} style={styles.title}>
          {title}
        </Typography>
        <Typography variant="caption" color={colors.text.secondary} style={styles.caption}>
          {caption}
        </Typography>
      </View>

      <View style={styles.art} pointerEvents="none">
        {isPacked ? (
          <>
            <View style={styles.packedHalo} />
            <View style={styles.bagLid} />
            <View style={styles.bagBody}>
              <View style={styles.bagHandle} />
              <View style={styles.bagContents}>
                <Ionicons name="shirt" size={28} color="#1769B0" style={styles.shirt} />
                <Ionicons name="medkit" size={20} color="#F56B5F" style={styles.kit} />
                <Ionicons name="water" size={19} color="#51A8C7" style={styles.bottle} />
              </View>
              <View style={styles.bagFrontLine} />
            </View>
          </>
        ) : (
          <>
            <View style={styles.prepHalo} />
            <View style={[styles.itemBubble, styles.clothesBubble]}>
              <Ionicons name="shirt-outline" size={25} color="#1769B0" />
            </View>
            <View style={[styles.itemBubble, styles.bottleBubble]}>
              <Ionicons name="water-outline" size={22} color="#51A8C7" />
            </View>
            <View style={[styles.itemBubble, styles.kitBubble]}>
              <Ionicons name="medkit-outline" size={21} color="#F56B5F" />
            </View>
            <View style={[styles.itemBubble, styles.glassesBubble]}>
              <Ionicons name="glasses-outline" size={20} color="#7C6AA6" />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 106,
    borderRadius: 18,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 15,
    paddingVertical: 12,
    marginBottom: 12,
  },
  copy: { flex: 1, zIndex: 2, paddingRight: 4 },
  title: { fontWeight: '800', marginBottom: 3 },
  caption: { lineHeight: 16, maxWidth: 210 },
  art: { width: 138, height: 106, alignSelf: 'stretch', position: 'relative' },
  prepHalo: {
    position: 'absolute', width: 104, height: 104, borderRadius: 52,
    backgroundColor: 'rgba(245,107,95,0.12)', right: 8, top: 1,
  },
  itemBubble: {
    position: 'absolute', width: 42, height: 42, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#071B4D', shadowOpacity: 0.08, shadowRadius: 5, elevation: 2,
  },
  clothesBubble: { right: 54, top: 12, transform: [{ rotate: '-9deg' }] },
  bottleBubble: { right: 15, top: 30, transform: [{ rotate: '8deg' }] },
  kitBubble: { right: 60, bottom: 8, transform: [{ rotate: '7deg' }] },
  glassesBubble: { right: 12, bottom: 7, transform: [{ rotate: '-8deg' }] },
  packedHalo: {
    position: 'absolute', width: 116, height: 116, borderRadius: 58,
    backgroundColor: 'rgba(23,105,176,0.1)', right: 7, top: -5,
  },
  bagLid: {
    position: 'absolute', width: 76, height: 21, right: 28, top: 20,
    backgroundColor: '#F5A18F', borderColor: '#D9796D', borderWidth: 2,
    borderRadius: 11, transform: [{ rotate: '-8deg' }],
  },
  bagBody: {
    position: 'absolute', width: 91, height: 57, right: 18, bottom: 9,
    backgroundColor: '#F7B3A3', borderColor: '#D9796D', borderWidth: 2,
    borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end',
  },
  bagHandle: {
    position: 'absolute', top: -8, width: 28, height: 19,
    borderWidth: 3, borderColor: '#D9796D', borderRadius: 10,
  },
  bagContents: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 9, gap: 1 },
  shirt: { marginBottom: 0 },
  kit: { marginBottom: 5 },
  bottle: { marginBottom: 4 },
  bagFrontLine: {
    position: 'absolute', bottom: 8, left: 0, right: 0, height: 2,
    backgroundColor: 'rgba(140,68,67,0.25)',
  },
});
