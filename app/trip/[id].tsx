import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, Image, ActivityIndicator, Modal, TextInput, Animated, Platform, KeyboardAvoidingView } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { ItemRecord } from '@/db/schema/items';
import { itemRepository } from '@/db/repositories/item.repository';
import { MomentRecord } from '@/db/schema/moments';
import { formatDateRange, formatTripDurationLabel } from '@/core/utils';
import { useUIStore } from '@/stores/ui-store';
import { useActiveInputStore } from '@/stores/active-input-store';
import { useI18n } from '@/core/i18n';
import { PackingIllustration } from '@/components/packing/PackingIllustration';
import { PackingItemRow, ItemBounds } from '@/components/packing/PackingItemRow';
import { usePackingFlight } from '@/components/packing/usePackingFlight';
import { ArchivedTripDetails } from '@/components/trip/ArchivedTripDetails';
import { VisitItemsReview } from '@/components/packing/VisitItemsReview';
import { VisitItemState } from '@/components/packing/ItemStatusPicker';
import { isDropOffItem } from '@/domains/packing/types';
import { getNativeDatabase } from '@/db/client';

type WorkspaceTab = 'roadmap' | 'packing' | 'moments';
type PackingFilter = 'all' | 'unpacked' | 'packed' | 'missing';

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
  const [showDestinationPacking, setShowDestinationPacking] = useState(false);
  const [packingTransitionItemId, setPackingTransitionItemId] = useState<string | null>(null);
  const packingScrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const keyboardHeight = useActiveInputStore((s) => s.keyboardHeight);

  useEffect(() => {
    useActiveInputStore.getState().setActiveScrollRef(packingScrollRef);
    return () => {
      useActiveInputStore.getState().setActiveScrollRef(null);
    };
  }, []);

  const packingSectionY = useRef(0);
  const packingBusy = useRef(false);
  const { bagRef, bagScale, flyToBag, overlay: packingFlightOverlay } = usePackingFlight(() => {
    packingScrollRef.current?.scrollTo({ y: packingSectionY.current, animated: true });
  });
  const [itemToShift, setItemToShift] = useState<TripItemRecord | null>(null);
  const [activeItemMenu, setActiveItemMenu] = useState<TripItemRecord | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<TripItemRecord | null>(null);
  const [itemToMoveGroup, setItemToMoveGroup] = useState<TripItemRecord | null>(null);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Record<string, boolean>>({});
  const [targetDestinationForNewItem, setTargetDestinationForNewItem] = useState<string | null>(null);
  const [visitedStopIds, setVisitedStopIds] = useState<string[]>([]);
  const [visitingModalDest, setVisitingModalDest] = useState<DestinationRecord | null>(null);
  const [visitingItemStates, setVisitingItemStates] = useState<Record<string, VisitItemState>>({});
  const [isSavingVisit, setIsSavingVisit] = useState(false);

  // Inline forms
  const [newDestName, setNewDestName] = useState('');
  const [newDestActivity, setNewDestActivity] = useState('');
  const [newDestTime, setNewDestTime] = useState('09:00');
  const [newDestImageUri, setNewDestImageUri] = useState<string | null>(null);
  const [isAddingDest, setIsAddingDest] = useState(false);
  const [editingDestination, setEditingDestination] = useState<DestinationRecord | null>(null);
  const [inventoryItems, setInventoryItems] = useState<ItemRecord[]>([]);
  const [isInventoryPickerOpen, setIsInventoryPickerOpen] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');

  const [newItemName, setNewItemName] = useState('');
  const [isDropOffMode, setIsDropOffMode] = useState(false);
  const [dropOffTargetDestId, setDropOffTargetDestId] = useState<string | null>(null);
  const [newMomentCaption, setNewMomentCaption] = useState('');
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [momentLocationTag, setMomentLocationTag] = useState<string>('');
  const [momentCoords, setMomentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSavingMoment, setIsSavingMoment] = useState<boolean>(false);

  const loadTripData = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const tripData = await tripRepository.getById(id);
      if (tripData) {
        setTrip(tripData);
        const dests = await destinationRepository.getByTripId(id);
        setDestinations(dests);
        setVisitedStopIds(dests.filter((destination) => destination.isVisited).map((destination) => destination.id));
        setInventoryItems(await itemRepository.getAll());
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

  useFocusEffect(useCallback(() => {
    loadTripData();
  }, [loadTripData]));

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

  const handleToggleVisited = async (dest: DestinationRecord) => {
    if (visitedStopIds.includes(dest.id)) {
      try {
        await destinationRepository.update(dest.id, { isVisited: false });
        setVisitedStopIds((prev) => prev.filter((i) => i !== dest.id));
      } catch {
        Alert.alert(language === 'en' ? 'Error' : 'Gagal', 'Could not update destination status.');
      }
    } else {
      // Opening dialog to check items used at this destination
      setVisitingModalDest(dest);
      setVisitingItemStates({});
    }
  };

  const handleAddDestination = async () => {
    if (!id || !newDestName.trim()) {
      Alert.alert(language === 'en' ? 'Required' : 'Perhatian', t.trip.alertDestRequired);
      return;
    }
    try {
      let savedDestinationImageUri = newDestImageUri;
      if (savedDestinationImageUri && !mediaService.isManagedPhotoUri(savedDestinationImageUri)) {
        const savedPhoto = await mediaService.savePhoto({ sourceUri: savedDestinationImageUri });
        savedDestinationImageUri = savedPhoto.fullUri;
      }
      const destinationData = {
        tripId: id,
        name: newDestName.trim(),
        activity: newDestActivity.trim() || null,
        dayNumber: editingDestination?.dayNumber ?? destinations.length + 1,
        orderIndex: editingDestination?.orderIndex ?? destinations.length,
        plannedTime: newDestTime.trim() || '09:00',
        locationLabel: editingDestination?.locationLabel ?? null,
        latitude: editingDestination?.latitude ?? null,
        longitude: editingDestination?.longitude ?? null,
        imageUri: savedDestinationImageUri,
        notes: editingDestination?.notes ?? null,
        todos: editingDestination?.todos ?? null,
      };
      if (editingDestination) {
        await destinationRepository.update(editingDestination.id, destinationData);
        if (editingDestination.imageUri && editingDestination.imageUri !== savedDestinationImageUri) {
          await mediaService.deletePhotoByUri(editingDestination.imageUri);
        }
      } else {
        await destinationRepository.create(destinationData);
      }
      setNewDestName('');
      setNewDestActivity('');
      setNewDestTime('09:00');
      setNewDestImageUri(null);
      setEditingDestination(null);
      setIsAddingDest(false);
      loadTripData();
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.trip.alertDestAddError);
    }
  };

  const handleEditDestination = (destination: DestinationRecord) => {
    setEditingDestination(destination);
    setNewDestName(destination.name);
    setNewDestActivity(destination.activity || '');
    setNewDestTime(destination.plannedTime || '09:00');
    setNewDestImageUri(destination.imageUri || null);
    setIsAddingDest(true);
  };

  const handleDeleteDestination = (destination: DestinationRecord) => {
    Alert.alert(
      language === 'en' ? 'Delete destination?' : 'Hapus destinasi?',
      language === 'en'
        ? `Items mapped to ${destination.name} will return to the Starter Pack.`
        : `Barang yang dipetakan ke ${destination.name} akan dipindahkan ke Starter Pack.`,
      [
        { text: t.trip.cancel, style: 'cancel' },
        { text: t.trip.delete, style: 'destructive', onPress: async () => {
          try {
            await destinationRepository.delete(destination.id);
            if (destination.imageUri) await mediaService.deletePhotoByUri(destination.imageUri);
            setVisitedStopIds((prev) => prev.filter((stopId) => stopId !== destination.id));
            const remaining = await destinationRepository.getByTripId(id!);
            await destinationRepository.reorderForTrip(id!, remaining.map((entry) => entry.id));
            await loadTripData();
          } catch {
            Alert.alert(language === 'en' ? 'Error' : 'Gagal', 'Could not delete destination.');
          }
        } },
      ]
    );
  };

  const handleMoveDestination = async (destination: DestinationRecord, direction: -1 | 1) => {
    if (!id) return;
    const currentIndex = destinations.findIndex((entry) => entry.id === destination.id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= destinations.length) return;
    const reordered = [...destinations];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
    setDestinations(reordered.map((entry, index) => ({ ...entry, orderIndex: index })));
    try {
      await destinationRepository.reorderForTrip(id, reordered.map((entry) => entry.id));
      await loadTripData();
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', 'Could not reorder destinations.');
      loadTripData();
    }
  };

  const handleToggleDestinationTodo = async (destinationId: string, todoId: string) => {
    const dest = destinations.find((d) => d.id === destinationId);
    if (!dest || !dest.todos) return;
    try {
      const list: { id: string; text: string; completed: boolean }[] = JSON.parse(dest.todos);
      const updated = list.map((td) => (td.id === todoId ? { ...td, completed: !td.completed } : td));
      const jsonStr = JSON.stringify(updated);
      setDestinations((prev) =>
        prev.map((d) => (d.id === destinationId ? { ...d, todos: jsonStr } : d))
      );
      await destinationRepository.update(destinationId, { todos: jsonStr });
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', 'Could not update to-do.');
    }
  };

  const openInventoryPicker = async (destinationId: string | null) => {
    setTargetDestinationForNewItem(destinationId);
    setInventorySearch('');
    try {
      setInventoryItems(await itemRepository.getAll());
      setIsInventoryPickerOpen(true);
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', 'Could not load inventory.');
    }
  };

  const handleAddInventoryItem = async (inventoryItem: ItemRecord) => {
    if (!id) return;

    if (inventoryItem.isGroup === 1) {
      // Menambahkan 1 paket group beserta child items 1, 2, 3 dst.
      const childItems = inventoryItems.filter((c) => c.parentId === inventoryItem.id);
      try {
        const parentTripItem = await packingRepository.addTripItem({
          tripId: id,
          itemId: inventoryItem.id,
          customName: inventoryItem.name,
          category: inventoryItem.category,
          plannedDestinationId: targetDestinationForNewItem,
          state: 'planned',
          priority: 'must_have',
          quantity: 1,
          isGroup: 1,
          parentId: null,
          notes: inventoryItem.notes,
        });

        for (const child of childItems) {
          await packingRepository.addTripItem({
            tripId: id,
            itemId: child.id,
            customName: child.name,
            category: child.category,
            plannedDestinationId: targetDestinationForNewItem,
            state: 'planned',
            priority: 'must_have',
            quantity: child.quantity,
            isGroup: 0,
            parentId: parentTripItem.id,
            notes: child.notes,
          });
        }
        setIsInventoryPickerOpen(false);
        await loadTripData();
      } catch {
        Alert.alert(language === 'en' ? 'Error' : 'Gagal', 'Could not add group package.');
      }
      return;
    }

    const duplicate = items.some((entry) =>
      entry.itemId === inventoryItem.id && entry.plannedDestinationId === targetDestinationForNewItem
    );
    if (duplicate) {
      Alert.alert(
        language === 'en' ? 'Already added' : 'Sudah ditambahkan',
        language === 'en' ? 'This inventory item is already in this packing section.' : 'Barang inventaris ini sudah ada di bagian packing tersebut.'
      );
      return;
    }
    try {
      await packingRepository.addTripItem({
        tripId: id,
        itemId: inventoryItem.id,
        customName: inventoryItem.name,
        category: inventoryItem.category,
        plannedDestinationId: targetDestinationForNewItem,
        state: 'planned',
        priority: 'must_have',
        quantity: inventoryItem.quantity,
        isGroup: 0,
        parentId: null,
        notes: inventoryItem.notes,
      });
      setIsInventoryPickerOpen(false);
      await loadTripData();
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', 'Could not add item from inventory.');
    }
  };

  const handleToggleGroupPack = async (group: TripItemRecord, packAll: boolean) => {
    try {
      await packingRepository.updateGroupState(group.id, packAll ? 'packed' : 'planned');
      await loadTripData();
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', 'Could not update group items.');
    }
  };

  const renderItemRowsWithGroups = (itemList: TripItemRecord[]) => {
    const tripGroups = items.filter((it) => it.isGroup === 1);
    const standaloneItems = itemList.filter((it) => it.isGroup !== 1 && !it.parentId);

    const activeGroups = tripGroups.map((group) => {
      const allGroupChildren = items.filter((it) => it.parentId === group.id);
      const visibleChildren = itemList.filter((it) => it.parentId === group.id);
      return {
        group,
        allChildren: allGroupChildren,
        visibleChildren,
      };
    }).filter(({ visibleChildren }) => {
      if (packingFilter === 'all') return true;
      return visibleChildren.length > 0;
    });

    if (activeGroups.length === 0 && standaloneItems.length === 0) {
      return (
        <View style={styles.emptyItemsBox}>
          <Typography variant="caption" color={colors.text.muted}>
            {language === 'en' ? 'No items in this view. Add only what you want to bring.' : 'Tidak ada barang di tampilan ini. Tambahkan hanya barang yang ingin dibawa.'}
          </Typography>
        </View>
      );
    }

    return (
      <View>
        {activeGroups.map(({ group, allChildren, visibleChildren }) => {
          const packedCount = allChildren.filter((c) => ['packed', 'available', 'returned', 'used'].includes(c.state)).length;
          const allPacked = allChildren.length > 0 && packedCount === allChildren.length;
          const isCollapsed = !!collapsedGroupIds[group.id];

          return (
            <View
              key={group.id}
              style={[
                styles.groupContainer,
                {
                  backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC',
                  borderColor: isDarkMode ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.groupHeaderRow}>
                <Pressable
                  style={styles.groupCollapseBtn}
                  onPress={() => setCollapsedGroupIds((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={isCollapsed ? t.destDetail.expandGroup : t.destDetail.minimizeGroup}
                >
                  <Ionicons
                    name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
                    size={18}
                    color={colors.text.secondary}
                  />
                </Pressable>

                <View
                  style={[
                    styles.groupIconCircle,
                    { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.2)' : '#E0F2FE' },
                  ]}
                >
                  <Ionicons name="cube" size={17} color={colors.brand.blue} />
                </View>

                <Pressable
                  style={{ flex: 1, marginRight: 8 }}
                  onPress={() => setCollapsedGroupIds((prev) => ({ ...prev, [group.id]: !prev[group.id] }))}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Typography variant="body" color={colors.brand.navy} style={{ fontWeight: '700' }}>
                      {group.customName}
                    </Typography>
                    <Badge label="PAKET" variant="accent" size="sm" />
                  </View>
                  <Typography variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>
                    {allChildren.length > 0
                      ? `${packedCount}/${allChildren.length} ${language === 'en' ? 'Packed' : 'Dikemas'}`
                      : group.category}
                    {isCollapsed ? ` · (${language === 'en' ? 'Minimized' : 'Diciutkan'})` : ''}
                  </Typography>
                </Pressable>

                {allChildren.length > 0 && (
                  <Pressable
                    style={[
                      styles.groupBatchBtn,
                      {
                        backgroundColor: allPacked
                          ? (isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#DCFCE7')
                          : colors.brand.blue,
                      },
                    ]}
                    onPress={() => handleToggleGroupPack(group, !allPacked)}
                  >
                    <Ionicons
                      name={allPacked ? 'checkmark-circle' : 'bag-check-outline'}
                      size={13}
                      color={allPacked ? '#10B981' : '#FFFFFF'}
                    />
                    <Typography
                      variant="caption"
                      color={allPacked ? '#10B981' : '#FFFFFF'}
                      style={{ fontWeight: '700', marginLeft: 4, fontSize: 11 }}
                    >
                      {allPacked
                        ? (language === 'en' ? 'Unpack All' : 'Keluarkan')
                        : (language === 'en' ? 'Pack All' : 'Kemas Semua')}
                    </Typography>
                  </Pressable>
                )}

                <Pressable
                  style={styles.groupMenuBtn}
                  onPress={() => setActiveItemMenu(group)}
                  hitSlop={8}
                >
                  <Ionicons name="ellipsis-vertical" size={16} color={colors.text.muted} />
                </Pressable>
              </View>

              {!isCollapsed && (
                <View style={styles.groupChildrenList}>
                  {visibleChildren.map((childItem) => (
                    <View key={childItem.id} style={styles.groupChildRowWrapper}>
                      <View style={[styles.childIndentGuide, { borderColor: isDarkMode ? '#475569' : '#CBD5E1' }]} />
                      <View style={{ flex: 1 }}>
                        <PackingItemRow
                          item={childItem}
                          imageUri={getPackingItemImage(childItem)}
                          destinationName={destinations.find((destination) => destination.id === childItem.plannedDestinationId)?.name}
                          busy={packingTransitionItemId !== null}
                          onPack={(bounds) => handleTogglePack(childItem, bounds)}
                          onMenu={() => setActiveItemMenu(childItem)}
                          onPress={() => setSelectedDetailItem(childItem)}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {standaloneItems.map((item) => (
          <PackingItemRow
            key={item.id}
            item={item}
            imageUri={getPackingItemImage(item)}
            destinationName={destinations.find((destination) => destination.id === item.plannedDestinationId)?.name}
            busy={packingTransitionItemId !== null}
            onPack={(bounds) => handleTogglePack(item, bounds)}
            onMenu={() => setActiveItemMenu(item)}
            onPress={() => setSelectedDetailItem(item)}
          />
        ))}
      </View>
    );
  };

  const handleAddTripItem = async () => {
    if (!id || !newItemName.trim()) return;
    try {
      await packingRepository.addTripItem({
        tripId: id,
        itemId: null,
        customName: newItemName.trim(),
        category: isDropOffMode ? 'Drop Off' : 'Gear & Activities',
        plannedDestinationId: isDropOffMode ? (dropOffTargetDestId || destinations[0]?.id || null) : null,
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

  const getPackingItemImage = (item: TripItemRecord) =>
    inventoryItems.find((entry) => entry.id === item.itemId)?.imageUri;

  const handleTogglePack = async (item: TripItemRecord, bounds?: ItemBounds) => {
    if (packingBusy.current) return;
    packingBusy.current = true;
    setPackingTransitionItemId(item.id);
    try {
      const nextState = ['packed', 'available', 'returned'].includes(item.state) ? 'planned' : 'packed';
      if (nextState === 'packed') await flyToBag(bounds, getPackingItemImage(item));
      await packingRepository.updateItemState(item.id, nextState);
      await loadTripData();
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.trip.alertItemUpdateError);
    } finally {
      packingBusy.current = false;
      setPackingTransitionItemId(null);
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
      packingScrollRef.current?.scrollTo({ y: 380, animated: true });
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

  if (trip.status === 'completed') return <ArchivedTripDetails tripId={trip.id} />;

  // Readiness computation
  const readiness = packingService.computeReadiness(items as any, language);
  const readinessPercent = readiness.totalItems > 0
    ? Math.round((readiness.packedCount / readiness.totalItems) * 100)
    : 0;

  const filteredItems = items.filter((item) => {
    if (packingFilter === 'all') return true;
    if (packingFilter === 'packed') return item.state !== 'planned' && item.state !== 'missing';
    if (packingFilter === 'unpacked') return item.state === 'planned';
    if (packingFilter === 'missing') return item.state === 'missing';
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
  const isCompleted = false;

  return (
    <ScreenContainer edges={['left', 'right']}>
      <ScrollView
        ref={packingScrollRef}
        scrollEnabled={packingTransitionItemId === null}
        contentContainerStyle={[
          styles.scrollContent,
          keyboardHeight > 0 && { paddingBottom: keyboardHeight + 240 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios' ? false : true}
        onScroll={(e) => useActiveInputStore.getState().setActiveScrollY(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
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
              tripStartDate={trip.startDate}
              visitedIds={visitedStopIds}
              onToggleVisited={handleToggleVisited}
              onEditDestination={handleEditDestination}
              onDeleteDestination={handleDeleteDestination}
              onMoveDestination={handleMoveDestination}
              onToggleTodo={handleToggleDestinationTodo}
              onAddStopPress={() => setIsAddingDest(true)}
            />

            {/* Form Tambah Destinasi */}
            {isAddingDest ? (
              <Card style={styles.addFormCard}>
                <View style={styles.formHeader}>
                  <Typography variant="h3" color={colors.brand.navy}>
                    {editingDestination
                      ? (language === 'en' ? 'Edit Destination' : 'Edit Destinasi')
                      : t.trip.addStopHeading}
                  </Typography>
                  <Pressable onPress={() => { setIsAddingDest(false); setEditingDestination(null); }}>
                    <Ionicons name="close-circle-outline" size={22} color={colors.text.muted} />
                  </Pressable>
                </View>

                {/* Quick Destination Chips */}
                <Typography variant="caption" color={colors.text.secondary} style={styles.quickChipLabel}>
                  {t.trip.quickPickLabel}
                </Typography>
                <View style={styles.quickChipsRow}>
                  {!editingDestination && quickDestSuggestions.map((sug) => (
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
                      quality: 0.2, // Ukuran paling rendah
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
                    onPress={() => { setIsAddingDest(false); setEditingDestination(null); }}
                  />
                  <Button
                    label={editingDestination
                      ? (language === 'en' ? 'Save Changes' : 'Simpan Perubahan')
                      : t.trip.saveStopBtn}
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
          <View style={styles.tabContent} onLayout={(event) => { packingSectionY.current = event.nativeEvent.layout.y; }}>
            <Animated.View style={{ transform: [{ scale: bagScale }] }}><PackingIllustration
              mode={packingFilter === 'missing' ? 'missing' : packingFilter === 'all' ? 'all' : packingFilter === 'packed' ? 'packed' : 'preparing'}
              title={packingFilter === 'missing' ? (language === 'en' ? 'Missing items' : 'Barang hilang') : packingFilter === 'all'
                ? (language === 'en' ? 'Packing overview' : 'Ringkasan packing')
                : packingFilter === 'packed'
                ? (language === 'en' ? 'Packed and ready' : 'Sudah masuk tas')
                : (language === 'en' ? 'Need packing' : 'Perlu disiapkan')}
              caption={packingFilter === 'missing' ? (language === 'en' ? 'If you find an item, return it to the bag. Losses remain in the trip history.' : 'Jika barang ditemukan, kembalikan ke tas. Kejadian hilang tetap tercatat di riwayat trip.') : packingFilter === 'all'
                ? (language === 'en'
                  ? `${readiness.packedCount} of ${readiness.totalItems} items packed. Review everything for your trip.`
                  : `${readiness.packedCount} dari ${readiness.totalItems} barang sudah masuk tas. Lihat semua kebutuhan perjalananmu.`)
                : packingFilter === 'packed'
                ? (language === 'en'
                  ? 'Your items are tucked safely in the bag.'
                  : 'Barang sudah tersimpan aman di dalam tas.')
                : (language === 'en'
                  ? 'Tap the bag button to send each item into your luggage.'
                  : 'Ketuk tombol tas untuk memasukkan barang ke bagasi.')}
              bagRef={bagRef}
            /></Animated.View>

            {/* Filter Chips */}
            <View style={styles.filterChipsRow}>
              {(
                [
                  { key: 'all', label: format(t.trip.filterAll, { count: items.length }) },
                  { key: 'unpacked', label: format(t.trip.filterUnpacked, { count: items.filter((item) => item.state === 'planned').length }) },
                  { key: 'packed', label: format(t.trip.filterPacked, { count: readiness.packedCount }) },
                  ...(items.some((item) => item.state === 'missing') ? [{ key: 'missing' as const, label: `${language === 'en' ? 'Missing' : 'Hilang'} (${items.filter((item) => item.state === 'missing').length})` }] : []),
                ] as const
              ).map((chip) => (
                <Pressable
                  key={chip.key}
                  disabled={packingTransitionItemId !== null}
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
              <Card style={styles.itemsListCard}>
                <View style={styles.subTabHeaderRow}>
                  <View style={{ flex: 1, paddingRight: spacing[2] }}>
                    <Typography variant="h3" color={colors.brand.navy}>
                      {t.packWorkspace.packingListTitle}
                    </Typography>
                    <Typography variant="caption" color={colors.text.muted}>
                      {t.packWorkspace.packingListSubtitle}
                    </Typography>
                  </View>
                  <Badge
                    label={`${filteredItems.length} Items`}
                    variant="neutral"
                    size="sm"
                  />
                </View>

                {renderItemRowsWithGroups(filteredItems)}

                {/* Add item inline with Drop Off Mode toggle */}
                <View style={styles.addItemBox}>
                  <View style={styles.itemModeToggleRow}>
                    <Pressable
                      onPress={() => setIsDropOffMode(false)}
                      style={[
                        styles.itemModePill,
                        !isDropOffMode && styles.itemModePillActive,
                      ]}
                    >
                      <Ionicons
                        name="bag-handle-outline"
                        size={14}
                        color={!isDropOffMode ? '#FFFFFF' : colors.text.secondary}
                      />
                      <Typography
                        variant="caption"
                        color={!isDropOffMode ? '#FFFFFF' : colors.text.secondary}
                        style={{ fontWeight: '700', marginLeft: 4 }}
                      >
                        {language === 'en' ? 'Standard Item' : 'Bawaan Standar'}
                      </Typography>
                    </Pressable>

                    <Pressable
                      onPress={() => setIsDropOffMode(true)}
                      style={[
                        styles.itemModePill,
                        isDropOffMode && [styles.itemModePillActive, { backgroundColor: '#EA580C', borderColor: '#EA580C' }],
                      ]}
                    >
                      <Ionicons
                        name="gift"
                        size={14}
                        color={isDropOffMode ? '#FFFFFF' : '#EA580C'}
                      />
                      <Typography
                        variant="caption"
                        color={isDropOffMode ? '#FFFFFF' : '#EA580C'}
                        style={{ fontWeight: '700', marginLeft: 4 }}
                      >
                        {language === 'en' ? 'Drop Off Item' : 'Item Drop Off'}
                      </Typography>
                    </Pressable>
                  </View>

                  {isDropOffMode && (
                    <View style={styles.dropOffNoticeBox}>
                      <Ionicons name="information-circle" size={16} color="#EA580C" style={{ marginRight: 6 }} />
                      <Typography variant="caption" color="#9A3412" style={{ flex: 1, fontSize: 11, lineHeight: 15 }}>
                        {language === 'en'
                          ? 'Drop off item is single-use for this trip (souvenirs, snacks). It won’t enter master inventory and is recorded in the album.'
                          : 'Item drop off sekali pakai untuk trip ini (oleh-oleh, snack). Tidak masuk inventaris master dan dicatat di album.'}
                      </Typography>
                    </View>
                  )}

                  {isDropOffMode && destinations.length > 0 && (
                    <View style={styles.dropDestSelector}>
                      <Typography variant="caption" color={colors.text.secondary} style={{ fontWeight: '700', marginBottom: 6 }}>
                        {language === 'en' ? 'Drop off at destination:' : 'Drop di destinasi tujuan:'}
                      </Typography>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                        {destinations.map((d, dIdx) => {
                          const isChosen = (dropOffTargetDestId || destinations[0]?.id) === d.id;
                          return (
                            <Pressable
                              key={d.id}
                              onPress={() => setDropOffTargetDestId(d.id)}
                              style={[
                                styles.dropDestChip,
                                isChosen && { backgroundColor: '#EA580C', borderColor: '#EA580C' },
                              ]}
                            >
                              <Typography
                                variant="caption"
                                color={isChosen ? '#FFFFFF' : colors.text.primary}
                                style={{ fontWeight: isChosen ? '700' : '400', fontSize: 11 }}
                              >
                                #{dIdx + 1} {d.name}
                              </Typography>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}

                  <Input
                    label={isDropOffMode
                      ? (language === 'en' ? 'Drop Off Item Name' : 'Nama Item Drop Off / Oleh-oleh')
                      : t.trip.manualAddTitle}
                    placeholder={isDropOffMode
                      ? (language === 'en' ? 'e.g., Souvenirs for family, road snacks...' : 'Misal: Oleh-oleh Bakpia, Snack Perjalanan, Titipan...')
                      : t.trip.manualAddPlaceholder}
                    value={newItemName}
                    onChangeText={setNewItemName}
                  />

                  <Button
                    label={isDropOffMode
                      ? (language === 'en' ? '+ Add Drop Off Item' : '+ Simpan Item Drop Off')
                      : (language === 'en' ? '+ Add to Packing List' : '+ Tambah ke Daftar Packing')}
                    variant="primary"
                    size="sm"
                    onPress={handleAddTripItem}
                    style={[styles.saveItemBtn, isDropOffMode && { backgroundColor: '#EA580C' }]}
                  />
                </View>
                {!isDropOffMode && (
                  <Button
                    label={language === 'en' ? '+ Add from Inventory' : '+ Tambah dari Inventaris'}
                    variant="secondary"
                    size="sm"
                    onPress={() => openInventoryPicker(null)}
                    style={{ marginTop: spacing[2] }}
                  />
                )}
              </Card>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showDestinationPacking }}
                onPress={() => setShowDestinationPacking((visible) => !visible)}
                style={[styles.optionalPackingHeader, { borderColor: themeColors.border.default }]}
              >
                <View style={{ flex: 1 }}>
                  <Typography variant="label" color={themeColors.brand.navy}>{t.packWorkspace.destinationPlanTitle}</Typography>
                  <Typography variant="caption" color={themeColors.text.muted} style={{ marginTop: 3 }}>{t.packWorkspace.destinationPlanSubtitle}</Typography>
                </View>
                <Badge label={t.packWorkspace.optionalBadge} variant="neutral" size="sm" />
                <Ionicons name={showDestinationPacking ? 'chevron-up' : 'chevron-down'} size={17} color={themeColors.text.muted} />
              </Pressable>
              {showDestinationPacking && (
              <View style={styles.destPackList}>
                {destinations.length === 0 ? (
                  <Card style={styles.emptyItemsBox}>
                    <Typography variant="body" color={colors.text.muted}>
                      {language === 'en'
                        ? 'You can pack without stops. Add stop-specific plans only when useful.'
                        : 'Kamu bisa packing tanpa destinasi. Rencanakan pemakaian per destinasi hanya jika diperlukan.'}
                    </Typography>
                  </Card>
                ) : (
                  destinations.map((dest, index) => {
                    const destItems = filteredItems.filter((i) => i.plannedDestinationId === dest.id);
                    return (
                      <Card key={dest.id} style={styles.destGroupCard}>
                        {/* Destination Group Header */}
                        <View style={styles.destGroupHeader}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Badge label={`#${index + 1}`} variant="accent" size="sm" />
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
                          {renderItemRowsWithGroups(destItems)}
                        </View>
                        <Button
                          label={language === 'en' ? '+ Add from Inventory' : '+ Tambah dari Inventaris'}
                          variant="secondary"
                          size="sm"
                          onPress={() => openInventoryPicker(dest.id)}
                          style={{ marginTop: spacing[2] }}
                        />
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
                  <View style={styles.capturedPhotoContainer}>
                    <View style={styles.photoPreviewWrapper}>
                      <Image source={{ uri: selectedPhotoUri }} style={styles.photoPreviewImage} />
                      <Pressable
                        style={styles.removePhotoBadge}
                        onPress={() => setSelectedPhotoUri(null)}
                      >
                        <Ionicons name="close-circle" size={26} color={colors.status.error} />
                      </Pressable>
                    </View>

                    {/* Quick photo actions */}
                    <View style={styles.capturedActionsRow}>
                      <Pressable
                        style={[styles.photoActionSubBtn, { backgroundColor: colors.surface.page, borderColor: colors.border.default }]}
                        onPress={handleTakePhoto}
                      >
                        <Ionicons name="camera-outline" size={15} color={colors.brand.blue} />
                        <Typography variant="caption" color={colors.brand.blue} style={{ fontWeight: '700', marginLeft: 4 }}>
                          {language === 'en' ? 'Retake' : 'Foto Ulang'}
                        </Typography>
                      </Pressable>

                      <Pressable
                        style={[styles.photoActionSubBtn, { backgroundColor: colors.surface.page, borderColor: colors.border.default }]}
                        onPress={handlePickGallery}
                      >
                        <Ionicons name="images-outline" size={15} color={colors.brand.coral} />
                        <Typography variant="caption" color={colors.brand.coral} style={{ fontWeight: '700', marginLeft: 4 }}>
                          {language === 'en' ? 'Gallery' : 'Galeri'}
                        </Typography>
                      </Pressable>

                      <Pressable
                        style={[styles.photoActionSubBtn, { backgroundColor: colors.surface.page, borderColor: colors.border.default }]}
                        onPress={() => setSelectedPhotoUri(null)}
                      >
                        <Ionicons name="trash-outline" size={15} color={colors.status.error} />
                        <Typography variant="caption" color={colors.status.error} style={{ fontWeight: '700', marginLeft: 4 }}>
                          {language === 'en' ? 'Remove' : 'Hapus Foto'}
                        </Typography>
                      </Pressable>
                    </View>
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

                {/* Caption Input - Always Visible */}
                <Input
                  label={t.trip.captionLabel}
                  placeholder={t.trip.captionPlaceholder}
                  value={newMomentCaption}
                  onChangeText={setNewMomentCaption}
                  style={{ marginTop: spacing[2] }}
                />

                {/* Location Tag Row - Always Visible */}
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

      </ScrollView>
      {activeTab === 'roadmap' ? (
        <SafeAreaView edges={['bottom']} style={[styles.endTripFooter, { backgroundColor: themeColors.surface.page, borderTopColor: themeColors.border.default }]}>
          {isCompleted && (
            <Typography variant="caption" color={themeColors.text.muted} style={styles.closedTripHint}>
              {language === 'en' ? 'This trip is already closed.' : 'Perjalanan ini sudah ditutup.'}
            </Typography>
          )}
          <Button
            label={language === 'en' ? 'End Trip' : 'Akhiri Perjalanan'}
            variant="destructive"
            size="md"
            onPress={handleCloseTrip}
            disabled={isCompleted}
          />
        </SafeAreaView>
      ) : activeTab === 'moments' ? (
        <SafeAreaView edges={['bottom']} style={[styles.endTripFooter, { backgroundColor: themeColors.surface.page, borderTopColor: themeColors.border.default }]}>
          <Button
            label={
              isSavingMoment
                ? (language === 'en' ? 'Saving Moment…' : 'Menyimpan Momen…')
                : (language === 'en' ? '💾 Save Moment' : '💾 Simpan Momen')
            }
            variant="primary"
            size="md"
            onPress={handleAddMoment}
            disabled={isSavingMoment}
          />
        </SafeAreaView>
      ) : null}
      {packingFlightOverlay}

      <Modal
        transparent
        animationType="slide"
        visible={isInventoryPickerOpen}
        onRequestClose={() => setIsInventoryPickerOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.inventoryPickerCard, { backgroundColor: colors.surface.card }]}>
            <View style={styles.modalHeader}>
              <Typography variant="h3" color={colors.brand.navy}>
                {language === 'en' ? 'Add from Inventory' : 'Tambah dari Inventaris'}
              </Typography>
              <Pressable onPress={() => setIsInventoryPickerOpen(false)}>
                <Ionicons name="close-circle-outline" size={24} color={colors.text.muted} />
              </Pressable>
            </View>
            <TextInput
              value={inventorySearch}
              onChangeText={setInventorySearch}
              placeholder={language === 'en' ? 'Search inventory' : 'Cari barang inventaris'}
              placeholderTextColor={colors.text.muted}
              style={[styles.inventorySearch, { backgroundColor: colors.surface.page, color: colors.text.primary, borderColor: colors.border.default }]}
              returnKeyType="search"
            />
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 380 }}>
              {inventoryItems
                .filter((entry) => entry.name.toLocaleLowerCase().includes(inventorySearch.trim().toLocaleLowerCase()))
                .map((entry) => {
                  const isGroup = entry.isGroup === 1;
                  const childCount = inventoryItems.filter((c) => c.parentId === entry.id).length;
                  const parentGroup = entry.parentId ? inventoryItems.find((p) => p.id === entry.parentId) : null;

                  return (
                    <Pressable
                      key={entry.id}
                      onPress={() => handleAddInventoryItem(entry)}
                      style={[
                        styles.inventoryPickerRow,
                        { borderBottomColor: colors.border.muted },
                        isGroup && { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.1)' : '#F0F9FF' },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Typography variant="label" color={colors.text.primary}>{entry.name}</Typography>
                          {isGroup && (
                            <Badge label={`PAKET (${childCount} item)`} variant="accent" size="sm" />
                          )}
                        </View>
                        <Typography variant="caption" color={colors.text.muted}>
                          {isGroup
                            ? (language === 'en' ? `${childCount} bundled items` : `${childCount} barang dalam paket`)
                            : parentGroup
                            ? `↳ ${parentGroup.name}`
                            : `${entry.category} · ${language === 'en' ? 'Qty' : 'Jumlah'}: ${entry.quantity}`}
                        </Typography>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        {isGroup && (
                          <Typography variant="caption" color={colors.brand.coral} style={{ fontWeight: '700' }}>
                            {language === 'en' ? '+ Add Bundle' : '+ Tambah Paket'}
                          </Typography>
                        )}
                        <Ionicons name="add-circle" size={23} color={colors.brand.coral} />
                      </View>
                    </Pressable>
                  );
                })}
              {inventoryItems.filter((entry) => entry.name.toLocaleLowerCase().includes(inventorySearch.trim().toLocaleLowerCase())).length === 0 && (
                <Typography variant="body" color={colors.text.muted} style={{ paddingVertical: spacing[4], textAlign: 'center' }}>
                  {language === 'en' ? 'No inventory items found.' : 'Barang tidak ditemukan di inventaris.'}
                </Typography>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
                {destinations.map((d, index) => (
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
                      {t.destDetail.moveToStopPrefix}#{index + 1} - {d.name}
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
                {/* 0. View Full Details */}
                <Pressable
                  style={({ pressed }) => [
                    styles.sheetActionItem,
                    { backgroundColor: colors.surface.page },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => {
                    const item = activeItemMenu;
                    setActiveItemMenu(null);
                    setSelectedDetailItem(item);
                  }}
                >
                  <View style={[styles.actionIconBox, { backgroundColor: `${colors.brand.navy}15` }]}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.brand.navy} />
                  </View>
                  <View style={styles.actionTextBox}>
                    <Typography variant="label" color={colors.brand.navy}>
                      {t.destDetail.actionViewDetail}
                    </Typography>
                    <Typography variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>
                      {t.destDetail.actionViewDetailDesc}
                    </Typography>
                  </View>
                </Pressable>

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

                {/* Move to Group / Container */}
                {activeItemMenu.isGroup !== 1 && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.sheetActionItem,
                      { backgroundColor: colors.surface.page },
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => {
                      const item = activeItemMenu;
                      setActiveItemMenu(null);
                      setItemToMoveGroup(item);
                    }}
                  >
                    <View style={[styles.actionIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                      <Ionicons name="cube" size={20} color={colors.brand.blue} />
                    </View>
                    <View style={styles.actionTextBox}>
                      <Typography variant="label" color={colors.brand.navy}>
                        {t.destDetail.actionShiftGroup}
                      </Typography>
                      <Typography variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>
                        {t.destDetail.actionShiftGroupDesc}
                      </Typography>
                    </View>
                  </Pressable>
                )}

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

                {/* Opsi Item Hilang / Ditemukan */}
                <Pressable
                  style={({ pressed }) => [
                    styles.sheetActionItem,
                    { backgroundColor: colors.surface.page },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => {
                    const item = activeItemMenu;
                    const isMissing = item.state === 'missing';
                    handleUpdateItemState(item, isMissing ? 'packed' : 'missing');
                    setActiveItemMenu(null);
                  }}
                >
                  <View
                    style={[
                      styles.actionIconBox,
                      {
                        backgroundColor:
                          activeItemMenu.state === 'missing'
                            ? `${colors.status.success}15`
                            : 'rgba(239, 68, 68, 0.15)',
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        activeItemMenu.state === 'missing'
                          ? 'checkmark-circle-outline'
                          : 'help-circle-outline'
                      }
                      size={20}
                      color={
                        activeItemMenu.state === 'missing'
                          ? colors.status.success
                          : colors.status.error
                      }
                    />
                  </View>
                  <View style={styles.actionTextBox}>
                    <Typography
                      variant="label"
                      color={
                        activeItemMenu.state === 'missing'
                          ? colors.status.success
                          : colors.status.error
                      }
                    >
                      {activeItemMenu.state === 'missing'
                        ? (language === 'en' ? 'Item Found (Restore)' : 'Barang Ditemukan (Batal Hilang)')
                        : (language === 'en' ? 'Item Hilang' : 'Item Hilang')}
                    </Typography>
                    <Typography variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>
                      {activeItemMenu.state === 'missing'
                        ? (language === 'en'
                            ? 'Restore item status back into bag'
                            : 'Kembalikan status barang menjadi ada dalam tas')
                        : (language === 'en'
                            ? 'Mark this item as lost during the trip'
                            : 'Catat barang ini sebagai hilang selama perjalanan')}
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

      {/* MODAL: Trip Item Detail Modal */}
      {selectedDetailItem && (
        <Modal
          transparent
          animationType="fade"
          visible={!!selectedDetailItem}
          onRequestClose={() => setSelectedDetailItem(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setSelectedDetailItem(null)}>
            <Pressable
              style={[
                styles.detailModalCard,
                { backgroundColor: themeColors.surface.card },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <View style={styles.detailHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Typography variant="h3" color={colors.brand.navy} style={{ fontWeight: '700' }}>
                    {selectedDetailItem.isGroup === 1
                      ? (language === 'en' ? 'Package Container Details' : 'Detail Paket Kontainer')
                      : t.destDetail.itemDetailTitle}
                  </Typography>
                </View>
                <Pressable onPress={() => setSelectedDetailItem(null)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.text.muted} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {/* Photo or Icon */}
                <View style={styles.detailImageContainer}>
                  {getPackingItemImage(selectedDetailItem) ? (
                    <Image
                      source={{ uri: getPackingItemImage(selectedDetailItem)! }}
                      style={styles.detailItemImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.detailIconCircle,
                        {
                          backgroundColor: selectedDetailItem.isGroup === 1
                            ? (isDarkMode ? 'rgba(56, 189, 248, 0.2)' : '#E0F2FE')
                            : isDropOffItem(selectedDetailItem)
                            ? (isDarkMode ? '#451A03' : '#FEF3C7')
                            : (isDarkMode ? colors.surface.muted : '#F0F4F8'),
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          selectedDetailItem.isGroup === 1
                            ? 'cube'
                            : isDropOffItem(selectedDetailItem)
                            ? 'gift'
                            : 'cube-outline'
                        }
                        size={36}
                        color={
                          selectedDetailItem.isGroup === 1
                            ? colors.brand.blue
                            : isDropOffItem(selectedDetailItem)
                            ? '#EA580C'
                            : colors.brand.navy
                        }
                      />
                    </View>
                  )}
                </View>

                {/* Name */}
                <Typography variant="h2" color={colors.brand.navy} style={styles.detailItemName}>
                  {selectedDetailItem.customName}
                </Typography>

                {/* Badges */}
                <View style={styles.detailBadgesRow}>
                  {selectedDetailItem.isGroup === 1 ? (
                    <Badge label="PAKET CONTAINER" variant="accent" size="md" />
                  ) : (
                    <Badge
                      label={
                        selectedDetailItem.state === 'packed'
                          ? (language === 'en' ? 'Packed in Bag' : 'Sudah Dalam Tas')
                          : selectedDetailItem.state === 'used'
                          ? (isDropOffItem(selectedDetailItem) ? 'Dropped Off ✓' : (language === 'en' ? 'Used' : 'Terpakai'))
                          : selectedDetailItem.state === 'missing'
                          ? (language === 'en' ? 'Missing' : 'Hilang')
                          : (language === 'en' ? 'Need Packing' : 'Perlu Dikemas')
                      }
                      variant={
                        selectedDetailItem.state === 'packed'
                          ? 'accent'
                          : selectedDetailItem.state === 'used'
                          ? 'neutral'
                          : selectedDetailItem.state === 'missing'
                          ? 'error'
                          : 'neutral'
                      }
                      size="md"
                    />
                  )}

                  <Badge label={selectedDetailItem.category} variant="neutral" size="md" />
                  <Badge label={`${language === 'en' ? 'Qty' : 'Jumlah'}: ${selectedDetailItem.quantity}`} variant="neutral" size="md" />

                  {isDropOffItem(selectedDetailItem) && (
                    <Badge label="DROP OFF" variant="accent" size="md" />
                  )}
                </View>

                {/* Destination info */}
                {selectedDetailItem.plannedDestinationId && (
                  <View
                    style={[
                      styles.detailMappingBox,
                      { backgroundColor: isDarkMode ? colors.surface.muted : '#F8FAFC', borderColor: colors.border.default },
                    ]}
                  >
                    <Typography variant="caption" color={colors.text.muted} style={{ fontWeight: '700', marginBottom: 4 }}>
                      {language === 'en' ? 'Planned Destination / Stop:' : 'Destinasi / Titik Penggunaan:'}
                    </Typography>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="location" size={16} color={colors.brand.coral} style={{ marginRight: 6 }} />
                      <Typography variant="body" color={colors.brand.navy} style={{ fontWeight: '600' }}>
                        {destinations.find((d) => d.id === selectedDetailItem.plannedDestinationId)?.name || 'Unknown Stop'}
                      </Typography>
                    </View>
                  </View>
                )}

                {/* Group / Container Mapping */}
                <View
                  style={[
                    styles.detailMappingBox,
                    { backgroundColor: isDarkMode ? colors.surface.muted : '#F8FAFC', borderColor: colors.border.default },
                  ]}
                >
                  <Typography variant="caption" color={colors.text.muted} style={{ fontWeight: '700', marginBottom: 4 }}>
                    {language === 'en' ? 'Container / Package Mapping:' : 'Pemetaan Kontainer / Paket:'}
                  </Typography>

                  {selectedDetailItem.isGroup === 1 ? (
                    <View>
                      <Typography variant="body" color={colors.brand.navy} style={{ fontWeight: '600' }}>
                        {items.filter((it) => it.parentId === selectedDetailItem.id).length}{' '}
                        {language === 'en' ? 'items bundled in this trip:' : 'barang dipaketkan di trip ini:'}
                      </Typography>
                      <View style={{ marginTop: 6, gap: 4 }}>
                        {items
                          .filter((it) => it.parentId === selectedDetailItem.id)
                          .map((ch) => (
                            <View key={ch.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                              <Ionicons name="return-down-forward" size={14} color={colors.brand.blue} />
                              <Typography variant="caption" color={colors.text.primary} style={{ marginLeft: 6, fontWeight: '600', flex: 1 }}>
                                {ch.customName}
                              </Typography>
                              <Badge
                                label={ch.state === 'packed' ? '✓' : '—'}
                                variant={ch.state === 'packed' ? 'accent' : 'neutral'}
                                size="sm"
                              />
                            </View>
                          ))}
                      </View>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        {selectedDetailItem.parentId ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="cube" size={15} color={colors.brand.blue} style={{ marginRight: 5 }} />
                            <Typography variant="body" color={colors.brand.navy} style={{ fontWeight: '600' }}>
                              {items.find((it) => it.id === selectedDetailItem.parentId)?.customName || 'Unknown Group'}
                            </Typography>
                          </View>
                        ) : (
                          <Typography variant="body" color={colors.text.muted}>
                            {language === 'en' ? 'No container (Standalone item)' : 'Tanpa kontainer (Barang mandiri)'}
                          </Typography>
                        )}
                      </View>

                      <Button
                        label={language === 'en' ? 'Move Group' : 'Pindah Grup'}
                        size="sm"
                        variant="secondary"
                        onPress={() => {
                          const it = selectedDetailItem;
                          setSelectedDetailItem(null);
                          setItemToMoveGroup(it);
                        }}
                      />
                    </View>
                  )}
                </View>

                {/* Notes */}
                {selectedDetailItem.notes && (
                  <View
                    style={[
                      styles.detailNotesBox,
                      { backgroundColor: isDarkMode ? colors.surface.muted : '#F8FAFC', borderColor: colors.border.default },
                    ]}
                  >
                    <Typography variant="caption" color={colors.text.muted} style={{ fontWeight: '700', marginBottom: 4 }}>
                      {language === 'en' ? 'Notes:' : 'Catatan Khusus:'}
                    </Typography>
                    <Typography variant="body" color={colors.text.primary} style={{ fontSize: 13, lineHeight: 19 }}>
                      {selectedDetailItem.notes}
                    </Typography>
                  </View>
                )}
              </ScrollView>

              {/* Action Buttons */}
              <View style={styles.detailActionButtonsRow}>
                {selectedDetailItem.isGroup !== 1 && (
                  <Button
                    label={
                      ['packed', 'available', 'returned', 'used'].includes(selectedDetailItem.state)
                        ? (language === 'en' ? 'Take Out of Bag' : 'Keluarkan dari Tas')
                        : (language === 'en' ? 'Pack into Bag' : 'Kemas Masuk ke Tas')
                    }
                    variant={['packed', 'available', 'returned', 'used'].includes(selectedDetailItem.state) ? 'secondary' : 'accent'}
                    size="md"
                    onPress={() => {
                      const it = selectedDetailItem;
                      setSelectedDetailItem(null);
                      handleTogglePack(it);
                    }}
                  />
                )}

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    label={language === 'en' ? 'Delete' : 'Hapus'}
                    variant="destructive"
                    size="sm"
                    onPress={() => {
                      const it = selectedDetailItem;
                      setSelectedDetailItem(null);
                      handleDeleteTripItem(it);
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label={t.destDetail.closeMenu}
                    variant="secondary"
                    size="sm"
                    onPress={() => setSelectedDetailItem(null)}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* MODAL: Move Item to Another Group Container */}
      {itemToMoveGroup && (
        <Modal
          transparent
          animationType="fade"
          visible={!!itemToMoveGroup}
          onRequestClose={() => setItemToMoveGroup(null)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setItemToMoveGroup(null)}>
            <Pressable
              style={[
                styles.modalCard,
                { backgroundColor: themeColors.surface.card, maxHeight: '80%' },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Typography variant="h3" color={colors.brand.navy}>
                    {t.destDetail.selectGroupModalTitle}
                  </Typography>
                  <Typography variant="caption" color={colors.text.muted} style={{ marginTop: 2 }}>
                    {t.destDetail.selectGroupModalSubtitle}
                  </Typography>
                </View>
                <Pressable onPress={() => setItemToMoveGroup(null)} hitSlop={8}>
                  <Ionicons name="close" size={22} color={colors.text.muted} />
                </Pressable>
              </View>

              {/* Scroll list of groups */}
              <ScrollView style={{ maxHeight: 350 }}>
                {/* Option 1: Standalone / No Group */}
                <Pressable
                  style={[
                    styles.groupOptionRow,
                    {
                      backgroundColor: !itemToMoveGroup.parentId
                        ? (isDarkMode ? 'rgba(56, 189, 248, 0.15)' : '#E0F2FE')
                        : (isDarkMode ? themeColors.surface.page : '#F8FAFC'),
                      borderColor: !itemToMoveGroup.parentId ? colors.brand.blue : colors.border.muted,
                    },
                  ]}
                  onPress={async () => {
                    const targetItem = itemToMoveGroup;
                    setItemToMoveGroup(null);
                    try {
                      await packingRepository.updateItemParent(targetItem.id, null);
                      await loadTripData();
                      if (selectedDetailItem?.id === targetItem.id) {
                        setSelectedDetailItem({ ...targetItem, parentId: null });
                      }
                    } catch {
                      Alert.alert('Error', 'Gagal memindahkan barang.');
                    }
                  }}
                >
                  <Ionicons name="cube-outline" size={20} color={!itemToMoveGroup.parentId ? colors.brand.blue : colors.text.muted} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Typography variant="body" color={colors.brand.navy} style={{ fontWeight: '600' }}>
                      {t.destDetail.noGroupTrip}
                    </Typography>
                    <Typography variant="caption" color={colors.text.muted}>
                      {language === 'en' ? 'Keep item standalone without any container' : 'Barang berdiri sendiri tanpa masuk kontainer paket'}
                    </Typography>
                  </View>
                  {!itemToMoveGroup.parentId && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.brand.blue} />
                  )}
                </Pressable>

                {/* Group Options */}
                {items
                  .filter((it) => it.isGroup === 1 && it.id !== itemToMoveGroup.id)
                  .map((grp) => {
                    const isSelected = itemToMoveGroup.parentId === grp.id;
                    const childCount = items.filter((it) => it.parentId === grp.id).length;
                    return (
                      <Pressable
                        key={grp.id}
                        style={[
                          styles.groupOptionRow,
                          {
                            backgroundColor: isSelected
                              ? (isDarkMode ? 'rgba(56, 189, 248, 0.15)' : '#E0F2FE')
                              : (isDarkMode ? themeColors.surface.page : '#F8FAFC'),
                            borderColor: isSelected ? colors.brand.blue : colors.border.muted,
                          },
                        ]}
                        onPress={async () => {
                          const targetItem = itemToMoveGroup;
                          setItemToMoveGroup(null);
                          try {
                            await packingRepository.updateItemParent(targetItem.id, grp.id);
                            await loadTripData();
                            if (selectedDetailItem?.id === targetItem.id) {
                              setSelectedDetailItem({ ...targetItem, parentId: grp.id });
                            }
                          } catch {
                            Alert.alert('Error', 'Gagal memindahkan barang.');
                          }
                        }}
                      >
                        <Ionicons name="cube" size={20} color={isSelected ? colors.brand.blue : colors.brand.coral} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Typography variant="body" color={colors.brand.navy} style={{ fontWeight: '600' }}>
                            {grp.customName}
                          </Typography>
                          <Typography variant="caption" color={colors.text.muted}>
                            {childCount} {language === 'en' ? 'items bundled' : 'barang di dalamnya'}
                          </Typography>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.brand.blue} />
                        )}
                      </Pressable>
                    );
                  })}
              </ScrollView>

              <Button
                variant="secondary"
                label={t.destDetail.closeMenu}
                onPress={() => setItemToMoveGroup(null)}
                style={{ marginTop: 12 }}
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
          onRequestClose={() => { if (!isSavingVisit) setVisitingModalDest(null); }}
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
                    {language === 'en' ? 'Used, back in the bag, or missing?' : 'Digunakan, kembali ke tas, atau hilang?'}
                  </Typography>
                </View>
              </View>

              <View
                style={[styles.sheetDivider, { backgroundColor: themeColors.border.default }]}
              />

              {/* Items List */}
              <VisitItemsReview
                items={[...items].sort((a, b) => Number(b.plannedDestinationId === visitingModalDest.id) - Number(a.plannedDestinationId === visitingModalDest.id))}
                choices={visitingItemStates}
                busy={isSavingVisit}
                onChange={(itemId, state) => setVisitingItemStates((previous) => ({ ...previous, [itemId]: state }))}
                onCancel={() => setVisitingModalDest(null)}
                onSave={async () => {
                  if (isSavingVisit) return;
                  setIsSavingVisit(true);
                  try {
                    await getNativeDatabase().withTransactionAsync(async () => {
                      for (const [itemId, state] of Object.entries(visitingItemStates)) {
                        if (state === 'used') await packingRepository.recordActualUsage(visitingModalDest.id, itemId);
                        else await packingRepository.updateItemState(itemId, state, visitingModalDest.id);
                      }
                      await destinationRepository.update(visitingModalDest.id, { isVisited: true });
                    });
                    setVisitingModalDest(null);
                    await loadTripData();
                  } catch {
                    Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.trip.alertItemUpdateError);
                  } finally {
                    setIsSavingVisit(false);
                  }
                }}
              />
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
    paddingBottom: 160,
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
    flexWrap: 'wrap',
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
  itemModeToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing[3],
  },
  itemModePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.page,
  },
  itemModePillActive: {
    backgroundColor: colors.brand.navy,
    borderColor: colors.brand.navy,
  },
  dropDestSelector: {
    marginBottom: spacing[3],
  },
  dropDestChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface.page,
  },
  dropOffNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: radius.md,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: spacing[3],
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
  capturedPhotoContainer: {
    width: '100%',
  },
  capturedActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing[2],
  },
  photoActionSubBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    borderWidth: 1,
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  inventoryPickerCard: {
    borderRadius: radius.xl,
    padding: spacing[4],
    maxHeight: '82%',
  },
  inventorySearch: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    marginBottom: spacing[2],
  },
  inventoryPickerRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionalPackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing[4],
    padding: spacing[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
  },
  endTripFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  closedTripHint: {
    textAlign: 'center',
    marginBottom: spacing[1],
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
  groupContainer: {
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing[2],
    overflow: 'hidden',
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  groupIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[2],
  },
  groupBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.full,
    marginRight: 6,
  },
  groupMenuBtn: {
    padding: 6,
  },
  groupChildrenList: {
    paddingLeft: spacing[2],
    paddingRight: spacing[2],
    paddingBottom: spacing[2],
  },
  groupChildRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childIndentGuide: {
    width: 14,
    height: '100%',
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderBottomLeftRadius: 6,
    marginLeft: spacing[2],
    marginRight: 2,
    marginBottom: 16,
  },
  groupCollapseBtn: {
    padding: 6,
    marginRight: 2,
  },
  detailModalCard: {
    width: '100%',
    borderRadius: radius.xl,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: '85%',
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  detailImageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  detailItemImage: {
    width: '100%',
    height: 180,
    borderRadius: radius.lg,
    backgroundColor: '#E2E8F0',
  },
  detailIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailItemName: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  detailBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing[3],
  },
  detailMappingBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  detailNotesBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  detailActionButtonsRow: {
    gap: 8,
    marginTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingTop: spacing[3],
  },
  groupOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: 8,
  },
});
