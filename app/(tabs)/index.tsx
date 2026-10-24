import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Button, Card, Badge, ScreenContainer } from '@/components/ui';
import { useTrips } from '@/hooks/useTrips';
import { tripService } from '@/domains/trip/service';
import { destinationRepository } from '@/db/repositories/destination.repository';
import { packingRepository } from '@/db/repositories/packing.repository';
import { momentRepository } from '@/db/repositories/moment.repository';
import { MomentRecord } from '@/db/schema/moments';
import { DestinationRecord } from '@/db/schema/destinations';
import { formatDateRange, formatTripDurationLabel } from '@/core/utils';
import { getTripPresets, TripPreset } from '@/core/constants';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';

export default function HomeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { isDarkMode, toggleTheme } = useUIStore();
  const { t, format, language } = useI18n();

  const { trips, isLoading, refreshTrips } = useTrips(true);
  const [moments, setMoments] = useState<MomentRecord[]>([]);
  const [destinations, setDestinations] = useState<DestinationRecord[]>([]);
  const [albumSortOrder, setAlbumSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [albumViewMode, setAlbumViewMode] = useState<'grid' | 'list'>('grid');

  const completedTripsList = useMemo(() => trips.filter((t) => t.status === 'completed'), [trips]);
  const completedTripIds = useMemo(() => new Set(completedTripsList.map((trip) => trip.id)), [completedTripsList]);
  const albumMoments = useMemo(() => moments.filter((moment) => completedTripIds.has(moment.tripId)), [moments, completedTripIds]);
  const sortedMoments = useMemo(() => {
    return [...albumMoments].sort((a, b) => {
      const timeA = new Date(a.capturedAt).getTime();
      const timeB = new Date(b.capturedAt).getTime();
      return albumSortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }, [albumMoments, albumSortOrder]);

  // Helper to get cover photo for trip
  const getTripCoverPhoto = (tripId: string): string | null => {
    const tripMoment = moments.find(
      (m) => m.tripId === tripId && m.photoPath && !m.photoPath.startsWith('local://placeholder')
    );
    if (tripMoment?.photoPath) return tripMoment.photoPath;

    const tripDest = destinations.find((d) => d.tripId === tripId && d.imageUri);
    if (tripDest?.imageUri) return tripDest.imageUri;

    return null;
  };

  // The travel memories album is an archive of completed trips only.
  const filteredAlbumTrips = useMemo(
    () => [...completedTripsList].sort((a, b) => {
        const timeA = new Date(a.startDate).getTime();
        const timeB = new Date(b.startDate).getTime();
        return albumSortOrder === 'newest' ? timeB - timeA : timeA - timeB;
      }),
    [completedTripsList, albumSortOrder]
  );

  // Ambil semua rencana perjalanan yang sedang aktif / dalam proses (bukan arsip selesai)
  const planningTrips = trips.filter((t) => t.status !== 'completed');
  // Jika semua trip sudah selesai atau belum ada trip aktif, tampilkan trip yang ada
  const displayTrips = planningTrips.length > 0 ? planningTrips : trips.slice(0, 3);

  const totalTrips = trips.length;
  const completedTrips = trips.filter((t) => t.status === 'completed').length;
  const activeCount = trips.filter(
    (t) => t.status === 'ongoing' || t.status === 'preparing' || t.status === 'ready'
  ).length;

  const getStageInfo = (status: string) => {
    switch (status) {
      case 'ongoing':
        return {
          step: '4/5',
          label: t.home.statusOngoing,
          badgeVariant: 'accent' as const,
          progress: '80%',
          color: colors.brand.coral,
        };
      case 'ready':
        return {
          step: '3/5',
          label: t.home.statusReady,
          badgeVariant: 'success' as const,
          progress: '60%',
          color: colors.status.success,
        };
      case 'preparing':
        return {
          step: '2/5',
          label: t.home.statusPreparing,
          badgeVariant: 'warning' as const,
          progress: '40%',
          color: colors.status.warning,
        };
      case 'completed':
        return {
          step: '5/5',
          label: t.home.statusCompleted,
          badgeVariant: 'neutral' as const,
          progress: '100%',
          color: colors.brand.blue,
        };
      case 'draft':
      default:
        return {
          step: '1/5',
          label: t.home.statusDraft,
          badgeVariant: 'neutral' as const,
          progress: '20%',
          color: colors.text.muted,
        };
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [m, d] = await Promise.all([
          momentRepository.getAll(),
          destinationRepository.getAll(),
        ]);
        setMoments(m);
        setDestinations(d);
      } catch {
        // Abaikan
      }
    }
    loadData();
  }, [trips]);

  // 1-Tap Instant Trip Creator from Home Screen
  const handleQuickCreateFromPreset = async (preset: TripPreset) => {
    try {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const end = new Date(tomorrow.getTime() + (preset.durationDays - 1) * 24 * 60 * 60 * 1000);
      const formatDateYmd = (d: Date) => d.toISOString().split('T')[0];

      const trip = await tripService.createTrip({
        name: preset.title,
        destination: preset.destination,
        startDate: formatDateYmd(tomorrow),
        endDate: formatDateYmd(end),
        notes: `Instant template: ${preset.title}`,
      });

      // Pre-populate initial roadmap destinations
      const createdDests = [];
      for (let i = 0; i < preset.defaultDestinations.length; i++) {
        const d = preset.defaultDestinations[i];
        const dest = await destinationRepository.create({
          tripId: trip.id,
          name: d.name,
          activity: d.activity,
          dayNumber: d.dayNumber,
          orderIndex: i,
          plannedTime: d.plannedTime,
          locationLabel: null,
          latitude: null,
          longitude: null,
        });
        createdDests.push(dest);
      }

      // Pre-populate starter items
      for (const it of preset.defaultItems) {
        await packingRepository.addTripItem({
          tripId: trip.id,
          itemId: null,
          customName: it.name,
          category: it.category,
          plannedDestinationId: createdDests[0]?.id ?? null,
          state: 'planned',
          priority: it.priority,
          quantity: it.quantity,
          notes: null,
        });
      }

      refreshTrips();
      router.push(`/trip/${trip.id}`);
    } catch {
      Alert.alert('Error', 'Unable to create instant trip.');
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header dengan Tombol Toggle Mode Terang/Gelap di Atas Kanan */}
        <View style={styles.header}>
          <View style={styles.brandContainer}>
            <Image
              source={require('@/../assets/images/logo-icon.png')}
              style={styles.logoIcon}
              resizeMode="contain"
            />
            <View>
              <Typography variant="h2" color={colors.brand.navy} style={styles.brandTitle}>
                Tripory
              </Typography>
              <Typography variant="caption" color={colors.text.secondary}>
                {t.tagline}
              </Typography>
            </View>
          </View>

          {/* Tombol Mode Gelap / Terang (Atas Kanan) */}
          <Pressable
            onPress={toggleTheme}
            style={[
              styles.themeToggleBtn,
              {
                backgroundColor: isDarkMode ? colors.surface.muted : '#F1F5F9',
                borderColor: isDarkMode ? colors.border.strong : '#E2E8F0',
              },
            ]}
            accessibilityLabel={language === 'en' ? 'Toggle Dark / Light Mode' : 'Ganti Mode Gelap / Terang'}
            accessibilityRole="button"
          >
            <Ionicons
              name={isDarkMode ? 'sunny' : 'moon'}
              size={20}
              color={isDarkMode ? '#FDE047' : colors.brand.navy}
            />
          </Pressable>
        </View>

        {/* Quick Stats Counter Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
            <Ionicons name="airplane-outline" size={18} color={colors.brand.blue} />
            <Typography variant="h3" color={colors.brand.navy} style={styles.statNumber}>
              {totalTrips}
            </Typography>
            <Typography variant="caption" color={colors.text.secondary}>
              {t.home.totalTrips}
            </Typography>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
            <Ionicons name="navigate-outline" size={18} color={colors.brand.coral} />
            <Typography variant="h3" color={colors.brand.navy} style={styles.statNumber}>
              {activeCount}
            </Typography>
            <Typography variant="caption" color={colors.text.secondary}>
              {t.home.activeTrips}
            </Typography>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
            <Ionicons name="checkmark-done-outline" size={18} color={colors.status.success} />
            <Typography variant="h3" color={colors.brand.navy} style={styles.statNumber}>
              {completedTrips}
            </Typography>
            <Typography variant="caption" color={colors.text.secondary}>
              {t.home.completedTrips}
            </Typography>
          </View>
        </View>

        {/* Section: Rencana Perjalanan / Planning Trips */}
        {displayTrips.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name="calendar-clear-outline"
                  size={18}
                  color={colors.brand.blue}
                  style={styles.sectionIcon}
                />
                <Typography variant="h3" color={colors.text.primary}>
                  {t.home.myPlansHeading}
                </Typography>
              </View>

              <Badge
                label={
                  displayTrips.length === 1
                    ? t.home.onePlanBadge
                    : format(t.home.plansBadge, { count: displayTrips.length })
                }
                variant="primary"
                size="sm"
              />
            </View>

            <View style={styles.planningListWrap}>
              {displayTrips.map((pTrip) => {
                const stage = getStageInfo(pTrip.status);
                return (
                  <Pressable
                    key={pTrip.id}
                    onPress={() => router.push(`/trip/${pTrip.id}`)}
                    style={({ pressed }) => [
                      styles.softPlanningCard,
                      {
                        backgroundColor: colors.surface.card,
                        borderColor: colors.border.default,
                      },
                      pressed && { opacity: 0.9, transform: [{ scale: 0.995 }] },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={pTrip.name}
                  >
                    {/* Header: Nama Perjalanan & Badge Status */}
                    <View style={styles.planningCardTop}>
                      <View style={styles.planningTitleWrap}>
                        <Typography
                          variant="h3"
                          color={colors.brand.navy}
                          style={styles.planningTripName}
                          numberOfLines={1}
                        >
                          {pTrip.name}
                        </Typography>
                      </View>
                      <Badge
                        label={stage.label}
                        variant={stage.badgeVariant}
                        size="sm"
                        dot
                      />
                    </View>

                    {/* Meta: Tujuan & Tanggal Rencana */}
                    <View style={styles.planningMetaRow}>
                      <View style={styles.planningMetaItem}>
                        <Ionicons name="location-outline" size={14} color={colors.brand.blue} />
                        <Typography
                          variant="caption"
                          color={colors.text.secondary}
                          style={styles.planningMetaText}
                          numberOfLines={1}
                        >
                          {pTrip.destination}
                        </Typography>
                      </View>

                      <View style={[styles.planningMetaDivider, { backgroundColor: colors.border.muted }]} />

                      <View style={styles.planningMetaItem}>
                        <Ionicons name="calendar-outline" size={14} color={colors.text.muted} />
                        <Typography
                          variant="caption"
                          color={colors.text.secondary}
                          style={styles.planningMetaText}
                        >
                          {formatDateRange(pTrip.startDate, pTrip.endDate, language)}
                        </Typography>
                      </View>
                    </View>

                    {/* Tahap Sekarang: Info & Slim Progress Bar */}
                    <View style={styles.planningProgressRow}>
                      <Typography variant="caption" color={colors.text.secondary} style={styles.progressStepText}>
                        {format(t.home.stagePrefix, { step: stage.step, label: stage.label })}
                      </Typography>
                      <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                    </View>

                    <View style={[styles.slimTrack, { backgroundColor: isDarkMode ? colors.surface.muted : '#F1F5F9' }]}>
                      <View
                        style={[
                          styles.slimFill,
                          {
                            width: stage.progress as any,
                            backgroundColor: stage.color,
                          },
                        ]}
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : (
          /* Empty State: Quick 1-Tap Travel Presets */
          <Card style={styles.starterBannerCard}>
            <View style={styles.starterBannerTop}>
              <View style={styles.starterIconCircle}>
                <Ionicons name="sparkles" size={24} color={colors.brand.coral} />
              </View>
              <View style={styles.starterTitles}>
                <Typography variant="h3" color={colors.brand.navy}>
                  {t.home.startPlanningTitle}
                </Typography>
                <Typography variant="caption" color={colors.text.secondary}>
                  {t.home.startPlanningDesc}
                </Typography>
              </View>
            </View>

            {/* Instant Templates List */}
            <View style={styles.instantPresetsWrap}>
              {getTripPresets(language).slice(0, 3).map((p) => (
                <Pressable
                  key={p.id}
                  style={[styles.instantPresetItem, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}
                  onPress={() => handleQuickCreateFromPreset(p)}
                >
                  <View style={styles.instantPresetLeft}>
                    <Ionicons name={p.icon as any} size={20} color={colors.brand.blue} />
                    <View style={styles.instantPresetInfo}>
                      <Typography variant="label" color={colors.brand.navy}>
                        {p.title}
                      </Typography>
                      <Typography variant="caption" color={colors.text.muted}>
                        {p.destination} • {p.durationDays} {p.durationDays === 1 ? t.home.oneDaySuffix : t.home.daysSuffix}
                      </Typography>
                    </View>
                  </View>
                  <Ionicons name="arrow-forward-circle" size={24} color={colors.brand.coral} />
                </Pressable>
              ))}
            </View>
          </Card>
        )}

        {/* Travel Memories: archive of completed trips */}
        <View style={styles.section}>
          <View style={styles.albumHeader}>
            <View style={styles.albumHeaderLeft}>
              <Ionicons name="images-outline" size={20} color={colors.brand.navy} />
              <Typography variant="h3" color={colors.text.primary} style={styles.albumTitle}>
                {t.home.albumTitle}
              </Typography>
            </View>
            <Badge
              label={format(t.home.albumTripsAndPhotosBadge, {
                trips: completedTripsList.length,
                photos: albumMoments.length,
              })}
              variant="primary"
              size="sm"
            />
          </View>

          {/* Archive only: completed journeys, with sorting and layout controls. */}
          <View style={styles.albumControlsRow}>
            {/* Sort Segment */}
            <View style={[styles.sortSegmentWrap, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
              <Pressable
                style={[
                  styles.sortPill,
                  albumSortOrder === 'newest' && { backgroundColor: colors.brand.blue },
                ]}
                onPress={() => setAlbumSortOrder('newest')}
              >
                <Typography
                  variant="caption"
                  color={albumSortOrder === 'newest' ? '#FFFFFF' : colors.text.secondary}
                  style={styles.controlPillText}
                >
                  {t.home.albumSortNewest}
                </Typography>
              </Pressable>

              <Pressable
                style={[
                  styles.sortPill,
                  albumSortOrder === 'oldest' && { backgroundColor: colors.brand.blue },
                ]}
                onPress={() => setAlbumSortOrder('oldest')}
              >
                <Typography
                  variant="caption"
                  color={albumSortOrder === 'oldest' ? '#FFFFFF' : colors.text.secondary}
                  style={styles.controlPillText}
                >
                  {t.home.albumSortOldest}
                </Typography>
              </Pressable>
            </View>

            {/* View Mode Toggle */}
            <View style={[styles.viewModeToggleWrap, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}>
              <Pressable
                style={[
                  styles.viewModeBtn,
                  albumViewMode === 'grid' && { backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0' },
                ]}
                onPress={() => setAlbumViewMode('grid')}
              >
                <Ionicons
                  name="grid"
                  size={16}
                  color={albumViewMode === 'grid' ? colors.brand.coral : colors.text.muted}
                />
              </Pressable>

              <Pressable
                style={[
                  styles.viewModeBtn,
                  albumViewMode === 'list' && { backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0' },
                ]}
                onPress={() => setAlbumViewMode('list')}
              >
                <Ionicons
                  name="list"
                  size={18}
                  color={albumViewMode === 'list' ? colors.brand.coral : colors.text.muted}
                />
              </Pressable>
            </View>
          </View>

          {/* 3. Render Journeys / Events (Grid or Clean List View) */}
          {filteredAlbumTrips.length === 0 ? (
            <Card style={styles.emptyAlbumCard}>
              <View style={styles.emptyAlbumContent}>
                <View style={styles.emptyAlbumIconCircle}>
                  <Ionicons name="filter-outline" size={26} color={colors.brand.coral} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing[3] }}>
                  <Typography variant="label" color={colors.brand.navy} style={{ fontWeight: '700' }}>
                    {t.home.albumEmptyFilter}
                  </Typography>
                  <Typography variant="caption" color={colors.text.secondary} style={{ marginTop: 2 }}>
                    {t.home.albumEmptyFilterDesc}
                  </Typography>
                </View>
              </View>
            </Card>
          ) : albumViewMode === 'list' ? (
            /* Clean Simple List View as requested */
            <View style={styles.tripListWrap}>
              {filteredAlbumTrips.map((itemTrip) => {
                const stage = getStageInfo(itemTrip.status);
                const coverPhoto = getTripCoverPhoto(itemTrip.id);
                return (
                  <Pressable
                    key={itemTrip.id}
                    style={({ pressed }) => [
                      styles.tripListCard,
                      {
                        backgroundColor: colors.surface.card,
                        borderColor: colors.border.default,
                      },
                      pressed && { opacity: 0.92, transform: [{ scale: 0.995 }] },
                    ]}
                    onPress={() => router.push(`/memories/${itemTrip.id}`)}
                  >
                    {/* Left: Event Photo Thumbnail */}
                    <View style={[styles.tripListThumbWrap, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}>
                      {coverPhoto ? (
                        <Image source={{ uri: coverPhoto }} style={styles.tripListThumbImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.tripListThumbPlaceholder, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}>
                          <Ionicons
                            name={itemTrip.status === 'completed' ? 'trophy-outline' : 'image-outline'}
                            size={24}
                            color={itemTrip.status === 'completed' ? colors.brand.coral : colors.brand.blue}
                          />
                          <Typography variant="caption" color={colors.text.muted} style={styles.noPhotoMiniText}>
                            {t.home.noCoverPhotoText}
                          </Typography>
                        </View>
                      )}
                    </View>

                    {/* Middle: Title, Destination, Dates & Duration */}
                    <View style={styles.tripListBody}>
                      <View style={styles.tripListTopRow}>
                        <Typography
                          variant="label"
                          color={colors.brand.navy}
                          style={styles.tripListTitle}
                          numberOfLines={1}
                        >
                          {itemTrip.name}
                        </Typography>
                        <Badge
                          label={stage.label}
                          variant={stage.badgeVariant}
                          size="sm"
                          dot
                        />
                      </View>

                      <View style={styles.tripListMetaRow}>
                        <Ionicons name="location-sharp" size={12} color={colors.brand.coral} />
                        <Typography
                          variant="caption"
                          color={colors.brand.coral}
                          style={styles.tripListDestText}
                          numberOfLines={1}
                        >
                          {itemTrip.destination}
                        </Typography>
                      </View>

                      <View style={styles.tripListDatesRow}>
                        <Ionicons name="calendar-outline" size={11} color={colors.text.muted} />
                        <Typography
                          variant="caption"
                          color={colors.text.secondary}
                          style={styles.tripListDateText}
                          numberOfLines={1}
                        >
                          {formatDateRange(itemTrip.startDate, itemTrip.endDate, language)} • {formatTripDurationLabel(itemTrip.startDate, itemTrip.endDate, language)}
                        </Typography>
                      </View>
                      {itemTrip.hasMissingItems ? (
                        <View style={styles.albumMissingNote}>
                          <Ionicons name="alert-circle" size={13} color={colors.status.error} />
                          <Typography variant="caption" color={colors.status.error} style={styles.albumMissingText}>
                            {t.home.albumMissingItemsNote}
                          </Typography>
                        </View>
                      ) : null}
                    </View>

                    {/* Right: Chevron */}
                    <Ionicons name="chevron-forward" size={16} color={colors.text.muted} style={{ marginLeft: 4 }} />
                  </Pressable>
                );
              })}
            </View>
          ) : (
            /* Grid View */
            <View style={styles.tripGridContainer}>
              {filteredAlbumTrips.map((itemTrip) => {
                const stage = getStageInfo(itemTrip.status);
                const coverPhoto = getTripCoverPhoto(itemTrip.id);
                return (
                  <Pressable
                    key={itemTrip.id}
                    style={({ pressed }) => [
                      styles.tripGridCard,
                      {
                        backgroundColor: colors.surface.card,
                        borderColor: colors.border.default,
                      },
                      pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
                    ]}
                    onPress={() => router.push(`/memories/${itemTrip.id}`)}
                  >
                    {/* Top: Photo Cover */}
                    <View style={[styles.tripGridImageWrap, { backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0' }]}>
                      {coverPhoto ? (
                        <Image source={{ uri: coverPhoto }} style={styles.tripGridImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.tripGridPlaceholder, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}>
                          <Ionicons
                            name={itemTrip.status === 'completed' ? 'trophy-outline' : 'image-outline'}
                            size={28}
                            color={itemTrip.status === 'completed' ? colors.brand.coral : colors.brand.blue}
                          />
                          <Typography variant="caption" color={colors.text.muted} style={{ fontSize: 10, marginTop: 2 }}>
                            {t.home.noCoverPhotoText}
                          </Typography>
                        </View>
                      )}

                      {/* Top Right Floating Badge */}
                      <View style={styles.tripGridStatusPill}>
                        <Badge
                          label={stage.label}
                          variant={stage.badgeVariant}
                          size="sm"
                          dot
                        />
                      </View>

                      {/* Bottom Left Floating Duration Pill */}
                      <View style={styles.tripGridDurationPill}>
                        <Typography variant="caption" color="#FFFFFF" style={{ fontSize: 10, fontWeight: '700' }}>
                          {formatTripDurationLabel(itemTrip.startDate, itemTrip.endDate, language)}
                        </Typography>
                      </View>
                    </View>

                    {/* Bottom: Body */}
                    <View style={styles.tripGridBody}>
                      <Typography variant="label" color={colors.brand.navy} style={styles.tripGridTitle} numberOfLines={1}>
                        {itemTrip.name}
                      </Typography>

                      <View style={styles.tripGridMetaRow}>
                        <Ionicons name="location-sharp" size={11} color={colors.brand.coral} />
                        <Typography variant="caption" color={colors.brand.coral} style={styles.tripGridDestText} numberOfLines={1}>
                          {itemTrip.destination}
                        </Typography>
                      </View>
                      {itemTrip.hasMissingItems ? (
                        <View style={styles.albumMissingNote}>
                          <Ionicons name="alert-circle" size={13} color={colors.status.error} />
                          <Typography variant="caption" color={colors.status.error} style={styles.albumMissingText} numberOfLines={2}>
                            {t.home.albumMissingItemsNote}
                          </Typography>
                        </View>
                      ) : null}

                      <View style={styles.tripGridMetaRow}>
                        <Ionicons name="calendar-outline" size={11} color={colors.text.muted} />
                        <Typography variant="caption" color={colors.text.muted} style={styles.tripGridDateText} numberOfLines={1}>
                          {formatDateRange(itemTrip.startDate, itemTrip.endDate, language)}
                        </Typography>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* 4. Sub-section: Captured Photo Memories Gallery (if any) */}
          {albumMoments.length > 0 && (
            <View style={styles.photoMemoriesSection}>
              <View style={styles.subSectionHeader}>
                <Ionicons name="camera" size={16} color={colors.brand.blue} />
                <Typography variant="label" color={colors.brand.navy} style={styles.subSectionTitle}>
                  {t.home.albumPhotoGalleryTitle}
                </Typography>
                <Badge
                  label={`${albumMoments.length}`}
                  variant="primary"
                  size="sm"
                />
              </View>
              <Typography variant="caption" color={colors.text.secondary} style={{ marginBottom: spacing[3] }}>
                {t.home.albumPhotoGalleryDesc}
              </Typography>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.momentsHorizontalScroll}>
                {sortedMoments.map((m) => (
                  <Pressable
                    key={m.id}
                    style={[
                      styles.momentMiniCard,
                      { backgroundColor: colors.surface.card, borderColor: colors.border.default },
                    ]}
                    onPress={() => router.push(`/memories/${m.tripId}`)}
                  >
                    <View style={styles.momentMiniImageWrap}>
                      {m.photoPath && !m.photoPath.startsWith('local://placeholder') ? (
                        <Image source={{ uri: m.photoPath }} style={styles.momentMiniImage} />
                      ) : (
                        <View style={[styles.momentMiniPlaceholder, { backgroundColor: colors.surface.muted }]}>
                          <Ionicons name="image-outline" size={24} color={colors.brand.blue} />
                        </View>
                      )}
                    </View>
                    <View style={styles.momentMiniBody}>
                      <Typography variant="caption" color={colors.brand.navy} numberOfLines={1} style={{ fontWeight: '700' }}>
                        {m.caption || 'Travel Memory'}
                      </Typography>
                      {m.locationName && (
                        <Typography variant="caption" color={colors.brand.coral} numberOfLines={1} style={{ fontSize: 10 }}>
                          {m.locationName}
                        </Typography>
                      )}
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  logoIcon: {
    width: 44,
    height: 44,
  },
  brandTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  themeToggleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[5],
  },
  statBox: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing[3],
    alignItems: 'center',
    borderWidth: 1,
  },
  statNumber: {
    marginTop: 4,
    marginBottom: 2,
    fontWeight: '800',
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: 6,
  },
  planningListWrap: {
    gap: spacing[3],
  },
  softPlanningCard: {
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  planningCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  planningTitleWrap: {
    flex: 1,
    marginRight: spacing[2],
  },
  planningTripName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  planningMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  planningMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  planningMetaDivider: {
    width: 1,
    height: 12,
  },
  planningMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  planningProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressStepText: {
    fontSize: 11,
    fontWeight: '600',
  },
  slimTrack: {
    height: 5,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  slimFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  starterBannerCard: {
    padding: spacing[5],
    marginBottom: spacing[6],
    backgroundColor: '#FFF9F8',
    borderColor: '#FED7D4',
  },
  starterBannerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  starterIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE4E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  starterTitles: {
    flex: 1,
  },
  instantPresetsWrap: {
    gap: spacing[2],
  },
  instantPresetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1,
  },
  instantPresetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  instantPresetInfo: {
    marginLeft: 10,
  },
  albumHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  albumHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumTitle: {
    marginLeft: 6,
    fontWeight: '700',
  },
  albumCarousel: {
    paddingRight: spacing[4],
    gap: spacing[3],
  },
  albumCard: {
    width: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  albumImageWrap: {
    width: '100%',
    height: 140,
    backgroundColor: '#000',
    position: 'relative',
  },
  albumImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  albumPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumLocationBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(7, 27, 77, 0.75)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumLocationText: {
    marginLeft: 4,
    fontWeight: '600',
    fontSize: 10,
  },
  albumInfo: {
    padding: spacing[3],
  },
  albumCaption: {
    fontWeight: '700',
    marginBottom: 2,
  },
  emptyAlbumCard: {
    padding: spacing[4],
  },
  emptyAlbumContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyAlbumIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  categoryScroll: {
    paddingBottom: 4,
    gap: 8,
    marginBottom: spacing[3],
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  tripListWrap: {
    gap: 10,
  },
  tripListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  tripListThumbWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  tripListThumbImage: {
    width: '100%',
    height: '100%',
  },
  tripListThumbPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  noPhotoMiniText: {
    fontSize: 8,
    marginTop: 2,
    textAlign: 'center',
  },
  tripListBody: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  tripListTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  tripListTitle: {
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
    marginRight: 6,
  },
  tripListMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  tripListDestText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 3,
  },
  tripListDatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripListDateText: {
    fontSize: 11,
    marginLeft: 4,
  },
  albumMissingNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
    gap: 4,
  },
  albumMissingText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
  },
  tripGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  tripGridCard: {
    width: '48.5%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tripGridImageWrap: {
    width: '100%',
    height: 105,
    position: 'relative',
  },
  tripGridImage: {
    width: '100%',
    height: '100%',
  },
  tripGridPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tripGridStatusPill: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  tripGridDurationPill: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(7, 27, 77, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  tripGridBody: {
    padding: 8,
  },
  tripGridTitle: {
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 2,
  },
  tripGridMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  tripGridDestText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 3,
  },
  tripGridDateText: {
    fontSize: 10,
    marginLeft: 3,
  },
  photoMemoriesSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  momentsHorizontalScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  momentMiniCard: {
    width: 140,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  momentMiniImageWrap: {
    width: '100%',
    height: 85,
    backgroundColor: '#000',
  },
  momentMiniImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  momentMiniPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  momentMiniBody: {
    padding: 6,
  },
  sortSegmentWrap: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 2,
  },
  sortPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  controlPillText: {
    fontWeight: '700',
    fontSize: 11,
  },
  viewModeToggleWrap: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 2,
    alignItems: 'center',
  },
  viewModeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing[3],
  },
  gridCard: {
    width: '48.5%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  gridImageWrap: {
    width: '100%',
    height: 120,
    position: 'relative',
    backgroundColor: '#000',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridLocationBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: 'rgba(7, 27, 77, 0.75)',
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridLocationText: {
    marginLeft: 3,
    fontSize: 9,
    fontWeight: '700',
  },
  gridCardBody: {
    padding: spacing[2],
  },
  gridCaption: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContainer: {
    gap: spacing[3],
  },
  listCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  listImageWrap: {
    width: '100%',
    height: 160,
    position: 'relative',
    backgroundColor: '#000',
  },
  listImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  listPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listLocationBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(7, 27, 77, 0.8)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listLocationText: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '700',
  },
  listCardBody: {
    padding: spacing[3],
  },
  listCaption: {
    fontSize: 14,
    fontWeight: '700',
  },
  completedTripsSection: {
    marginBottom: spacing[4],
  },
  subSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[1],
    gap: 6,
  },
  subSectionTitle: {
    fontWeight: '700',
    fontSize: 14,
  },
  pastTripCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: spacing[3],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3,
  },
  pastTripBanner: {
    padding: spacing[4],
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  pastTripBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  completedBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  durationPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  pastTripTitle: {
    fontWeight: '800',
    fontSize: 18,
    marginTop: 2,
  },
  pastTripBody: {
    padding: spacing[4],
  },
  pastTripMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pastTripPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  highlightPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  openMemoryRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
});
