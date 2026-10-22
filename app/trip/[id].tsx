import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Card, Badge, Button, Input, ScreenContainer, ProgressBar } from '@/components/ui';
import { TripLifecycleRoadmap, DestinationRoadmap } from '@/components/roadmap';
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
import { QUICK_PACK_BUNDLES, QuickBundle } from '@/core/constants';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';

type WorkspaceTab = 'roadmap' | 'packing' | 'moments';
type PackingFilter = 'all' | 'unpacked' | 'packed';

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const themeColors = useThemeColors();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const { language } = useI18n();

  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [destinations, setDestinations] = useState<DestinationRecord[]>([]);
  const [items, setItems] = useState<TripItemRecord[]>([]);
  const [momentsList, setMomentsList] = useState<MomentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active workspace segment tab
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('roadmap');
  const [packingFilter, setPackingFilter] = useState<PackingFilter>('all');
  const [visitedStopIds, setVisitedStopIds] = useState<string[]>([]);

  // Inline forms
  const [newDestName, setNewDestName] = useState('');
  const [newDestActivity, setNewDestActivity] = useState('');
  const [newDestTime, setNewDestTime] = useState('09:00');
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
      Alert.alert('Error', 'Gagal memuat data perjalanan.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

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
      Alert.alert('Gagal', 'Tidak dapat memperbarui status perjalanan.');
    }
  };

  const handleToggleVisited = (dest: DestinationRecord) => {
    setVisitedStopIds((prev) =>
      prev.includes(dest.id) ? prev.filter((i) => i !== dest.id) : [...prev, dest.id]
    );
  };

  // 1-Tap Add Bundle of Items
  const handleAddBundle = async (bundle: QuickBundle) => {
    if (!id) return;
    try {
      for (const bItem of bundle.items) {
        await packingRepository.addTripItem({
          tripId: id,
          itemId: null,
          customName: bItem.name,
          category: bundle.category,
          plannedDestinationId: destinations[0]?.id ?? null,
          state: 'planned',
          priority: bItem.priority,
          quantity: 1,
          notes: null,
        });
      }
      loadTripData();
      Alert.alert('Sukses', `${bundle.title} (${bundle.items.length} barang) berhasil ditambahkan ke checklist.`);
    } catch {
      Alert.alert('Gagal', 'Tidak dapat menambahkan paket barang.');
    }
  };

  const handleAddDestination = async () => {
    if (!id || !newDestName.trim()) {
      Alert.alert('Perhatian', 'Nama destinasi wajib diisi.');
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
      });
      setNewDestName('');
      setNewDestActivity('');
      setIsAddingDest(false);
      loadTripData();
    } catch {
      Alert.alert('Gagal', 'Tidak dapat menambahkan destinasi.');
    }
  };

  const handleAddTripItem = async () => {
    if (!id || !newItemName.trim()) return;
    try {
      await packingRepository.addTripItem({
        tripId: id,
        itemId: null,
        customName: newItemName.trim(),
        category: 'Perlengkapan',
        plannedDestinationId: destinations[0]?.id ?? null,
        state: 'planned',
        priority: 'must_have',
        quantity: 1,
        notes: null,
      });
      setNewItemName('');
      loadTripData();
    } catch {
      Alert.alert('Gagal', 'Tidak dapat menambahkan barang.');
    }
  };

  const handleTogglePack = async (item: TripItemRecord) => {
    try {
      const nextState = item.state === 'planned' ? 'packed' : 'planned';
      await packingRepository.updateItemState(item.id, nextState);
      loadTripData();
    } catch {
      Alert.alert('Gagal', 'Tidak dapat memperbarui status barang.');
    }
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
      Alert.alert('Selesai', 'Semua barang telah ditandai sudah dikemas!');
    } catch {
      Alert.alert('Gagal', 'Tidak dapat memperbarui barang.');
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
      Alert.alert('Gagal', 'Tidak dapat mengambil foto menggunakan kamera.');
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
      Alert.alert('Gagal', 'Tidak dapat memilih foto dari galeri.');
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
      Alert.alert('Perhatian', 'Silakan ambil/pilih foto atau tuliskan cerita momen Anda.');
      return;
    }
    try {
      setIsSavingMoment(true);
      await momentRepository.create({
        tripId: id,
        destinationId: destinations[0]?.id ?? null,
        caption: newMomentCaption.trim() || 'Foto Kenangan Perjalanan',
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
      Alert.alert('Momen Tersimpan', 'Kenangan perjalanan berhasil disimpan secara offline di perangkat.');
    } catch {
      Alert.alert('Gagal', 'Tidak dapat menyimpan kenangan momen.');
    } finally {
      setIsSavingMoment(false);
    }
  };

  const handleDeleteMoment = async (momentId: string, photoPath: string) => {
    Alert.alert('Hapus Momen', 'Apakah Anda yakin ingin menghapus kenangan momen ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await momentRepository.delete(momentId);
            if (photoPath && !photoPath.startsWith('local://')) {
              await mediaService.deletePhoto(photoPath);
            }
            loadTripData();
          } catch {
            Alert.alert('Gagal', 'Tidak dapat menghapus momen.');
          }
        },
      },
    ]);
  };

  const handleCloseTrip = async () => {
    if (!id) return;

    Alert.alert(
      'Tutup & Selesaikan Perjalanan?',
      'Menutup trip akan memindahkan perjalanan ini ke arsip kenangan. Jika ada barang belum diverifikasi kembali, sistem tetap menyimpannya dengan aman tanpa mengunci penutupan trip.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Tutup & Simpan Kenangan',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsClosingTrip(true);
              const result = await tripClosureService.closeTrip({ tripId: id });
              if (result.hasMissingItems) {
                Alert.alert(
                  'Perjalanan Selesai & Diarsipkan',
                  `Trip berhasil ditutup. Catatan: terdapat ${result.missingItemsCount} barang yang belum diverifikasi kembali dan tetap dicatat pada arsip trip.`
                );
              } else {
                Alert.alert('Selamat!', 'Semua barang berhasil diverifikasi lengkap. Perjalanan Anda tersimpan manis di arsip Tripory.');
              }
              loadTripData();
            } catch {
              Alert.alert('Gagal', 'Tidak dapat menutup perjalanan.');
            } finally {
              setIsClosingTrip(false);
            }
          },
        },
      ]
    );
  };

  if (!trip) {
    return (
      <ScreenContainer>
        <Typography variant="body" color={colors.text.secondary}>
          {isLoading ? 'Memuat perjalanan...' : 'Perjalanan tidak ditemukan.'}
        </Typography>
      </ScreenContainer>
    );
  }

  // Readiness computation
  const readiness = packingService.computeReadiness(items as any);
  const readinessPercent = readiness.totalItems > 0
    ? Math.round((readiness.packedCount / readiness.totalItems) * 100)
    : 0;

  const filteredItems = items.filter((item) => {
    if (packingFilter === 'all') return true;
    if (packingFilter === 'packed') return item.state === 'packed';
    if (packingFilter === 'unpacked') return item.state === 'planned';
    return true;
  });

  // Smart Co-Pilot recommendation logic
  const isPreparing = trip.status === 'draft' || trip.status === 'preparing';
  const isReady = trip.status === 'ready';
  const isOngoing = trip.status === 'ongoing';
  const isCompleted = trip.status === 'completed';

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Navigation Top Bar */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={colors.brand.navy} />
            <Typography variant="label" color={colors.brand.navy} style={styles.backText}>
              Kembali
            </Typography>
          </Pressable>

          <Badge
            label={
              isCompleted
                ? 'Selesai (Arsip)'
                : isOngoing
                ? 'Sedang Berlangsung'
                : isReady
                ? 'Siap Berangkat'
                : 'Persiapan'
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
            dot
          />
        </View>

        {/* Hero Header Card */}
        <Card variant="navy" style={styles.heroCard}>
          <Typography variant="h1" color="#FFFFFF" style={styles.heroTitle}>
            {trip.name}
          </Typography>
          <View style={styles.destRow}>
            <Ionicons name="location-sharp" size={16} color={colors.brand.coral} />
            <Typography variant="body" color="#F1F5F9" style={styles.heroDest}>
              {trip.destination}
            </Typography>
          </View>

          <View style={styles.heroMetaRow}>
            <View style={styles.heroChip}>
              <Ionicons name="calendar-outline" size={13} color="#CBD5E1" />
              <Typography variant="caption" color="#CBD5E1" style={styles.chipText}>
                {formatDateRange(trip.startDate, trip.endDate)}
              </Typography>
            </View>
            <View style={styles.heroChip}>
              <Ionicons name="time-outline" size={13} color="#CBD5E1" />
              <Typography variant="caption" color="#CBD5E1" style={styles.chipText}>
                {formatTripDurationLabel(trip.startDate, trip.endDate)}
              </Typography>
            </View>
          </View>

          {/* Lifecycle Stepper Component */}
          <View style={styles.lifecycleWrap}>
            <TripLifecycleRoadmap status={trip.status} theme="dark" compact={false} />
          </View>
        </Card>

        {/* SMART CO-PILOT GUIDED ACTION CARD */}
        {!isCompleted ? (
          <Card elevated style={styles.coPilotCard}>
            <View style={styles.coPilotHeader}>
              <View style={styles.coPilotIconCircle}>
                <Ionicons
                  name={isOngoing ? 'navigate' : isReady ? 'rocket' : 'compass'}
                  size={20}
                  color={colors.brand.coral}
                />
              </View>
              <View style={styles.coPilotTitles}>
                <Typography variant="label" color={colors.brand.coral}>
                  PANDUAN LANGKAH BERIKUTNYA
                </Typography>
                <Typography variant="h3" color={colors.brand.navy}>
                  {isPreparing && readinessPercent < 100
                    ? `Kemas ${readiness.totalItems - readiness.packedCount} barang sebelum berangkat`
                    : isPreparing || isReady
                    ? 'Persiapan lengkap! Siap memulai perjalanan?'
                    : isOngoing
                    ? 'Perjalanan sedang aktif. Jelajahi roadmap & abadikan momen'
                    : 'Perjalanan siap ditutup'}
                </Typography>
              </View>
            </View>

            <View style={styles.coPilotActionRow}>
              {isPreparing && readinessPercent < 100 ? (
                <>
                  <Button
                    label="Buka Checklist Kemas"
                    size="sm"
                    variant="secondary"
                    onPress={() => setActiveTab('packing')}
                  />
                  {items.length > 0 ? (
                    <Button
                      label="✓ Centang Semua Siap"
                      size="sm"
                      variant="primary"
                      onPress={handlePackAll}
                    />
                  ) : null}
                </>
              ) : isPreparing || isReady ? (
                <Button
                  label="🚀 Mulai Perjalanan (Jelajah Sekarang)"
                  size="md"
                  variant="accent"
                  onPress={() => handleAdvanceStatus('ongoing')}
                />
              ) : isOngoing ? (
                <>
                  <Button
                    label="📸 Tambah Foto Momen"
                    size="sm"
                    variant="secondary"
                    onPress={() => setActiveTab('moments')}
                  />
                  <Button
                    label="📦 Selesai & Cek Kepulangan"
                    size="sm"
                    variant="primary"
                    onPress={handleCloseTrip}
                  />
                </>
              ) : null}
            </View>
          </Card>
        ) : null}

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
              Destinasi
            </Typography>
          </Pressable>

          <Pressable
            style={[styles.segmentTab, activeTab === 'packing' && styles.segmentTabActive]}
            onPress={() => setActiveTab('packing')}
          >
            <Ionicons
              name={activeTab === 'packing' ? 'bag-handle' : 'bag-handle-outline'}
              size={16}
              color={activeTab === 'packing' ? '#FFFFFF' : colors.brand.navy}
            />
            <Typography
              variant="label"
              color={activeTab === 'packing' ? '#FFFFFF' : colors.brand.navy}
              style={styles.tabText}
            >
              Kemas
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
              Momen
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
                    Tambah Titik Singgah Baru
                  </Typography>
                  <Pressable onPress={() => setIsAddingDest(false)}>
                    <Ionicons name="close-circle-outline" size={22} color={colors.text.muted} />
                  </Pressable>
                </View>

                {/* Quick Destination Chips */}
                <Typography variant="caption" color={colors.text.secondary} style={styles.quickChipLabel}>
                  Pilih Cepat:
                </Typography>
                <View style={styles.quickChipsRow}>
                  {[
                    { name: 'Hotel / Penginapan', act: 'Check-in & istirahat' },
                    { name: 'Wisata Alam / Pantai', act: 'Eksplorasi alam & foto' },
                    { name: 'Kuliner Lokal Favorit', act: 'Makan siang & santap santai' },
                    { name: 'Pusat Oleh-Oleh', act: 'Belanja suvenir' },
                  ].map((sug) => (
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
                  label="Nama Tempat / Titik Singgah *"
                  placeholder="Contoh: Kawah Putih / Restoran Pagi"
                  value={newDestName}
                  onChangeText={setNewDestName}
                />

                <Input
                  label="Rencana Aktivitas"
                  placeholder="Contoh: Sarapan, Foto bersama, Trekking"
                  value={newDestActivity}
                  onChangeText={setNewDestActivity}
                />

                <Input
                  label="Estimasi Jam"
                  placeholder="Contoh: 09:30"
                  value={newDestTime}
                  onChangeText={setNewDestTime}
                />

                <View style={styles.formButtons}>
                  <Button
                    label="Batal"
                    variant="ghost"
                    size="sm"
                    onPress={() => setIsAddingDest(false)}
                  />
                  <Button
                    label="+ Simpan ke Roadmap"
                    variant="primary"
                    size="sm"
                    onPress={handleAddDestination}
                  />
                </View>
              </Card>
            ) : (
              <Button
                label="+ Tambah Titik Singgah ke Roadmap"
                variant="secondary"
                size="md"
                onPress={() => setIsAddingDest(true)}
                style={styles.addTriggerBtn}
              />
            )}
          </View>
        ) : null}

        {/* TAB 2: PACKING & READINESS */}
        {activeTab === 'packing' ? (
          <View style={styles.tabContent}>
            {/* Readiness Gauge Card */}
            <Card elevated style={styles.readinessCard}>
              <View style={styles.readinessHeader}>
                <View>
                  <Typography variant="caption" color={colors.text.secondary}>
                    Kesiapan Barang Bawaan
                  </Typography>
                  <Typography variant="h2" color={colors.brand.navy}>
                    {readiness.packedCount} dari {readiness.totalItems} Barang Siap
                  </Typography>
                </View>
                <Badge
                  label={readiness.statusLabel}
                  variant={readinessPercent === 100 ? 'success' : 'accent'}
                  dot
                />
              </View>

              <ProgressBar
                progress={readinessPercent}
                variant={readinessPercent === 100 ? 'success' : 'accent'}
                height={10}
                showLabel
                label="Progres Packing Koper"
              />

              {/* Critical Blockers */}
              {readiness.criticalBlockers.length > 0 ? (
                <View style={styles.blockerAlertBox}>
                  <View style={styles.blockerTitleRow}>
                    <Ionicons name="alert-circle" size={16} color={colors.status.error} />
                    <Typography variant="label" color={colors.status.error} style={styles.blockerTitle}>
                      Blocker Kritis ({readiness.criticalBlockers.length} barang wajib belum siap)
                    </Typography>
                  </View>
                  {readiness.criticalBlockers.map((b) => (
                    <Typography key={b.id} variant="caption" color={colors.status.error} style={styles.blockerItem}>
                      • {b.customName} ({b.category})
                    </Typography>
                  ))}
                </View>
              ) : null}
            </Card>

            {/* ONE-TAP QUICK STARTER PACKAGES */}
            <View style={styles.quickBundlesSection}>
              <Typography variant="label" color={colors.brand.navy} style={styles.bundleSectionTitle}>
                Tambah Paket Barang Cepat (1-Tap):
              </Typography>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bundlesRow}>
                {QUICK_PACK_BUNDLES.map((bundle) => (
                  <Pressable
                    key={bundle.title}
                    style={styles.bundleCard}
                    onPress={() => handleAddBundle(bundle)}
                  >
                    <Ionicons name={bundle.icon as any} size={18} color={colors.brand.coral} />
                    <Typography variant="caption" color={colors.brand.navy} style={styles.bundleCardTitle}>
                      + {bundle.title}
                    </Typography>
                    <Typography variant="caption" color={colors.text.muted} style={styles.bundleCountText}>
                      ({bundle.items.length} item)
                    </Typography>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Filter Chips */}
            <View style={styles.filterChipsRow}>
              {(
                [
                  { key: 'all', label: `Semua (${items.length})` },
                  { key: 'unpacked', label: `Perlu Disiapkan (${readiness.totalItems - readiness.packedCount})` },
                  { key: 'packed', label: `Sudah Dikemas (${readiness.packedCount})` },
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

            {/* Items Checklist */}
            <Card style={styles.itemsListCard}>
              {filteredItems.length === 0 ? (
                <View style={styles.emptyItemsBox}>
                  <Typography variant="caption" color={colors.text.muted}>
                    Belum ada barang di filter ini. Pilih paket cepat di atas atau tambahkan barang di bawah.
                  </Typography>
                </View>
              ) : (
                filteredItems.map((item) => {
                  const isPacked = item.state === 'packed';
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => handleTogglePack(item)}
                      style={styles.checkItemRow}
                    >
                      <View style={[styles.checkbox, isPacked && styles.checkboxActive]}>
                        {isPacked ? (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        ) : null}
                      </View>

                      <View style={styles.itemTextWrap}>
                        <Typography
                          variant="body"
                          color={isPacked ? colors.text.muted : colors.brand.navy}
                          style={[styles.itemName, isPacked && styles.strikeText]}
                        >
                          {item.customName}
                        </Typography>
                        <Typography variant="caption" color={colors.text.muted}>
                          {item.category} • Jumlah: {item.quantity}
                        </Typography>
                      </View>

                      <Badge
                        label={
                          item.priority === 'must_have'
                            ? 'Wajib'
                            : item.priority === 'conditional'
                            ? 'Kondisional'
                            : 'Opsional'
                        }
                        variant={
                          item.priority === 'must_have'
                            ? 'error'
                            : item.priority === 'conditional'
                            ? 'warning'
                            : 'neutral'
                        }
                        size="sm"
                      />
                    </Pressable>
                  );
                })
              )}

              {/* Add item inline */}
              <View style={styles.addItemBox}>
                <Input
                  label="Tambah Barang Manual"
                  placeholder="Ketik nama barang lalu tekan tombol di bawah..."
                  value={newItemName}
                  onChangeText={setNewItemName}
                />

                <Button
                  label="+ Tambahkan ke Checklist"
                  variant="primary"
                  size="sm"
                  onPress={handleAddTripItem}
                  style={styles.saveItemBtn}
                />
              </View>
            </Card>
          </View>
        ) : null}

        {/* TAB 3: MOMEN & KENANGAN */}
        {activeTab === 'moments' ? (
          <View style={styles.tabContent}>
            <Card elevated style={styles.momentsCard}>
              <View style={styles.momentsHeader}>
                <View style={{ flex: 1 }}>
                  <Typography variant="h3" color={colors.brand.navy} style={styles.momentsTitle}>
                    Kenangan Perjalanan
                  </Typography>
                  <Typography variant="caption" color={colors.text.secondary}>
                    Foto & catatan tersimpan offline secara lokal di perangkat Anda.
                  </Typography>
                </View>
                <Badge label={`${momentsList.length} Momen`} variant="primary" />
              </View>

              {/* Form Tambah Momen Baru */}
              <View style={styles.addMomentBox}>
                <Typography variant="label" color={colors.brand.navy} style={{ marginBottom: spacing[2] }}>
                  Abadikan Foto & Catatan Momen
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
                        Ambil Kamera
                      </Typography>
                      <Typography variant="caption" color={colors.text.muted}>
                        Foto langsung
                      </Typography>
                    </Pressable>

                    <Pressable style={styles.photoActionBtn} onPress={handlePickGallery}>
                      <View style={[styles.photoIconCircle, { backgroundColor: '#FFF0EE' }]}>
                        <Ionicons name="images" size={24} color={colors.brand.coral} />
                      </View>
                      <Typography variant="label" color={colors.brand.navy} style={{ marginTop: 6, fontWeight: '700' }}>
                        Pilih Galeri
                      </Typography>
                      <Typography variant="caption" color={colors.text.muted}>
                        Buka foto tersimpan
                      </Typography>
                    </Pressable>
                  </View>
                )}

                {/* Caption Input */}
                <Input
                  label="Cerita atau Catatan Momen"
                  placeholder="Contoh: Menikmati udara sejuk kebun teh & pemandangan..."
                  value={newMomentCaption}
                  onChangeText={setNewMomentCaption}
                  style={{ marginTop: spacing[3] }}
                />

                {/* Location Tag Row */}
                <View style={styles.locationTagBox}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Tag Lokasi Momen"
                      placeholder="Nama tempat / daerah..."
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
                          GPS
                        </Typography>
                      </>
                    )}
                  </Pressable>
                </View>

                <Button
                  label={isSavingMoment ? 'Menyimpan...' : '💾 Simpan Kenangan Lokal'}
                  variant="primary"
                  size="md"
                  onPress={handleAddMoment}
                  disabled={isSavingMoment}
                  style={styles.saveMomentBtn}
                />
              </View>

              {/* Moments List */}
              <Typography variant="label" color={colors.brand.navy} style={{ marginTop: spacing[5], marginBottom: spacing[2] }}>
                Galeri Kenangan ({momentsList.length})
              </Typography>

              {momentsList.length === 0 ? (
                <View style={styles.emptyMomentsWrap}>
                  <Ionicons name="camera-outline" size={44} color={colors.brand.blue} />
                  <Typography variant="body" color={colors.brand.navy} style={{ marginTop: spacing[2], fontWeight: '700' }}>
                    Belum ada kenangan tersimpan
                  </Typography>
                  <Typography variant="caption" color={colors.text.secondary} style={{ textAlign: 'center', marginTop: 4, paddingHorizontal: spacing[4] }}>
                    Gunakan tombol kamera atau galeri di atas untuk mulai mengabadikan momen perjalanan Anda secara offline.
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
                        {m.caption || 'Foto Kenangan Perjalanan'}
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
                        {new Date(m.capturedAt).toLocaleDateString('id-ID', {
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
                Selesai & Tutup Perjalanan
              </Typography>
            </View>
            <Typography variant="body" color={colors.text.secondary} style={styles.closeDesc}>
              Lakukan return check dan arsipkan perjalanan ini. Jika ada barang belum diverifikasi, sistem akan menyimpannya sebagai catatan barang hilang tanpa mengunci penutupan trip.
            </Typography>
            <Button
              label="Tutup & Arsipkan Perjalanan Ini"
              variant="destructive"
              isLoading={isClosingTrip}
              onPress={handleCloseTrip}
            />
          </Card>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingVertical: spacing[3],
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  backText: {
    marginLeft: 6,
    fontWeight: '700',
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
  quickBundlesSection: {
    marginBottom: spacing[4],
  },
  bundleSectionTitle: {
    fontWeight: '700',
    marginBottom: spacing[2],
  },
  bundlesRow: {
    gap: spacing[2],
  },
  bundleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bundleCardTitle: {
    marginLeft: 6,
    fontWeight: '700',
  },
  bundleCountText: {
    marginLeft: 4,
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
});
