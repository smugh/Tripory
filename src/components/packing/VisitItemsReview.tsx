import React from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Typography } from '@/components/ui';
import { useThemeColors } from '@/core/theme';
import { useI18n } from '@/core/i18n';
import { TripItemRecord } from '@/db/schema/trip-items';
import { ItemStatusPicker, VisitItemState } from './ItemStatusPicker';

export function VisitItemsReview({ items, choices, busy, onChange, onSave, onCancel }: {
  items: TripItemRecord[];
  choices: Record<string, VisitItemState>;
  busy: boolean;
  onChange: (id: string, state: VisitItemState) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const colors = useThemeColors();
  const { language } = useI18n();
  return <>
    <Typography variant="caption" color={colors.text.muted} style={{ marginBottom: 8 }}>
      {language === 'en' ? 'Update only what changed here. Items do not need a destination link.' : 'Perbarui hanya barang yang berubah di sini. Barang tidak harus dihubungkan ke destinasi.'}
    </Typography>
    <ScrollView style={{ maxHeight: 330 }} showsVerticalScrollIndicator>
      {items.length === 0 && <Typography variant="body" color={colors.text.muted}>{language === 'en' ? 'No items to update. You can mark this stop visited.' : 'Tidak ada barang untuk diperbarui. Destinasi tetap bisa ditandai dikunjungi.'}</Typography>}
      {items.map((item) => <View key={item.id} style={{ paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border.muted }}>
        <Typography variant="label" color={colors.brand.navy}>{item.customName}</Typography>
        <Typography variant="caption" color={colors.text.muted}>{item.category} · {language === 'en' ? 'Qty' : 'Jumlah'}: {item.quantity}</Typography>
        <ItemStatusPicker itemName={item.customName} value={choices[item.id] ?? item.state} disabled={busy} onSelect={(state) => { if (state !== 'returned') onChange(item.id, state); }} />
      </View>)}
    </ScrollView>
    <View style={{ gap: 7, marginTop: 12 }}>
      <Button variant="accent" size="md" label={language === 'en' ? 'Save & Mark Visited' : 'Simpan & Tandai Dikunjungi'} onPress={onSave} disabled={busy} isLoading={busy} />
      <Button variant="ghost" size="sm" label={language === 'en' ? 'Cancel' : 'Batal'} onPress={onCancel} disabled={busy} />
    </View>
  </>;
}
