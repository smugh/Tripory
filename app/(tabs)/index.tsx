import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Button, Card, Badge, ScreenContainer } from '@/components/ui';
import { TripLifecycleRoadmap } from '@/components/roadmap';
import { useTrips } from '@/hooks/useTrips';
import { tripService } from '@/domains/trip/service';
import { destinationRepository } from '@/db/repositories/destination.repository';
import { packingRepository } from '@/db/repositories/packing.repository';
import { momentRepository } from '@/db/repositories/moment.repository';
import { MomentRecord } from '@/db/schema/moments';
import { formatDateRange, formatTripDurationLabel } from '@/core/utils';
import { TRIP_PRESETS, TripPreset } from '@/core/constants';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';

export default function HomeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { isDarkMode, toggleTheme } = useUIStore();
  const { t, format } = useI18n();

  const { trips, isLoading, refreshTrips } = useTrips(true);
  const [moments, setMoments] = useState<MomentRecord[]>([]);

  // Cari trip yang sedang berlangsung (active/ongoing) atau trip mendatang berikutnya
  const activeTrip = trips.find((t) => t.status === 'ongoing');
  const upcomingTrip = trips.find(
    (t) => t.status === 'preparing' || t.status === 'ready' || t.status === 'draft'
  );
  const featuredTrip = activeTrip || upcomingTrip;

  const totalTrips = trips.length;
  const completedTrips = trips.filter((t) => t.status === 'completed').length;
  const activeCount = trips.filter(
    (t) => t.status === 'ongoing' || t.status === 'preparing' || t.status === 'ready'
  ).length;

  useEffect(() => {
    async function loadMoments() {
      try {
        const data = await momentRepository.getAll();
        setMoments(data);
      } catch {
        // Abaikan
      }
    }
    loadMoments();
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
                backgroundColor: isDarkMode ? '#132857' : '#F1F5F9',
                borderColor: isDarkMode ? '#244382' : '#E2E8F0',
              },
            ]}
            accessibilityLabel="Ganti Mode Gelap / Terang"
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

        {/* Featured Trip Workspace & Roadmap */}
        {featuredTrip ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name={activeTrip ? 'flash' : 'calendar'}
                  size={18}
                  color={activeTrip ? colors.brand.coral : colors.brand.blue}
                  style={styles.sectionIcon}
                />
                <Typography variant="h3" color={colors.text.primary}>
                  {activeTrip ? t.home.ongoingTripHeading : t.home.upcomingTripHeading}
                </Typography>
              </View>

              <Badge
                label={
                  featuredTrip.status === 'ongoing'
                    ? t.home.statusOngoing
                    : featuredTrip.status === 'ready'
                    ? t.home.statusReady
                    : t.home.statusPreparing
                }
                variant={
                  featuredTrip.status === 'ongoing'
                    ? 'accent'
                    : featuredTrip.status === 'ready'
                    ? 'success'
                    : 'primary'
                }
                size="sm"
              />
            </View>

            <Card variant="navy" elevated style={styles.featuredCard}>
              <View style={styles.heroTop}>
                <View style={styles.heroTitles}>
                  <Typography variant="h2" color="#FFFFFF" style={styles.heroTripName}>
                    {featuredTrip.name}
                  </Typography>

                  <View style={styles.destRow}>
                    <Ionicons name="location-sharp" size={15} color="#93C5FD" />
                    <Typography variant="body" color="#93C5FD" style={styles.heroDestination}>
                      {featuredTrip.destination}
                    </Typography>
                  </View>
                </View>
              </View>

              {/* Date & Duration Row */}
              <View style={styles.heroMetaRow}>
                <View style={styles.heroMetaChip}>
                  <Ionicons name="calendar-outline" size={13} color="#E2E8F0" />
                  <Typography variant="caption" color="#E2E8F0" style={styles.metaChipText}>
                    {formatDateRange(featuredTrip.startDate, featuredTrip.endDate)}
                  </Typography>
                </View>

                <View style={styles.heroMetaChip}>
                  <Ionicons name="time-outline" size={13} color="#E2E8F0" />
                  <Typography variant="caption" color="#E2E8F0" style={styles.metaChipText}>
                    {formatTripDurationLabel(featuredTrip.startDate, featuredTrip.endDate)}
                  </Typography>
                </View>
              </View>

              {/* Progress Roadmap Stepper */}
              <View style={styles.roadmapBox}>
                <TripLifecycleRoadmap status={featuredTrip.status} theme="dark" />
              </View>

              {/* Action Button - Elegant Crisp White Button on Navy Card */}
              <Pressable
                onPress={() => router.push(`/trip/${featuredTrip.id}`)}
                style={({ pressed }) => [
                  styles.heroWhiteBtn,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel={t.home.openRoadmapBtn}
              >
                <Typography variant="label" color="#0A214D" style={styles.heroWhiteBtnText}>
                  {t.home.openRoadmapBtn}
                </Typography>
                <Ionicons name="arrow-forward" size={16} color="#0A214D" style={{ marginLeft: 6 }} />
              </Pressable>
            </Card>
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
              {TRIP_PRESETS.slice(0, 3).map((p) => (
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
                        {p.destination} • {p.durationDays} Days
                      </Typography>
                    </View>
                  </View>
                  <Ionicons name="arrow-forward-circle" size={24} color={colors.brand.coral} />
                </Pressable>
              ))}
            </View>
          </Card>
        )}

        {/* Album Kenangan Perjalanan (Carousel) */}
        <View style={styles.section}>
          <View style={styles.albumHeader}>
            <View style={styles.albumHeaderLeft}>
              <Ionicons name="images-outline" size={20} color={colors.brand.navy} />
              <Typography variant="h3" color={colors.text.primary} style={styles.albumTitle}>
                {t.home.albumTitle}
              </Typography>
            </View>
            <Badge
              label={
                moments.length === 1
                  ? t.home.onePhotoBadge
                  : format(t.home.photosBadge, { count: moments.length })
              }
              variant="primary"
              size="sm"
            />
          </View>

          {moments.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.albumCarousel}
            >
              {moments.map((m) => (
                <Pressable
                  key={m.id}
                  style={[styles.albumCard, { backgroundColor: colors.surface.card, borderColor: colors.border.default }]}
                  onPress={() => router.push(`/trip/${m.tripId}`)}
                >
                  <View style={styles.albumImageWrap}>
                    {m.photoPath && !m.photoPath.startsWith('local://placeholder') ? (
                      <Image source={{ uri: m.photoPath }} style={styles.albumImage} />
                    ) : (
                      <View style={[styles.albumPlaceholder, { backgroundColor: colors.surface.muted }]}>
                        <Ionicons name="image-outline" size={36} color={colors.brand.blue} />
                      </View>
                    )}

                    {m.locationName ? (
                      <View style={styles.albumLocationBadge}>
                        <Ionicons name="location" size={12} color="#FFFFFF" />
                        <Typography variant="caption" color="#FFFFFF" style={styles.albumLocationText} numberOfLines={1}>
                          {m.locationName}
                        </Typography>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.albumInfo}>
                    <Typography variant="body" color={colors.brand.navy} style={styles.albumCaption} numberOfLines={1}>
                      {m.caption || 'Travel Memory'}
                    </Typography>
                    <Typography variant="caption" color={colors.text.muted}>
                      {new Date(m.capturedAt).toLocaleDateString(t.settings.profileName === 'Tripory Explorer' ? 'en-US' : 'id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Typography>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <Card style={styles.emptyAlbumCard}>
              <View style={styles.emptyAlbumContent}>
                <View style={styles.emptyAlbumIconCircle}>
                  <Ionicons name="camera-outline" size={28} color={colors.brand.blue} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing[3] }}>
                  <Typography variant="label" color={colors.brand.navy} style={{ fontWeight: '700' }}>
                    {t.home.emptyAlbumTitle}
                  </Typography>
                  <Typography variant="caption" color={colors.text.secondary} style={{ marginTop: 2 }}>
                    {t.home.emptyAlbumDesc}
                  </Typography>
                </View>
              </View>
            </Card>
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
  featuredCard: {
    padding: spacing[5],
  },
  heroTop: {
    marginBottom: spacing[3],
  },
  heroTitles: {
    flex: 1,
  },
  heroTripName: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroDestination: {
    marginLeft: 4,
    fontWeight: '600',
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  heroMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  metaChipText: {
    marginLeft: 4,
    fontSize: 11,
  },
  roadmapBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: spacing[4],
    borderRadius: radius.lg,
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroCta: {
    marginTop: spacing[1],
  },
  heroWhiteBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
    marginTop: spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  heroWhiteBtnText: {
    fontWeight: '700',
    fontSize: 14,
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
});
