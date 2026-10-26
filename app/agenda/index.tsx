import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, ScreenContainer, Typography } from '@/components/ui';
import { radius, spacing, useThemeColors } from '@/core/theme';
import { useI18n } from '@/core/i18n';
import { agendaRepository, AgendaRow } from '@/db/repositories/agenda.repository';

export default function AgendasScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { t, language } = useI18n();
  const [filter, setFilter] = useState<'active' | 'saved'>('active');
  const [agendas, setAgendas] = useState<AgendaRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(() => setAgendas(agendaRepository.getAll(filter)), [filter]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const refresh = () => { setRefreshing(true); load(); setRefreshing(false); };
  const labelFor = (type: AgendaRow['type']) => type === 'shopping' ? t.agenda.shopping : type === 'short_trip' ? t.agenda.shortTrip : t.agenda.event;

  return (
    <ScreenContainer edges={['left', 'right']}>
      <View style={[styles.tabs, { backgroundColor: colors.surface.muted }]}>
        {(['active', 'saved'] as const).map((key) => (
          <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: filter === key }} onPress={() => setFilter(key)} style={[styles.tab, filter === key && { backgroundColor: colors.brand.navy }]}>
            <Typography variant="label" color={filter === key ? '#FFFFFF' : colors.text.secondary}>{key === 'active' ? t.planning.activeAgendas : t.planning.savedAgendas}</Typography>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={agendas}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={refresh}
        contentContainerStyle={agendas.length ? styles.list : styles.emptyList}
        ListEmptyComponent={<EmptyState title={filter === 'active' ? t.agenda.noActive : t.agenda.noSaved} description={t.agenda.emptyDescription} actionLabel={filter === 'active' ? t.planning.createAgenda : undefined} onAction={filter === 'active' ? () => router.push('/agenda/new' as any) : undefined} />}
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" onPress={() => router.push(`/agenda/${item.id}` as any)} style={[styles.row, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
            <View style={[styles.icon, { backgroundColor: colors.surface.muted }]}><Ionicons name={item.type === 'shopping' ? 'cart-outline' : item.type === 'short_trip' ? 'navigate-outline' : 'sparkles-outline'} size={20} color={colors.brand.blue} /></View>
            <View style={styles.rowText}>
              <Typography variant="label" color={colors.text.primary} numberOfLines={1}>{item.title}</Typography>
              <Typography variant="caption" color={colors.text.secondary} numberOfLines={1}>{labelFor(item.type)}{item.date ? ` · ${item.date}` : ''}{item.location ? ` · ${item.location}` : ''}</Typography>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
          </Pressable>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', padding: 3, borderRadius: radius.full, marginTop: spacing[2], marginBottom: spacing[3] },
  tab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
  list: { paddingBottom: spacing[8] },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingHorizontal: spacing[3], marginBottom: spacing[2], borderRadius: radius.lg, borderWidth: 1 },
  icon: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 4 },
});
