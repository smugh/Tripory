import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Card, Badge, EmptyState, ScreenContainer } from '@/components/ui';
import { TripLifecycleRoadmap } from '@/components/roadmap';
import { useTrips } from '@/hooks/useTrips';
import { formatDateRange, formatTripDurationLabel } from '@/core/utils';
import { TripRecord } from '@/db/schema/trips';
import { useI18n } from '@/core/i18n';
import { useUIStore } from '@/stores/ui-store';

type FilterType = 'all' | 'ongoing' | 'preparing' | 'completed';

export default function TripsScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const { t, language } = useI18n();
  const { trips, isLoading } = useTrips(true);
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredTrips = trips.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'ongoing') return t.status === 'ongoing';
    if (filter === 'preparing') return t.status === 'preparing' || t.status === 'ready' || t.status === 'draft';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  const filterTabs = [
    { key: 'all', label: t.tripsList.filterAll },
    { key: 'ongoing', label: t.tripsList.filterActive },
    { key: 'preparing', label: t.tripsList.filterPreparing },
    { key: 'completed', label: t.tripsList.filterDone },
  ] as const;

  const renderTripCard = ({ item }: { item: TripRecord }) => {
    const isOngoing = item.status === 'ongoing';
    const isCompleted = item.status === 'completed';
    const isReady = item.status === 'ready';

    const getStatusLabel = () => {
      if (isOngoing) return t.tripsList.statusOngoing;
      if (isCompleted) return t.tripsList.statusDone;
      if (isReady) return t.tripsList.statusReady;
      return t.tripsList.statusPlanning;
    };

    return (
      <Pressable onPress={() => router.push(`/trip/${item.id}`)} style={styles.cardPressable}>
        <Card elevated style={[styles.card, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          {/* Card Header */}
          <View style={styles.cardTop}>
            <View style={styles.cardHeaderLeft}>
              <Typography variant="h3" color={themeColors.text.primary} style={styles.tripName}>
                {item.name}
              </Typography>
              <View style={styles.destRow}>
                <Ionicons name="location-sharp" size={13} color={themeColors.brand.coral} />
                <Typography variant="body" color={themeColors.text.secondary} style={styles.destination}>
                  {item.destination}
                </Typography>
              </View>
            </View>

            <Badge
              label={getStatusLabel()}
              variant={isOngoing ? 'accent' : isCompleted ? 'neutral' : isReady ? 'success' : 'warning'}
              dot
              size="sm"
            />
          </View>

          {/* Dates & Duration Meta */}
          <View style={styles.cardMeta}>
            <View style={[styles.metaChip, { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.1)' : '#F1F5F9' }]}>
              <Ionicons name="calendar-outline" size={12} color={themeColors.text.muted} />
              <Typography variant="caption" color={themeColors.text.secondary} style={styles.metaText}>
                {formatDateRange(item.startDate, item.endDate, language)}
              </Typography>
            </View>

            <View style={[styles.metaChip, { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.1)' : '#F1F5F9' }]}>
              <Ionicons name="time-outline" size={12} color={themeColors.text.muted} />
              <Typography variant="caption" color={themeColors.text.secondary} style={styles.metaText}>
                {formatTripDurationLabel(item.startDate, item.endDate, language)}
              </Typography>
            </View>
          </View>

          {/* Mini Roadmap Stepper */}
          <View style={[styles.miniRoadmapWrap, { backgroundColor: isDarkMode ? '#06132D' : '#F8FAFC', borderColor: themeColors.border.default }]}>
            <TripLifecycleRoadmap status={item.status} compact theme={isDarkMode ? 'dark' : 'light'} />
          </View>

          {/* Missing Items Warning Banner */}
          {item.hasMissingItems ? (
            <View style={styles.missingBadge}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Typography variant="caption" color="#EF4444" style={styles.missingText}>
                {t.tripsList.missingWarning}
              </Typography>
            </View>
          ) : null}

          {/* Footer Navigation Link */}
          <View style={[styles.cardFooter, { borderTopColor: themeColors.border.muted }]}>
            <Typography variant="caption" color={themeColors.brand.blue} style={styles.viewRoadmapLink}>
              {t.tripsList.openWorkspace}
            </Typography>
            <Ionicons name="chevron-forward" size={14} color={themeColors.brand.blue} />
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <ScreenContainer>
      {/* Refined Filter Row - full width pill container */}
      <View style={styles.filterRow}>
        <View style={[styles.tabsContainer, { backgroundColor: isDarkMode ? themeColors.surface.muted : '#EEF2F6' }]}>
          {filterTabs.map((tab) => {
            const isActive = filter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setFilter(tab.key)}
                style={[
                  styles.tabButton,
                  isActive && { backgroundColor: isDarkMode ? themeColors.brand.blue : themeColors.brand.navy },
                ]}
              >
                <Typography
                  variant="label"
                  color={isActive ? '#FFFFFF' : themeColors.text.secondary}
                  style={[
                    styles.tabLabel,
                    isActive && styles.tabLabelActive,
                  ]}
                >
                  {tab.label}
                </Typography>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Trips FlatList */}
      <FlatList
        data={filteredTrips}
        keyExtractor={(item) => item.id}
        renderItem={renderTripCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title={t.tripsList.emptyTitle}
            description={t.tripsList.emptyDesc}
            actionLabel={t.tripsList.createBtn}
            onAction={() => router.push('/trip/new')}
          />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    marginBottom: spacing[3],
    marginTop: spacing[1],
  },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: radius.full,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  listContainer: {
    paddingBottom: spacing[8],
  },
  cardPressable: {
    marginBottom: spacing[3],
  },
  card: {
    padding: spacing[3],
    borderRadius: radius.lg,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[2],
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: spacing[2],
  },
  tripName: {
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  destination: {
    marginLeft: 3,
    fontSize: 12,
    fontWeight: '500',
  },
  cardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  metaText: {
    marginLeft: 4,
    fontSize: 11,
  },
  miniRoadmapWrap: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing[2],
    marginBottom: spacing[2],
  },
  missingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: radius.md,
    marginBottom: spacing[2],
  },
  missingText: {
    marginLeft: 6,
    fontSize: 11,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: spacing[2],
  },
  viewRoadmapLink: {
    fontWeight: '700',
    fontSize: 11,
  },
});
