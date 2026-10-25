import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, Modal, Alert, Pressable, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { spacing, radius, useThemeColors } from '@/core/theme';
import { Typography, Card, Badge, Button, Input, EmptyState, ScreenContainer } from '@/components/ui';
import { itemRepository } from '@/db/repositories/item.repository';
import { ItemRecord } from '@/db/schema/items';
import { useCategoryStore } from '@/stores/category-store';
import { useI18n } from '@/core/i18n';
import { useUIStore } from '@/stores/ui-store';
import { useActiveInputStore } from '@/stores/active-input-store';
import { mediaService } from '@/services/media';

export default function ItemsScreen() {
  const themeColors = useThemeColors();
  const isDarkMode = useUIStore((s) => s.isDarkMode);
  const { t, format, language } = useI18n();

  const categories = useCategoryStore((s) => s.categories);

  const [itemsList, setItemsList] = useState<ItemRecord[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemRecord | null>(null);
  const modalScrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const keyboardHeight = useActiveInputStore((s) => s.keyboardHeight);

  useEffect(() => {
    if (isModalOpen) {
      useActiveInputStore.getState().setActiveScrollRef(modalScrollRef);
    } else {
      useActiveInputStore.getState().setActiveScrollRef(null);
    }
  }, [isModalOpen]);

  // Form states for Add / Edit
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<string>(categories[0] || 'Clothing');
  const [itemImageUri, setItemImageUri] = useState<string | null>(null);
  const [itemNotes, setItemNotes] = useState('');

  const loadItems = useCallback(async () => {
    try {
      const data = await itemRepository.getAll();
      setItemsList(data);
    } catch {
      // silent catch
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Keep category in sync if categories list changes
  useEffect(() => {
    if (categories.length > 0 && !categories.includes(itemCategory)) {
      setItemCategory(categories[0]);
    }
  }, [categories, itemCategory]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemCategory(categories[0] || 'Clothing');
    setItemImageUri(null);
    setItemNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ItemRecord) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCategory(item.category);
    setItemImageUri(item.imageUri || null);
    setItemNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handlePickCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          language === 'en' ? 'Permission Denied' : 'Izin Ditolak',
          language === 'en' ? 'Camera permission is required to take photos.' : 'Izin kamera diperlukan untuk mengambil foto.'
        );
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.2, // Ukuran paling rendah
      });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        setItemImageUri(res.assets[0].uri);
      }
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', 'Failed to open camera.');
    }
  };

  const handlePickGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          language === 'en' ? 'Permission Denied' : 'Izin Ditolak',
          language === 'en' ? 'Gallery permission is required to choose photos.' : 'Izin galeri diperlukan untuk memilih foto.'
        );
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.2, // Ukuran paling rendah
      });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        setItemImageUri(res.assets[0].uri);
      }
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', 'Failed to open gallery.');
    }
  };

  const handleShowPhotoOptions = () => {
    Alert.alert(
      t.inventory.photoModalTitle,
      t.inventory.photoModalDesc,
      [
        {
          text: t.inventory.photoTakeCamera,
          onPress: handlePickCamera,
        },
        {
          text: t.inventory.photoChooseGallery,
          onPress: handlePickGallery,
        },
        {
          text: t.inventory.cancelBtn,
          style: 'cancel',
        },
      ]
    );
  };

  const handleSaveItem = async () => {
    if (!itemName.trim()) {
      Alert.alert(language === 'en' ? 'Required' : 'Perhatian', t.inventory.alertNameRequired);
      return;
    }

    try {
      const previousImageUri = editingItem?.imageUri ?? null;
      let savedImageUri = itemImageUri || null;
      if (savedImageUri && !mediaService.isManagedPhotoUri(savedImageUri)) {
        const savedPhoto = await mediaService.savePhoto({ sourceUri: savedImageUri });
        savedImageUri = savedPhoto.fullUri;
      }

      if (editingItem) {
        // Update existing item (Update / U of CRUD)
        await itemRepository.update(editingItem.id, {
          name: itemName.trim(),
          category: itemCategory,
          notes: itemNotes.trim() || null,
          imageUri: savedImageUri,
        });
      } else {
        // Create new item (Create / C of CRUD)
        await itemRepository.create({
          name: itemName.trim(),
          category: itemCategory,
          quantity: 1,
          notes: itemNotes.trim() || null,
          imageUri: savedImageUri,
        });
      }

      if (previousImageUri && previousImageUri !== savedImageUri) {
        await mediaService.deletePhotoByUri(previousImageUri);
      }

      setIsModalOpen(false);
      setEditingItem(null);
      loadItems();
    } catch {
      Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.inventory.alertSaveError);
    }
  };

  const handleConfirmDelete = (item: ItemRecord) => {
    Alert.alert(
      t.inventory.deleteModalTitle,
      format(t.inventory.deleteModalMessage, { name: item.name }),
      [
        {
          text: t.inventory.cancelBtn,
          style: 'cancel',
        },
        {
          text: t.inventory.deleteBtn,
          style: 'destructive',
          onPress: async () => {
            try {
              await itemRepository.delete(item.id);
              if (item.imageUri) await mediaService.deletePhotoByUri(item.imageUri);
              if (isModalOpen && editingItem?.id === item.id) {
                setIsModalOpen(false);
                setEditingItem(null);
              }
              loadItems();
            } catch {
              Alert.alert(language === 'en' ? 'Error' : 'Gagal', t.inventory.deleteError);
            }
          },
        },
      ]
    );
  };

  const filteredItems = itemsList.filter((item) => {
    if (selectedCategory === 'All') return true;
    return item.category === selectedCategory;
  });

  const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'Clothing':
        return 'shirt-outline';
      case 'Toiletries':
        return 'water-outline';
      case 'Electronics':
        return 'hardware-chip-outline';
      case 'Documents':
        return 'document-text-outline';
      case 'Medicine':
        return 'medkit-outline';
      case 'Gear & Activities':
        return 'construct-outline';
      default:
        return 'cube-outline';
    }
  };

  return (
    <ScreenContainer>
      {/* Top Header Row */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Typography variant="body" color={themeColors.text.secondary} style={{ fontSize: 13, fontWeight: '600' }}>
            {filteredItems.length === 1
              ? t.inventory.itemCountOne
              : format(t.inventory.itemCount, { count: filteredItems.length })}
          </Typography>
        </View>

        <Button
          label={t.inventory.addItemBtn}
          size="sm"
          variant="accent"
          onPress={handleOpenAddModal}
        />
      </View>

      {/* Category Filter Pills */}
      <View style={styles.categoryWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={['All', ...categories]}
          keyExtractor={(cat) => cat}
          renderItem={({ item: cat }) => {
            const isSelected = selectedCategory === cat;
            return (
              <Pressable
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected
                      ? themeColors.brand.blue
                      : isDarkMode
                      ? themeColors.surface.card
                      : '#F1F5F9',
                    borderColor: isSelected
                      ? themeColors.brand.blue
                      : themeColors.border.default,
                  },
                ]}
              >
                <Typography
                  variant="label"
                  color={isSelected ? '#FFFFFF' : themeColors.text.secondary}
                  style={styles.categoryPillText}
                >
                  {cat === 'All' ? t.inventory.allCategory : cat}
                </Typography>
              </Pressable>
            );
          }}
          contentContainerStyle={styles.categoryList}
        />
      </View>

      {/* Items List (Read / R of CRUD) */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleOpenEditModal(item)}
            style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
          >
            <Card
              elevated
              style={[
                styles.itemCard,
                { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default },
              ]}
            >
              <View style={styles.itemRow}>
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={styles.itemThumbImage} resizeMode="cover" />
                ) : (
                  <View
                    style={[
                      styles.categoryIconCircle,
                      { backgroundColor: isDarkMode ? themeColors.surface.muted : '#F0F4F8' },
                    ]}
                  >
                    <Ionicons
                      name={getCategoryIcon(item.category)}
                      size={18}
                      color={isDarkMode ? '#93C5FD' : themeColors.brand.navy}
                    />
                  </View>
                )}

                <View style={styles.itemInfo}>
                  <Typography variant="body" color={themeColors.text.primary} style={styles.itemName}>
                    {item.name}
                  </Typography>
                  <Typography variant="caption" color={themeColors.text.secondary} numberOfLines={1}>
                    {item.notes ? item.notes : item.category}
                  </Typography>
                </View>

                {/* Right Actions: Category Badge & Direct Action Buttons */}
                <View style={styles.itemActionsRight}>
                  <Badge label={item.category} variant="neutral" size="sm" />
                  <View style={styles.iconButtonsRow}>
                    <Pressable
                      style={[
                        styles.iconBtn,
                        { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : '#EFF6FF' },
                      ]}
                      hitSlop={8}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(item);
                      }}
                    >
                      <Ionicons name="pencil" size={14} color={themeColors.brand.blue} />
                    </Pressable>
                    <Pressable
                      style={[
                        styles.iconBtn,
                        { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2' },
                      ]}
                      hitSlop={8}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleConfirmDelete(item);
                      }}
                    >
                      <Ionicons name="trash-outline" size={15} color={themeColors.status.error} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </Card>
          </Pressable>
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title={t.inventory.emptyTitle}
            description={t.inventory.emptyDesc}
            actionLabel={t.inventory.emptyAction}
            onAction={handleOpenAddModal}
          />
        }
      />

      {/* Modal Tambah / Edit Barang (Create & Update / C & U of CRUD) */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: themeColors.surface.card, borderColor: themeColors.border.default },
            ]}
          >
            <ScrollView
              ref={modalScrollRef}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              contentContainerStyle={[
                styles.modalScrollContent,
                keyboardHeight > 0 && { paddingBottom: keyboardHeight + 120 },
              ]}
              onScroll={(e) => useActiveInputStore.getState().setActiveScrollY(e.nativeEvent.contentOffset.y)}
              scrollEventThrottle={16}
            >
              <View style={styles.modalHeader}>
                <Typography variant="h2" color={themeColors.brand.navy}>
                  {editingItem ? t.inventory.editModalTitle : t.inventory.modalTitle}
                </Typography>
                <Pressable onPress={() => setIsModalOpen(false)}>
                  <Ionicons name="close-circle-outline" size={24} color={themeColors.text.muted} />
                </Pressable>
              </View>

              {/* 1. Item Photo Picker (Camera or Local Gallery) */}
              <Typography variant="label" color={themeColors.text.primary} style={styles.inputLabel}>
                {t.inventory.photoLabel}
              </Typography>

              {itemImageUri ? (
                <View style={styles.photoPreviewRow}>
                  <Image source={{ uri: itemImageUri }} style={styles.photoPreviewImage} />
                  <View style={styles.photoActionButtons}>
                    <Button
                      label={t.inventory.photoChangeBtn}
                      size="sm"
                      variant="secondary"
                      onPress={handleShowPhotoOptions}
                    />
                    <Button
                      label={t.inventory.photoRemoveBtn}
                      size="sm"
                      variant="ghost"
                      onPress={() => setItemImageUri(null)}
                      style={{ marginTop: 6 }}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.photoPickerBtnsRow}>
                  <Pressable
                    style={[
                      styles.photoChoiceBtn,
                      { backgroundColor: isDarkMode ? themeColors.surface.muted : '#F1F5F9', borderColor: themeColors.border.default },
                    ]}
                    onPress={handlePickCamera}
                  >
                    <Ionicons name="camera" size={20} color={themeColors.brand.coral} />
                    <Typography variant="caption" color={themeColors.text.primary} style={styles.photoChoiceText}>
                      {t.inventory.photoTakeCamera}
                    </Typography>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.photoChoiceBtn,
                      { backgroundColor: isDarkMode ? themeColors.surface.muted : '#F1F5F9', borderColor: themeColors.border.default },
                    ]}
                    onPress={handlePickGallery}
                  >
                    <Ionicons name="image" size={20} color={themeColors.brand.blue} />
                    <Typography variant="caption" color={themeColors.text.primary} style={styles.photoChoiceText}>
                      {t.inventory.photoChooseGallery}
                    </Typography>
                  </Pressable>
                </View>
              )}

              {/* 2. Item Name */}
              <Input
                label={t.inventory.nameLabel}
                placeholder={t.inventory.namePlaceholder}
                value={itemName}
                onChangeText={setItemName}
              />

              {/* 3. Category Select */}
              <Typography variant="label" color={themeColors.text.primary} style={styles.inputLabel}>
                {t.inventory.categoryLabel}
              </Typography>
              <View style={styles.categorySelectGrid}>
                {categories.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setItemCategory(cat)}
                    style={[
                      styles.catSelectPill,
                      {
                        backgroundColor: itemCategory === cat
                          ? themeColors.brand.blue
                          : isDarkMode
                          ? themeColors.surface.card
                          : '#F1F5F9',
                      },
                    ]}
                  >
                    <Typography
                      variant="caption"
                      color={itemCategory === cat ? '#FFFFFF' : themeColors.text.secondary}
                      style={styles.catSelectText}
                    >
                      {cat}
                    </Typography>
                  </Pressable>
                ))}
              </View>

              {/* 4. Notes (Optional) */}
              <Input
                label={t.inventory.notesLabel}
                placeholder={t.inventory.notesPlaceholder}
                value={itemNotes}
                onChangeText={setItemNotes}
              />

              {/* Modal Buttons */}
              <View style={styles.modalButtons}>
                {editingItem && (
                  <Button
                    label={t.inventory.deleteBtn}
                    variant="destructive"
                    size="md"
                    onPress={() => handleConfirmDelete(editingItem)}
                    style={{ marginRight: 'auto' }}
                  />
                )}
                <Button
                  label={t.inventory.cancelBtn}
                  variant="ghost"
                  size="md"
                  onPress={() => setIsModalOpen(false)}
                />
                <Button
                  label={editingItem ? t.inventory.saveChangesBtn : t.inventory.saveBtn}
                  variant="accent"
                  size="md"
                  onPress={handleSaveItem}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
    marginTop: spacing[1],
  },
  topBarLeft: {
    flex: 1,
  },
  categoryWrap: {
    marginBottom: spacing[3],
  },
  categoryList: {
    gap: spacing[2],
  },
  categoryPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: spacing[8],
  },
  itemCard: {
    padding: spacing[3],
    marginBottom: spacing[2],
    borderRadius: radius.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemThumbImage: {
    width: 42,
    height: 42,
    borderRadius: 8,
    marginRight: spacing[3],
    backgroundColor: '#E2E8F0',
  },
  categoryIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  itemInfo: {
    flex: 1,
    marginRight: spacing[2],
  },
  itemName: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 2,
  },
  itemActionsRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  iconButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 27, 77, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing[5],
    paddingBottom: spacing[8],
    borderWidth: 1,
    maxHeight: '88%',
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingBottom: spacing[2],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  inputLabel: {
    marginBottom: 6,
    fontWeight: '600',
  },
  photoPickerBtnsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  photoChoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  photoChoiceText: {
    fontWeight: '600',
    fontSize: 12,
  },
  photoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  photoPreviewImage: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: '#CBD5E1',
  },
  photoActionButtons: {
    flex: 1,
  },
  categorySelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  catSelectPill: {
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  catSelectText: {
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[4],
  },
});
