import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, fontFamily, useThemeColors } from '@/core/theme';
import { Typography, EmptyState, ScreenContainer } from '@/components/ui';
import { useTrips } from '@/hooks/useTrips';
import { formatDateRange } from '@/core/utils';
import { TripRecord } from '@/db/schema/trips';
import { useI18n } from '@/core/i18n';
import { useUIStore } from '@/stores/ui-store';
import { tripRepository } from '@/db/repositories/trip.repository';

type FilterType = 'active' | 'done';
type ViewMode = 'grid' | 'list';

export default function TripsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const isDarkMode = useUIStore((state) => state.isDarkMode);
  const { t, language } = useI18n();
  const { planningTrips: trips, isLoading, refreshTrips } = useTrips(true);
  const [filter, setFilter] = useState<FilterType>('active');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const text = (en: string, id: string) => language === 'en' ? en : id;
  const filteredTrips = trips.filter((trip) => {
    if (filter === 'active') return trip.status !== 'completed';
    if (filter === 'done') return trip.status === 'completed';
    return true;
  });
  const filterTabs = [
    { key: 'active', label: t.tripsList.filterActive },
    { key: 'done', label: t.tripsList.filterDone },
  ] as const;
  const openTrip = (trip: TripRecord) => router.push(`/trip/${trip.id}`);
  const removePlan = (trip: TripRecord) => Alert.alert(
    text('Delete from planning?', 'Hapus dari planning?'),
    text('This removes the trip from your planning lists. Saved memory albums, photos and archived trip details will stay available.', 'Trip ini akan dihapus dari daftar planning. Album kenangan, foto, dan detail arsip trip yang sudah tersimpan tetap tersedia.'),
    [
      { text: t.trip.cancel, style: 'cancel' },
      { text: text('Delete plan', 'Hapus planning'), style: 'destructive', onPress: async () => {
        setRemovingId(trip.id);
        try { await tripRepository.removeFromPlanning(trip.id); await refreshTrips(); }
        catch { Alert.alert(text('Error', 'Gagal'), text('Could not remove this plan. Please try again.', 'Planning belum bisa dihapus. Silakan coba lagi.')); }
        finally { setRemovingId(null); }
      } },
    ],
  );
  const deleteButton = (trip: TripRecord) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${text('Delete plan', 'Hapus planning')}: ${trip.name}`} onPress={() => removePlan(trip)} disabled={removingId !== null} hitSlop={4} style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.5 }]}>
      <Ionicons name="trash-outline" size={18} color={colors.status.error} />
    </Pressable>
  );
  const renderTrip = ({ item }: { item: TripRecord }) => {
    const completed = item.status === 'completed';
    if (viewMode === 'list') return (
      <View style={[styles.listRow, { borderBottomColor: colors.border.default }]}>
        <Pressable accessibilityRole="button" onPress={() => openTrip(item)} style={({ pressed }) => [styles.listMain, pressed && { opacity: 0.65 }]}>
          <View style={styles.listTitleRow}>
            {completed && <Ionicons name="lock-closed-outline" size={13} color={colors.text.muted} />}
            <Typography variant="body" numberOfLines={1} style={styles.listTitle}>{item.name}</Typography>
            {!!item.hasMissingItems && <Ionicons name="alert-circle-outline" size={14} color={colors.status.error} />}
          </View>
          <Typography variant="caption" color={colors.text.secondary} numberOfLines={1} style={styles.secondaryText}>
            {item.destination} · {formatDateRange(item.startDate, item.endDate, language)}
          </Typography>
        </Pressable>
        {deleteButton(item)}
        <Pressable accessibilityRole="button" accessibilityLabel={`${text('Open trip', 'Buka trip')}: ${item.name}`} onPress={() => openTrip(item)} style={styles.openButton}>
          <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
        </Pressable>
      </View>
    );
    return (
      <View style={[styles.gridCard, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
        <Pressable accessibilityRole="button" onPress={() => openTrip(item)} style={({ pressed }) => [styles.gridMain, pressed && { opacity: 0.65 }]}>
          <View style={[styles.gridCover, { backgroundColor: isDarkMode ? colors.surface.muted : '#EDF5FC' }]}>
            {item.coverPhotoPath ? <Image source={{ uri: item.coverPhotoPath }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Ionicons name="map-outline" size={18} color={colors.brand.blue} />}
            {completed && <View style={styles.lockBadge}><Ionicons name="lock-closed" size={11} color={colors.brand.navy} /></View>}
            {!!item.hasMissingItems && (
              <View style={styles.missingBadgeIcon}>
                <Ionicons name="alert-circle" size={13} color={colors.status.error} />
              </View>
            )}
          </View>
          <View style={styles.gridInfo}>
            <Typography variant="body" numberOfLines={2} style={styles.gridTitle}>{item.name}</Typography>
            <View style={styles.locationRow}><Ionicons name="location-outline" size={12} color={colors.brand.coral} /><Typography variant="caption" color={colors.text.secondary} numberOfLines={1} style={[styles.secondaryText, { flex: 1 }]}>{item.destination}</Typography></View>
            <Typography variant="caption" color={colors.text.muted} style={styles.gridDate}>{formatDateRange(item.startDate, item.endDate, language)}</Typography>
          </View>
        </Pressable>
        <View style={[styles.gridFooter, { borderTopColor: colors.border.muted }]}>
          <Pressable accessibilityRole="button" onPress={() => openTrip(item)} style={styles.gridOpen}>
            <Typography variant="caption" color={colors.brand.blue} style={styles.openText}>{completed ? text('View archive', 'Lihat arsip') : text('Open plan', 'Buka rencana')}</Typography>
            <Ionicons name="chevron-forward" size={13} color={colors.brand.blue} />
          </Pressable>
          {deleteButton(item)}
        </View>
      </View>
    );
  };
  return (
    <ScreenContainer edges={['left', 'right']} style={{ paddingTop: 12 }}>
      <View style={[styles.planningTabs, { backgroundColor: isDarkMode ? colors.surface.muted : '#F1F5F9', borderColor: colors.border.default }]}>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: true }} style={[styles.planningTab, { backgroundColor: isDarkMode ? colors.brand.blue : colors.brand.navy }]}>
          <Ionicons name="map-outline" size={15} color="#FFFFFF" />
          <Typography variant="label" color="#FFFFFF" style={styles.tabText}>{t.planning.trip}</Typography>
        </Pressable>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: false }} onPress={() => router.push('/agenda' as any)} style={styles.planningTab}>
          <Ionicons name="list-outline" size={15} color={colors.text.secondary} />
          <Typography variant="label" color={colors.text.secondary} style={styles.tabText}>{t.planning.agenda}</Typography>
        </Pressable>
      </View>
      <View style={styles.toolbar}>
        <Typography variant="caption" color={colors.text.secondary} style={styles.secondaryText}>{filteredTrips.length} {text(filteredTrips.length === 1 ? 'trip' : 'trips', 'trip')}</Typography>
        <View style={styles.statusTabs}>
          {filterTabs.map((tab) => {
            const selected = filter === tab.key;
            return <Pressable key={tab.key} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setFilter(tab.key)} style={styles.statusTab}>
              <Typography variant="label" color={selected ? colors.brand.navy : colors.text.muted} style={styles.statusTabText}>{tab.label}</Typography>
              <View style={[styles.statusTabIndicator, { backgroundColor: selected ? colors.brand.coral : 'transparent' }]} />
            </Pressable>;
          })}
        </View>
        <View style={[styles.viewToggle, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
          {(['grid', 'list'] as const).map((mode) => <Pressable key={mode} accessibilityRole="button" accessibilityLabel={mode === 'grid' ? text('Grid view', 'Tampilan grid') : text('List view', 'Tampilan list')} accessibilityState={{ selected: viewMode === mode }} onPress={() => setViewMode(mode)} style={[styles.viewButton, viewMode === mode && { backgroundColor: colors.surface.muted }]}>
            <Ionicons name={mode === 'grid' ? 'grid' : 'list'} size={18} color={viewMode === mode ? colors.brand.coral : colors.text.muted} />
          </Pressable>)}
        </View>
      </View>
      <FlatList key={viewMode} data={filteredTrips} keyExtractor={(item) => item.id} renderItem={renderTrip} numColumns={viewMode === 'grid' ? 2 : 1} columnWrapperStyle={viewMode === 'grid' ? styles.gridColumns : undefined} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshing={isLoading} onRefresh={refreshTrips}
        ListEmptyComponent={<EmptyState title={t.tripsList.emptyTitle} description={t.tripsList.emptyDesc} actionLabel={t.tripsList.createBtn} onAction={() => router.push('/trip/new')} />} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  planningTabs: { flexDirection: 'row', borderRadius: radius.full, padding: 4, marginTop: 4, marginBottom: 10, borderWidth: 1 },
  planningTab: { flex: 1, minHeight: 38, flexDirection: 'row', gap: 7, justifyContent: 'center', alignItems: 'center', borderRadius: radius.full },
  statusTabs: { flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center' },
  statusTab: { minWidth: 50, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  statusTabText: { fontSize: 12 },
  statusTabIndicator: { position: 'absolute', bottom: 1, left: 7, right: 7, height: 2, borderRadius: 2 },
  tabText: { fontSize: 12 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 },
  viewToggle: { flexDirection: 'row', borderWidth: 1, borderRadius: 10, padding: 3 },
  viewButton: { width: 36, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 7 },
  content: { paddingBottom: spacing[8] },
  listRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 12 },
  listMain: { flex: 1, gap: 4, paddingVertical: 2 },
  listTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  listTitle: { flex: 1, fontFamily: fontFamily.semiBold, fontWeight: '600', fontSize: 14, lineHeight: 20 },
  secondaryText: { fontFamily: fontFamily.regular, fontWeight: '400', fontSize: 11, lineHeight: 16 },
  deleteButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  openButton: { width: 24, height: 40, alignItems: 'center', justifyContent: 'center' },
  gridColumns: { gap: 12 },
  gridCard: { flex: 1, maxWidth: '48.5%', borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  gridMain: { flex: 1 },
  gridCover: { height: 44, alignItems: 'center', justifyContent: 'center' },
  lockBadge: { position: 'absolute', right: 8, top: 6, padding: 4, backgroundColor: '#FFFFFF', borderRadius: 10 },
  missingBadgeIcon: { position: 'absolute', left: 8, top: 6, padding: 3, backgroundColor: '#FFFFFF', borderRadius: 10 },
  gridInfo: { padding: 10, gap: 6 },
  gridTitle: { fontFamily: fontFamily.semiBold, fontWeight: '600', fontSize: 13, lineHeight: 18, minHeight: 36 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridDate: { fontFamily: fontFamily.regular, fontWeight: '400', fontSize: 10, lineHeight: 15 },
  gridFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingLeft: 10 },
  gridOpen: { flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 3 },
  openText: { fontSize: 11, fontWeight: '500' },
});
