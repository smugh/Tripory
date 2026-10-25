import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Card, Badge, Button, Input, ScreenContainer, EmptyState } from '@/components/ui';
import { useUIStore } from '@/stores/ui-store';
import { useI18n } from '@/core/i18n';
import { tripRepository } from '@/db/repositories/trip.repository';
import { momentRepository } from '@/db/repositories/moment.repository';
import { destinationRepository } from '@/db/repositories/destination.repository';
import { albumRepository } from '@/db/repositories/album.repository';
import { TripRecord } from '@/db/schema/trips';
import { AlbumCustomizationRecord } from '@/db/schema/album-customizations';
import { formatDateRange } from '@/core/utils';
import { mediaService } from '@/services/media';

interface AlbumItemData {
  trip: TripRecord;
  customization: AlbumCustomizationRecord | null;
  photoCount: number;
  coverUri: string | null;
}

export default function AlbumManagementScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const { t, language } = useI18n();

  const [albums, setAlbums] = useState<AlbumItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Modal State
  const [editingAlbum, setEditingAlbum] = useState<AlbumItemData | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editCoverUri, setEditCoverUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadAlbums = useCallback(async () => {
    try {
      setIsLoading(true);
      const allTrips = await tripRepository.getAll();
      const allCustomizations = await albumRepository.getAllCustomizations();
      const customMap = new Map(allCustomizations.map((c) => [c.tripId, c]));

      // Ambil trip yang berstatus completed atau memiliki momen
      const albumsData: AlbumItemData[] = [];
      for (const trip of allTrips) {
        const tripMoments = await momentRepository.getByTripId(trip.id);
        if (trip.status === 'completed' || tripMoments.length > 0) {
          const customization = customMap.get(trip.id) || null;
          let coverUri = customization?.customCoverPath || trip.coverPhotoPath || null;
          if (!coverUri && tripMoments.length > 0) {
            coverUri = tripMoments[0].photoPath;
          }
          if (!coverUri) {
            const stops = await destinationRepository.getByTripId(trip.id);
            const stopWithImg = stops.find((s) => s.imageUri);
            if (stopWithImg) coverUri = stopWithImg.imageUri;
          }

          albumsData.push({
            trip,
            customization,
            photoCount: tripMoments.length,
            coverUri,
          });
        }
      }

      setAlbums(albumsData);
    } catch {
      // silent catch
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlbums();
  }, [loadAlbums]);

  const handleToggleHide = async (item: AlbumItemData) => {
    try {
      const isNowHidden = await albumRepository.toggleHide(item.trip.id);
      Alert.alert(
        language === 'en' ? 'Success' : 'Berhasil',
        isNowHidden ? t.settings.albumHideSuccess : t.settings.albumUnhideSuccess
      );
      loadAlbums();
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', 'Could not update privacy.');
    }
  };

  const handleOpenEdit = (item: AlbumItemData) => {
    setEditingAlbum(item);
    setEditTitle(item.customization?.customTitle || item.trip.name);
    setEditNotes(item.customization?.customNotes || item.trip.notes || '');
    setEditCoverUri(item.customization?.customCoverPath || item.coverUri);
  };

  const handlePickCoverCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.2,
      });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        setEditCoverUri(res.assets[0].uri);
      }
    } catch {
      // ignore
    }
  };

  const handlePickCoverGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.2,
      });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        setEditCoverUri(res.assets[0].uri);
      }
    } catch {
      // ignore
    }
  };

  const handleSaveEdit = async () => {
    if (!editingAlbum) return;
    try {
      setIsSaving(true);
      let finalCover = editCoverUri;
      if (finalCover && !mediaService.isManagedPhotoUri(finalCover)) {
        const savedPhoto = await mediaService.savePhoto({ sourceUri: finalCover });
        finalCover = savedPhoto.fullUri;
      }

      await albumRepository.setCustomization(editingAlbum.trip.id, {
        customTitle: editTitle.trim() || null,
        customNotes: editNotes.trim() || null,
        customCoverPath: finalCover,
      });

      Alert.alert(language === 'en' ? 'Success' : 'Berhasil', t.settings.albumSaveSuccess);
      setEditingAlbum(null);
      loadAlbums();
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', 'Could not save album changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAlbum = (item: AlbumItemData) => {
    Alert.alert(
      t.settings.deleteAlbumConfirmTitle,
      t.settings.deleteAlbumConfirmMsg,
      [
        { text: t.inventory.cancelBtn, style: 'cancel' },
        {
          text: t.settings.deleteAlbumAction,
          style: 'destructive',
          onPress: async () => {
            try {
              await albumRepository.deleteAlbum(item.trip.id);
              loadAlbums();
            } catch {
              Alert.alert(language === 'en' ? 'Error' : 'Gagal', 'Could not delete album.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Intro Card */}
        <Card elevated style={[styles.introCard, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
          <View style={styles.introRow}>
            <View style={[styles.introIconCircle, { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7' }]}>
              <Ionicons name="images" size={24} color="#F59E0B" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Typography variant="body" color={themeColors.text.primary} style={{ fontWeight: '700' }}>
                {t.settings.albumManagementTitle}
              </Typography>
              <Typography variant="caption" color={themeColors.text.muted} style={{ marginTop: 2 }}>
                {t.settings.albumManagementSubtitle}
              </Typography>
            </View>
          </View>
        </Card>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={themeColors.brand.blue} />
          </View>
        ) : albums.length === 0 ? (
          <EmptyState
            title={language === 'en' ? 'No travel albums found' : 'Belum ada album kenangan'}
            description={language === 'en' ? 'Completed trips and captured memories will be listed here.' : 'Perjalanan yang selesai atau memiliki foto kenangan akan muncul di sini.'}
          />
        ) : (
          albums.map((item) => {
            const isHidden = item.customization?.isHidden === 1;
            const displayTitle = item.customization?.customTitle || item.trip.name;

            return (
              <Card
                key={item.trip.id}
                elevated
                style={[
                  styles.albumCard,
                  { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default },
                  isHidden && { opacity: 0.9, borderColor: '#F59E0B' },
                ]}
              >
                {/* Album Cover & Info Header */}
                <View style={styles.albumHeader}>
                  {item.coverUri ? (
                    <Image source={{ uri: item.coverUri }} style={styles.coverThumb} />
                  ) : (
                    <View style={[styles.coverPlaceholder, { backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0' }]}>
                      <Ionicons name="image-outline" size={28} color={themeColors.text.muted} />
                    </View>
                  )}

                  <View style={styles.albumMeta}>
                    <View style={styles.titleRow}>
                      <Typography variant="h3" color={themeColors.brand.navy} numberOfLines={1} style={{ flex: 1 }}>
                        {displayTitle}
                      </Typography>
                    </View>

                    <View style={styles.destRow}>
                      <Ionicons name="location-sharp" size={13} color={themeColors.brand.coral} />
                      <Typography variant="caption" color={themeColors.text.secondary} numberOfLines={1} style={{ marginLeft: 3 }}>
                        {item.trip.destination}
                      </Typography>
                    </View>

                    <Typography variant="caption" color={themeColors.text.muted} style={{ marginTop: 2 }}>
                      {formatDateRange(item.trip.startDate, item.trip.endDate, language)} • {item.photoCount} Foto
                    </Typography>

                    <View style={{ marginTop: 6 }}>
                      <Badge
                        label={isHidden ? t.settings.albumStatusHidden : t.settings.albumStatusVisible}
                        variant={isHidden ? 'warning' : 'success'}
                        size="sm"
                      />
                    </View>
                  </View>
                </View>

                {/* Action Buttons Row */}
                <View style={[styles.actionsBar, { borderTopColor: themeColors.border.muted }]}>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}
                    onPress={() => handleToggleHide(item)}
                  >
                    <Ionicons
                      name={isHidden ? 'eye-outline' : 'eye-off-outline'}
                      size={15}
                      color={isHidden ? '#10B981' : '#F59E0B'}
                    />
                    <Typography
                      variant="caption"
                      color={isHidden ? '#10B981' : '#F59E0B'}
                      style={{ fontWeight: '700', marginLeft: 4 }}
                    >
                      {isHidden ? t.settings.unhideAlbumAction : t.settings.hideAlbumAction}
                    </Typography>
                  </Pressable>

                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}
                    onPress={() => handleOpenEdit(item)}
                  >
                    <Ionicons name="pencil" size={14} color={themeColors.brand.blue} />
                    <Typography variant="caption" color={themeColors.brand.blue} style={{ fontWeight: '700', marginLeft: 4 }}>
                      {t.settings.editAlbumAction}
                    </Typography>
                  </Pressable>

                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' }]}
                    onPress={() => handleDeleteAlbum(item)}
                  >
                    <Ionicons name="trash-outline" size={14} color={themeColors.status.error} />
                    <Typography variant="caption" color={themeColors.status.error} style={{ fontWeight: '700', marginLeft: 4 }}>
                      {t.settings.deleteAlbumAction}
                    </Typography>
                  </Pressable>

                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', marginLeft: 'auto' }]}
                    onPress={() => router.push(`/memories/${item.trip.id}`)}
                  >
                    <Ionicons name="sparkles-outline" size={14} color={themeColors.brand.coral} />
                    <Typography variant="caption" color={themeColors.brand.coral} style={{ fontWeight: '700', marginLeft: 4 }}>
                      {language === 'en' ? 'Open' : 'Buka'}
                    </Typography>
                  </Pressable>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* MODAL: EDIT ALBUM */}
      <Modal
        visible={!!editingAlbum}
        animationType="slide"
        transparent
        onRequestClose={() => setEditingAlbum(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default }]}>
            <View style={styles.modalHeader}>
              <Typography variant="h2" color={themeColors.brand.navy}>
                {t.settings.editAlbumTitle}
              </Typography>
              <Pressable onPress={() => setEditingAlbum(null)}>
                <Ionicons name="close-circle-outline" size={24} color={themeColors.text.muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Cover Photo */}
              <Typography variant="label" color={themeColors.text.primary} style={{ marginBottom: 6, fontWeight: '600' }}>
                {language === 'en' ? 'Cover Photo' : 'Foto Sampul Album'}
              </Typography>
              {editCoverUri ? (
                <View style={styles.coverPreviewRow}>
                  <Image source={{ uri: editCoverUri }} style={styles.coverPreviewImage} />
                  <View style={{ gap: 6 }}>
                    <Button
                      label={t.inventory.photoChangeBtn}
                      size="sm"
                      variant="secondary"
                      onPress={handlePickCoverGallery}
                    />
                    <Button
                      label={t.inventory.photoRemoveBtn}
                      size="sm"
                      variant="ghost"
                      onPress={() => setEditCoverUri(null)}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.coverChoiceRow}>
                  <Pressable
                    style={[styles.photoChoiceBtn, { backgroundColor: isDarkMode ? themeColors.surface.muted : '#F1F5F9', borderColor: themeColors.border.default }]}
                    onPress={handlePickCoverCamera}
                  >
                    <Ionicons name="camera" size={18} color={themeColors.brand.coral} />
                    <Typography variant="caption" color={themeColors.text.primary} style={{ fontWeight: '600' }}>
                      {t.inventory.photoTakeCamera}
                    </Typography>
                  </Pressable>
                  <Pressable
                    style={[styles.photoChoiceBtn, { backgroundColor: isDarkMode ? themeColors.surface.muted : '#F1F5F9', borderColor: themeColors.border.default }]}
                    onPress={handlePickCoverGallery}
                  >
                    <Ionicons name="image" size={18} color={themeColors.brand.blue} />
                    <Typography variant="caption" color={themeColors.text.primary} style={{ fontWeight: '600' }}>
                      {t.inventory.photoChooseGallery}
                    </Typography>
                  </Pressable>
                </View>
              )}

              {/* Title Input */}
              <Input
                label={t.settings.albumTitleField}
                placeholder="Contoh: Liburan Seru di Bali"
                value={editTitle}
                onChangeText={setEditTitle}
                style={{ marginTop: spacing[3] }}
              />

              {/* Story / Notes Input */}
              <Input
                label={t.settings.albumStoryField}
                placeholder="Tulis cerita manis atau kenangan penting perjalanan ini..."
                value={editNotes}
                onChangeText={setEditNotes}
                multiline
                numberOfLines={3}
                style={{ marginTop: spacing[3] }}
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button
                label={t.inventory.cancelBtn}
                variant="ghost"
                size="md"
                onPress={() => setEditingAlbum(null)}
              />
              <Button
                label={isSaving ? (language === 'en' ? 'Saving…' : 'Menyimpan…') : t.inventory.saveChangesBtn}
                variant="primary"
                size="md"
                onPress={handleSaveEdit}
                disabled={isSaving}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: spacing[1],
    paddingBottom: spacing[8],
  },
  introCard: {
    padding: spacing[4],
    marginBottom: spacing[4],
    borderRadius: radius.lg,
  },
  introRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  introIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  albumCard: {
    padding: spacing[3],
    marginBottom: spacing[3],
    borderRadius: radius.lg,
  },
  albumHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  coverThumb: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: '#CBD5E1',
  },
  coverPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumMeta: {
    flex: 1,
    marginLeft: spacing[3],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing[4],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  coverPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  coverPreviewImage: {
    width: 90,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: '#CBD5E1',
  },
  coverChoiceRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  photoChoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    marginTop: spacing[4],
  },
});
