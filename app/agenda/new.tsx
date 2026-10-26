import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input, ScreenContainer, Typography } from '@/components/ui';
import { CreateTypeTabs } from '@/components/agenda';
import { radius, spacing, useThemeColors } from '@/core/theme';
import { useI18n } from '@/core/i18n';
import { agendaService } from '@/domains/agenda/service';
import { AgendaType } from '@/domains/agenda/types';
import { usePlanningDraftStore } from '@/stores/planning-draft-store';

const TEMPLATES: { type: AgendaType; icon: keyof typeof Ionicons.glyphMap; labelKey: 'shopping' | 'shortTrip' | 'event'; hintKey: 'shoppingHint' | 'shortTripHint' | 'eventHint' }[] = [
  { type: 'shopping', icon: 'cart-outline', labelKey: 'shopping', hintKey: 'shoppingHint' },
  { type: 'short_trip', icon: 'navigate-outline', labelKey: 'shortTrip', hintKey: 'shortTripHint' },
  { type: 'event', icon: 'sparkles-outline', labelKey: 'event', hintKey: 'eventHint' },
];

const parseOptionalNumber = (value: string): number | null => {
  const number = Number(value.replace(/[^\d.,]/g, '').replace(',', '.'));
  return Number.isFinite(number) && number > 0 ? number : null;
};

