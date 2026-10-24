import React, { useRef } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/core/theme';
import { TripItemRecord } from '@/db/schema/trip-items';
import { useI18n } from '@/core/i18n';

export type ItemBounds = { x: number; y: number; width: number; height: number };

export function PackingItemRow({ item, imageUri, destinationName, busy, onPack, onMenu }: {
  item: TripItemRecord;
  imageUri?: string | null;
  destinationName?: string;
  busy: boolean;
  onPack: (bounds?: ItemBounds) => void;
  onMenu: () => void;
}) {
  const colors = useThemeColors();
  const { language } = useI18n();
  const thumbnail = useRef<React.ComponentRef<typeof View>>(null);
  const inBag = ['packed', 'available', 'returned'].includes(item.state);
  const isMissing = item.state === 'missing';
  const bagColor = isMissing ? colors.status.error : inBag ? colors.status.success : colors.status.warning;
  const bagBackground = isMissing ? `${colors.status.error}12` : inBag ? colors.status.successLight : colors.status.warningLight;
  const action = isMissing ? (language === 'en' ? 'Found' : 'Ketemu') : inBag
    ? (language === 'en' ? 'Take out' : 'Keluarkan')
    : (language === 'en' ? 'Pack' : 'Masukkan');
  return (
    <View style={[styles.row, { borderBottomColor: colors.border.muted }]}>
      <View ref={thumbnail} collapsable={false} style={[styles.thumbnail, { backgroundColor: colors.surface.muted }]}>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} />
          : <Ionicons name="cube-outline" size={23} color={colors.text.muted} />}
      </View>
      <View style={styles.copy}>
        <Typography variant="body" color={colors.brand.navy} numberOfLines={2} style={styles.name}>{item.customName}</Typography>
        <Typography variant="caption" color={colors.text.muted} style={styles.meta}>
          {item.category} · {language === 'en' ? 'Qty' : 'Jumlah'}: {item.quantity}
          {isMissing ? (language === 'en' ? ' · Missing' : ' · Hilang') : item.state === 'used' ? (language === 'en' ? ' · Used' : ' · Digunakan') : inBag ? (language === 'en' ? ' · In bag' : ' · Dalam tas') : ''}
        </Typography>
        {destinationName && <Typography variant="caption" color={colors.text.muted} numberOfLines={1} style={styles.meta}>
          {language === 'en' ? 'For' : 'Untuk'}: {destinationName}
        </Typography>}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${isMissing ? (language === 'en' ? 'Found; return to bag' : 'Ditemukan; kembalikan ke tas') : inBag ? (language === 'en' ? 'Take out of bag' : 'Keluarkan dari tas') : (language === 'en' ? 'Send to bag' : 'Masukkan ke tas')}: ${item.customName}`}
        disabled={busy}
        onPress={() => {
          if (thumbnail.current) thumbnail.current.measureInWindow((x, y, width, height) => onPack({ x, y, width, height }));
          else onPack();
        }}
        style={({ pressed }) => [styles.pack, { backgroundColor: bagBackground, opacity: busy ? 0.45 : pressed ? 0.65 : 1 }]}
      >
        <View style={styles.bagIcon}>
          <Ionicons name="bag-handle-outline" size={21} color={bagColor} />
          <View style={[styles.arrow, { backgroundColor: bagBackground }]}>
            <Ionicons name={inBag ? 'arrow-up' : 'arrow-down'} size={11} color={bagColor} />
          </View>
        </View>
        <Typography variant="caption" color={bagColor} style={styles.action}>{action}</Typography>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={language === 'en' ? `Options: ${item.customName}` : `Opsi: ${item.customName}`} onPress={onMenu} disabled={busy} style={styles.menu}>
        <Ionicons name="ellipsis-vertical" size={18} color={colors.text.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  thumbnail: { width: 46, height: 46, borderRadius: 11, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  copy: { flex: 1 },
  name: { fontSize: 13, lineHeight: 18 },
  meta: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  pack: { minWidth: 49, minHeight: 46, borderRadius: 11, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  bagIcon: { position: 'relative' },
  arrow: { position: 'absolute', right: -4, bottom: -1, borderRadius: 6 },
  action: { fontSize: 9, lineHeight: 13, fontWeight: '700' },
  menu: { width: 28, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
});
