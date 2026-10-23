import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { ScreenContainer, Typography, Badge, Button, Card } from '@/components/ui';
import { useThemeColors } from '@/core/theme';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';
import { destinationRepository } from '@/db/repositories/destination.repository';
import { packingRepository } from '@/db/repositories/packing.repository';
import { tripRepository } from '@/db/repositories/trip.repository';
import { DestinationRecord } from '@/db/schema/destinations';
import { TripItemRecord } from '@/db/schema/trip-items';
import { TripRecord } from '@/db/schema/trips';
import { generateId } from '@/core/utils/id';

interface DestinationTodo {
  id: string;
  text: string;
  completed: boolean;
}

export default function DestinationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useThemeColors();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const { t, format, language } = useI18n();

  const [loading, setLoading] = useState(true);
  const [destination, setDestination] = useState<DestinationRecord | null>(null);
  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [allDestinations, setAllDestinations] = useState<DestinationRecord[]>([]);
  const [tripItems, setTripItems] = useState<TripItemRecord[]>([]);

  // Notes state
  const [notes, setNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Todo state
  const [todos, setTodos] = useState<DestinationTodo[]>([]);
  const [newTodoText, setNewTodoText] = useState('');

  // Modals state
  const [shiftModalItem, setShiftModalItem] = useState<TripItemRecord | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const dest = await destinationRepository.getById(id);
      if (!dest) {
        Alert.alert('Error', t.trip.tripNotFound);
        router.back();
        return;
      }
      setDestination(dest);
      setNotes(dest.notes || '');

      if (dest.todos) {
        try {
          const parsed = JSON.parse(dest.todos);
          if (Array.isArray(parsed)) setTodos(parsed);
        } catch {
          setTodos([]);
        }
      } else {
        setTodos([]);
      }

      const tripData = await tripRepository.getById(dest.tripId);
      setTrip(tripData || null);

      const allDests = await destinationRepository.getByTripId(dest.tripId);
      setAllDestinations(allDests);

      const items = await packingRepository.getByTripId(dest.tripId);
      setTripItems(items);
    } catch {
      Alert.alert('Error', 'Failed to load destination data.');
    } finally {
      setLoading(false);
    }
  }, [id, router, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Photo Picker
  const handlePickImage = async (useCamera: boolean) => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
          allowsEditing: true,
          aspect: [16, 9],
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery access is required.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
          allowsEditing: true,
          aspect: [16, 9],
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        await destinationRepository.update(id!, { imageUri: selectedUri });
        setDestination((prev) => (prev ? { ...prev, imageUri: selectedUri } : prev));
      }
    } catch {
      Alert.alert('Error', 'Failed to update location photo.');
    }
  };

  const showImagePickerOptions = () => {
    Alert.alert(
      t.destDetail.photoSectionTitle,
      '',
      [
        {
          text: t.trip.cameraBtn,
          onPress: () => handlePickImage(true),
        },
        {
          text: t.trip.galleryBtn,
          onPress: () => handlePickImage(false),
        },
        {
          text: t.trip.cancel,
          style: 'cancel',
        },
      ]
    );
  };

  // Handle Save Notes
  const handleSaveNotes = async () => {
    if (!id) return;
    try {
      setIsSavingNotes(true);
      await destinationRepository.update(id, { notes });
      setDestination((prev) => (prev ? { ...prev, notes } : prev));
      Alert.alert('Sukses', t.destDetail.notesSaved);
    } catch {
      Alert.alert('Error', 'Failed to save notes.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Handle Todos
  const handleAddTodo = async () => {
    if (!newTodoText.trim() || !id) return;
    const updated: DestinationTodo[] = [
      ...todos,
      { id: generateId('todo'), text: newTodoText.trim(), completed: false },
    ];
    setTodos(updated);
    setNewTodoText('');
    await destinationRepository.update(id, { todos: JSON.stringify(updated) });
  };

  const handleToggleTodo = async (todoId: string) => {
    if (!id) return;
    const updated = todos.map((td) =>
      td.id === todoId ? { ...td, completed: !td.completed } : td
    );
    setTodos(updated);
    await destinationRepository.update(id, { todos: JSON.stringify(updated) });
  };

  const handleDeleteTodo = async (todoId: string) => {
    if (!id) return;
    const updated = todos.filter((td) => td.id !== todoId);
    setTodos(updated);
    await destinationRepository.update(id, { todos: JSON.stringify(updated) });
  };

  // Items mapped to this destination
  const assignedItems = tripItems.filter((item) => item.plannedDestinationId === id);
  const unassignedItems = tripItems.filter((item) => item.plannedDestinationId !== id);

  // Shift item destination
  const handleShiftDestination = async (targetDestId: string | null) => {
    if (!shiftModalItem) return;
    try {
      await packingRepository.updateItemDestination(shiftModalItem.id, targetDestId);
      setTripItems((prev) =>
        prev.map((it) =>
          it.id === shiftModalItem.id ? { ...it, plannedDestinationId: targetDestId } : it
        )
      );
      setShiftModalItem(null);
    } catch {
      Alert.alert('Error', 'Failed to shift item destination.');
    }
  };

  // Toggle Item State
  const handleToggleItemState = async (item: TripItemRecord, nextState: TripItemRecord['state']) => {
    try {
      await packingRepository.updateItemState(item.id, nextState);
      setTripItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, state: nextState } : it))
      );
    } catch {
      Alert.alert('Error', 'Failed to update item state.');
    }
  };

  // Assign item to this destination
  const handleAssignItem = async (itemId: string) => {
    try {
      await packingRepository.updateItemDestination(itemId, id!);
      setTripItems((prev) =>
        prev.map((it) => (it.id === itemId ? { ...it, plannedDestinationId: id! } : it))
      );
    } catch {
      Alert.alert('Error', 'Failed to assign item.');
    }
  };

  if (loading || !destination) {
    return (
      <ScreenContainer style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand.coral} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Cover / Location Image Banner */}
        <View style={styles.imageSection}>
          {destination.imageUri ? (
            <View style={styles.imageWrap}>
              <Image source={{ uri: destination.imageUri }} style={styles.locationImage} />
              <Pressable
                style={[styles.editImageBtn, { backgroundColor: 'rgba(0,0,0,0.65)' }]}
                onPress={showImagePickerOptions}
              >
                <Ionicons name="camera" size={16} color="#FFFFFF" />
                <Typography variant="caption" color="#FFFFFF" style={styles.editImageText}>
                  {t.destDetail.changePhotoBtn}
                </Typography>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[
                styles.emptyImagePlaceholder,
                { backgroundColor: colors.surface.card, borderColor: colors.border.default },
              ]}
              onPress={showImagePickerOptions}
            >
              <View style={[styles.photoIconCircle, { backgroundColor: colors.surface.muted }]}>
                <Ionicons name="camera-outline" size={28} color={colors.brand.blue} />
              </View>
              <Typography variant="label" color={colors.brand.blue} style={{ marginTop: 8 }}>
                {t.destDetail.addPhotoBtn}
              </Typography>
              <Typography variant="caption" color={colors.text.muted}>
                {trip?.name} • Day {destination.dayNumber}
              </Typography>
            </Pressable>
          )}
        </View>

        {/* Destination Header Info Card */}
        <Card style={styles.headerCard}>
          <View style={styles.badgeRow}>
            <View style={styles.dayChip}>
              <Typography variant="caption" color={colors.brand.coral} style={styles.dayChipText}>
                DAY {destination.dayNumber}
              </Typography>
            </View>
            {destination.plannedTime && (
              <View style={[styles.timeChip, { backgroundColor: colors.surface.muted }]}>
                <Ionicons name="time-outline" size={13} color={colors.text.secondary} />
                <Typography variant="caption" color={colors.text.secondary} style={{ marginLeft: 4 }}>
                  {destination.plannedTime}
                </Typography>
              </View>
            )}
          </View>

          <Typography variant="h2" color={colors.brand.navy} style={styles.destTitle}>
            {destination.name}
          </Typography>

          {destination.activity && (
            <View style={styles.activityRow}>
              <Ionicons name="flag-outline" size={15} color={colors.brand.coral} />
              <Typography variant="body" color={colors.text.secondary} style={styles.activityText}>
                {destination.activity}
              </Typography>
            </View>
          )}

          {destination.locationLabel && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={15} color={colors.brand.blue} />
              <Typography variant="caption" color={colors.text.muted} style={styles.locationText}>
                {destination.locationLabel}
              </Typography>
            </View>
          )}
        </Card>

        {/* Section 1: Assigned Items / Inventory for this Destination */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleLeft}>
              <Ionicons name="bag-handle" size={20} color={colors.brand.coral} />
              <Typography variant="h3" color={colors.text.primary} style={styles.sectionHeading}>
                {t.destDetail.itemsSectionTitle}
              </Typography>
            </View>
            <Badge label={`${assignedItems.length}`} variant="primary" size="sm" />
          </View>

          <Typography variant="caption" color={colors.text.muted} style={styles.sectionSubtitle}>
            {t.destDetail.itemsSubtitle}
          </Typography>

          {assignedItems.length > 0 ? (
            <View style={styles.itemsList}>
              {assignedItems.map((item) => {
                const isPacked = item.state === 'packed';
                const isUsed = item.state === 'used';
                const isReturned = item.state === 'returned';

                let stateBadgeColor: string = colors.status.warning;
                let stateLabel = t.destDetail.statePlanned;
                if (isPacked) {
                  stateBadgeColor = colors.brand.blue;
                  stateLabel = t.destDetail.statePacked;
                } else if (isUsed) {
                  stateBadgeColor = colors.status.success;
                  stateLabel = t.destDetail.stateUsed;
                } else if (isReturned) {
                  stateBadgeColor = '#8B5CF6';
                  stateLabel = t.destDetail.stateReturned;
                }

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.itemRow,
                      { backgroundColor: colors.surface.page, borderColor: colors.border.default },
                    ]}
                  >
                    <View style={styles.itemMainInfo}>
                      <Typography variant="label" color={colors.brand.navy}>
                        {item.customName}
                      </Typography>
                      <View style={styles.itemMeta}>
                        <Typography variant="caption" color={colors.text.muted}>
                          {item.category} • Qty: {item.quantity}
                        </Typography>
                        <View style={[styles.statePill, { backgroundColor: `${stateBadgeColor}20` }]}>
                          <Typography variant="caption" color={stateBadgeColor} style={styles.statePillText}>
                            {stateLabel}
                          </Typography>
                        </View>
                      </View>
                    </View>

                    {/* Action Buttons for this item */}
                    <View style={styles.itemActions}>
                      {/* State switch buttons */}
                      {!isUsed && !isReturned && (
                        <Pressable
                          style={[
                            styles.itemActionBtn,
                            { backgroundColor: isPacked ? colors.status.success : colors.brand.blue },
                          ]}
                          onPress={() =>
                            handleToggleItemState(item, isPacked ? 'used' : 'packed')
                          }
                        >
                          <Typography variant="caption" color="#FFFFFF" style={styles.btnLabel}>
                            {isPacked ? t.destDetail.markUsedBtn : t.destDetail.markPackedBtn}
                          </Typography>
                        </Pressable>
                      )}

                      {/* Shift Stop Button */}
                      <Pressable
                        style={[styles.itemActionBtnOutline, { borderColor: colors.border.strong }]}
                        onPress={() => setShiftModalItem(item)}
                      >
                        <Ionicons name="swap-horizontal" size={14} color={colors.text.primary} />
                        <Typography variant="caption" color={colors.text.primary} style={{ marginLeft: 3 }}>
                          {t.destDetail.shiftStopBtn}
                        </Typography>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[styles.emptyBox, { backgroundColor: colors.surface.page }]}>
              <Ionicons name="cube-outline" size={32} color={colors.text.muted} />
              <Typography variant="body" color={colors.text.muted} style={styles.emptyText}>
                {t.destDetail.noItemsAssigned}
              </Typography>
            </View>
          )}

          <Button
            variant="secondary"
            label={t.destDetail.assignItemsBtn}
            onPress={() => setIsAssignModalOpen(true)}
            style={{ marginTop: 12 }}
          />
        </Card>

        {/* Section 2: Local To-Do Checklist */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleLeft}>
              <Ionicons name="checkbox-outline" size={20} color={colors.brand.blue} />
              <Typography variant="h3" color={colors.text.primary} style={styles.sectionHeading}>
                {t.destDetail.todoSectionTitle}
              </Typography>
            </View>
            <Badge
              label={`${todos.filter((x) => x.completed).length}/${todos.length}`}
              variant="neutral"
              size="sm"
            />
          </View>

          {/* Add Todo Input Row */}
          <View style={styles.addTodoRow}>
            <TextInput
              style={[
                styles.todoInput,
                {
                  backgroundColor: colors.surface.page,
                  borderColor: colors.border.default,
                  color: colors.text.primary,
                },
              ]}
              placeholder={t.destDetail.todoPlaceholder}
              placeholderTextColor={colors.text.muted}
              value={newTodoText}
              onChangeText={setNewTodoText}
              onSubmitEditing={handleAddTodo}
            />
            <Pressable
              style={[
                styles.addTodoBtn,
                { backgroundColor: newTodoText.trim() ? colors.brand.coral : colors.border.strong },
              ]}
              onPress={handleAddTodo}
              disabled={!newTodoText.trim()}
            >
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Todos List */}
          {todos.length > 0 ? (
            <View style={styles.todosList}>
              {todos.map((todo) => (
                <View
                  key={todo.id}
                  style={[
                    styles.todoItemRow,
                    { borderBottomColor: colors.border.muted },
                  ]}
                >
                  <Pressable
                    style={styles.todoCheckWrap}
                    onPress={() => handleToggleTodo(todo.id)}
                  >
                    <Ionicons
                      name={todo.completed ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={todo.completed ? colors.status.success : colors.text.muted}
                    />
                    <Typography
                      variant="body"
                      color={todo.completed ? colors.text.muted : colors.text.primary}
                      style={[
                        styles.todoText,
                        todo.completed && styles.todoTextDone,
                      ]}
                    >
                      {todo.text}
                    </Typography>
                  </Pressable>

                  <Pressable
                    style={styles.deleteTodoBtn}
                    onPress={() => handleDeleteTodo(todo.id)}
                  >
                    <Ionicons name="trash-outline" size={17} color={colors.status.error} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <Typography variant="caption" color={colors.text.muted} style={styles.emptyTodoText}>
              {t.destDetail.noTodos}
            </Typography>
          )}
        </Card>

        {/* Section 3: Destination Notes */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleLeft}>
              <Ionicons name="document-text-outline" size={20} color={colors.brand.navy} />
              <Typography variant="h3" color={colors.text.primary} style={styles.sectionHeading}>
                {t.destDetail.notesSectionTitle}
              </Typography>
            </View>
          </View>

          <TextInput
            style={[
              styles.notesInput,
              {
                backgroundColor: colors.surface.page,
                borderColor: colors.border.default,
                color: colors.text.primary,
              },
            ]}
            placeholder={t.destDetail.notesPlaceholder}
            placeholderTextColor={colors.text.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={notes}
            onChangeText={setNotes}
          />

          <Button
            variant="primary"
            label={isSavingNotes ? '...' : t.destDetail.saveNotesBtn}
            onPress={handleSaveNotes}
            disabled={isSavingNotes}
            style={{ marginTop: 12 }}
          />
        </Card>
      </ScrollView>

      {/* MODAL 1: Shift Item Destination */}
      {shiftModalItem && (
        <Modal transparent animationType="fade" visible={!!shiftModalItem}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface.card }]}>
              <Typography variant="h3" color={colors.brand.navy} style={styles.modalTitle}>
                {t.destDetail.moveModalTitle}
              </Typography>
              <Typography variant="body" color={colors.text.secondary} style={styles.modalSubtitle}>
                {shiftModalItem.customName}
              </Typography>

              <ScrollView style={{ maxHeight: 280, marginVertical: 12 }}>
                {/* Option: Move to General Starter Pack */}
                <Pressable
                  style={[
                    styles.destOption,
                    {
                      backgroundColor:
                        shiftModalItem.plannedDestinationId === null
                          ? colors.surface.muted
                          : colors.surface.page,
                    },
                  ]}
                  onPress={() => handleShiftDestination(null)}
                >
                  <Ionicons name="briefcase-outline" size={18} color={colors.brand.coral} />
                  <Typography variant="label" color={colors.text.primary} style={{ marginLeft: 8 }}>
                    {t.destDetail.moveToStarterPack}
                  </Typography>
                </Pressable>

                {/* Option: Move to other destinations */}
                {allDestinations.map((d) => {
                  const isCurrent = d.id === id;
                  return (
                    <Pressable
                      key={d.id}
                      style={[
                        styles.destOption,
                        {
                          backgroundColor: isCurrent ? colors.surface.muted : colors.surface.page,
                          opacity: isCurrent ? 0.6 : 1,
                        },
                      ]}
                      onPress={() => !isCurrent && handleShiftDestination(d.id)}
                    >
                      <Ionicons name="location-outline" size={18} color={colors.brand.blue} />
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Typography variant="label" color={colors.text.primary}>
                          {t.destDetail.moveToStopPrefix}Day {d.dayNumber} - {d.name}
                        </Typography>
                        {isCurrent && (
                          <Typography variant="caption" color={colors.brand.coral}>
                            (Current Stop)
                          </Typography>
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Button
                variant="secondary"
                label={t.trip.cancel}
                onPress={() => setShiftModalItem(null)}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL 2: Assign Items to Destination */}
      <Modal transparent animationType="slide" visible={isAssignModalOpen}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCardLarge, { backgroundColor: colors.surface.card }]}>
            <Typography variant="h3" color={colors.brand.navy} style={styles.modalTitle}>
              {format(t.destDetail.assignModalTitle, { destName: destination.name })}
            </Typography>
            <Typography variant="caption" color={colors.text.muted} style={{ marginBottom: 12 }}>
              {t.destDetail.assignModalSubtitle}
            </Typography>

            <ScrollView style={{ maxHeight: 350 }}>
              {unassignedItems.length > 0 ? (
                unassignedItems.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.assignItemRow,
                      { backgroundColor: colors.surface.page, borderColor: colors.border.default },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Typography variant="label" color={colors.text.primary}>
                        {item.customName}
                      </Typography>
                      <Typography variant="caption" color={colors.text.muted}>
                        {item.category} • Current:{' '}
                        {item.plannedDestinationId
                          ? allDestinations.find((d) => d.id === item.plannedDestinationId)?.name ||
                            'Other Stop'
                          : 'Starter Pack'}
                      </Typography>
                    </View>

                    <Button
                      variant="primary"
                      size="sm"
                      label="+ Map Here"
                      onPress={() => handleAssignItem(item.id)}
                    />
                  </View>
                ))
              ) : (
                <Typography variant="body" color={colors.text.muted} style={{ textAlign: 'center', padding: 20 }}>
                  All items are already mapped to this stop or no items exist.
                </Typography>
              )}
            </ScrollView>

            <Button
              variant="secondary"
              label={t.trip.cancel}
              onPress={() => setIsAssignModalOpen(false)}
              style={{ marginTop: 14 }}
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  imageSection: {
    marginBottom: 16,
  },
  imageWrap: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    height: 180,
  },
  locationImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  editImageBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  editImageText: {
    marginLeft: 6,
    fontWeight: '700',
  },
  emptyImagePlaceholder: {
    height: 150,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  photoIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayChip: {
    backgroundColor: '#FFEFEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  dayChipText: {
    fontWeight: '800',
    fontSize: 11,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  destTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  activityText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    marginLeft: 6,
    fontSize: 13,
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeading: {
    marginLeft: 8,
    fontSize: 17,
  },
  sectionSubtitle: {
    marginTop: 3,
    marginBottom: 12,
  },
  itemsList: {
    gap: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  itemMainInfo: {
    flex: 1,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 6,
  },
  statePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnLabel: {
    fontWeight: '700',
    fontSize: 11,
  },
  itemActionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  emptyBox: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 10,
  },
  emptyText: {
    marginTop: 8,
    textAlign: 'center',
  },
  addTodoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 12,
    gap: 8,
  },
  todoInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  addTodoBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todosList: {
    gap: 6,
  },
  todoItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  todoCheckWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  todoText: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  todoTextDone: {
    textDecorationLine: 'line-through',
  },
  deleteTodoBtn: {
    padding: 6,
  },
  emptyTodoText: {
    textAlign: 'center',
    marginVertical: 10,
  },
  notesInput: {
    minHeight: 90,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    marginTop: 10,
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
  modalCardLarge: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 8,
  },
  destOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  assignItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
});