export default function NewAgendaScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { t, language } = useI18n();
  const isId = language === 'id';
  const draft = usePlanningDraftStore((s) => s.agenda);
  const setAgendaDraft = usePlanningDraftStore((s) => s.setAgenda);
  const clearAgendaDraft = usePlanningDraftStore((s) => s.clearAgenda);
  const [type, setType] = useState<AgendaType>(draft?.type ?? 'shopping');
  const [title, setTitle] = useState(draft?.title ?? '');
  const [date, setDate] = useState(draft?.date ?? '');
  const [location, setLocation] = useState(draft?.location ?? '');
  const [notes, setNotes] = useState(draft?.notes ?? '');
  const [items, setItems] = useState(draft?.items ?? []);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAgendaDraft({ type, title, date, location, notes, items });
  }, [type, title, date, location, notes, items, setAgendaDraft]);

  const template = useMemo(() => TEMPLATES.find((entry) => entry.type === type)!, [type]);
  const addItem = () => {
    if (!itemName.trim()) return;
    setItems((current) => [...current, {
      name: itemName.trim(),
      quantity: Math.max(0.01, Number(quantity.replace(',', '.')) || 1),
      unit: unit.trim(),
      estimatedPrice: type === 'shopping' ? parseOptionalNumber(estimatedPrice) : null,
      notes: itemNotes.trim(),
    }]);
    setItemName(''); setQuantity('1'); setUnit(''); setEstimatedPrice(''); setItemNotes('');
  };

  const createAgenda = () => {
    if (!title.trim()) {
      Alert.alert(isId ? 'Nama agenda diperlukan' : 'Agenda name required', t.agenda.requiredTitle);
      return;
    }
    setSubmitting(true);
    try {
      const id = agendaService.create({ type, title, date: date.trim() || null, location: location.trim() || null, notes: notes.trim() || null, items });
      clearAgendaDraft();
      router.replace(`/agenda/${id}` as any);
    } catch {
      Alert.alert(isId ? 'Gagal' : 'Error', t.agenda.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <CreateTypeTabs active="agenda" />
        <Typography variant="h2" color={colors.brand.navy} style={styles.heading}>{t.agenda.header}</Typography>
        <Typography variant="body" color={colors.text.secondary} style={styles.description}>{t.agenda.description}</Typography>

        <View style={styles.templateGrid}>
          {TEMPLATES.map((entry) => {
            const selected = entry.type === type;
            return (
              <Pressable key={entry.type} accessibilityRole="radio" accessibilityState={{ selected }} onPress={() => setType(entry.type)} style={[styles.templateCard, { backgroundColor: colors.surface.card, borderColor: selected ? colors.brand.coral : colors.border.default }]}>
                <Ionicons name={entry.icon} size={21} color={selected ? colors.brand.coral : colors.brand.blue} />
                <Typography variant="label" color={colors.brand.navy} style={styles.templateLabel}>{t.agenda[entry.labelKey]}</Typography>
              </Pressable>
            );
          })}
        </View>
        <Typography variant="caption" color={colors.text.secondary} style={styles.hint}>{t.agenda[template.hintKey]}</Typography>

        <Card style={[styles.card, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
          <Input label={t.agenda.title} placeholder={t.agenda.titlePlaceholder} value={title} onChangeText={setTitle} returnKeyType="next" />
          <Input label={t.agenda.date} placeholder={isId ? 'YYYY-MM-DD' : 'YYYY-MM-DD'} value={date} onChangeText={setDate} />
          <Input label={type === 'short_trip' ? (isId ? 'Tempat / rute (opsional)' : 'Places / route (optional)') : t.agenda.location} placeholder={type === 'short_trip' ? (isId ? 'Contoh: Bogor, Kebun Raya' : 'e.g. Bogor, botanical garden') : (isId ? 'Contoh: Pasar' : 'e.g. City market')} value={location} onChangeText={setLocation} />
          <Input label={t.agenda.notes} value={notes} onChangeText={setNotes} multiline style={styles.multiline} />
        </Card>

        <Typography variant="h3" color={colors.brand.navy} style={styles.sectionHeading}>{t.agenda.items}</Typography>
        <Card style={[styles.card, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
          <Input label={undefined} placeholder={t.agenda.itemPlaceholder} value={itemName} onChangeText={setItemName} returnKeyType="done" onSubmitEditing={addItem} />
          <View style={styles.rowInputs}>
            <Input containerStyle={styles.smallInput} label={t.agenda.quantity} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
            <Input containerStyle={styles.smallInput} label={t.agenda.unit} value={unit} onChangeText={setUnit} placeholder={isId ? 'pcs, kg' : 'pcs, kg'} />
          </View>
          {type === 'shopping' && <Input label={t.agenda.estimatedPrice} value={estimatedPrice} onChangeText={setEstimatedPrice} keyboardType="numeric" placeholder="0" />}
          <Input label={t.agenda.notes} value={itemNotes} onChangeText={setItemNotes} />
          <Button variant="secondary" label={t.agenda.addItem} onPress={addItem} />
          {items.length === 0 ? <Typography variant="caption" color={colors.text.muted} style={styles.emptyList}>{t.agenda.emptyItems}</Typography> : items.map((item, index) => (
            <View key={`${item.name}-${index}`} style={[styles.itemPreview, { borderTopColor: colors.border.muted }]}>
              <View style={styles.itemPreviewText}>
                <Typography variant="body" color={colors.text.primary}>{item.name}</Typography>
                <Typography variant="caption" color={colors.text.secondary}>{item.quantity} {item.unit}{item.estimatedPrice ? ` · Rp ${item.estimatedPrice.toLocaleString('id-ID')}` : ''}</Typography>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={isId ? 'Hapus item' : 'Remove item'} onPress={() => setItems((current) => current.filter((_, i) => i !== index))} style={styles.removeItem}>
                <Ionicons name="close-circle-outline" size={20} color={colors.text.muted} />
              </Pressable>
            </View>
          ))}
        </Card>
        <Button label={t.agenda.create} onPress={createAgenda} isLoading={submitting} style={styles.submit} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing[3], paddingBottom: 140 },
  heading: { fontWeight: '800', marginBottom: 4 },
  description: { marginBottom: spacing[4] },
  templateGrid: { flexDirection: 'row', gap: 8 },
  templateCard: { flex: 1, minHeight: 82, borderWidth: 1.5, borderRadius: radius.md, padding: 10, justifyContent: 'center', alignItems: 'center' },
  templateLabel: { textAlign: 'center', fontSize: 11, marginTop: 7 },
  hint: { marginTop: 9, marginBottom: spacing[3] },
  card: { padding: spacing[4], borderWidth: 1, marginBottom: spacing[4] },
  multiline: { minHeight: 76, textAlignVertical: 'top', paddingTop: 10 },
  sectionHeading: { fontWeight: '800', marginBottom: spacing[2] },
  rowInputs: { flexDirection: 'row', gap: spacing[2] },
  smallInput: { flex: 1 },
  emptyList: { textAlign: 'center', paddingTop: spacing[3] },
  itemPreview: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 9 },
  itemPreviewText: { flex: 1 },
  removeItem: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  submit: { marginTop: spacing[1] },
});
