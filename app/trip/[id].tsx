import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, Image, ActivityIndicator, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Card, Badge, Button, Input, ScreenContainer, ProgressBar } from '@/components/ui';
import { TripLifecycleRoadmap, DestinationRoadmap, DestinationJourneyMap } from '@/components/roadmap';
import { tripRepository } from '@/db/repositories/trip.repository';
import { destinationRepository } from '@/db/repositories/destination.repository';
import { packingRepository } from '@/db/repositories/packing.repository';
import { momentRepository } from '@/db/repositories/moment.repository';
import { tripClosureService } from '@/domains/trip-closure/service';
import { packingService } from '@/domains/packing/service';
import { mediaService } from '@/services/media';
import { locationService } from '@/services/adapters';
import { TripRecord } from '@/db/schema/trips';
import { DestinationRecord } from '@/db/schema/destinations';
import { TripItemRecord } from '@/db/schema/trip-items';
import { MomentRecord } from '@/db/schema/moments';
import { formatDateRange, formatTripDurationLabel } from '@/core/utils';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';

type WorkspaceTab = 'roadmap' | 'packing' | 'moments';
type PackingFilter = 'all' | 'unpacked' | 'packed';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const themeColors = useThemeColors();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const { t, format, language } = useI18n();

  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [destinations, setDestinations] = useState<DestinationRecord[]>([]);
  const [items, setItems] = useState<TripItemRecord[]>([]);
  const [momentsList, setMomentsList] = useState<MomentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active workspace segment tab
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('roadmap');
  const [packingFilter, setPackingFilter] = useState<PackingFilter>('all');
  const [packSubTab, setPackSubTab] = useState<'starter' | 'destinations'>('starter');
  const [itemToShift, setItemToShift] = useState<TripItemRecord | null>(null);
  const [activeItemMenu, setActiveItemMenu] = useState<TripItemRecord | null>(null);
  const [targetDestinationForNewItem, setTargetDestinationForNewItem] = useState<string | null>(null);
  const [visitedStopIds, setVisitedStopIds] = useState<string[]>([]);
  const [visitingModalDest, setVisitingModalDest] = useState<DestinationRecord | null>(null);
  const [selectedUsedItemIds, setSelectedUsedItemIds] = useState<string[]>([]);

  // Inline forms
  const [newDestName, setNewDestName] = useState('');
  const [newDestActivity, setNewDestActivity] = useState('');
  const [newDestTime, setNewDestTime] = useState('09:00');
  const [newDestImageUri, setNewDestImageUri] = useState<string | null>(null);
  const [isAddingDest, setIsAddingDest] = useState(false);

  const [newItemName, setNewItemName] = useState('');
  const [newMomentCaption, setNewMomentCaption] = useState('');
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [momentLocationTag, setMomentLocationTag] = useState<string>('');
  const [momentCoords, setMomentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSavingMoment, setIsSavingMoment] = useState<boolean>(false);
  const [isClosingTrip, setIsClosingTrip] = useState(false);

  const loadTripData = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const tripData = await tripRepository.getById(id);
      if (tripData) {
        setTrip(tripData);
        const dests = await destinationRepository.getByTripId(id);
        setDestinations(dests);
        const tripItems = await packingRepository.getByTripId(id);
        setItems(tripItems);
        const m = await momentRepository.getByTripId(id);
        setMomentsList(m);
      }
    } catch {
      Alert.alert('Error', t.trip.alertLoadError);
    } finally {
      setIsLoading(false);
    }
  }, [id, t.trip.alertLoadError]);

  useEffect(() => {
    loadTripData();
  }, [loadTripData]);

  // Handle stage progression
  const handleAdvanceStatus = async (nextStatus: TripRecord['status']) => {
    if (!trip || !id) return;
    try {
      await tripRepository.updateStatus(id, nextStatus);
      loadTripData();
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.trip.alertUpdateStatusError);
    }
  };

  const handleToggleVisited = (dest: DestinationRecord) => {
    if (visitedStopIds.includes(dest.id)) {
      // If already visited, tapping untoggles it
      setVisitedStopIds((prev) => prev.filter((i) => i !== dest.id));
    } else {
      // Opening dialog to check items used at this destination
      setVisitingModalDest(dest);
      const mapped = items.filter((i) => i.plannedDestinationId === dest.id && i.state !== 'used');
      setSelectedUsedItemIds(mapped.map((i) => i.id));
    }
  };

  const handleAddDestination = async () => {
    if (!id || !newDestName.trim()) {
      Alert.alert(language === 'en' ? 'Required' : 'Perhatian', t.trip.alertDestRequired);
      return;
    }
    try {
      await destinationRepository.create({
        tripId: id,
        name: newDestName.trim(),
        activity: newDestActivity.trim() || null,
        dayNumber: destinations.length + 1,
        orderIndex: destinations.length,
        plannedTime: newDestTime.trim() || '09:00',
        locationLabel: null,
        latitude: null,
        longitude: null,
        imageUri: newDestImageUri,
        notes: null,
        todos: null,
      });
      setNewDestName('');
      setNewDestActivity('');
      setNewDestImageUri(null);
      setIsAddingDest(false);
      loadTripData();
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.trip.alertDestAddError);
    }
  };

  const handleAddTripItem = async () => {
    if (!id || !newItemName.trim()) return;
    try {
      await packingRepository.addTripItem({
        tripId: id,
        itemId: null,
        customName: newItemName.trim(),
        category: 'Gear & Activities',
        plannedDestinationId: targetDestinationForNewItem,
        state: 'planned',
        priority: 'must_have',
        quantity: 1,
        notes: null,
      });
      setNewItemName('');
      loadTripData();
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.trip.alertItemAddError);
    }
  };

  const handleUpdateItemState = async (item: TripItemRecord, state: TripItemRecord['state']) => {
    try {
      await packingRepository.updateItemState(item.id, state);
      loadTripData();
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.trip.alertItemUpdateError);
    }
  };

  const handleShiftItem = async (targetDestId: string | null) => {
    if (!itemToShift) return;
    try {
      await packingRepository.updateItemDestination(itemToShift.id, targetDestId);
      setItemToShift(null);
      loadTripData();
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', 'Failed to shift destination.');
    }
  };

  const handleTogglePack = async (item: TripItemRecord) => {
    try {
      const nextState = item.state === 'planned' ? 'packed' : 'planned';
      await packingRepository.updateItemState(item.id, nextState);
      loadTripData();
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.trip.alertItemUpdateError);
    }
  };

  const handleDeleteTripItem = (item: TripItemRecord) => {
    Alert.alert(
      language === 'en' ? 'Delete Item' : 'Hapus Barang',
      language === 'en'
        ? `Remove "${item.customName}" from trip checklist?`
        : `Hapus "${item.customName}" dari daftar checklist?`,
      [
        { text: t.trip.cancel, style: 'cancel' },
        {
          text: t.trip.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              await packingRepository.deleteTripItem(item.id);
              loadTripData();
            } catch {
              Alert.alert(language === 'en' ? 'Error' : 'Gagal', 'Could not delete item.');
            }
          },
        },
      ]
    );
  };

  const handlePackAll = async () => {
    if (!id || items.length === 0) return;
    try {
      for (const item of items) {
        if (item.state === 'planned') {
          await packingRepository.updateItemState(item.id, 'packed');
        }
      }
      loadTripData();
      Alert.alert(language === 'en' ? 'Done' : 'Selesai', t.trip.alertAllPackedSuccess);
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.trip.alertItemUpdateError);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const media = await mediaService.takePhoto();
      if (media) {
        setSelectedPhotoUri(media.fullUri);
        if (!momentLocationTag) {
          fetchCurrentLocation();
        }
      }
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.trip.alertCameraError);
    }
  };

  const handlePickGallery = async () => {
    try {
      const media = await mediaService.pickImageFromGallery();
      if (media) {
        setSelectedPhotoUri(media.fullUri);
        if (!momentLocationTag && (trip?.destination || destinations.length > 0)) {
          setMomentLocationTag(destinations[0]?.name || trip?.destination || '');
        }
      }
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.trip.alertGalleryError);
    }
  };

  const fetchCurrentLocation = async () => {
    try {
      setIsLocating(true);
      const coords = await locationService.getCurrentPosition();
      if (coords) {
        setMomentCoords({ latitude: coords.latitude, longitude: coords.longitude });
        const address = await locationService.reverseGeocode(coords);
        if (address?.label) {
          setMomentLocationTag(address.label);
        }
      } else {
        if (trip?.destination) {
          setMomentLocationTag(trip.destination);
        }
      }
    } catch {
      if (trip?.destination) {
        setMomentLocationTag(trip.destination);
      }
    } finally {
      setIsLocating(false);
    }
  };

  const handleAddMoment = async () => {
    if (!id) return;
    if (!selectedPhotoUri && !newMomentCaption.trim()) {
      Alert.alert(language === 'en' ? 'Notice' : 'Perhatian', t.trip.alertMomentRequired);
      return;
    }
    try {
      setIsSavingMoment(true);
      await momentRepository.create({
        tripId: id,
        destinationId: destinations[0]?.id ?? null,
        caption: newMomentCaption.trim() || (language === 'en' ? 'Trip Memory' : 'Foto Kenangan Perjalanan'),
        photoPath: selectedPhotoUri || 'local://placeholder',
        locationName: momentLocationTag.trim() || trip?.destination || null,
        latitude: momentCoords?.latitude ?? null,
        longitude: momentCoords?.longitude ?? null,
        capturedAt: new Date().toISOString(),
      });
      setSelectedPhotoUri(null);
      setNewMomentCaption('');
      setMomentLocationTag('');
      setMomentCoords(null);
      loadTripData();
      Alert.alert(language === 'en' ? 'Moment Saved' : 'Momen Tersimpan', t.trip.alertMomentSaved);
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.trip.alertMomentSaveError);
    } finally {
      setIsSavingMoment(false);
    }
  };

  const handleDeleteMoment = async (momentId: string, photoPath: string) => {
    Alert.alert(t.trip.deleteMomentConfirmTitle, t.trip.deleteMomentConfirmDesc, [
      { text: t.trip.cancel, style: 'cancel' },
      {
        text: t.trip.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await momentRepository.delete(momentId);
            if (photoPath && !photoPath.startsWith('local://')) {
              await mediaService.deletePhoto(photoPath);
            }
            loadTripData();
          } catch {
            Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.trip.alertMomentDeleteError);
          }
        },
      },
    ]);
  };

  const handleCloseTrip = () => {
    if (!id) return;
    router.push({ pathname: '/trip/close', params: { tripId: id } } as any);
  };

  if (!trip) {
    return (
      <ScreenContainer>
        <Typography variant="body" color={colors.text.secondary}>
          {isLoading ? t.trip.loadingTrip : t.trip.tripNotFound}
        </Typography>
      </ScreenContainer>
    );
  }

  // Readiness computation
  const readiness = packingService.computeReadiness(items as any, language);
  const readinessPercent = readiness.totalItems > 0
    ? Math.round((readiness.packedCount / readiness.totalItems) * 100)
    : 0;

  const filteredItems = items.filter((item) => {
    if (packingFilter === 'all') return true;
    if (packingFilter === 'packed') return item.state === 'packed';
    if (packingFilter === 'unpacked') return item.state === 'planned';
    return true;
  });

  const quickDestSuggestions = language === 'en'
    ? [
        { name: 'Hotel / Resort', act: 'Check-in & relax' },
        { name: 'Nature / Beach View', act: 'Explore scenery & photos' },
        { name: 'Local Specialty Dining', act: 'Lunch & culinary tasting' },
        { name: 'Souvenir Market', act: 'Gift & local shopping' },
      ]
    : [
        { name: 'Hotel / Penginapan', act: 'Check-in & istirahat' },
        { name: 'Wisata Alam / Pantai', act: 'Eksplorasi alam & foto' },
        { name: 'Kuliner Lokal Favorit', act: 'Makan siang & santap santai' },
        { name: 'Pusat Oleh-Oleh', act: 'Belanja suvenir' },
      ];

  // Smart Co-Pilot recommendation logic
  const isPreparing = trip.status === 'draft' || trip.status === 'preparing';
  const isReady = trip.status === 'ready';
  const isOngoing = trip.status === 'ongoing';
  const isCompleted = trip.status === 'completed';

  return (
    <ScreenContainer edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Header Card */}
        <Card variant="navy" style={styles.heroCard}>
          {/* Header Row: Title & Status Badge */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleWrap}>
              <Typography variant="h1" color="#FFFFFF" style={styles.heroTitle}>
                {trip.name}
              </Typography>
            </View>

            <Badge
              label={
                isCompleted
                  ? t.trip.badgeArchived
                  : isOngoing
                  ? t.trip.badgeOngoing
                  : isReady
                  ? t.trip.badgeReady
                  : isPreparing
                  ? t.trip.badgePreparing
                  : t.trip.badgeDraft
              }
              variant={
                isCompleted
                  ? 'neutral'
                  : isOngoing
                  ? 'accent'
                  : isReady
                  ? 'success'
                  : 'warning'
              }
              size="sm"
              dot
            />
          </View>
          <View style={styles.destRow}>
            <Ionicons name="location-sharp" size={16} color="#93C5FD" />
            <Typography variant="body" color="#F1F5F9" style={styles.heroDest}>
              {trip.destination}
            </Typography>
          </View>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroChip}>
              <Ionicons name="calendar-outline" size={13} color="#CBD5E1" />
              <Typography variant="caption" color="#CBD5E1" style={styles.chipText}>
                {formatDateRange(trip.startDate, trip.endDate, language)}
              </Typography>
            </View>
            <View style={styles.heroChip}>
              <Ionicons name="time-outline" size={13} color="#CBD5E1" />
              <Typography variant="caption" color="#CBD5E1" style={styles.chipText}>
                {formatTripDurationLabel(trip.startDate, trip.endDate, language)}
              </Typography>
            </View>
          </View>

          {/* Unique Compact Destination Route Journey Map */}
          <DestinationJourneyMap
            destinations={destinations}
            visitedIds={visitedStopIds}
            onAddStopPress={() => {
              setActiveTab('roadmap');
              setIsAddingDest(true);
            }}
          />
        </Card>

        {/* Workspace Segment Tabs */}
        <View style={styles.tabsBar}>
          <Pressable
            style={[styles.segmentTab, activeTab === 'roadmap' && styles.segmentTabActive]}
            onPress={() => setActiveTab('roadmap')}
          >
            <Ionicons
              name={activeTab === 'roadmap' ? 'map' : 'map-outline'}
              size={16}
              color={activeTab === 'roadmap' ? '#FFFFFF' : colors.brand.navy}
            />
            <Typography
              variant="label"
              color={activeTab === 'roadmap' ? '#FFFFFF' : colors.brand.navy}
              style={styles.tabText}
            >
              {t.trip.tabDestinations}
            </Typography>
          </Pressable>

          <Pressable
            style={[styles.segmentTab, activeTab === 'packing' && styles.segmentTabActive]}
            onPress={() => setActiveTab('packing')}
          >
            <MaterialIcons
              name="backpack"
              size={17}
              color={activeTab === 'packing' ? '#FFFFFF' : colors.brand.navy}
            />
            <Typography
              variant="label"
              color={activeTab === 'packing' ? '#FFFFFF' : colors.brand.navy}
              style={styles.tabText}
            >
              {t.trip.tabPacking}
            </Typography>
          </Pressable>

          <Pressable
            style={[styles.segmentTab, activeTab === 'moments' && styles.segmentTabActive]}
            onPress={() => setActiveTab('moments')}
          >
            <Ionicons
              name={activeTab === 'moments' ? 'camera' : 'camera-outline'}
              size={16}
              color={activeTab === 'moments' ? '#FFFFFF' : colors.brand.navy}
            />
            <Typography
              variant="label"
              color={activeTab === 'moments' ? '#FFFFFF' : colors.brand.navy}
              style={styles.tabText}
            >
              {t.trip.tabMoments}
            </Typography>
          </Pressable>
        </View>

        {/* TAB 1: ROADMAP DESTINASI */}
        {activeTab === 'roadmap' ? (
          <View style={styles.tabContent}>
            {/* Roadmap Trail Component */}
            <DestinationRoadmap
              destinations={destinations}
              visitedIds={visitedStopIds}
              onToggleVisited={handleToggleVisited}
              onAddStopPress={() => setIsAddingDest(true)}
            />

            {/* Form Tambah Destinasi */}
            {isAddingDest ? (
              <Card style={styles.addFormCard}>
                <View style={styles.formHeader}>
                  <Typography variant="h3" color={colors.brand.navy}>
                    {t.trip.addStopHeading}
                  </Typography>
                  <Pressable onPress={() => setIsAddingDest(false)}>
                    <Ionicons name="close-circle-outline" size={22} color={colors.text.muted} />
                  </Pressable>
                </View>

                {/* Quick Destination Chips */}
                <Typography variant="caption" color={colors.text.secondary} style={styles.quickChipLabel}>
                  {t.trip.quickPickLabel}
                </Typography>
                <View style={styles.quickChipsRow}>
                  {quickDestSuggestions.map((sug) => (
                    <Pressable
                      key={sug.name}
                      style={styles.sugChip}
                      onPress={() => {
                        setNewDestName(sug.name);
                        setNewDestActivity(sug.act);
                      }}
                    >
                      <Typography variant="caption" color={colors.brand.navy} style={styles.sugChipText}>
                        + {sug.name}
                      </Typography>
                    </Pressable>
                  ))}
                </View>

                <Input
                  label={t.trip.stopNameLabel}
                  placeholder={t.trip.stopNamePlaceholder}
                  value={newDestName}
                  onChangeText={setNewDestName}
                />

                <Input
                  label={t.trip.stopActivityLabel}
                  placeholder={t.trip.stopActivityPlaceholder}
                  value={newDestActivity}
                  onChangeText={setNewDestActivity}
                />

                <Input
                  label={t.trip.stopTimeLabel}
                  placeholder="09:30"
                  value={newDestTime}
                  onChangeText={setNewDestTime}
                />

                {/* Optional Location Photo when creating stop */}
                <Pressable
                  style={[
                    styles.destPhotoPickBtn,
                    { backgroundColor: colors.surface.page, borderColor: colors.border.default },
                  ]}
                  onPress={async () => {
                    const result = await ImagePicker.launchImageLibraryAsync({
                      mediaTypes: ImagePicker.MediaTypeOptions.Images,
                      quality: 0.85,
                      allowsEditing: true,
                      aspect: [16, 9],
                    });
                    if (!result.canceled && result.assets && result.assets[0]) {
                      setNewDestImageUri(result.assets[0].uri);
                    }
                  }}
                >
                  <Ionicons
                    name={newDestImageUri ? 'checkmark-circle' : 'camera-outline'}
                    size={18}
                    color={newDestImageUri ? colors.status.success : colors.brand.blue}
                  />
                  <Typography
                    variant="caption"
                    color={newDestImageUri ? colors.status.success : colors.brand.blue}
                    style={{ marginLeft: 6, fontWeight: '700' }}
                  >
                    {newDestImageUri
                      ? (language === 'en' ? 'Photo Attached ✓' : 'Foto Lokasi Terlampir ✓')
                      : (language === 'en' ? '+ Attach Location Photo' : '+ Lampirkan Foto Lokasi')}
                  </Typography>
                </Pressable>

                <View style={styles.formButtons}>
                  <Button
                    label={t.trip.cancel}
                    variant="ghost"
                    size="sm"
                    onPress={() => setIsAddingDest(false)}
                  />
                  <Button
                    label={t.trip.saveStopBtn}
                    variant="primary"
                    size="sm"
                    onPress={handleAddDestination}
                  />
                </View>
              </Card>
            ) : (
              <Button
                label={t.trip.addStopTriggerBtn}
                variant="secondary"
                size="md"
                onPress={() => setIsAddingDest(true)}
                style={styles.addTriggerBtn}
              />
            )}
          </View>
        ) : null}

        {/* TAB 2: PACKING & INVENTORY */}
        {activeTab === 'packing' ? (
          <View style={styles.tabContent}>
            {/* 2 OPTIONS SUB-TABS: STARTER PACK VS DESTINATION PACK */}
            <View style={styles.packSubTabContainer}>
              <Pressable
                style={[
                  styles.packSubTabBtn,
                  packSubTab === 'starter' && { backgroundColor: colors.brand.coral },
                ]}
                onPress={() => setPackSubTab('starter')}
              >
                <Ionicons
                  name="briefcase"
                  size={15}
                  color={packSubTab === 'starter' ? '#FFFFFF' : colors.text.secondary}
                />
                <Typography
                  variant="label"
                  color={packSubTab === 'starter' ? '#FFFFFF' : colors.text.secondary}
                  style={styles.packSubTabText}
                >
                  {t.packWorkspace.tabStarterPack} (
                  {items.filter((i) => !i.plannedDestinationId).length})
                </Typography>
              </Pressable>

              <Pressable
                style={[
                  styles.packSubTabBtn,
                  packSubTab === 'destinations' && { backgroundColor: colors.brand.coral },
                ]}
                onPress={() => setPackSubTab('destinations')}
              >
                <Ionicons
                  name="location"
                  size={15}
                  color={packSubTab === 'destinations' ? '#FFFFFF' : colors.text.secondary}
                />
                <Typography
                  variant="label"
                  color={packSubTab === 'destinations' ? '#FFFFFF' : colors.text.secondary}
                  style={styles.packSubTabText}
                >
                  {t.packWorkspace.tabDestinationPack} (
                  {items.filter((i) => !!i.plannedDestinationId).length})
                </Typography>
              </Pressable>
            </View>

            {/* Filter Chips */}
            <View style={styles.filterChipsRow}>
              {(
                [
                  { key: 'all', label: format(t.trip.filterAll, { count: items.length }) },
                  { key: 'unpacked', label: format(t.trip.filterUnpacked, { count: readiness.totalItems - readiness.packedCount }) },
                  { key: 'packed', label: format(t.trip.filterPacked, { count: readiness.packedCount }) },
                ] as const
              ).map((chip) => (
                <Pressable
                  key={chip.key}
                  onPress={() => setPackingFilter(chip.key)}
                  style={[
                    styles.filterChip,
                    packingFilter === chip.key && styles.filterChipActive,
                  ]}
                >
                  <Typography
                    variant="label"
                    color={packingFilter === chip.key ? '#FFFFFF' : colors.text.secondary}
                    style={styles.filterChipText}
                  >
                    {chip.label}
                  </Typography>
                </Pressable>
              ))}
            </View>

            {/* SUB-VIEW 1: STARTER PACK */}
            {packSubTab === 'starter' ? (
              <Card style={styles.itemsListCard}>
                <View style={styles.subTabHeaderRow}>
                  <View>
                    <Typography variant="h3" color={colors.brand.navy}>
                      {t.packWorkspace.tabStarterPack}
                    </Typography>
                    <Typography variant="caption" color={colors.text.muted}>
                      {t.packWorkspace.starterSubtitle}
                    </Typography>
                  </View>
                  <Badge
                    label={`${filteredItems.filter((i) => !i.plannedDestinationId).length} Items`}
                    variant="neutral"
                    size="sm"
                  />
                </View>

                {filteredItems.filter((i) => !i.plannedDestinationId).length === 0 ? (
                  <View style={styles.emptyItemsBox}>
                    <Typography variant="caption" color={colors.text.muted}>
                      {t.trip.emptyItemsDesc}
                    </Typography>
                  </View>
                ) : (
                  filteredItems
                    .filter((i) => !i.plannedDestinationId)
                    .map((item) => {
                      const isPacked = item.state === 'packed';
                      const isUsed = item.state === 'used';
                      return (
                        <View key={item.id} style={styles.checkItemRow}>
                          <Pressable
                            onPress={() => handleTogglePack(item)}
                            style={[styles.checkbox, isPacked && styles.checkboxActive]}
                          >
                            {isPacked ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                          </Pressable>

                          <View style={styles.itemTextWrap}>
                            <Typography
                              variant="body"
                              color={isPacked ? colors.text.muted : colors.brand.navy}
                              style={[styles.itemName, isPacked && styles.strikeText]}
                            >
                              {item.customName}
                            </Typography>
                            <Typography variant="caption" color={colors.text.muted}>
                              {item.category} • {language === 'en' ? 'Qty:' : 'Jumlah:'} {item.quantity}
                              {isUsed && (
                                <Typography variant="caption" color={colors.status.success}>
                                  {' '}• {t.packWorkspace.statusUsed}
                                </Typography>
                              )}
                            </Typography>
                          </View>

                          {/* 3-Dots Action Button */}
                          <Pressable
                            style={[
                              styles.itemMenuBtn,
                              {
                                backgroundColor: colors.surface.page,
                                borderColor: colors.border.default,
                              },
                            ]}
                            onPress={() => setActiveItemMenu(item)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="ellipsis-vertical" size={17} color={colors.text.primary} />
                          </Pressable>
                        </View>
                      );
                    })
                )}

                {/* Add item inline */}
                <View style={styles.addItemBox}>
                  <Input
                    label={t.trip.manualAddTitle}
                    placeholder={t.trip.manualAddPlaceholder}
                    value={newItemName}
                    onChangeText={setNewItemName}
                  />

                  <Button
                    label={t.trip.addChecklistBtn}
                    variant="primary"
                    size="sm"
                    onPress={handleAddTripItem}
                    style={styles.saveItemBtn}
                  />
                </View>
              </Card>
            ) : (
              /* SUB-VIEW 2: DESTINATION PACK (Grouped by Stop) */
              <View style={styles.destPackList}>
                {destinations.length === 0 ? (
                  <Card style={styles.emptyItemsBox}>
                    <Typography variant="body" color={colors.text.muted}>
                      {language === 'en'
                        ? 'No destination stops in roadmap yet. Add stops to start mapping equipment.'
                        : 'Belum ada destinasi di roadmap. Tambahkan destinasi terlebih dahulu untuk memetakan barang.'}
                    </Typography>
                  </Card>
                ) : (
                  destinations.map((dest) => {
                    const destItems = filteredItems.filter((i) => i.plannedDestinationId === dest.id);
                    return (
                      <Card key={dest.id} style={styles.destGroupCard}>
                        {/* Destination Group Header */}
                        <View style={styles.destGroupHeader}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Badge label={`Day ${dest.dayNumber}`} variant="accent" size="sm" />
                              {dest.plannedTime && (
                                <Typography variant="caption" color={colors.text.muted} style={{ marginLeft: 6 }}>
                                  {dest.plannedTime}
                                </Typography>
                              )}
                            </View>
                            <Typography variant="h3" color={colors.brand.navy} style={{ marginTop: 4 }}>
                              {dest.name}
                            </Typography>
                            {dest.activity && (
                              <Typography variant="caption" color={colors.text.secondary}>
                                {dest.activity}
                              </Typography>
                            )}
                          </View>

                          <Pressable
                            style={[styles.inspectDestBtn, { backgroundColor: colors.surface.muted }]}
                            onPress={() => router.push(`/destination/${dest.id}` as any)}
                          >
                            <Ionicons name="open-outline" size={16} color={colors.brand.blue} />
                          </Pressable>
                        </View>

                        {/* Mapped Items for this Stop */}
                        <View style={styles.destGroupItems}>
                          {destItems.length === 0 ? (
                            <Typography variant="caption" color={colors.text.muted} style={{ fontStyle: 'italic', marginVertical: 8 }}>
                              {language === 'en'
                                ? 'No items mapped to this stop yet.'
                                : 'Belum ada barang yang dipetakan ke destinasi ini.'}
                            </Typography>
                          ) : (
                            destItems.map((item) => {
                              const isPacked = item.state === 'packed';
                              const isUsed = item.state === 'used';
                              return (
                                <View key={item.id} style={styles.checkItemRow}>
                                  <Pressable
                                    onPress={() => handleTogglePack(item)}
                                    style={[styles.checkbox, isPacked && styles.checkboxActive]}
                                  >
                                    {isPacked ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
                                  </Pressable>

                                  <View style={styles.itemTextWrap}>
                                    <Typography
                                      variant="body"
                                      color={isPacked ? colors.text.muted : colors.brand.navy}
                                      style={[styles.itemName, isPacked && styles.strikeText]}
                                    >
                                      {item.customName}
                                    </Typography>
                                    <Typography variant="caption" color={colors.text.muted}>
                                      {item.category} • Qty: {item.quantity}
                                      {isUsed && (
                                        <Typography variant="caption" color={colors.status.success}>
                                          {' '}• {t.packWorkspace.statusUsed}
                                        </Typography>
                                      )}
                                    </Typography>
                                  </View>

                                  {/* 3-Dots Action Button */}
                                  <Pressable
                                    style={[
                                      styles.itemMenuBtn,
                                      {
                                        backgroundColor: colors.surface.page,
                                        borderColor: colors.border.default,
                                      },
                                    ]}
                                    onPress={() => setActiveItemMenu(item)}
                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  >
                                    <Ionicons name="ellipsis-vertical" size={17} color={colors.text.primary} />
                                  </Pressable>
                                </View>
                              );
                            })
                          )}
                        </View>
                      </Card>
                    );
                  })
                )}
              </View>
            )}
          </View>
        ) : null}

        {/* TAB 3: MOMEN & KENANGAN */}
        {activeTab === 'moments' ? (
          <View style={styles.tabContent}>
            <Card elevated style={styles.momentsCard}>
              <View style={styles.momentsHeader}>
                <View style={{ flex: 1 }}>
                  <Typography variant="h3" color={colors.brand.navy} style={styles.momentsTitle}>
                    {t.trip.memoriesHeading}
                  </Typography>
                  <Typography variant="caption" color={colors.text.secondary}>
                    {t.trip.memoriesSubtitle}
                  </Typography>
                </View>
                <Badge
                  label={
                    momentsList.length === 1
                      ? t.home.onePhotoBadge
                      : format(t.home.photosBadge, { count: momentsList.length })
                  }
                  variant="primary"
                />
              </View>

              {/* Form Tambah Momen Baru */}
              <View style={styles.addMomentBox}>
                <Typography variant="label" color={colors.brand.navy} style={{ marginBottom: spacing[2] }}>
                  {t.trip.addMemoryTitle}
                </Typography>

                {/* Photo Preview / Picker Area */}
                {selectedPhotoUri ? (
                  <View style={styles.photoPreviewWrapper}>
                    <Image source={{ uri: selectedPhotoUri }} style={styles.photoPreviewImage} />
                    <Pressable
                      style={styles.removePhotoBadge}
                      onPress={() => setSelectedPhotoUri(null)}
                    >
                      <Ionicons name="close-circle" size={26} color={colors.status.error} />
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.photoPickerRow}>
                    <Pressable style={styles.photoActionBtn} onPress={handleTakePhoto}>
                      <View style={[styles.photoIconCircle, { backgroundColor: '#EBF3FC' }]}>
                        <Ionicons name="camera" size={24} color={colors.brand.blue} />
                      </View>
                      <Typography variant="label" color={colors.brand.navy} style={{ marginTop: 6, fontWeight: '700' }}>
                        {t.trip.cameraBtn}
                      </Typography>
                      <Typography variant="caption" color={colors.text.muted}>
                        {t.trip.cameraDesc}
                      </Typography>
                    </Pressable>

                    <Pressable style={styles.photoActionBtn} onPress={handlePickGallery}>
                      <View style={[styles.photoIconCircle, { backgroundColor: '#FFF0EE' }]}>
                        <Ionicons name="images" size={24} color={colors.brand.coral} />
                      </View>
                      <Typography variant="label" color={colors.brand.navy} style={{ marginTop: 6, fontWeight: '700' }}>
                        {t.trip.galleryBtn}
                      </Typography>
                      <Typography variant="caption" color={colors.text.muted}>
                        {t.trip.galleryDesc}
                      </Typography>
                    </Pressable>
                  </View>
                )}

                {/* Caption Input */}
                <Input
                  label={t.trip.captionLabel}
                  placeholder={t.trip.captionPlaceholder}
                  value={newMomentCaption}
                  onChangeText={setNewMomentCaption}
                  style={{ marginTop: spacing[3] }}
                />

                {/* Location Tag Row */}
                <View style={styles.locationTagBox}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label={t.trip.locationTagLabel}
                      placeholder={t.trip.locationTagPlaceholder}
                      value={momentLocationTag}
                      onChangeText={setMomentLocationTag}
                    />
                  </View>
                  <Pressable
                    style={styles.gpsButton}
                    onPress={fetchCurrentLocation}
                    disabled={isLocating}
                  >
                    {isLocating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="location-sharp" size={16} color="#FFFFFF" />
                        <Typography variant="caption" color="#FFFFFF" style={{ fontWeight: '700', marginLeft: 4 }}>
                          {t.trip.gpsBtn}
                        </Typography>
                      </>
                    )}
                  </Pressable>
                </View>

                <Button
                  label={isSavingMoment ? t.trip.savingMomentBtn : t.trip.saveMomentBtn}
                  variant="primary"
                  size="md"
                  onPress={handleAddMoment}
                  disabled={isSavingMoment}
                  style={styles.saveMomentBtn}
                />
              </View>

              {/* Moments List */}
              <Typography variant="label" color={colors.brand.navy} style={{ marginTop: spacing[5], marginBottom: spacing[2] }}>
                {format(t.trip.galleryTitle, { count: momentsList.length })}
              </Typography>

              {momentsList.length === 0 ? (
                <View style={styles.emptyMomentsWrap}>
                  <Ionicons name="camera-outline" size={44} color={colors.brand.blue} />
                  <Typography variant="body" color={colors.brand.navy} style={{ marginTop: spacing[2], fontWeight: '700' }}>
                    {t.trip.noMemoriesYet}
                  </Typography>
                  <Typography variant="caption" color={colors.text.secondary} style={{ textAlign: 'center', marginTop: 4, paddingHorizontal: spacing[4] }}>
                    {t.trip.noMemoriesDesc}
                  </Typography>
                </View>
              ) : (
                momentsList.map((m) => (
                  <View key={m.id} style={styles.momentCardItem}>
                    {m.photoPath && !m.photoPath.startsWith('local://placeholder') ? (
                      <Image source={{ uri: m.photoPath }} style={styles.momentThumb} />
                    ) : (
                      <View style={styles.momentPlaceholderThumb}>
                        <Ionicons name="image-outline" size={32} color={colors.brand.blue} />
                      </View>
                    )}
                    <View style={styles.momentItemInfo}>
                      <Typography variant="body" color={colors.brand.navy} style={{ fontWeight: '700' }} numberOfLines={2}>
                        {m.caption || (language === 'en' ? 'Trip Memory Photo' : 'Foto Kenangan Perjalanan')}
                      </Typography>

                      {m.locationName ? (
                        <View style={styles.momentLocationRow}>
                          <Ionicons name="location" size={13} color={colors.brand.coral} />
                          <Typography variant="caption" color={colors.brand.coral} style={{ fontWeight: '600', marginLeft: 3 }} numberOfLines={1}>
                            {m.locationName}
                          </Typography>
                        </View>
                      ) : null}

                      <Typography variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>
                        {new Date(m.capturedAt).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                    </View>

                    <Pressable
                      style={styles.deleteMomentBtn}
                      onPress={() => handleDeleteMoment(m.id, m.photoPath)}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.text.muted} />
                    </Pressable>
                  </View>
                ))
              )}
            </Card>
          </View>
        ) : null}

        {/* Penutupan Perjalanan (Trip Closure) */}
        {!isCompleted ? (
          <Card style={styles.closeCard}>
            <View style={styles.closeHeader}>
              <Ionicons name="archive-outline" size={20} color={colors.brand.navy} />
              <Typography variant="h3" color={colors.brand.navy} style={styles.closeTitle}>
                {t.trip.closeSectionTitle}
              </Typography>
            </View>
            <Typography variant="body" color={colors.text.secondary} style={styles.closeDesc}>
              {t.trip.closeSectionDesc}
            </Typography>
            <Button
              label={t.trip.closeSectionBtn}
              variant="destructive"
              isLoading={isClosingTrip}
              onPress={handleCloseTrip}
            />
          </Card>
        ) : null}
      </ScrollView>

      {/* MODAL: SHIFT ITEM TO ANOTHER DESTINATION */}
      {itemToShift && (
        <Modal transparent animationType="fade" visible={!!itemToShift}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface.card }]}>
              <Typography variant="h3" color={colors.brand.navy}>
                {t.destDetail.moveModalTitle}
              </Typography>
              <Typography variant="body" color={colors.text.secondary} style={{ marginBottom: 12, marginTop: 4 }}>
                {itemToShift.customName}
              </Typography>

              <ScrollView style={{ maxHeight: 280 }}>
                {/* Option 1: Starter Pack */}
                <Pressable
                  style={[
                    styles.destOptionItem,
                    {
                      backgroundColor:
                        itemToShift.plannedDestinationId === null
                          ? colors.surface.muted
                          : colors.surface.page,
                    },
                  ]}
                  onPress={() => handleShiftItem(null)}
                >
                  <Ionicons name="briefcase-outline" size={18} color={colors.brand.coral} />
                  <Typography variant="label" color={colors.text.primary} style={{ marginLeft: 8 }}>
                    {t.destDetail.moveToStarterPack}
                  </Typography>
                </Pressable>

                {/* Option 2: Each Destination */}
                {destinations.map((d) => (
                  <Pressable
                    key={d.id}
                    style={[
                      styles.destOptionItem,
                      {
                        backgroundColor:
                          itemToShift.plannedDestinationId === d.id
                            ? colors.surface.muted
                            : colors.surface.page,
                      },
                    ]}
                    onPress={() => handleShiftItem(d.id)}
                  >
                    <Ionicons name="location-outline" size={18} color={colors.brand.blue} />
                    <Typography variant="label" color={colors.text.primary} style={{ marginLeft: 8 }}>
                      {t.destDetail.moveToStopPrefix}Day {d.dayNumber} - {d.name}
                    </Typography>
                  </Pressable>
                ))}
              </ScrollView>

              <Button
                variant="secondary"
                label={t.trip.cancel}
                onPress={() => setItemToShift(null)}
                style={{ marginTop: 12 }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL: Item Context Actions (3-Dots Kebab Menu) */}
      {activeItemMenu && (
        <Modal
          transparent
          animationType="fade"
          visible={!!activeItemMenu}
          onRequestClose={() => setActiveItemMenu(null)}
        >
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setActiveItemMenu(null)}
          >
            <Pressable
              style={[
                styles.actionSheetCard,
                { backgroundColor: colors.surface.card, borderColor: colors.border.strong },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Drag Handle Indicator */}
              <View style={styles.sheetHandleWrap}>
                <View style={[styles.sheetHandle, { backgroundColor: colors.border.strong }]} />
              </View>

              {/* Sheet Header: Item Info */}
              <View style={styles.sheetHeader}>
                <View style={styles.sheetHeaderLeft}>
                  <View style={[styles.sheetIconCircle, { backgroundColor: colors.surface.page }]}>
                    <Ionicons name="bag-handle" size={20} color={colors.brand.coral} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Typography variant="h3" color={colors.brand.navy} numberOfLines={1}>
                      {activeItemMenu.customName}
                    </Typography>
                    <Typography variant="caption" color={colors.text.muted}>
                      {activeItemMenu.category} • Qty: {activeItemMenu.quantity}
                    </Typography>
                  </View>
                </View>
                <Pressable
                  onPress={() => setActiveItemMenu(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.sheetCloseBtn}
                >
                  <Ionicons name="close" size={20} color={colors.text.muted} />
                </Pressable>
              </View>

              <View style={[styles.sheetDivider, { backgroundColor: colors.border.default }]} />

              {/* Action Options */}
              <View style={styles.sheetActionsList}>
                {/* 1. Toggle Packing Status */}
                <Pressable
                  style={({ pressed }) => [
                    styles.sheetActionItem,
                    { backgroundColor: colors.surface.page },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => {
                    handleTogglePack(activeItemMenu);
                    setActiveItemMenu(null);
                  }}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: `${colors.brand.blue}15` }]}>
                    <Ionicons
                      name={
                        activeItemMenu.state === 'packed' || activeItemMenu.state === 'used'
                          ? 'refresh-outline'
                          : 'cube-outline'
                      }
                      size={20}
                      color={colors.brand.blue}
                    />
                  </View>
                  <View style={styles.actionTextBox}>
                    <Typography variant="label" color={colors.brand.navy}>
                      {activeItemMenu.state === 'packed' || activeItemMenu.state === 'used'
                        ? t.destDetail.actionMarkUnpacked
                        : t.destDetail.actionMarkPacked}
                    </Typography>
                    <Typography variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>
                      {activeItemMenu.state === 'packed' || activeItemMenu.state === 'used'
                        ? t.destDetail.actionMarkUnpackedDesc
                        : t.destDetail.actionMarkPackedDesc}
                    </Typography>
                  </View>
                </Pressable>

                {/* 2. Toggle In-Trip Usage Status */}
                <Pressable
                  style={({ pressed }) => [
                    styles.sheetActionItem,
                    { backgroundColor: colors.surface.page },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => {
                    const isUsed = activeItemMenu.state === 'used';
                    handleUpdateItemState(activeItemMenu, isUsed ? 'packed' : 'used');
                    setActiveItemMenu(null);
                  }}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: `${colors.status.success}15` }]}>
                    <Ionicons
                      name={
                        activeItemMenu.state === 'used'
                          ? 'arrow-undo-outline'
                          : 'checkmark-done-circle-outline'
                      }
                      size={20}
                      color={colors.status.success}
                    />
                  </View>
                  <View style={styles.actionTextBox}>
                    <Typography variant="label" color={colors.brand.navy}>
                      {activeItemMenu.state === 'used'
                        ? t.destDetail.actionResetUsed
                        : t.destDetail.actionMarkUsed}
                    </Typography>
                    <Typography variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>
                      {activeItemMenu.state === 'used'
                        ? t.destDetail.actionResetUsedDesc
                        : t.destDetail.actionMarkUsedDesc}
                    </Typography>
                  </View>
                </Pressable>

                {/* 3. Shift Destination / Map Stop */}
                <Pressable
                  style={({ pressed }) => [
                    styles.sheetActionItem,
                    { backgroundColor: colors.surface.page },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => {
                    const item = activeItemMenu;
                    setActiveItemMenu(null);
                    setItemToShift(item);
                  }}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: `${colors.brand.coral}15` }]}>
                    <Ionicons name="swap-horizontal" size={20} color={colors.brand.coral} />
                  </View>
                  <View style={styles.actionTextBox}>
                    <Typography variant="label" color={colors.brand.navy}>
                      {t.destDetail.actionShiftDest}
                    </Typography>
                    <Typography variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>
                      {t.destDetail.actionShiftDestDesc}
                    </Typography>
                  </View>
                </Pressable>

                {/* 4. If Mapped to Destination: Option to Move Back to Starter Pack */}
                {activeItemMenu.plannedDestinationId && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.sheetActionItem,
                      { backgroundColor: colors.surface.page },
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={async () => {
                      const item = activeItemMenu;
                      setActiveItemMenu(null);
                      try {
                        await packingRepository.updateItemDestination(item.id, null);
                        loadTripData();
                      } catch {
                        Alert.alert('Error', 'Failed to move to starter pack.');
                      }
                    }}
                  >
                    <View style={[styles.actionIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                      <Ionicons name="briefcase-outline" size={20} color="#8B5CF6" />
                    </View>
                    <View style={styles.actionTextBox}>
                      <Typography variant="label" color={colors.brand.navy}>
                        {t.destDetail.actionReturnStarter}
                      </Typography>
                      <Typography variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>
                        {t.destDetail.actionReturnStarterDesc}
                      </Typography>
                    </View>
                  </Pressable>
                )}

                {/* 5. Delete Item */}
                <Pressable
                  style={({ pressed }) => [
                    styles.sheetActionItem,
                    { backgroundColor: colors.surface.page },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => {
                    const item = activeItemMenu;
                    setActiveItemMenu(null);
                    handleDeleteTripItem(item);
                  }}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <Ionicons name="trash-outline" size={20} color={colors.status.error} />
                  </View>
                  <View style={styles.actionTextBox}>
                    <Typography variant="label" color={colors.status.error}>
                      {language === 'en' ? 'Delete Item' : 'Hapus Barang'}
                    </Typography>
                    <Typography variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>
                      {language === 'en'
                        ? 'Permanently remove from this trip checklist'
                        : 'Hapus permanen dari daftar barang trip ini'}
                    </Typography>
                  </View>
                </Pressable>
              </View>

              {/* Cancel Button */}
              <Button
                variant="secondary"
                label={t.destDetail.closeMenu}
                onPress={() => setActiveItemMenu(null)}
                style={{ marginTop: 14 }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* MODAL: Visited Destination & Inventory Usage Dialog */}
      {visitingModalDest && (
        <Modal
          transparent
          animationType="fade"
          visible={!!visitingModalDest}
          onRequestClose={() => setVisitingModalDest(null)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalCard,
                { backgroundColor: themeColors.surface.card, maxHeight: '85%' },
              ]}
            >
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View
                  style={[
                    styles.sheetIconCircle,
                    { backgroundColor: 'rgba(22, 163, 74, 0.15)' },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={24} color={themeColors.status.success} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Typography variant="h3" color={themeColors.brand.navy} numberOfLines={1}>
                    {format(t.trip.visitedDialogTitle, { destName: visitingModalDest.name })}
                  </Typography>
                  <Typography variant="caption" color={themeColors.text.secondary}>
                    {t.trip.visitedDialogSubtitle}
                  </Typography>
                </View>
              </View>

              <View
                style={[styles.sheetDivider, { backgroundColor: themeColors.border.default }]}
              />

              {/* Items List */}
              {(() => {
                const targetItems = items.filter(
                  (i) => i.plannedDestinationId === visitingModalDest.id
                );
                const displayItems =
                  targetItems.length > 0
                    ? targetItems
                    : items.filter((i) => i.state !== 'returned');

                return (
                  <>
                    {displayItems.length === 0 ? (
                      <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                        <Ionicons name="bag-outline" size={28} color={themeColors.text.muted} />
                        <Typography
                          variant="caption"
                          color={themeColors.text.muted}
                          style={{ textAlign: 'center', marginTop: 6 }}
                        >
                          {t.trip.visitedDialogEmptyItems}
                        </Typography>
                      </View>
                    ) : (
                      <ScrollView
                        style={{ maxHeight: 220, marginVertical: 6 }}
                        showsVerticalScrollIndicator={false}
                      >
                        {displayItems.map((item) => {
                          const isChecked = selectedUsedItemIds.includes(item.id);
                          return (
                            <Pressable
                              key={item.id}
                              style={[
                                styles.checkItemRow,
                                {
                                  paddingVertical: 10,
                                  borderBottomColor: themeColors.border.muted,
                                },
                              ]}
                              onPress={() => {
                                setSelectedUsedItemIds((prev) =>
                                  prev.includes(item.id)
                                    ? prev.filter((x) => x !== item.id)
                                    : [...prev, item.id]
                                );
                              }}
                            >
                              <View
                                style={[
                                  styles.checkbox,
                                  isChecked && {
                                    backgroundColor: themeColors.status.success,
                                    borderColor: themeColors.status.success,
                                  },
                                ]}
                              >
                                {isChecked && (
                                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                                )}
                              </View>

                              <View style={{ flex: 1, marginRight: 8 }}>
                                <Typography variant="label" color={themeColors.brand.navy}>
                                  {item.customName}
                                </Typography>
                                <Typography variant="caption" color={themeColors.text.muted}>
                                  {item.category} • Qty: {item.quantity}
                                </Typography>
                              </View>

                              <Badge
                                label={
                                  isChecked
                                    ? t.trip.visitedDialogItemUsedLabel
                                    : item.state === 'packed'
                                    ? 'Packed'
                                    : 'Planned'
                                }
                                variant={isChecked ? 'success' : 'neutral'}
                                size="sm"
                              />
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    )}

                    {/* Action Buttons */}
                    <View style={{ gap: 8, marginTop: 12 }}>
                      {/* 1. Mark All Used */}
                      {displayItems.length > 0 && (
                        <Button
                          variant="primary"
                          size="sm"
                          label={t.trip.visitedDialogMarkAllUsed}
                          onPress={async () => {
                            try {
                              for (const it of displayItems) {
                                await packingRepository.updateItemState(it.id, 'used');
                              }
                              setVisitedStopIds((prev) => [...prev, visitingModalDest.id]);
                              setVisitingModalDest(null);
                              loadTripData();
                            } catch {
                              Alert.alert('Error', 'Failed to update items.');
                            }
                          }}
                        />
                      )}

                      {/* 2. Save Selection if some checked */}
                      {displayItems.length > 0 && selectedUsedItemIds.length > 0 && (
                        <Button
                          variant="accent"
                          size="sm"
                          label={t.trip.visitedDialogSaveSelection}
                          onPress={async () => {
                            try {
                              for (const idToUpdate of selectedUsedItemIds) {
                                await packingRepository.updateItemState(idToUpdate, 'used');
                              }
                              setVisitedStopIds((prev) => [...prev, visitingModalDest.id]);
                              setVisitingModalDest(null);
                              loadTripData();
                            } catch {
                              Alert.alert('Error', 'Failed to update selected items.');
                            }
                          }}
                        />
                      )}

                      {/* 3. Skip / No changes */}
                      <Button
                        variant="secondary"
                        size="sm"
                        label={t.trip.visitedDialogNoChange}
                        onPress={() => {
                          setVisitedStopIds((prev) => [...prev, visitingModalDest.id]);
                          setVisitingModalDest(null);
                        }}
                      />

                      {/* 4. Cancel */}
                      <Button
                        variant="ghost"
                        size="sm"
                        label={t.trip.cancel}
                        onPress={() => setVisitingModalDest(null)}
                      />
                    </View>
                  </>
                );
              })()}
            </View>
          </View>
        </Modal>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: spacing[2],
    paddingBottom: spacing[6],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
    gap: spacing[2],
  },
  cardTitleWrap: {
    flex: 1,
  },
  heroCard: {
    padding: spacing[5],
    marginBottom: spacing[3],
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  heroDest: {
    marginLeft: 4,
    fontWeight: '600',
  },
  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  chipText: {
    marginLeft: 4,
    fontSize: 11,
  },
  lifecycleWrap: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: spacing[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  coPilotCard: {
    padding: spacing[4],
    marginBottom: spacing[4],
    backgroundColor: '#FFF9F8',
    borderColor: '#FED7D4',
  },
  coPilotHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  coPilotIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE4E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  coPilotTitles: {
    flex: 1,
  },
  coPilotActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    borderTopWidth: 1,
    borderTopColor: '#FED7D4',
    paddingTop: spacing[3],
  },
  tabsBar: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
    borderRadius: radius.full,
    padding: 4,
    marginBottom: spacing[4],
    gap: 4,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    gap: 6,
  },
  segmentTabActive: {
    backgroundColor: colors.brand.navy,
    shadowColor: colors.brand.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tabContent: {
    marginBottom: spacing[4],
  },
  addFormCard: {
    padding: spacing[4],
    marginTop: spacing[3],
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  quickChipLabel: {
    marginBottom: 6,
    fontWeight: '600',
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  sugChip: {
    backgroundColor: colors.surface.muted,
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  sugChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  addTriggerBtn: {
    marginTop: spacing[2],
  },
  readinessCard: {
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  readinessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[3],
  },
  blockerAlertBox: {
    marginTop: spacing[4],
    backgroundColor: colors.status.errorLight,
    padding: spacing[3],
    borderRadius: radius.md,
  },
  blockerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  blockerTitle: {
    marginLeft: 6,
    fontWeight: '700',
  },
  blockerItem: {
    marginTop: 2,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  filterChip: {
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  filterChipActive: {
    backgroundColor: colors.brand.navy,
    borderColor: colors.brand.navy,
  },
  filterChipText: {
    fontSize: 11,
  },
  itemsListCard: {
    padding: spacing[4],
  },
  emptyItemsBox: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: spacing[1],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  checkboxActive: {
    backgroundColor: colors.brand.navy,
    borderColor: colors.brand.navy,
  },
  itemTextWrap: {
    flex: 1,
    marginRight: spacing[2],
  },
  itemName: {
    fontWeight: '600',
  },
  strikeText: {
    textDecorationLine: 'line-through',
  },
  addItemBox: {
    marginTop: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  saveItemBtn: {
    marginTop: spacing[2],
  },
  momentsCard: {
    padding: spacing[4],
  },
  momentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  momentsTitle: {
    marginBottom: 2,
  },
  addMomentBox: {
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  photoPreviewWrapper: {
    position: 'relative',
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: spacing[3],
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removePhotoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  photoPickerRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  photoActionBtn: {
    flex: 1,
    backgroundColor: colors.surface.muted,
    borderRadius: radius.md,
    padding: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderStyle: 'dashed',
  },
  photoIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTagBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  gpsButton: {
    height: 44,
    paddingHorizontal: spacing[3],
    backgroundColor: colors.brand.blue,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  saveMomentBtn: {
    marginTop: spacing[1],
  },
  emptyMomentsWrap: {
    alignItems: 'center',
    paddingVertical: spacing[5],
    backgroundColor: colors.surface.muted,
    borderRadius: radius.md,
  },
  momentCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
    gap: spacing[3],
  },
  momentThumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.surface.muted,
  },
  momentPlaceholderThumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: '#EEF2F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentItemInfo: {
    flex: 1,
  },
  momentLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  deleteMomentBtn: {
    padding: spacing[2],
  },
  closeCard: {
    padding: spacing[5],
    marginBottom: spacing[6],
    borderColor: colors.status.warning,
  },
  closeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  closeTitle: {
    marginLeft: 6,
  },
  closeDesc: {
    marginBottom: spacing[4],
    lineHeight: 20,
  },
  packSubTabContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing[3],
  },
  packSubTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    backgroundColor: '#EEF2F6',
    gap: 6,
  },
  packSubTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modeGuidanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing[3],
  },
  subTabHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  itemActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  markUsedBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  shiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  destPackList: {
    gap: spacing[3],
  },
  destGroupCard: {
    padding: spacing[4],
  },
  destGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
    paddingBottom: spacing[2],
    marginBottom: spacing[2],
  },
  inspectDestBtn: {
    padding: 6,
    borderRadius: radius.sm,
  },
  destGroupItems: {
    gap: 6,
  },
  destOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  destPhotoPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: spacing[3],
  },
  itemMenuBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  actionSheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  sheetHandleWrap: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 10,
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sheetIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseBtn: {
    padding: 4,
    marginLeft: 8,
  },
  sheetDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  sheetActionsList: {
    gap: 8,
  },
  sheetActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTextBox: {
    flex: 1,
  },
});
