import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, fontFamily, useThemeColors } from '@/core/theme';
import { Typography, Badge, EmptyState, ScreenContainer } from '@/components/ui';
import { useTrips } from '@/hooks/useTrips';
import { formatDateRange } from '@/core/utils';
import { TripRecord } from '@/db/schema/trips';
import { useI18n } from '@/core/i18n';
import { useUIStore } from '@/stores/ui-store';
import { tripRepository } from '@/db/repositories/trip.repository';

type FilterType = 'all' | 'ongoing' | 'preparing' | 'completed';
type ViewMode = 'grid' | 'list';

export default function TripsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const isDarkMode = useUIStore((state) => state.isDarkMode);
  const { t, language } = useI18n();
  const { planningTrips: trips, isLoading, refreshTrips } = useTrips(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const text = (en: string, id: string) => language === 'en' ? en : id;
  const filteredTrips = trips.filter((trip) => {
    if (filter === 'ongoing') return trip.status === 'ongoing';
    if (filter === 'preparing') return ['preparing', 'ready', 'draft'].includes(trip.status);
    if (filter === 'completed') return trip.status === 'completed';
    return true;
  });
  const filterTabs = [
    { key: 'all', label: t.tripsList.filterAll },
    { key: 'ongoing', label: t.tripsList.filterActive },
    { key: 'preparing', label: t.tripsList.filterPreparing },
    { key: 'completed', label: t.tripsList.filterDone },
  ] as const;
  const statusLabel = (trip: TripRecord) => trip.status === 'ongoing' ? t.tripsList.statusOngoing
    : trip.status === 'completed' ? t.tripsList.statusDone
    : trip.status === 'ready' ? t.tripsList.statusReady : t.tripsList.statusPlanning;
  const statusVariant = (trip: TripRecord) => trip.status === 'ongoing' ? 'accent' as const
    : trip.status === 'completed' ? 'neutral' as const
    : trip.status === 'ready' ? 'success' as const : 'warning' as const;
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
          </View>
          <Typography variant="caption" color={colors.text.secondary} numberOfLines={1} style={styles.secondaryText}>
            {item.destination} · {formatDateRange(item.startDate, item.endDate, language)}
          </Typography>
          <View style={styles.listStatusRow}>
            <View style={[styles.statusDot, { backgroundColor: completed ? colors.text.muted : item.status === 'ready' ? colors.status.success : item.status === 'ongoing' ? colors.brand.coral : colors.status.warning }]} />
            <Typography variant="caption" color={colors.text.secondary} style={styles.statusText}>{statusLabel(item)}{completed ? text(' · Read only', ' · Hanya baca') : ''}</Typography>
            {!!item.hasMissingItems && <Ionicons name="alert-circle-outline" size={13} color={colors.status.error} />}
          </View>
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
            {item.coverPhotoPath ? <Image source={{ uri: item.coverPhotoPath }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Ionicons name="map-outline" size={28} color={colors.brand.blue} />}
            {completed && <View style={styles.lockBadge}><Ionicons name="lock-closed" size={12} color={colors.brand.navy} /></View>}
          </View>
          <View style={styles.gridInfo}>
            <Badge label={statusLabel(item)} variant={statusVariant(item)} size="sm" dot />
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
      <View style={[styles.tabsContainer, { backgroundColor: isDarkMode ? colors.surface.muted : '#EEF2F6' }]}>
        {filterTabs.map((tab) => <Pressable key={tab.key} accessibilityRole="tab" accessibilityState={{ selected: filter === tab.key }} onPress={() => setFilter(tab.key)} style={[styles.tabButton, filter === tab.key && { backgroundColor: isDarkMode ? colors.brand.blue : colors.brand.navy }]}>
          <Typography variant="label" color={filter === tab.key ? '#FFFFFF' : colors.text.secondary} style={styles.tabText}>{tab.label}</Typography>
        </Pressable>)}
      </View>
      <View style={styles.toolbar}>
        <Typography variant="caption" color={colors.text.secondary} style={styles.secondaryText}>{filteredTrips.length} {text(filteredTrips.length === 1 ? 'trip' : 'trips', 'trip')}</Typography>
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
  tabsContainer: { flexDirection: 'row', borderRadius: radius.full, padding: 3, marginTop: 4 },
  tabButton: { flex: 1, paddingVertical: 8, borderRadius: radius.full, alignItems: 'center' },
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
  listStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontFamily: fontFamily.regular, fontWeight: '400', fontSize: 10, lineHeight: 14 },
  deleteButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  openButton: { width: 24, height: 40, alignItems: 'center', justifyContent: 'center' },
  gridColumns: { gap: 12 },
  gridCard: { flex: 1, maxWidth: '48.5%', borderWidth: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  gridMain: { flex: 1 },
  gridCover: { height: 76, alignItems: 'center', justifyContent: 'center' },
  lockBadge: { position: 'absolute', right: 8, top: 8, padding: 5, backgroundColor: '#FFFFFF', borderRadius: 12 },
  gridInfo: { padding: 10, gap: 6 },
  gridTitle: { fontFamily: fontFamily.semiBold, fontWeight: '600', fontSize: 13, lineHeight: 18, minHeight: 36 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  gridDate: { fontFamily: fontFamily.regular, fontWeight: '400', fontSize: 10, lineHeight: 15 },
  gridFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingLeft: 10 },
  gridOpen: { flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 3 },
  openText: { fontSize: 11, fontWeight: '500' },
});
