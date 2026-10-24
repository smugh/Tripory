import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Card, Badge, Button, ScreenContainer } from '@/components/ui';
import { tripRepository } from '@/db/repositories/trip.repository';
import { destinationRepository } from '@/db/repositories/destination.repository';
import { packingRepository } from '@/db/repositories/packing.repository';
import { momentRepository } from '@/db/repositories/moment.repository';
import { tripClosureService } from '@/domains/trip-closure/service';
import { TripRecord } from '@/db/schema/trips';
import { DestinationRecord } from '@/db/schema/destinations';
import { TripItemRecord } from '@/db/schema/trip-items';
import { MomentRecord } from '@/db/schema/moments';
import { formatDateRange } from '@/core/utils';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';
import { ItemStatusPicker, FinalItemState } from '@/components/packing/ItemStatusPicker';
import { unresolvedReturnItems } from '@/domains/trip-closure/validation';

type ReturnFilter = 'all' | 'pending' | 'returned' | 'missing';

export default function TripCloseScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  const themeColors = useThemeColors();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const { t, format, language } = useI18n();

  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [destinations, setDestinations] = useState<DestinationRecord[]>([]);
  const [items, setItems] = useState<TripItemRecord[]>([]);
  const [moments, setMoments] = useState<MomentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [filter, setFilter] = useState<ReturnFilter>('all');

  const loadData = useCallback(async () => {
    if (!tripId) return;
    try {
      setLoading(true);
      const tripData = await tripRepository.getById(tripId);
      if (!tripData) {
        Alert.alert('Error', t.trip.tripNotFound);
        router.back();
        return;
      }
      setTrip(tripData);

      const dests = await destinationRepository.getByTripId(tripId);
      setDestinations(dests);

      const tripItems = await packingRepository.getByTripId(tripId);
      setItems(tripItems);

      const m = await momentRepository.getByTripId(tripId);
      setMoments(m);
    } catch {
      Alert.alert('Error', t.trip.alertLoadError);
    } finally {
      setLoading(false);
    }
  }, [tripId, router, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [isUpdatingItems, setIsUpdatingItems] = useState(false);
  const handleSetFinalState = async (item: TripItemRecord, state: FinalItemState) => {
    if (isClosing || isUpdatingItems) return;
    setIsUpdatingItems(true);
    try {
      await packingRepository.updateItemState(item.id, state);
      setItems((previous) => previous.map((entry) => entry.id === item.id ? { ...entry, state } : entry));
    } catch { Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.trip.alertItemUpdateError); }
    finally { setIsUpdatingItems(false); }
  };

  const handleMarkAllReturned = async () => {
    if (isClosing || isUpdatingItems) return;
    setIsUpdatingItems(true);
    try {
      for (const item of unresolvedReturnItems(items)) await packingRepository.updateItemState(item.id, 'returned');
      setItems((previous) => previous.map((item) => item.state === 'missing' ? item : { ...item, state: 'returned' as const }));
    } catch { Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.trip.alertItemUpdateError); }
    finally { setIsUpdatingItems(false); }
  };
  // Execute trip closure
  const handleExecuteClose = async () => {
    if (!tripId) return;

    try {
      setIsClosing(true);
      const result = await tripClosureService.closeTrip({ tripId });

      if (result.hasMissingItems) {
        Alert.alert(
          t.tripClose.successTitle,
          format(t.tripClose.successMsgMissing, { count: result.missingItemsCount }),
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)' as any),
            },
          ]
        );
      } else {
        Alert.alert(
          t.tripClose.successTitle,
          t.tripClose.successMsgAll,
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)' as any),
            },
          ]
        );
      }
    } catch {
      Alert.alert('Error', t.trip.alertTripCloseError);
    } finally {
      setIsClosing(false);
    }
  };

  if (loading || !trip) {
    return (
      <ScreenContainer style={styles.centerContainer}>
        <ActivityIndicator size="large" color={themeColors.brand.coral} />
      </ScreenContainer>
    );
  }

  if (trip.status === 'completed') return <Redirect href={{ pathname: '/trip/[id]', params: { id: trip.id } }} />;

  const returnedCount = items.filter((i) => i.state === 'returned').length;
  const unreturnedCount = unresolvedReturnItems(items).length;
  const missingCount = items.filter((item) => item.state === 'missing').length;
  const allReturned = items.length > 0 && returnedCount === items.length;

  const filteredItems = items.filter((item) => {
    if (filter === 'returned') return item.state === 'returned';
    if (filter === 'pending') return item.state !== 'returned' && item.state !== 'missing';
    if (filter === 'missing') return item.state === 'missing';
    return true;
  });

  return (
    <ScreenContainer edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Summary Card */}
        <Card variant="navy" style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={{ flex: 1 }}>
              <Typography variant="h1" color="#FFFFFF" style={styles.tripTitle}>
                {trip.name}
              </Typography>
              <View style={styles.destRow}>
                <Ionicons name="location-sharp" size={15} color="#93C5FD" />
                <Typography variant="body" color="#F1F5F9" style={{ marginLeft: 4 }}>
                  {trip.destination}
                </Typography>
              </View>
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={13} color="#CBD5E1" />
                <Typography variant="caption" color="#CBD5E1" style={{ marginLeft: 4 }}>
                  {formatDateRange(trip.startDate, trip.endDate, language)}
                </Typography>
              </View>
            </View>

            <View style={styles.flagIconWrap}>
              <Ionicons name="flag" size={28} color="#FF6B57" />
            </View>
          </View>

          {/* 3 Metric Stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Typography variant="caption" color="#CBD5E1">
                {t.tripClose.statStops}
              </Typography>
              <Typography variant="h2" color="#FFFFFF" style={styles.statNumber}>
                {destinations.filter((stop) => stop.isVisited).length}/{destinations.length}
              </Typography>
            </View>

            <View style={styles.statBox}>
              <Typography variant="caption" color="#CBD5E1">
                {t.tripClose.statPhotos}
              </Typography>
              <Typography variant="h2" color="#FFFFFF" style={styles.statNumber}>
                {moments.length}
              </Typography>
            </View>

            <View style={styles.statBox}>
              <Typography variant="caption" color="#CBD5E1">
                {t.tripClose.statItems}
              </Typography>
              <Typography
                variant="h2"
                color={allReturned ? '#22C55E' : '#FF6B57'}
                style={styles.statNumber}
              >
                {returnedCount}/{items.length}
              </Typography>
            </View>
          </View>
        </Card>

        {/* Status Banner */}
        {allReturned ? (
          <View style={[styles.statusBanner, { backgroundColor: 'rgba(22, 163, 74, 0.12)', borderColor: themeColors.status.success }]}>
            <Ionicons name="checkmark-circle" size={22} color={themeColors.status.success} />
            <Typography variant="body" color={themeColors.status.success} style={styles.bannerText}>
              {t.tripClose.allReturnedBanner}
            </Typography>
          </View>
        ) : (
          <View style={[styles.statusBanner, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: themeColors.status.warning }]}>
            <Ionicons name="alert-circle-outline" size={22} color={themeColors.status.warning} />
            <Typography variant="caption" color={themeColors.brand.navy} style={styles.bannerText}>
              {unreturnedCount > 0 ? format(t.tripClose.unreturnedNotice, { count: unreturnedCount })
                : (language === 'en' ? `${missingCount} missing items will be recorded in your trip album.` : `${missingCount} barang hilang akan dicatat di album perjalanan.`)}
            </Typography>
          </View>
        )}

        {/* Section: Return Checklist */}
        <Card style={styles.checklistCard}>
          <View style={styles.checklistHeader}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="bag-check" size={20} color={themeColors.brand.coral} />
                <Typography variant="h3" color={themeColors.brand.navy} style={{ marginLeft: 8 }}>
                  {t.tripClose.checklistTitle}
                </Typography>
              </View>
              <Typography variant="caption" color={themeColors.text.muted} style={{ marginTop: 2 }}>
                {t.tripClose.checklistSubtitle}
              </Typography>
            </View>
          </View>

          {/* Quick Mark All Returned Button */}
          {unreturnedCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              label={language === 'en' ? 'Confirm remaining items returned' : 'Pastikan barang tersisa sudah pulang'}
              onPress={handleMarkAllReturned}
              style={{ marginTop: 10, marginBottom: 12 }}
            />
          )}

          {/* Filter Chips */}
          <View style={styles.filterRow}>
            {(
              [
                { key: 'all', label: format(t.tripClose.filterAll, { count: items.length }) },
                { key: 'pending', label: format(t.tripClose.filterPending, { count: unreturnedCount }) },
                { key: 'returned', label: format(t.tripClose.filterReturned, { count: returnedCount }) },
                { key: 'missing', label: language === 'en' ? `Missing (${missingCount})` : `Hilang (${missingCount})` },
              ] as const
            ).map((chip) => (
              <Pressable
                key={chip.key}
                onPress={() => setFilter(chip.key)}
                style={[
                  styles.filterChip,
                  { backgroundColor: themeColors.surface.muted, borderColor: themeColors.border.default },
                  filter === chip.key && [
                    styles.filterChipActive,
                    { backgroundColor: themeColors.brand.navy, borderColor: themeColors.brand.navy },
                  ],
                ]}
              >
                <Typography
                  variant="caption"
                  color={filter === chip.key ? '#FFFFFF' : themeColors.text.secondary}
                  style={{ fontWeight: '700' }}
                >
                  {chip.label}
                </Typography>
              </Pressable>
            ))}
          </View>

          {/* Item Rows */}
          {filteredItems.length === 0 ? (
            <View style={styles.emptyItemsBox}>
              <Typography variant="caption" color={themeColors.text.muted}>
                Tidak ada barang di filter ini.
              </Typography>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {filteredItems.map((item) => (
                <View key={item.id} style={[styles.itemRow, { flexDirection: 'column', alignItems: 'stretch', backgroundColor: themeColors.surface.page, borderColor: item.state === 'missing' ? themeColors.status.error : themeColors.border.default }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Typography variant="label" color={themeColors.brand.navy}>{item.customName}</Typography>
                      <Typography variant="caption" color={themeColors.text.muted}>{item.category} · Qty: {item.quantity}</Typography>
                    </View>
                    <Badge label={item.state === 'returned' ? t.tripClose.statusReturned : item.state === 'missing' ? (language === 'en' ? 'Missing' : 'Hilang') : t.tripClose.statusPending} variant={item.state === 'returned' ? 'success' : 'warning'} size="sm" />
                  </View>
                  <ItemStatusPicker finalCheck itemName={item.customName} value={item.state} disabled={isClosing || isUpdatingItems} onSelect={(state) => { if (state !== 'used' && state !== 'packed') handleSetFinalState(item, state); }} />
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Action Buttons */}
        <View style={styles.footerActions}>
          <Typography variant="caption" color={themeColors.text.secondary} style={{ marginBottom: 10 }}>
            {language === 'en'
              ? `${unreturnedCount} items still need a final status. ${missingCount} missing items will be saved in the album. Once closed, this trip becomes read-only.`
              : `${unreturnedCount} barang masih perlu status akhir. ${missingCount} barang hilang akan disimpan di album. Setelah ditutup, trip hanya bisa dibaca.`}
          </Typography>
          <Button
            variant="destructive"
            size="lg"
            label={isClosing ? t.tripClose.closingTrip : t.tripClose.closeTripBtn}
            onPress={handleExecuteClose}
            disabled={isClosing || isUpdatingItems}
          />

          <Button
            variant="ghost"
            size="md"
            label={t.tripClose.returnToTripBtn}
            onPress={() => router.back()}
            disabled={isClosing || isUpdatingItems}
            style={{ marginTop: 6 }}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: 40,
  },
  heroCard: {
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  tripTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flagIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 107, 87, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing[3],
  },
  bannerText: {
    flex: 1,
    marginLeft: 10,
    fontWeight: '600',
  },
  checklistCard: {
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginVertical: spacing[3],
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  filterChipActive: {},
  emptyItemsBox: {
    padding: 20,
    alignItems: 'center',
  },
  itemsList: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemName: {
    fontWeight: '700',
    fontSize: 14,
  },
  itemReturnedStrike: {
    textDecorationLine: 'line-through',
  },
  footerActions: {
    gap: 8,
    marginTop: 8,
  },
});
