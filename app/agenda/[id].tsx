import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input, ScreenContainer, Typography } from '@/components/ui';
import { radius, spacing, useThemeColors } from '@/core/theme';
import { useI18n } from '@/core/i18n';
import { AgendaWithItems } from '@/domains/agenda/types';
import { agendaRepository } from '@/db/repositories/agenda.repository';
import { agendaService } from '@/domains/agenda/service';

export default function AgendaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useThemeColors();
  const { t, language } = useI18n();
  const isId = language === 'id';
  const [agenda, setAgenda] = useState<AgendaWithItems | null>(null);
  const [newItem, setNewItem] = useState('');
  const [priceDrafts, setPriceDrafts] = useState<Record<string, { shelf: string; actual: string }>>({});
  const load = useCallback(() => { const next = agendaRepository.getById(id); setAgenda(next); }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!agenda) return <ScreenContainer><Typography variant="body">{isId ? 'Agenda tidak ditemukan.' : 'Agenda not found.'}</Typography></ScreenContainer>;
  const isSaved = agenda.status === 'saved';
  const label = agenda.type === 'shopping' ? t.agenda.shopping : agenda.type === 'short_trip' ? t.agenda.shortTrip : t.agenda.event;
  const money = (value: number) => `Rp ${Math.round(value).toLocaleString('id-ID')}`;
  const priceText = (id: string, key: 'shelf' | 'actual', current: number | null) => priceDrafts[id]?.[key] ?? (current == null ? '' : String(current));
  const updatePrice = (itemId: string, key: 'shelfPrice' | 'actualPrice', raw: string) => {
    const parsed = Number(raw.replace(/[^\d]/g, ''));
    const value = raw.trim() ? (Number.isFinite(parsed) ? parsed : null) : null;
    agendaRepository.updateItem(itemId, key === 'shelfPrice' ? { shelfPrice: value } : { actualPrice: value });
    load();
  };
  const closeAgenda = () => Alert.alert(t.agenda.close, t.agenda.closePrompt, [
    { text: t.agenda.cancel, style: 'cancel' },
    { text: t.agenda.delete, style: 'destructive', onPress: () => Alert.alert(t.agenda.deleteTitle, t.agenda.deleteConfirm, [
      { text: t.agenda.cancel, style: 'cancel' },
      { text: t.agenda.delete, style: 'destructive', onPress: () => { agendaService.delete(agenda.id); router.replace('/agenda' as any); } },
    ]) },
    { text: t.agenda.save, onPress: () => { agendaService.save(agenda.id); router.replace('/agenda' as any); } },
  ]);
  const addItem = () => {
    if (!newItem.trim()) return;
    agendaRepository.addItem(agenda.id, { name: newItem });
    setNewItem(''); load();
  };

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.headingRow}>
          <View style={styles.headingText}>
            <Typography variant="caption" color={colors.brand.coral}>{label}</Typography>
            <Typography variant="h2" color={colors.brand.navy} style={styles.title}>{agenda.title}</Typography>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: colors.surface.muted }]}><Typography variant="caption" color={isSaved ? colors.text.secondary : colors.brand.blue}>{isSaved ? t.agenda.saved : t.agenda.active}</Typography></View>
        </View>
        {!!(agenda.date || agenda.location) && <Typography variant="caption" color={colors.text.secondary} style={styles.meta}>{[agenda.date, agenda.location].filter(Boolean).join(' · ')}</Typography>}
        {!!agenda.notes && <Typography variant="body" color={colors.text.secondary} style={styles.notes}>{agenda.notes}</Typography>}
        {isSaved && <Typography variant="caption" color={colors.text.secondary} style={styles.savedMessage}>{t.agenda.savedReadOnly}</Typography>}

        {agenda.type === 'shopping' && (
          <Card style={[styles.summary, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
            <View style={styles.summaryRow}><Typography variant="caption" color={colors.text.secondary}>{t.agenda.estimate}</Typography><Typography variant="label" color={colors.brand.navy}>{money(agendaRepository.estimateTotal(agenda.id))}</Typography></View>
            <View style={styles.summaryRow}><Typography variant="caption" color={colors.text.secondary}>{t.agenda.actual}</Typography><Typography variant="label" color={colors.brand.navy}>{money(agendaRepository.actualTotal(agenda.id))}</Typography></View>
          </Card>
        )}

        <Typography variant="h3" color={colors.brand.navy} style={styles.section}>{t.agenda.items} · {agenda.items.filter((item) => item.isDone).length}/{agenda.items.length}</Typography>
        {agenda.items.map((item) => (
          <Card key={item.id} style={[styles.itemCard, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
            <View style={styles.itemTop}>
              {!isSaved && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !!item.isDone }} accessibilityLabel={item.isDone ? t.agenda.itemUndone : t.agenda.itemDone} onPress={() => { agendaRepository.updateItem(item.id, { isDone: !item.isDone }); load(); }} style={styles.checkButton}><Ionicons name={item.isDone ? 'checkbox' : 'square-outline'} size={23} color={item.isDone ? colors.status.success : colors.text.muted} /></Pressable>}
              <View style={styles.itemName}><Typography variant="body" color={colors.text.primary} style={item.isDone ? styles.doneText : undefined}>{item.name}</Typography><Typography variant="caption" color={colors.text.secondary}>{item.quantity}{item.unit ? ` ${item.unit}` : ''}</Typography>{!!item.notes && <Typography variant="caption" color={colors.text.muted}>{item.notes}</Typography>}</View>
              {!isSaved && <Pressable accessibilityRole="button" accessibilityLabel={isId ? 'Hapus item' : 'Remove item'} onPress={() => Alert.alert(t.agenda.deleteTitle, item.name, [{ text: t.agenda.cancel, style: 'cancel' }, { text: t.agenda.delete, style: 'destructive', onPress: () => { agendaRepository.removeItem(item.id); load(); } }])} style={styles.removeButton}><Ionicons name="trash-outline" size={17} color={colors.status.error} /></Pressable>}
            </View>
            {agenda.type === 'shopping' && (
              <View style={styles.priceRow}>
                <Input containerStyle={styles.priceInput} label={t.agenda.shelf} value={priceText(item.id, 'shelf', item.shelfPrice)} onChangeText={(value) => setPriceDrafts((current) => ({ ...current, [item.id]: { shelf: value, actual: priceText(item.id, 'actual', item.actualPrice) } }))} onBlur={() => updatePrice(item.id, 'shelfPrice', priceText(item.id, 'shelf', item.shelfPrice))} keyboardType="numeric" editable={!isSaved} placeholder="0" />
                <Input containerStyle={styles.priceInput} label={t.agenda.actualPrice} value={priceText(item.id, 'actual', item.actualPrice)} onChangeText={(value) => setPriceDrafts((current) => ({ ...current, [item.id]: { shelf: priceText(item.id, 'shelf', item.shelfPrice), actual: value } }))} onBlur={() => updatePrice(item.id, 'actualPrice', priceText(item.id, 'actual', item.actualPrice))} keyboardType="numeric" editable={!isSaved} placeholder="0" />
              </View>
            )}
          </Card>
        ))}
        {agenda.items.length === 0 && <Typography variant="caption" color={colors.text.muted} style={styles.noItems}>{t.agenda.emptyItems}</Typography>}
        {!isSaved && (
          <View style={styles.addRow}>
            <Input containerStyle={styles.addInput} label={undefined} placeholder={t.agenda.itemPlaceholder} value={newItem} onChangeText={setNewItem} onSubmitEditing={addItem} returnKeyType="done" />
            <Pressable accessibilityRole="button" accessibilityLabel={t.agenda.addItem} onPress={addItem} style={[styles.addButton, { backgroundColor: colors.brand.navy }]}><Ionicons name="add" size={24} color="#FFFFFF" /></Pressable>
          </View>
        )}
        {!isSaved && <Button variant="accent" label={t.agenda.close} onPress={closeAgenda} style={styles.closeButton} />}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing[4], paddingBottom: spacing[8] },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  headingText: { flex: 1 },
  title: { fontWeight: '800', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  meta: { marginTop: spacing[2] },
  notes: { marginTop: spacing[2] },
  savedMessage: { marginTop: spacing[2] },
  summary: { padding: spacing[3], borderWidth: 1, marginTop: spacing[4] },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  section: { fontWeight: '800', marginTop: spacing[5], marginBottom: spacing[2] },
  itemCard: { padding: spacing[3], borderWidth: 1, marginBottom: spacing[2] },
  itemTop: { flexDirection: 'row', alignItems: 'center' },
  checkButton: { width: 42, height: 42, justifyContent: 'center' },
  itemName: { flex: 1 },
  doneText: { textDecorationLine: 'line-through' },
  removeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  priceRow: { flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] },
  priceInput: { flex: 1, marginBottom: 0 },
  noItems: { textAlign: 'center', padding: spacing[4] },
  addRow: { flexDirection: 'row', gap: spacing[2], alignItems: 'flex-start', marginTop: spacing[2] },
  addInput: { flex: 1 },
  addButton: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 0 },
  closeButton: { marginTop: spacing[4] },
});
