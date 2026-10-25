import React, { useRef } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@/components/ui/Typography';
import { Badge } from '@/components/ui/Badge';
import { useThemeColors } from '@/core/theme';
import { TripItemRecord } from '@/db/schema/trip-items';
import { useI18n } from '@/core/i18n';
import { useUIStore } from '@/stores/ui-store';
import { isDropOffItem } from '@/domains/packing/types';

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
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const thumbnail = useRef<React.ComponentRef<typeof View>>(null);
  const inBag = ['packed', 'available', 'returned'].includes(item.state);
  const isMissing = item.state === 'missing';
  const isDropOff = isDropOffItem(item);
  const isDroppedOff = item.state === 'used';

  const bagColor = isMissing ? colors.status.error : inBag ? colors.status.success : isDropOff ? '#EA580C' : colors.status.warning;
  const bagBackground = isMissing ? `${colors.status.error}12` : inBag ? colors.status.successLight : isDropOff ? (isDarkMode ? 'rgba(234, 88, 12, 0.2)' : '#FFEDD5') : colors.status.warningLight;
  const action = isMissing ? (language === 'en' ? 'Found' : 'Ketemu') : inBag
    ? (language === 'en' ? 'Take out' : 'Keluarkan')
    : (language === 'en' ? 'Pack' : 'Masukkan');

  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: colors.border.muted },
        isDropOff && [
          styles.dropOffCard,
          {
            backgroundColor: isDarkMode ? '#2D1A08' : '#FFF9F0',
            borderColor: isDarkMode ? '#F59E0B' : '#F59E0B',
          },
        ],
      ]}
    >
      <View
        ref={thumbnail}
        collapsable={false}
        style={[
          styles.thumbnail,
          { backgroundColor: isDropOff ? (isDarkMode ? '#451A03' : '#FEF3C7') : colors.surface.muted },
        ]}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : isDropOff ? (
          <Ionicons name="gift" size={24} color="#EA580C" />
        ) : (
          <Ionicons name="cube-outline" size={23} color={colors.text.muted} />
        )}
      </View>
      <View style={styles.copy}>
        <View style={styles.titleBadgeRow}>
          <Typography
            variant="body"
            color={isDropOff ? (isDarkMode ? '#FDBA74' : '#9A3412') : colors.brand.navy}
            numberOfLines={2}
            style={[styles.name, isDropOff && styles.dropOffName]}
          >
            {item.customName}
          </Typography>
          {isDropOff && (
            <Badge
              label="DROP OFF"
              variant="accent"
              size="sm"
            />
          )}
        </View>

        <Typography variant="caption" color={colors.text.muted} style={styles.meta}>
          {item.category} · {language === 'en' ? 'Qty' : 'Jumlah'}: {item.quantity}
          {isMissing
            ? (language === 'en' ? ' · Missing' : ' · Hilang')
            : isDroppedOff
            ? (language === 'en' ? ' · Dropped off ✓' : ' · Sudah di-drop off ✓')
            : inBag
            ? (language === 'en' ? ' · In bag' : ' · Dalam tas')
            : ''}
        </Typography>

        {isDropOff ? (
          <View style={styles.dropTargetRow}>
            <Ionicons name="location" size={13} color="#EA580C" />
            <Typography variant="caption" style={[styles.dropTargetText, { color: isDarkMode ? '#FB923C' : '#C2410C' }]}>
              {destinationName
                ? (language === 'en' ? `Drop at: ${destinationName}` : `Drop di: ${destinationName}`)
                : (language === 'en' ? 'Single-use · Drop at destination' : 'Sekali pakai · Drop di destinasi')}
            </Typography>
          </View>
        ) : destinationName ? (
          <Typography variant="caption" color={colors.text.muted} numberOfLines={1} style={styles.meta}>
            {language === 'en' ? 'For' : 'Untuk'}: {destinationName}
          </Typography>
        ) : null}
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
  dropOffCard: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginVertical: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnail: { width: 46, height: 46, borderRadius: 11, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  copy: { flex: 1 },
  titleBadgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  name: { fontSize: 13, lineHeight: 18 },
  dropOffName: { fontWeight: '700' },
  dropTargetRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  dropTargetText: { fontSize: 11, fontWeight: '700', marginLeft: 3 },
  meta: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  pack: { minWidth: 49, minHeight: 46, borderRadius: 11, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  bagIcon: { position: 'relative' },
  arrow: { position: 'absolute', right: -4, bottom: -1, borderRadius: 6 },
  action: { fontSize: 9, lineHeight: 13, fontWeight: '700' },
  menu: { width: 28, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
});
